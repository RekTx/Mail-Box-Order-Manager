"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAdminUser, DEMO_USER_COOKIE } from "@/lib/auth";
import { OrderService } from "@/services/order.service";
import { MailboxWorker } from "@/worker";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action for retrying a failed order.
 * Strictly verifies admin role and delegates directly to OrderService.
 */
export async function retryOrderAction(orderId: string): Promise<ActionResult> {
  try {
    const adminUser = await requireAdminUser();

    await OrderService.retryFailedOrder(orderId, adminUser.id);

    revalidatePath("/admin");
    revalidatePath(`/admin/orders/${orderId}`);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to retry order.",
    };
  }
}

/**
 * Demo Session switcher allowing testing as Admin or Customer.
 */
export async function switchUserAction(email: string): Promise<ActionResult> {
  try {
    const cookieStore = cookies();
    cookieStore.set(DEMO_USER_COOKIE, email, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to switch user.",
    };
  }
}

/**
 * Allows triggering the background worker cycle from the admin dashboard.
 */
export async function triggerWorkerCycleAction(): Promise<ActionResult> {
  try {
    await requireAdminUser();
    const result = await MailboxWorker.runCycle(5);

    revalidatePath("/admin");
    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to run worker cycle.",
    };
  }
}

