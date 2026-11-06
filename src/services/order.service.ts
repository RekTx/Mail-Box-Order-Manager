import { prisma } from "@/lib/prisma";
import {
  OrderStatus,
  MailboxStatus,
  MailboxProviderType,
  assertTransition,
  CreateOrderInput,
} from "@/domain";
import { AuditService } from "./audit.service";

export interface GetAdminOrdersParams {
  status?: OrderStatus | "ALL";
  provider?: MailboxProviderType | "ALL";
  page?: number;
  pageSize?: number;
}

export class OrderService {
  /**
   * Creates an order idempotently.
   * If an order with the provided idempotencyKey already exists, returns the existing order.
   * Otherwise, creates the order with status PENDING, placeholder mailboxes, and records the initial audit log.
   */
  static async createOrder(data: CreateOrderInput) {
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      include: { mailboxes: true },
    });

    if (existingOrder) {
      return existingOrder;
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: data.customerId,
          domain: data.domain,
          provider: data.provider,
          mailboxCount: data.mailboxCount,
          status: OrderStatus.PENDING,
          idempotencyKey: data.idempotencyKey,
          mailboxes: {
            create: Array.from({ length: data.mailboxCount }, (_, index) => ({
              emailAddress: `mailbox${index + 1}@${data.domain}`,
              status: MailboxStatus.PENDING,
            })),
          },
        },
        include: {
          mailboxes: true,
        },
      });

      await AuditService.recordStatusTransition(tx, {
        orderId: order.id,
        fromStatus: null,
        toStatus: OrderStatus.PENDING,
        actionBy: data.customerId,
        reason: "Order created",
      });

      return order;
    });
  }

  /**
   * Transitions an order to the next status within an interactive transaction.
   * Validates the transition using the pure domain state machine.
   */
  static async transitionOrderStatus(
    orderId: string,
    nextStatus: OrderStatus,
    actionBy: string,
    reason?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
      });

      const currentStatus = order.status as OrderStatus;
      assertTransition(currentStatus, nextStatus);

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
        include: { mailboxes: true },
      });

      await AuditService.recordStatusTransition(tx, {
        orderId,
        fromStatus: currentStatus,
        toStatus: nextStatus,
        actionBy,
        reason,
      });

      return updatedOrder;
    });
  }

  /**
   * Specifically transitions FAILED -> PENDING with actionBy: adminUserId and reason "Admin retry".
   * Rejects if the order is not currently in FAILED status.
   */
  static async retryFailedOrder(orderId: string, adminUserId: string) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });

    const currentStatus = order.status as OrderStatus;
    if (currentStatus !== OrderStatus.FAILED) {
      throw new Error(
        `Cannot retry order '${orderId}': Order is in '${currentStatus}' status, but must be in '${OrderStatus.FAILED}' to retry.`
      );
    }

    return prisma.$transaction(async (tx) => {
      assertTransition(currentStatus, OrderStatus.PENDING);

      // Reset any failed mailboxes back to PENDING for the retry
      await tx.mailbox.updateMany({
        where: { orderId, status: MailboxStatus.FAILED },
        data: { status: MailboxStatus.PENDING },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PENDING },
        include: { mailboxes: true },
      });

      await AuditService.recordStatusTransition(tx, {
        orderId,
        fromStatus: OrderStatus.FAILED,
        toStatus: OrderStatus.PENDING,
        actionBy: adminUserId,
        reason: "Admin retry",
      });

      return updatedOrder;
    });
  }

  /**
   * Queries orders with pagination and filtering for the Admin view.
   * Business/data layer query strictly encapsulated in service.
   */
  static async getAdminOrders(params: GetAdminOrdersParams = {}) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.status && params.status !== "ALL") {
      where.status = params.status;
    }
    if (params.provider && params.provider !== "ALL") {
      where.provider = params.provider;
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { email: true } },
          mailboxes: { orderBy: { createdAt: "asc" } },
          auditLogs: { orderBy: { createdAt: "asc" } },
        },
      }),
    ]);

    return {
      orders,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      page,
      pageSize,
    };
  }

  /**
   * Fetch order by ID with associated customer, mailboxes, and audit history.
   */
  static async getOrderById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { email: true } },
        mailboxes: { orderBy: { createdAt: "asc" } },
        auditLogs: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  /**
   * Fetch all orders belonging to a specific customer.
   */
  static async getCustomerOrders(customerId: string) {
    return prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { email: true } },
        mailboxes: { orderBy: { createdAt: "asc" } },
        auditLogs: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  /**
   * Fetch order for a customer, enforcing customer-isolation boundaries.
   * Throws an error if a customer attempts to access an order owned by someone else.
   */
  static async getOrderForCustomer(
    orderId: string,
    customerId: string,
    isAdmin = false
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { email: true } },
        mailboxes: { orderBy: { createdAt: "asc" } },
        auditLogs: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) {
      return null;
    }

    if (!isAdmin && order.customerId !== customerId) {
      throw new Error(
        "Forbidden: You do not have permission to view this order."
      );
    }

    return order;
  }
}
