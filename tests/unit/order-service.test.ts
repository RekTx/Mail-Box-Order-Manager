import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "../../src/services/order.service";
import { AuditService } from "../../src/services/audit.service";
import { prisma } from "../../src/lib/prisma";
import {
  OrderStatus,
  MailboxStatus,
  InvalidStateTransitionError,
} from "../../src/domain";

// Mock the prisma client
vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    mailbox: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("OrderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createOrder", () => {
    it("should return existing order if idempotencyKey already exists", async () => {
      const existingOrder = {
        id: "order_123",
        customerId: "cust_1",
        domain: "example.com",
        provider: "google",
        mailboxCount: 2,
        status: OrderStatus.PENDING,
        idempotencyKey: "idem_key_1",
        mailboxes: [],
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(existingOrder as any);

      const result = await OrderService.createOrder({
        customerId: "cust_1",
        domain: "example.com",
        provider: "google",
        mailboxCount: 2,
        idempotencyKey: "idem_key_1",
      });

      expect(result).toEqual(existingOrder);
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { idempotencyKey: "idem_key_1" },
        include: { mailboxes: true },
      });
      // Should not start transaction or create anything new
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should create new order with PENDING status, placeholder mailboxes, and audit log", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      const createdOrder = {
        id: "order_new",
        customerId: "cust_1",
        domain: "example.com",
        provider: "google",
        mailboxCount: 2,
        status: OrderStatus.PENDING,
        idempotencyKey: "idem_key_new",
        mailboxes: [
          { id: "mb_1", emailAddress: "mailbox1@example.com", status: MailboxStatus.PENDING },
          { id: "mb_2", emailAddress: "mailbox2@example.com", status: MailboxStatus.PENDING },
        ],
      };

      const mockTx = {
        order: {
          create: vi.fn().mockResolvedValue(createdOrder),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit_1" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await OrderService.createOrder({
        customerId: "cust_1",
        domain: "example.com",
        provider: "google",
        mailboxCount: 2,
        idempotencyKey: "idem_key_new",
      });

      expect(result).toEqual(createdOrder);
      expect(mockTx.order.create).toHaveBeenCalledWith({
        data: {
          customerId: "cust_1",
          domain: "example.com",
          provider: "google",
          mailboxCount: 2,
          status: OrderStatus.PENDING,
          idempotencyKey: "idem_key_new",
          mailboxes: {
            create: [
              { emailAddress: "mailbox1@example.com", status: MailboxStatus.PENDING },
              { emailAddress: "mailbox2@example.com", status: MailboxStatus.PENDING },
            ],
          },
        },
        include: { mailboxes: true },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          orderId: "order_new",
          fromStatus: null,
          toStatus: OrderStatus.PENDING,
          actionBy: "cust_1",
          reason: "Order created",
        },
      });
    });
  });

  describe("transitionOrderStatus", () => {
    it("should successfully transition status and record audit log in transaction", async () => {
      const initialOrder = {
        id: "order_1",
        status: OrderStatus.PENDING,
      };

      const updatedOrder = {
        id: "order_1",
        status: OrderStatus.PROVISIONING,
        mailboxes: [],
      };

      const mockTx = {
        order: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(initialOrder),
          update: vi.fn().mockResolvedValue(updatedOrder),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit_1" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await OrderService.transitionOrderStatus(
        "order_1",
        OrderStatus.PROVISIONING,
        "SYSTEM_WORKER",
        "Worker started"
      );

      expect(result).toEqual(updatedOrder);
      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: "order_1" },
        data: { status: OrderStatus.PROVISIONING },
        include: { mailboxes: true },
      });
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          orderId: "order_1",
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.PROVISIONING,
          actionBy: "SYSTEM_WORKER",
          reason: "Worker started",
        },
      });
    });

    it("should throw InvalidStateTransitionError when transition is disallowed", async () => {
      const activeOrder = {
        id: "order_1",
        status: OrderStatus.ACTIVE,
      };

      const mockTx = {
        order: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(activeOrder),
          update: vi.fn(),
        },
        auditLog: {
          create: vi.fn(),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(
        OrderService.transitionOrderStatus(
          "order_1",
          OrderStatus.PENDING,
          "admin_1",
          "Attempt invalid"
        )
      ).rejects.toThrowError(InvalidStateTransitionError);

      expect(mockTx.order.update).not.toHaveBeenCalled();
    });
  });

  describe("retryFailedOrder", () => {
    it("should successfully transition FAILED order to PENDING and reset failed mailboxes", async () => {
      const failedOrder = {
        id: "order_failed",
        status: OrderStatus.FAILED,
      };

      const retriedOrder = {
        id: "order_failed",
        status: OrderStatus.PENDING,
        mailboxes: [],
      };

      vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(failedOrder as any);

      const mockTx = {
        mailbox: {
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        order: {
          update: vi.fn().mockResolvedValue(retriedOrder),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit_retry" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await OrderService.retryFailedOrder("order_failed", "admin_user_42");

      expect(result).toEqual(retriedOrder);
      expect(mockTx.mailbox.updateMany).toHaveBeenCalledWith({
        where: { orderId: "order_failed", status: MailboxStatus.FAILED },
        data: { status: MailboxStatus.PENDING },
      });
      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: "order_failed" },
        data: { status: OrderStatus.PENDING },
        include: { mailboxes: true },
      });
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          orderId: "order_failed",
          fromStatus: OrderStatus.FAILED,
          toStatus: OrderStatus.PENDING,
          actionBy: "admin_user_42",
          reason: "Admin retry",
        },
      });
    });

    it("should reject retry if order is not in FAILED status", async () => {
      const pendingOrder = {
        id: "order_pending",
        status: OrderStatus.PENDING,
      };

      vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(pendingOrder as any);

      await expect(
        OrderService.retryFailedOrder("order_pending", "admin_user_42")
      ).rejects.toThrowError(/must be in 'FAILED' to retry/);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});

