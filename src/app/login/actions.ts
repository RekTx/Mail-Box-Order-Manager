"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { authenticateUser, DEMO_USER_COOKIE } from "@/lib/auth";
import { UserRole } from "@/domain";

export interface LoginActionResult {
  success: boolean;
  redirectTo?: string;
  error?: string;
}

export async function loginAction(formData: {
  email: string;
  password?: string;
}): Promise<LoginActionResult> {
  const { email } = formData;

  if (!email || !email.trim()) {
    return {
      success: false,
      error: "Email address is required.",
    };
  }

  const user = await authenticateUser(email);

  if (!user) {
    return {
      success: false,
      error:
        "User not found. Please use seeded credentials (admin@example.com or customer@example.com).",
    };
  }

  const cookieStore = cookies();
  cookieStore.set(DEMO_USER_COOKIE, user.email, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  revalidatePath("/", "layout");

  const redirectTo = user.role === UserRole.ADMIN ? "/admin" : "/orders";

  return {
    success: true,
    redirectTo,
  };
}

export async function logoutAction(): Promise<{ success: boolean; redirectTo: string }> {
  const cookieStore = cookies();
  cookieStore.set(DEMO_USER_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });

  revalidatePath("/", "layout");

  return {
    success: true,
    redirectTo: "/login",
  };
}

