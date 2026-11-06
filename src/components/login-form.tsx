"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/login/actions";

interface LoginFormProps {
  initialEmail?: string;
}

export function LoginForm({ initialEmail = "" }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("password123");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFillAdmin = () => {
    setEmail("admin@example.com");
    setPassword("password123");
    setErrorMessage(null);
  };

  const handleFillCustomer = () => {
    setEmail("customer@example.com");
    setPassword("password123");
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setErrorMessage(null);

    startTransition(async () => {
      const result = await loginAction({ email, password });
      if (!result.success) {
        setErrorMessage(result.error ?? "Login failed. Please check credentials.");
      } else if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="bg-white px-6 py-8 shadow-md rounded-2xl border border-slate-200 sm:px-10">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-extrabold text-xl shadow">
            M
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Sign In to Mailbox Manager
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Access your customer mailbox orders or the admin management portal.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg bg-rose-50 p-3.5 border border-rose-200">
            <div className="flex">
              <svg
                className="h-5 w-5 text-rose-500 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-2.5">
                <p className="text-xs font-semibold text-rose-800">
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Email Address
            </label>
            <div className="mt-1.5">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                placeholder="name@example.com"
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Password
              </label>
              <span className="text-[11px] text-slate-400">
                (Demo: any password)
              </span>
            </div>
            <div className="mt-1.5">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm font-medium"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full justify-center items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isPending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>

        {/* Demo Quick-Fill Section */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Demo Quick-Fill
            </span>
            <span className="text-[11px] text-slate-400">
              One-click preset credentials
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleFillAdmin}
              disabled={isPending}
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 text-left transition group"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700">
                  Fill Admin
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  admin@example.com
                </div>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                ADMIN
              </span>
            </button>

            <button
              type="button"
              onClick={handleFillCustomer}
              disabled={isPending}
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-200 text-left transition group"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800 group-hover:text-amber-700">
                  Fill Customer
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  customer@example.com
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                CUSTOMER
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

