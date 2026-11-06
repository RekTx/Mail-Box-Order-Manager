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
 * Validates credentials against the database or seeded demo fallbacks.
 */
export async function authenticateUser(email: string): Promise<SessionUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      return {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
      };
    }
  } catch (error) {
    console.warn("DB lookup failed during auth, checking seeded fallbacks:", error);
  }

  // Fallbacks for seeded accounts
  if (normalizedEmail === "admin@example.com") {
    return {
      id: "admin-seeded-id",
      email: "admin@example.com",
      role: UserRole.ADMIN,
    };
  }

  if (normalizedEmail === "customer@example.com") {
    return {
      id: "customer-seeded-id",
      email: "customer@example.com",
      role: UserRole.CUSTOMER,
    };
  }

  return null;
}

/**
 * Gets the current active demo user from the session cookie.
 * Returns null if no active session cookie exists.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const demoEmail = cookieStore.get(DEMO_USER_COOKIE)?.value?.trim();

  if (!demoEmail) {
    return null;
  }

  return authenticateUser(demoEmail);
}

/**
 * Ensures a user is authenticated (Customer or Admin).
 * Throws AuthenticationError if not logged in.
 */
export async function requireAuthenticatedUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
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
