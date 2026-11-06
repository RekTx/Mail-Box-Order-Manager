"use client";

import { useTransition, useState } from "react";
import { retryOrderAction } from "@/app/admin/actions";
import { OrderStatus } from "@/domain";

interface RetryButtonProps {
  orderId: string;
  status: OrderStatus | string;
}

export function RetryButton({ orderId, status }: RetryButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFailed = status === OrderStatus.FAILED;

  const handleRetry = () => {
    if (!isFailed || isPending) return;

    setErrorMessage(null);
    startTransition(async () => {
      const result = await retryOrderAction(orderId);
      if (!result.success) {
        setErrorMessage(result.error ?? "Failed to retry");
      }
    });
  };

  if (!isFailed) {
    return (
      <button
        type="button"
        disabled
        title="Retry is only available for FAILED orders"
        className="inline-flex cursor-not-allowed items-center rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-400 opacity-60"
      >
        Retry
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleRetry}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <svg
              className="h-3.5 w-3.5 animate-spin text-white"
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
            Retrying...
          </>
        ) : (
          <>
            <svg
              className="h-3.5 w-3.5"
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
            Retry
          </>
        )}
      </button>

      {errorMessage && (
        <span className="text-[11px] text-rose-600 font-medium">
          {errorMessage}
        </span>
      )}
    </div>
  );
}

