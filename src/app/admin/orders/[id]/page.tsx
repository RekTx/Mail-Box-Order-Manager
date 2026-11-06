import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, requireAdminUser } from "@/lib/auth";
import { OrderService } from "@/services/order.service";
import { AdminNav } from "@/components/admin-nav";
import { StatusBadge } from "@/components/status-badge";
import { ProviderBadge } from "@/components/provider-badge";
import { RetryButton } from "@/components/retry-button";
import { AuditLogTimeline } from "@/components/audit-log-timeline";
import { OrderStatus } from "@/domain";

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const currentUser = await getCurrentUser();

  // Enforce admin protection
  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminNav currentUser={currentUser} />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Access Denied: Admin Privileges Required
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You must be logged in as an Admin to view order details.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const order = await OrderService.getOrderById(params.id);

  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Link & Header */}
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 mb-3"
          >
            &larr; Back to all orders
          </Link>

          <div className="sm:flex sm:items-center sm:justify-between bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-mono text-slate-900">
                  Order {order.id}
                </h1>
                <StatusBadge status={order.status} />
                <ProviderBadge provider={order.provider} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Created on {new Date(order.createdAt).toLocaleString()} &bull;
                Idempotency Key:{" "}
                <span className="font-mono text-slate-700">
                  {order.idempotencyKey}
                </span>
              </p>
            </div>

            <div className="mt-4 sm:mt-0">
              <RetryButton orderId={order.id} status={order.status} />
            </div>
          </div>
        </div>

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold uppercase text-slate-400">
              Customer
            </span>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {order.customer?.email || order.customerId}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ID: {order.customerId}
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold uppercase text-slate-400">
              Domain Name
            </span>
            <p className="mt-1 text-sm font-mono font-semibold text-slate-900">
              {order.domain}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Provider: <span className="capitalize">{order.provider}</span>
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold uppercase text-slate-400">
              Provisioning Slots
            </span>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {order.mailboxCount} Mailbox(es)
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {order.mailboxes.filter((m) => m.status === "ACTIVE").length} active,{" "}
              {order.mailboxes.filter((m) => m.status === "FAILED").length} failed
            </p>
          </div>
        </div>

        {/* Two Column Layout: Mailboxes Table + Audit Log Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mailboxes Slots */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Mailboxes ({order.mailboxes.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {order.mailboxes.map((mailbox, index) => (
                <div
                  key={mailbox.id}
                  className="flex items-center justify-between px-6 py-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400">#{index + 1}</span>
                    <span className="font-mono text-slate-800">
                      {mailbox.emailAddress}
                    </span>
                  </div>
                  <StatusBadge status={mailbox.status} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log Inspector */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Audit Log Inspector
              </h3>
              <span className="text-xs text-slate-500">
                {order.auditLogs.length} Event(s)
              </span>
            </div>
            <AuditLogTimeline logs={order.auditLogs} />
          </div>
        </div>
      </main>
    </div>
  );
}

