import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "../../src/services/order.service";
import { prisma } from "../../src/lib/prisma";
import { OrderStatus, MailboxProviderType } from "../../src/domain";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    order: {
      count: vi.fn(),
      findMany: vi.fn(),
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

describe("Admin Orders Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OrderService.getAdminOrders", () => {
    it("should return paginated orders with default parameters", async () => {
      const mockOrders = [
        {
          id: "order_1",
          domain: "example.com",
          status: OrderStatus.PENDING,
          provider: "google",
          customer: { email: "cust1@example.com" },
          mailboxes: [],
          auditLogs: [],
        },
      ];

      vi.mocked(prisma.order.count).mockResolvedValue(1);
      vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);

      const result = await OrderService.getAdminOrders();

      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.orders).toEqual(mockOrders);

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { email: true } },
          mailboxes: { orderBy: { createdAt: "asc" } },
          auditLogs: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    it("should apply status and provider filters when provided", async () => {
      vi.mocked(prisma.order.count).mockResolvedValue(0);
      vi.mocked(prisma.order.findMany).mockResolvedValue([]);

      await OrderService.getAdminOrders({
        status: OrderStatus.FAILED,
        provider: MailboxProviderType.MICROSOFT,
        page: 2,
        pageSize: 5,
      });

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          status: OrderStatus.FAILED,
          provider: MailboxProviderType.MICROSOFT,
        },
        skip: 5,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { email: true } },
          mailboxes: { orderBy: { createdAt: "asc" } },
          auditLogs: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    it("should omit filter keys when set to 'ALL'", async () => {
      vi.mocked(prisma.order.count).mockResolvedValue(0);
      vi.mocked(prisma.order.findMany).mockResolvedValue([]);

      await OrderService.getAdminOrders({
        status: "ALL",
        provider: "ALL",
      });

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { email: true } },
          mailboxes: { orderBy: { createdAt: "asc" } },
          auditLogs: { orderBy: { createdAt: "asc" } },
        },
      });
    });
  });
});

