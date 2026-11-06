"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  pageSize: number;
}

export function Pagination({
  currentPage,
  totalPages,
  totalOrders,
  pageSize,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/admin?${params.toString()}`);
  };

  const startIdx = totalOrders === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalOrders);

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
      <div className="hidden sm:block">
        <p className="text-xs text-slate-700">
          Showing <span className="font-semibold">{startIdx}</span> to{" "}
          <span className="font-semibold">{endIdx}</span> of{" "}
          <span className="font-semibold">{totalOrders}</span> orders
        </p>
      </div>

      <div className="flex flex-1 justify-between sm:justify-end gap-2">
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="inline-flex items-center px-3 py-1 text-xs text-slate-700 font-medium">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

