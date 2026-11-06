import { prisma } from "@/lib/prisma";
import { OrderStatus, MailboxStatus } from "@/domain";
import { OrderService } from "@/services/order.service";
import { AuditService } from "@/services/audit.service";
import { getProvider, MailboxProvider } from "@/providers";

export interface ProcessedOrderResult {
  orderId: string;
  finalStatus: OrderStatus;
  success: boolean;
  totalMailboxes: number;
  activeCount: number;
  failedCount: number;
  error?: string;
}

export interface WorkerCycleResult {
  claimedCount: number;
  results: ProcessedOrderResult[];
}

export class MailboxWorker {
  /**
   * Concurrency-Safe Claim:
   * Uses PostgreSQL row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`)
   * inside an interactive transaction to claim the oldest PENDING order.
   *
   * Immediately transitions the claimed order to PROVISIONING and writes an audit log.
   * This guarantees that concurrent workers will NEVER select or process the same order.
   */
  static async claimNextPendingOrder() {
    return prisma.$transaction(async (tx) => {
      // Execute row-level lock skipping any rows locked by other concurrent workers
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "orders"
        WHERE "status" = 'PENDING'::"OrderStatus"
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (!rows || rows.length === 0) {
        return null;
      }

      const orderId = rows[0].id;

      // Atomically mark order as PROVISIONING while holding the lock
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PROVISIONING },
        include: { mailboxes: { orderBy: { createdAt: "asc" } } },
      });

      await AuditService.recordStatusTransition(tx, {
        orderId,
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.PROVISIONING,
        actionBy: "SYSTEM_WORKER",
        reason: "Claimed by background worker for provisioning",
      });

      return order;
    });
  }

  /**
   * Processes a claimed order:
   * 1. Iterates through its mailbox slots and invokes the provider strategy.
   * 2. Updates each mailbox status to ACTIVE or FAILED based on the provider result.
   * 3. Transitions the order to ACTIVE if all mailboxes succeed, or FAILED if any mailbox fails.
   */
  static async processOrder(
    orderId: string,
    providerOverride?: MailboxProvider
  ): Promise<ProcessedOrderResult> {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { mailboxes: { orderBy: { createdAt: "asc" } } },
    });

    if (order.status !== OrderStatus.PROVISIONING) {
      throw new Error(
        `Cannot process order '${orderId}': Expected status 'PROVISIONING', but found '${order.status}'.`
      );
    }

    const provider =
      providerOverride ??
      getProvider(order.provider as "google" | "microsoft");

    let hasFailure = false;
    let firstErrorMessage: string | undefined;
    let activeCount = 0;
    let failedCount = 0;

    for (let index = 0; index < order.mailboxes.length; index++) {
      const mailbox = order.mailboxes[index];
      const slotIndex = index + 1;

      try {
        const result = await provider.provisionMailbox(order.domain, slotIndex);

        if (result.success) {
          await prisma.mailbox.update({
            where: { id: mailbox.id },
            data: {
              status: MailboxStatus.ACTIVE,
              emailAddress: result.mailboxEmail,
            },
          });
          activeCount++;
        } else {
          hasFailure = true;
          firstErrorMessage = firstErrorMessage ?? result.errorMessage;
          await prisma.mailbox.update({
            where: { id: mailbox.id },
            data: {
              status: MailboxStatus.FAILED,
              emailAddress: result.mailboxEmail,
            },
          });
          failedCount++;
        }
      } catch (err: any) {
        hasFailure = true;
        firstErrorMessage = firstErrorMessage ?? (err?.message || "Unknown provider error");
        await prisma.mailbox.update({
          where: { id: mailbox.id },
          data: { status: MailboxStatus.FAILED },
        });
        failedCount++;
      }
    }

    const finalStatus = hasFailure ? OrderStatus.FAILED : OrderStatus.ACTIVE;
    const reason = hasFailure
      ? `Provisioning failed: ${firstErrorMessage ?? "One or more mailboxes failed."}`
      : "All mailboxes provisioned successfully.";

    await OrderService.transitionOrderStatus(
      order.id,
      finalStatus,
      "SYSTEM_WORKER",
      reason
    );

    return {
      orderId: order.id,
      finalStatus,
      success: !hasFailure,
      totalMailboxes: order.mailboxes.length,
      activeCount,
      failedCount,
      error: hasFailure ? firstErrorMessage : undefined,
    };
  }

  /**
   * Claims and processes a single pending order if available.
   */
  static async processNext(providerOverride?: MailboxProvider): Promise<ProcessedOrderResult | null> {
    const claimedOrder = await this.claimNextPendingOrder();
    if (!claimedOrder) {
      return null;
    }
    return this.processOrder(claimedOrder.id, providerOverride);
  }

  /**
   * Runs one worker cycle, claiming and processing up to `maxBatchSize` orders sequentially.
   */
  static async runCycle(
    maxBatchSize: number = 5,
    providerOverride?: MailboxProvider
  ): Promise<WorkerCycleResult> {
    const results: ProcessedOrderResult[] = [];

    for (let i = 0; i < maxBatchSize; i++) {
      const result = await this.processNext(providerOverride);
      if (!result) {
        break; // No more pending orders to claim
      }
      results.push(result);
    }

    return {
      claimedCount: results.length,
      results,
    };
  }
}

