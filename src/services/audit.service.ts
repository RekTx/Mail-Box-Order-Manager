import { Prisma } from "@prisma/client";
import { OrderStatus } from "@/domain";
import { prisma } from "@/lib/prisma";

export type PrismaTransaction = Prisma.TransactionClient;

export interface RecordStatusTransitionParams {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actionBy: string;
  reason?: string;
}

export class AuditService {
  /**
   * Records a status transition within an active Prisma transaction.
   */
  static async recordStatusTransition(
    tx: PrismaTransaction,
    params: RecordStatusTransitionParams
  ) {
    return tx.auditLog.create({
      data: {
        orderId: params.orderId,
        fromStatus: params.fromStatus ?? null,
        toStatus: params.toStatus,
        actionBy: params.actionBy,
        reason: params.reason,
      },
    });
  }

  /**
   * Retrieves the full audit history for a given order in chronological order.
   */
  static async getOrderHistory(orderId: string) {
    return prisma.auditLog.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    });
  }
}
