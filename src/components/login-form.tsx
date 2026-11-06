"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/login/actions";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Inputs MUST start completely empty
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFillCustomer = () => {
    setEmail("customer@example.com");
    setPassword("password123");
    setErrorMessage(null);
  };

  const handleFillAdmin = () => {
    setEmail("admin@example.com");
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
        setErrorMessage(result.error ?? "Invalid email or password.");
      } else if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white px-8 py-10 shadow-sm rounded-xl border border-slate-200">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-lg shadow-sm">
            M
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Sign In
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to access your account
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg bg-rose-50 p-3.5 border border-rose-200">
            <p className="text-xs font-semibold text-rose-800">
              {errorMessage}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-slate-700"
            >
              Email Address
            </label>
            <div className="mt-1">
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
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-slate-700"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                placeholder="••••••••"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm"
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

        {/* Quick-Fill Helpers Section */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleFillCustomer}
              disabled={isPending}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition text-center"
            >
              Fill Customer Account
            </button>

            <button
              type="button"
              onClick={handleFillAdmin}
              disabled={isPending}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition text-center"
            >
              Fill Admin Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
