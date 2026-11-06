import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/domain";

export const DEMO_USER_COOKIE = "demo_user_email";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

export class AuthenticationError extends Error {
  constructor(message = "Unauthorized: Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Forbidden: Admin privileges required") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Gets the current active demo user from cookie or falls back to admin@example.com.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const demoEmail =
    cookieStore.get(DEMO_USER_COOKIE)?.value || "admin@example.com";

  try {
    const user = await prisma.user.findUnique({
      where: { email: demoEmail },
    });

    if (user) {
      return {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
      };
    }
  } catch (error) {
    console.warn("Could not query user from database, falling back to mock session:", error);
  }

  // Fallback if DB hasn't been seeded yet
  if (demoEmail === "admin@example.com") {
    return {
      id: "admin-seeded-id",
      email: "admin@example.com",
      role: UserRole.ADMIN,
    };
  }

  return {
    id: "customer-seeded-id",
    email: demoEmail,
    role: UserRole.CUSTOMER,
  };
}

/**
 * Ensures the authenticated user has the ADMIN role.
 * Throws AuthorizationError if the user is not an admin.
 */
export async function requireAdminUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthenticationError();
  }

  if (user.role !== UserRole.ADMIN) {
    throw new AuthorizationError(
      `Access denied for '${user.email}'. Admin privileges required.`
    );
  }

  return user;
}

