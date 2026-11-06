"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "@/app/login/actions";
import { SessionUser } from "@/lib/auth";

interface CustomerNavProps {
  currentUser: SessionUser | null;
}

export function CustomerNav({ currentUser }: CustomerNavProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Brand & Nav */}
          <div className="flex items-center space-x-6">
            <Link
              href="/orders"
              className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-extrabold text-sm shadow">
                M
              </span>
              <span>Mailbox Order Manager</span>
            </Link>

            <nav className="flex space-x-2">
              <Link
                href="/orders"
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  pathname === "/orders"
                    ? "text-indigo-700 bg-indigo-50"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                My Orders
              </Link>
              <Link
                href="/orders/new"
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  pathname === "/orders/new"
                    ? "text-indigo-700 bg-indigo-50"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                + New Order
              </Link>
            </nav>
          </div>

          {/* Right Section: User Info & Logout */}
          <div className="flex items-center space-x-3">
            {currentUser && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200">
                <span className="text-xs font-medium text-slate-700">
                  {currentUser.email}
                </span>
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  CUSTOMER
                </span>
              </div>
            )}

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition"
              title="Sign out and return to login"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
