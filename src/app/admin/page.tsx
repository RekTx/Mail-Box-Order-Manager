import { redirect } from "next/navigation";
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

  if (!currentUser) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;

  // Enforce admin protection: non-admins are redirected immediately to customer orders
  if (!isAdmin) {
    redirect("/orders");
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

