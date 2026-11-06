import { describe, it, expect, vi, beforeEach } from "vitest";
import { MailboxWorker } from "../../src/worker/mailbox.worker";
import { prisma } from "../../src/lib/prisma";
import { OrderStatus, MailboxStatus } from "../../src/domain";
import { MailboxProvider } from "../../src/providers";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    order: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    mailbox: {
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

describe("MailboxWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("claimNextPendingOrder (Concurrency-Safe Claim)", () => {
    it("should return null if there are no pending orders", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        order: { update: vi.fn() },
        auditLog: { create: vi.fn() },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const claimed = await MailboxWorker.claimNextPendingOrder();
      expect(claimed).toBeNull();
      expect(mockTx.order.update).not.toHaveBeenCalled();
    });

    it("should claim order with row lock, update to PROVISIONING, and log audit record", async () => {
      const pendingOrder = {
        id: "order_123",
        status: OrderStatus.PROVISIONING,
        mailboxes: [],
      };

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: "order_123" }]),
        order: {
          update: vi.fn().mockResolvedValue(pendingOrder),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit_worker" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const claimed = await MailboxWorker.claimNextPendingOrder();
      expect(claimed).toEqual(pendingOrder);
      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: "order_123" },
        data: { status: OrderStatus.PROVISIONING },
        include: { mailboxes: { orderBy: { createdAt: "asc" } } },
      });
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          orderId: "order_123",
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.PROVISIONING,
          actionBy: "SYSTEM_WORKER",
          reason: "Claimed by background worker for provisioning",
        },
      });
    });
  });

  describe("processOrder", () => {
    it("should successfully provision all mailboxes and transition order to ACTIVE", async () => {
      const order = {
        id: "order_abc",
        domain: "company.com",
        provider: "google",
        status: OrderStatus.PROVISIONING,
        mailboxes: [
          { id: "mb_1", status: MailboxStatus.PENDING },
          { id: "mb_2", status: MailboxStatus.PENDING },
        ],
      };

      vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(order as any);
      vi.mocked(prisma.mailbox.update).mockResolvedValue({} as any);

      const mockTx = {
        order: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(order),
          update: vi.fn().mockResolvedValue({ ...order, status: OrderStatus.ACTIVE }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit_done" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const mockProvider: MailboxProvider = {
        name: "google",
        provisionMailbox: vi.fn().mockImplementation(async (domain, index) => ({
          success: true,
          mailboxEmail: `user${index}@${domain}`,
        })),
      };

      const result = await MailboxWorker.processOrder("order_abc", mockProvider);

      expect(result.success).toBe(true);
      expect(result.finalStatus).toBe(OrderStatus.ACTIVE);
      expect(result.activeCount).toBe(2);
      expect(result.failedCount).toBe(0);

      expect(prisma.mailbox.update).toHaveBeenCalledTimes(2);
      expect(prisma.mailbox.update).toHaveBeenNthCalledWith(1, {
        where: { id: "mb_1" },
        data: { status: MailboxStatus.ACTIVE, emailAddress: "user1@company.com" },
      });
      expect(prisma.mailbox.update).toHaveBeenNthCalledWith(2, {
        where: { id: "mb_2" },
        data: { status: MailboxStatus.ACTIVE, emailAddress: "user2@company.com" },
      });

      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: "order_abc" },
        data: { status: OrderStatus.ACTIVE },
        include: { mailboxes: true },
      });
    });

    it("should transition order to FAILED when any mailbox fails", async () => {
      const order = {
        id: "order_fail_test",
        domain: "company.com",
        provider: "microsoft",
        status: OrderStatus.PROVISIONING,
        mailboxes: [
          { id: "mb_1", status: MailboxStatus.PENDING },
          { id: "mb_2", status: MailboxStatus.PENDING },
        ],
      };

      vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(order as any);
      vi.mocked(prisma.mailbox.update).mockResolvedValue({} as any);

      const mockTx = {
        order: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(order),
          update: vi.fn().mockResolvedValue({ ...order, status: OrderStatus.FAILED }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit_failed" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const mockProvider: MailboxProvider = {
        name: "microsoft",
        provisionMailbox: vi.fn()
          .mockResolvedValueOnce({
            success: true,
            mailboxEmail: "user1@company.com",
          })
          .mockResolvedValueOnce({
            success: false,
            mailboxEmail: "user2@company.com",
            errorMessage: "Quota limit reached",
          }),
      };

      const result = await MailboxWorker.processOrder("order_fail_test", mockProvider);

      expect(result.success).toBe(false);
      expect(result.finalStatus).toBe(OrderStatus.FAILED);
      expect(result.activeCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.error).toBe("Quota limit reached");

      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: "order_fail_test" },
        data: { status: OrderStatus.FAILED },
        include: { mailboxes: true },
      });
    });

    it("should reject processing if order is not in PROVISIONING status", async () => {
      const order = {
        id: "order_pending",
        status: OrderStatus.PENDING,
      };

      vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(order as any);

      await expect(
        MailboxWorker.processOrder("order_pending")
      ).rejects.toThrowError(/Expected status 'PROVISIONING'/);
    });
  });

  describe("Concurrency Safety Verification", () => {
    it("should never allow two concurrent workers to claim the same order", async () => {
      // Simulate PostgreSQL row-locking behavior:
      // When Worker 1 queries with SKIP LOCKED, it immediately acquires row 1.
      // When Worker 2 queries with SKIP LOCKED concurrently, row 1 is locked, so it gets row 2.
      const order1 = { id: "order_first", status: OrderStatus.PROVISIONING, mailboxes: [] };
      const order2 = { id: "order_second", status: OrderStatus.PROVISIONING, mailboxes: [] };

      const lockedOrderIds = new Set<string>();

      const runSimulatedWorkerClaim = async (availableRows: { id: string }[]) => {
        const mockTx = {
          $queryRaw: vi.fn().mockImplementation(async () => {
            // Find first available row not locked by any active transaction
            const available = availableRows.find((r) => !lockedOrderIds.has(r.id));
            if (!available) return [];
            // "FOR UPDATE" locks the row immediately upon selection
            lockedOrderIds.add(available.id);
            return [available];
          }),
          order: {
            update: vi.fn().mockImplementation(async ({ where }: any) => {
              return where.id === "order_first" ? order1 : order2;
            }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        };

        vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
          return callback(mockTx);
        });

        return MailboxWorker.claimNextPendingOrder();
      };

      const availableInDb = [{ id: "order_first" }, { id: "order_second" }];

      // Run two claims concurrently
      const [worker1Result, worker2Result] = await Promise.all([
        runSimulatedWorkerClaim(availableInDb),
        runSimulatedWorkerClaim(availableInDb),
      ]);

      expect(worker1Result).not.toBeNull();
      expect(worker2Result).not.toBeNull();
      expect(worker1Result?.id).not.toEqual(worker2Result?.id);

      // Verify each was claimed exactly once
      expect(new Set([worker1Result?.id, worker2Result?.id]).size).toBe(2);
    });
  });
});
