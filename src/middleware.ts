import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEMO_USER_COOKIE = "demo_user_email";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userCookie = request.cookies.get(DEMO_USER_COOKIE)?.value?.trim();

  const isAuth = !!userCookie;
  const isAdmin = userCookie?.toLowerCase() === "admin@example.com";

  // If authenticated user visits /login, redirect to their respective dashboard
  if (pathname === "/login") {
    if (isAuth) {
      const destination = isAdmin ? "/admin" : "/orders";
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  // Protected paths check
  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/dashboard");

  if (isProtectedPath && !isAuth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based boundary enforcement:
  // If a customer tries to visit /admin, redirect to /orders
  if (pathname.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  // If an admin visits /orders, redirect to /admin
  if (pathname.startsWith("/orders") && isAdmin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/admin/:path*",
    "/orders/:path*",
    "/dashboard/:path*",
  ],
};
