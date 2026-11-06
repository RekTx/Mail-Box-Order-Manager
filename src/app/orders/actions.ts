"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/auth";
import { CreateOrderFormSchema } from "@/domain";
import { OrderService } from "@/services/order.service";

export interface CreateOrderActionResult {
  success: boolean;
  orderId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createOrderAction(
  rawInput: unknown
): Promise<CreateOrderActionResult> {
  try {
    const sessionUser = await requireAuthenticatedUser();

    // Validate form input via Zod schema
    const parseResult = CreateOrderFormSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const flattened = parseResult.error.flatten();
      return {
        success: false,
        error: "Validation failed. Please correct the highlighted fields.",
        fieldErrors: flattened.fieldErrors,
      };
    }

    const { domain, provider, mailboxCount, idempotencyKey } = parseResult.data;

    // Strictly delegate order creation to the service layer
    const order = await OrderService.createOrder({
      customerId: sessionUser.id,
      domain,
      provider,
      mailboxCount,
      idempotencyKey,
    });

    revalidatePath("/orders");
    revalidatePath("/admin");

    return {
      success: true,
      orderId: order.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while creating the order.",
    };
  }
}

/**
 * Polling action to fetch live order status and mailbox provisioning progression.
 */
export async function getLiveOrderStatusAction(orderId: string) {
  try {
    const sessionUser = await requireAuthenticatedUser();
    const order = await OrderService.getOrderForCustomer(
      orderId,
      sessionUser.id,
      sessionUser.role === "ADMIN"
    );

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    return {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        mailboxes: order.mailboxes.map((m) => ({
          id: m.id,
          emailAddress: m.emailAddress,
          status: m.status,
        })),
        auditLogs: order.auditLogs.map((l) => ({
          id: l.id,
          fromStatus: l.fromStatus,
          toStatus: l.toStatus,
          actionBy: l.actionBy,
          reason: l.reason,
          createdAt: l.createdAt,
        })),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to fetch live order status",
    };
  }
}

