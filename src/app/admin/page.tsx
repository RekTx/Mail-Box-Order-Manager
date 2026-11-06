import { getCurrentUser } from "@/lib/auth";
import { OrderService } from "@/services/order.service";
import { OrderStatus, MailboxProviderType, UserRole } from "@/domain";
import { AdminNav } from "@/components/admin-nav";
import { OrdersTable } from "@/components/orders-table";
import { OrdersFilter } from "@/components/orders-filter";
import { Pagination } from "@/components/pagination";

interface AdminPageProps {
  searchParams: {
    status?: string;
    provider?: string;
    page?: string;
  };
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminPageProps) {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // Enforce admin protection
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminNav currentUser={currentUser} />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <svg
                className="h-6 w-6 text-rose-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Access Denied: Admin Privileges Required
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You are currently authenticated as{" "}
              <span className="font-semibold text-slate-800">
                {currentUser?.email || "anonymous"}
              </span>{" "}
              with role{" "}
              <span className="font-semibold text-amber-700">
                {currentUser?.role || "CUSTOMER"}
              </span>
              . Non-admin users cannot access admin-restricted views or trigger retries.
            </p>
            <p className="mt-4 text-xs text-slate-500">
              Use the user switcher in the top navigation bar to switch back to{" "}
              <code className="rounded bg-rose-100/60 px-1 py-0.5 font-mono text-rose-800">
                admin@example.com
              </code>{" "}
              to continue.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Parse filters
  const statusParam = searchParams.status?.toUpperCase();
  const providerParam = searchParams.provider?.toLowerCase();
  const page = parseInt(searchParams.page || "1", 10) || 1;

  const validStatuses: string[] = Object.values(OrderStatus);
  const validProviders: string[] = Object.values(MailboxProviderType);

  const filterStatus =
    statusParam && validStatuses.includes(statusParam)
      ? (statusParam as OrderStatus)
      : "ALL";

  const filterProvider =
    providerParam && validProviders.includes(providerParam)
      ? (providerParam as MailboxProviderType)
      : "ALL";

  // Delegate strictly to service layer
  const { orders, total, totalPages, pageSize } =
    await OrderService.getAdminOrders({
      status: filterStatus,
      provider: filterProvider,
      page,
      pageSize: 10,
    });

  const formattedOrders = orders.map((o) => ({
    id: o.id,
    customerId: o.customerId,
    customerEmail: o.customer.email,
    domain: o.domain,
    provider: o.provider as "google" | "microsoft",
    mailboxCount: o.mailboxCount,
    status: o.status as OrderStatus,
    createdAt: o.createdAt,
    mailboxesCount: o.mailboxes.length,
    auditLogs: o.auditLogs.map((l) => ({
      id: l.id,
      fromStatus: l.fromStatus,
      toStatus: l.toStatus,
      actionBy: l.actionBy,
      reason: l.reason,
      createdAt: l.createdAt,
    })),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Mailbox Orders
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage cross-tenant mailbox orders, inspect status transitions, and retry failed operations.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-700">
              {total} Total Orders
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <OrdersFilter
            currentStatus={filterStatus}
            currentProvider={filterProvider}
          />
        </div>

        {/* Table & Pagination */}
        <div className="space-y-0">
          <OrdersTable orders={formattedOrders} />
          {total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalOrders={total}
              pageSize={pageSize}
            />
          )}
        </div>
      </main>
    </div>
  );
}

