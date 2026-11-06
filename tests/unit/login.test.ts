import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticateUser, DEMO_USER_COOKIE } from "../../src/lib/auth";
import { loginAction, logoutAction } from "../../src/app/login/actions";
import { prisma } from "../../src/lib/prisma";
import { UserRole } from "../../src/domain";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { cookies } from "next/headers";

describe("Login Flow & Authentication", () => {
  const mockCookieSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockReturnValue({
      set: mockCookieSet,
      get: vi.fn(),
      delete: vi.fn(),
    } as any);
  });

  describe("authenticateUser", () => {
    it("should authenticate seeded admin user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "admin_id_1",
        email: "admin@example.com",
        role: UserRole.ADMIN,
      } as any);

      const user = await authenticateUser("admin@example.com");
      expect(user).not.toBeNull();
      expect(user?.email).toBe("admin@example.com");
      expect(user?.role).toBe(UserRole.ADMIN);
    });

    it("should authenticate seeded customer user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "cust_id_1",
        email: "customer@example.com",
        role: UserRole.CUSTOMER,
      } as any);

      const user = await authenticateUser("customer@example.com");
      expect(user).not.toBeNull();
      expect(user?.email).toBe("customer@example.com");
      expect(user?.role).toBe(UserRole.CUSTOMER);
    });

    it("should return null for unknown user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const user = await authenticateUser("unknown@random.org");
      expect(user).toBeNull();
    });
  });

  describe("loginAction Server Action", () => {
    it("should reject submission without email", async () => {
      const result = await loginAction({ email: "" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Email address is required");
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it("should reject unknown email with error message", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await loginAction({ email: "invalid@example.com" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("User not found");
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it("should sign in admin, set session cookie, and return redirectTo '/admin'", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "admin_id",
        email: "admin@example.com",
        role: UserRole.ADMIN,
      } as any);

      const result = await loginAction({
        email: "admin@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe("/admin");
      expect(mockCookieSet).toHaveBeenCalledWith(
        DEMO_USER_COOKIE,
        "admin@example.com",
        expect.objectContaining({ path: "/" })
      );
    });

    it("should sign in customer, set session cookie, and return redirectTo '/orders'", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "cust_id",
        email: "customer@example.com",
        role: UserRole.CUSTOMER,
      } as any);

      const result = await loginAction({
        email: "customer@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe("/orders");
      expect(mockCookieSet).toHaveBeenCalledWith(
        DEMO_USER_COOKIE,
        "customer@example.com",
        expect.objectContaining({ path: "/" })
      );
    });
  });

  describe("logoutAction Server Action", () => {
    it("should clear session cookie and redirect to '/login'", async () => {
      const result = await logoutAction();
      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe("/login");
      expect(mockCookieSet).toHaveBeenCalledWith(
        DEMO_USER_COOKIE,
        "",
        expect.objectContaining({ maxAge: 0 })
      );
    });
  });
});

