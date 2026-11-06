import { OrderStatus } from "@/domain";

interface StatusBadgeProps {
  status: OrderStatus | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-semibold";

  switch (status) {
    case OrderStatus.PENDING:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 ${sizeClasses}`}
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
          PENDING
        </span>
      );
    case OrderStatus.PROVISIONING:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 ${sizeClasses}`}
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          PROVISIONING
        </span>
      );
    case OrderStatus.ACTIVE:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 ${sizeClasses}`}
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          ACTIVE
        </span>
      );
    case OrderStatus.FAILED:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 ${sizeClasses}`}
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
          FAILED
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/10 ${sizeClasses}`}
        >
          {status}
        </span>
      );
  }
}

