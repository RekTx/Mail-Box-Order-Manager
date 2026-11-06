import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/domain";

export interface LogAuditParams {
  orderId: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  actionBy: string;
  reason?: string;
}

export class AuditService {
  static async logStatusTransition(params: LogAuditParams) {
    return prisma.auditLog.create({
      data: {
        orderId: params.orderId,
        fromStatus: params.fromStatus ?? null,
        toStatus: params.toStatus,
        actionBy: params.actionBy,
        reason: params.reason,
      },
    });
  }

  static async getOrderHistory(orderId: string) {
    return prisma.auditLog.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    });
  }
}

