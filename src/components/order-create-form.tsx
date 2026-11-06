"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createOrderAction } from "@/app/orders/actions";

export function OrderCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [domain, setDomain] = useState("");
  const [provider, setProvider] = useState<"google" | "microsoft">("google");
  const [mailboxCount, setMailboxCount] = useState<number>(5);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Generate a cryptographically secure idempotency key on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const generated =
        typeof crypto?.randomUUID === "function"
          ? crypto.randomUUID()
          : `idem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      setIdempotencyKey(generated);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setFieldErrors({});
    setGeneralError(null);

    startTransition(async () => {
      const result = await createOrderAction({
        domain,
        provider,
        mailboxCount: Number(mailboxCount),
        idempotencyKey,
      });

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        if (result.error) {
          setGeneralError(result.error);
        }
      } else if (result.orderId) {
        router.push(`/orders/${result.orderId}`);
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl md:col-span-2 p-6 sm:p-8"
    >
      {generalError && (
        <div className="mb-6 rounded-md bg-rose-50 p-4 border border-rose-200">
          <div className="flex">
            <svg
              className="h-5 w-5 text-rose-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-rose-800">
                {generalError}
              </h3>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Domain Input */}
        <div>
          <label
            htmlFor="domain"
            className="block text-sm font-medium leading-6 text-slate-900"
          >
            Domain Name <span className="text-rose-500">*</span>
          </label>
          <div className="mt-2">
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
              <span className="flex select-none items-center pl-3 text-slate-500 text-sm">
                https://
              </span>
              <input
                id="domain"
                name="domain"
                type="text"
                placeholder="acme-corp.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isPending}
                required
                className="block flex-1 border-0 bg-transparent py-2 pl-1 pr-3 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-sm sm:leading-6 font-mono"
              />
            </div>
          </div>
          {fieldErrors.domain ? (
            <p className="mt-2 text-xs text-rose-600 font-medium">
              {fieldErrors.domain[0]}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Must be a valid domain format (e.g., example.com, mycompany.org).
            </p>
          )}
        </div>

        {/* Provider Selection */}
        <fieldset>
          <legend className="text-sm font-medium leading-6 text-slate-900">
            Mailbox Provider <span className="text-rose-500">*</span>
          </legend>
          <p className="text-xs text-slate-500 mb-3">
            Select the cloud platform to provision your mailboxes on.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            {/* Google Radio Card */}
            <label
              className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition ${
                provider === "google"
                  ? "border-red-600 ring-2 ring-red-600 bg-red-50/20"
                  : "border-slate-300 bg-white hover:border-slate-400"
              }`}
            >
              <input
                type="radio"
                name="provider"
                value="google"
                checked={provider === "google"}
                onChange={() => setProvider("google")}
                disabled={isPending}
                className="sr-only"
              />
              <span className="flex flex-1 items-center justify-between">
                <span className="flex flex-col">
                  <span className="block text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Google Workspace
                  </span>
                  <span className="mt-1 flex items-center text-xs text-slate-500">
                    Gmail &amp; Google Drive
                  </span>
                </span>
              </span>
            </label>

            {/* Microsoft Radio Card */}
            <label
              className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition ${
                provider === "microsoft"
                  ? "border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/20"
                  : "border-slate-300 bg-white hover:border-slate-400"
              }`}
            >
              <input
                type="radio"
                name="provider"
                value="microsoft"
                checked={provider === "microsoft"}
                onChange={() => setProvider("microsoft")}
                disabled={isPending}
                className="sr-only"
              />
              <span className="flex flex-1 items-center justify-between">
                <span className="flex flex-col">
                  <span className="block text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    Microsoft 365
                  </span>
                  <span className="mt-1 flex items-center text-xs text-slate-500">
                    Exchange &amp; Outlook
                  </span>
                </span>
              </span>
            </label>
          </div>
          {fieldErrors.provider && (
            <p className="mt-2 text-xs text-rose-600 font-medium">
              {fieldErrors.provider[0]}
            </p>
          )}
        </fieldset>

        {/* Mailbox Count */}
        <div>
          <label
            htmlFor="mailboxCount"
            className="block text-sm font-medium leading-6 text-slate-900"
          >
            Number of Mailboxes (1 - 50) <span className="text-rose-500">*</span>
          </label>
          <div className="mt-2 sm:max-w-xs">
            <input
              id="mailboxCount"
              name="mailboxCount"
              type="number"
              min={1}
              max={50}
              value={mailboxCount}
              onChange={(e) => setMailboxCount(parseInt(e.target.value || "1", 10))}
              disabled={isPending}
              required
              className="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
            />
          </div>
          {fieldErrors.mailboxCount ? (
            <p className="mt-2 text-xs text-rose-600 font-medium">
              {fieldErrors.mailboxCount[0]}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Each mailbox slot will be automatically prepared and assigned to the worker.
            </p>
          )}
        </div>

        {/* Idempotency Key (Read-Only Demo Field) */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="idempotencyKey"
              className="block text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              Client Idempotency Key
            </label>
            <span className="text-[11px] text-slate-400">
              Auto-generated UUID prevents duplicate submissions
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id="idempotencyKey"
              name="idempotencyKey"
              type="text"
              readOnly
              value={idempotencyKey}
              className="block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-600 shadow-sm"
            />
          </div>
          {fieldErrors.idempotencyKey && (
            <p className="mt-1 text-xs text-rose-600 font-medium">
              {fieldErrors.idempotencyKey[0]}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-slate-900/10 pt-5">
        <Link
          href="/orders"
          className="text-sm font-semibold leading-6 text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center gap-2"
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
              Creating Order...
            </>
          ) : (
            "Submit Order"
          )}
        </button>
      </div>
    </form>
  );
}

