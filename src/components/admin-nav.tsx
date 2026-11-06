"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { triggerWorkerCycleAction } from "@/app/admin/actions";
import { logoutAction } from "@/app/login/actions";
import { SessionUser } from "@/lib/auth";

interface AdminNavProps {
  currentUser: SessionUser | null;
}

export function AdminNav({ currentUser }: AdminNavProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [workerMessage, setWorkerMessage] = useState<string | null>(null);

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.push("/login");
      router.refresh();
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
          {/* Logo / Brand */}
          <div className="flex items-center space-x-4">
            <Link
              href="/admin"
              className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-extrabold text-sm shadow">
                M
              </span>
              <span>Mailbox Order Manager</span>
            </Link>
          </div>

          {/* Right Section: User Info & Actions */}
          <div className="flex items-center space-x-3">
            {/* Quick worker execution button */}
            <button
              type="button"
              onClick={handleRunWorker}
              disabled={isPending}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              title="Run background provisioning worker cycle"
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

            {/* User Email & Role Badge */}
            {currentUser && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200">
                <span className="text-xs font-medium text-slate-700">
                  {currentUser.email}
                </span>
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                  ADMIN
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
