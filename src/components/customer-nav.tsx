"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { switchUserAction, triggerWorkerCycleAction } from "@/app/admin/actions";
import { logoutAction } from "@/app/login/actions";
import { SessionUser } from "@/lib/auth";

interface CustomerNavProps {
  currentUser: SessionUser | null;
}

export function CustomerNav({ currentUser }: CustomerNavProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [workerMessage, setWorkerMessage] = useState<string | null>(null);
  const pathname = usePathname();

  const isAdmin = currentUser?.role === "ADMIN";

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.push("/login");
      router.refresh();
    });
  };

  const handleSwitchRole = (email: string) => {
    startTransition(async () => {
      await switchUserAction(email);
    });
  };

  const handleRunWorker = () => {
    startTransition(async () => {
      setWorkerMessage(null);
      const res = await triggerWorkerCycleAction();
      if (res.success) {
        const count = (res.data as any)?.claimedCount ?? 0;
        setWorkerMessage(
          count > 0
            ? `Worker processed ${count} order(s)`
            : "Worker cycle completed: No pending orders."
        );
        setTimeout(() => setWorkerMessage(null), 4000);
      } else {
        setWorkerMessage(res.error || "Worker failed to run");
      }
    });
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
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

            <nav className="hidden md:flex space-x-2">
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
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                >
                  Admin Portal &rarr;
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quick worker execution button */}
            <button
              type="button"
              onClick={handleRunWorker}
              disabled={isPending}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              title="Trigger background worker cycle to provision pending orders"
            >
              <svg
                className={`h-3.5 w-3.5 text-slate-500 ${isPending ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Run Worker
            </button>

            {/* Demo User Switcher */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-1.5 border border-slate-200">
              <div className="text-right text-xs">
                <div className="font-semibold text-slate-800">
                  {currentUser?.email || "Guest"}
                </div>
                <div className="text-[10px] text-slate-500">
                  Role:{" "}
                  <span
                    className={`font-bold ${
                      isAdmin ? "text-indigo-600" : "text-amber-600"
                    }`}
                  >
                    {currentUser?.role || "CUSTOMER"}
                  </span>
                </div>
              </div>

              <div className="flex gap-1 pl-1 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSwitchRole("customer@example.com")}
                  disabled={isPending || currentUser?.email === "customer@example.com"}
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    currentUser?.email === "customer@example.com"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                  title="Switch to seeded Customer"
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchRole("admin@example.com")}
                  disabled={isPending || currentUser?.email === "admin@example.com"}
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    currentUser?.email === "admin@example.com"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                  title="Switch to seeded Admin"
                >
                  Admin
                </button>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              title="Sign out of current account"
            >
              Logout
            </button>
          </div>
        </div>

        {workerMessage && (
          <div className="pb-2">
            <div className="rounded-md bg-indigo-50 border border-indigo-200 p-2 text-xs text-indigo-700 font-medium">
              {workerMessage}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

