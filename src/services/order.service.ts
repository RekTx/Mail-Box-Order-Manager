import { prisma } from "@/lib/prisma";
import {
  CreateOrderInput,
  OrderStatus,
  canTransitionOrder,
} from "@/domain";
import { AuditService } from "./audit.service";

export class OrderService {
  /**
   * Creates an order idempotently or returns the existing order if idempotency key matches.
   */
  static async createOrder(input: CreateOrderInput) {
    // Check if an order already exists for this idempotency key
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { mailboxes: true },
    });

    if (existingOrder) {
      return { order: existingOrder, isDuplicate: true };
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId: input.customerId,
          domain: input.domain,
          provider: input.provider,
          mailboxCount: input.mailboxCount,
          status: OrderStatus.PENDING,
          idempotencyKey: input.idempotencyKey,
        },
      });

      await tx.auditLog.create({
        data: {
          orderId: created.id,
          fromStatus: null,
          toStatus: OrderStatus.PENDING,
          actionBy: input.customerId,
          reason: "Order created",
        },
      });

      return created;
    });

    return { order, isDuplicate: false };
  }

  /**
   * Updates order status ensuring strict state machine validation and audit logging.
   */
  static async updateOrderStatus(
    orderId: string,
    nextStatus: OrderStatus,
    actionBy: string,
    reason?: string
  ) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });

    if (!canTransitionOrder(order.status as OrderStatus, nextStatus)) {
      throw new Error(
        `Invalid status transition from ${order.status} to ${nextStatus}`
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
      });

      await tx.auditLog.create({
        data: {
          orderId,
          fromStatus: order.status as OrderStatus,
          toStatus: nextStatus,
          actionBy,
          reason,
        },
      });

      return updated;
    });
  }

  static async getOrderById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        mailboxes: true,
        auditLogs: { orderBy: { createdAt: "asc" } },
      },
    });
  }
}

