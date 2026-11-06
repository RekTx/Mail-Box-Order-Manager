import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireAdminUser,
  getCurrentUser,
  AuthorizationError,
} from "../../src/lib/auth";
import { retryOrderAction } from "../../src/app/admin/actions";
import { OrderService } from "../../src/services/order.service";
import { prisma } from "../../src/lib/prisma";
import { UserRole, OrderStatus } from "../../src/domain";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    order: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    mailbox: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { cookies } from "next/headers";

describe("Auth & Admin Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAdminUser", () => {
    it("should allow access when user role is ADMIN", async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn().mockReturnValue({ value: "admin@example.com" }),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "admin_123",
        email: "admin@example.com",
        role: UserRole.ADMIN,
      } as any);

      const user = await requireAdminUser();
      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.email).toBe("admin@example.com");
    });

    it("should throw AuthorizationError when user role is CUSTOMER", async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn().mockReturnValue({ value: "customer@example.com" }),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "cust_123",
        email: "customer@example.com",
        role: UserRole.CUSTOMER,
      } as any);

      await expect(requireAdminUser()).rejects.toThrowError(AuthorizationError);
    });
  });

  describe("retryOrderAction Server Action", () => {
    it("should reject retry action if the user is not an Admin", async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn().mockReturnValue({ value: "customer@example.com" }),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "cust_123",
        email: "customer@example.com",
        role: UserRole.CUSTOMER,
      } as any);

      const result = await retryOrderAction("order_failed_1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Admin privileges required");
    });

    it("should successfully retry failed order when authenticated as Admin", async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn().mockReturnValue({ value: "admin@example.com" }),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "admin_123",
        email: "admin@example.com",
        role: UserRole.ADMIN,
      } as any);

      const failedOrder = {
        id: "order_failed_1",
        status: OrderStatus.FAILED,
      };

      vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(failedOrder as any);

      const mockTx = {
        mailbox: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        order: { update: vi.fn().mockResolvedValue({ id: "order_failed_1", status: OrderStatus.PENDING }) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(mockTx));

      const result = await retryOrderAction("order_failed_1");
      expect(result.success).toBe(true);
      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "order_failed_1" },
          data: { status: OrderStatus.PENDING },
        })
      );
    });

    it("should reject retrying an ACTIVE order with a descriptive error", async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn().mockReturnValue({ value: "admin@example.com" }),
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "admin_123",
        email: "admin@example.com",
        role: UserRole.ADMIN,
      } as any);

      const activeOrder = {
        id: "order_active_1",
        status: OrderStatus.ACTIVE,
      };

      vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(activeOrder as any);

      const result = await retryOrderAction("order_active_1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("must be in 'FAILED' to retry");
    });
  });
});

