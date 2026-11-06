import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "../../src/services/order.service";
import {
  CreateOrderInputSchema,
  CreateOrderFormSchema,
  OrderStatus,
  MailboxStatus,
} from "../../src/domain";
import { createOrderAction } from "../../src/app/orders/actions";
import { prisma } from "../../src/lib/prisma";

// Mock next/headers for server actions
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue({ value: "customer@example.com" }),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    mailbox: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Integration: Order Creation & Idempotency", () => {
  const customerId = "cust_seeded_123";
  const idempotencyKey = "uuid-key-abc-123-xyz";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Happy Path Order Creation", () => {
    it("should insert order in PENDING status, prepare mailbox slots, and log initial audit trail", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      const createdOrderData = {
        id: "order_happy_path",
        customerId,
        domain: "acme-corp.com",
        provider: "google",
        mailboxCount: 3,
        status: OrderStatus.PENDING,
        idempotencyKey,
        mailboxes: [
          { id: "mb_1", emailAddress: "mailbox1@acme-corp.com", status: MailboxStatus.PENDING },
          { id: "mb_2", emailAddress: "mailbox2@acme-corp.com", status: MailboxStatus.PENDING },
          { id: "mb_3", emailAddress: "mailbox3@acme-corp.com", status: MailboxStatus.PENDING },
        ],
      };

      const mockTx = {
        order: {
          create: vi.fn().mockResolvedValue(createdOrderData),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit_init" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const order = await OrderService.createOrder({
        customerId,
        domain: "acme-corp.com",
        provider: "google",
        mailboxCount: 3,
        idempotencyKey,
      });

      expect(order.id).toBe("order_happy_path");
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.mailboxes).toHaveLength(3);

      // Verify transaction created the order with nested mailboxes
      expect(mockTx.order.create).toHaveBeenCalledWith({
        data: {
          customerId,
          domain: "acme-corp.com",
          provider: "google",
          mailboxCount: 3,
          status: OrderStatus.PENDING,
          idempotencyKey,
          mailboxes: {
            create: [
              { emailAddress: "mailbox1@acme-corp.com", status: MailboxStatus.PENDING },
              { emailAddress: "mailbox2@acme-corp.com", status: MailboxStatus.PENDING },
              { emailAddress: "mailbox3@acme-corp.com", status: MailboxStatus.PENDING },
            ],
          },
        },
        include: {
          mailboxes: true,
        },
      });

      // Verify initial audit log [null -> PENDING]
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          orderId: "order_happy_path",
          fromStatus: null,
          toStatus: OrderStatus.PENDING,
          actionBy: customerId,
          reason: "Order created",
        },
      });
    });
  });

  describe("Idempotency Enforcement", () => {
    it("should return the existing order without creating duplicate rows when called with identical idempotencyKey", async () => {
      const existingOrder = {
        id: "order_existing_123",
        customerId,
        domain: "duplicate-test.com",
        provider: "microsoft",
        mailboxCount: 2,
        status: OrderStatus.PENDING,
        idempotencyKey: "same-key-twice",
        mailboxes: [
          { id: "mb_1", emailAddress: "mailbox1@duplicate-test.com", status: MailboxStatus.PENDING },
          { id: "mb_2", emailAddress: "mailbox2@duplicate-test.com", status: MailboxStatus.PENDING },
        ],
      };

      // First call simulates order not found, creates it
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);

      const mockTx = {
        order: { create: vi.fn().mockResolvedValue(existingOrder) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      };
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) => cb(mockTx));

      const firstSubmission = await OrderService.createOrder({
        customerId,
        domain: "duplicate-test.com",
        provider: "microsoft",
        mailboxCount: 2,
        idempotencyKey: "same-key-twice",
      });

      expect(firstSubmission.id).toBe("order_existing_123");
      expect(mockTx.order.create).toHaveBeenCalledTimes(1);

      // Second call with the same idempotencyKey finds the order already exists
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(existingOrder as any);

      const secondSubmission = await OrderService.createOrder({
        customerId,
        domain: "duplicate-test.com",
        provider: "microsoft",
        mailboxCount: 2,
        idempotencyKey: "same-key-twice",
      });

      expect(secondSubmission.id).toBe("order_existing_123");
      // Transaction was NOT invoked again, zero duplicate database rows created
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("Boundary & Validation Rules", () => {
    it("should reject mailboxCount below 1", () => {
      const result = CreateOrderInputSchema.safeParse({
        customerId,
        domain: "valid-domain.com",
        provider: "google",
        mailboxCount: 0,
        idempotencyKey,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.mailboxCount?.[0]).toContain(
          "at least 1"
        );
      }
    });

    it("should reject mailboxCount above 50", () => {
      const result = CreateOrderInputSchema.safeParse({
        customerId,
        domain: "valid-domain.com",
        provider: "google",
        mailboxCount: 51,
        idempotencyKey,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.mailboxCount?.[0]).toContain(
          "cannot exceed 50"
        );
      }
    });

    it("should accept mailboxCount exactly at boundaries (1 and 50)", () => {
      const minBoundary = CreateOrderInputSchema.safeParse({
        customerId,
        domain: "valid-domain.com",
        provider: "google",
        mailboxCount: 1,
        idempotencyKey,
      });

      const maxBoundary = CreateOrderInputSchema.safeParse({
        customerId,
        domain: "valid-domain.com",
        provider: "microsoft",
        mailboxCount: 50,
        idempotencyKey,
      });

      expect(minBoundary.success).toBe(true);
      expect(maxBoundary.success).toBe(true);
    });

    it("should reject invalid domain formats", () => {
      const invalidDomains = [
        "not_a_domain",
        "http://example.com",
        "domain with spaces.com",
        ".starts-with-dot.com",
        "ends-with-dot.",
        "has_underscore_in_tld.c_m",
      ];

      for (const invalid of invalidDomains) {
        const result = CreateOrderInputSchema.safeParse({
          customerId,
          domain: invalid,
          provider: "google",
          mailboxCount: 5,
          idempotencyKey,
        });

        expect(result.success).toBe(false);
      }
    });

    it("should accept valid domain formats", () => {
      const validDomains = [
        "example.com",
        "my-company.org",
        "sub.domain.co.uk",
        "cool-startup.io",
        "enterprise123.net",
      ];

      for (const valid of validDomains) {
        const result = CreateOrderInputSchema.safeParse({
          customerId,
          domain: valid,
          provider: "google",
          mailboxCount: 5,
          idempotencyKey,
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe("Server Action Input Validation", () => {
    it("should return structured field errors on invalid client submission", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "cust_123",
        email: "customer@example.com",
        role: "CUSTOMER",
      } as any);

      const actionResult = await createOrderAction({
        domain: "invalid domain",
        provider: "yahoo", // Invalid provider
        mailboxCount: 99,   // Out of range
        idempotencyKey: "short", // Less than 8 chars
      });

      expect(actionResult.success).toBe(false);
      expect(actionResult.fieldErrors).toBeDefined();
      expect(actionResult.fieldErrors?.domain).toBeDefined();
      expect(actionResult.fieldErrors?.provider).toBeDefined();
      expect(actionResult.fieldErrors?.mailboxCount).toBeDefined();
      expect(actionResult.fieldErrors?.idempotencyKey).toBeDefined();
    });
  });
});

