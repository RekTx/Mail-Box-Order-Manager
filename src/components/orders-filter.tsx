"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { OrderStatus, MailboxProviderType } from "@/domain";

interface OrdersFilterProps {
  currentStatus: string;
  currentProvider: string;
}

export function OrdersFilter({
  currentStatus,
  currentProvider,
}: OrdersFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`/admin?${params.toString()}`);
  };

  const handleReset = () => {
    router.push("/admin");
  };

  const hasActiveFilters = currentStatus !== "ALL" || currentProvider !== "ALL";

  return (
    <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="status-filter"
          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          Status:
        </label>
        <select
          id="status-filter"
          value={currentStatus}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="rounded-md border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="ALL">All Statuses</option>
          <option value={OrderStatus.PENDING}>PENDING</option>
          <option value={OrderStatus.PROVISIONING}>PROVISIONING</option>
          <option value={OrderStatus.ACTIVE}>ACTIVE</option>
          <option value={OrderStatus.FAILED}>FAILED</option>
        </select>
      </div>

      {/* Provider Filter */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="provider-filter"
          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          Provider:
        </label>
        <select
          id="provider-filter"
          value={currentProvider}
          onChange={(e) => handleFilterChange("provider", e.target.value)}
          className="rounded-md border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="ALL">All Providers</option>
          <option value={MailboxProviderType.GOOGLE}>Google</option>
          <option value={MailboxProviderType.MICROSOFT}>Microsoft</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

