import { notFound } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth";
import { OrderService } from "@/services/order.service";
import { CustomerNav } from "@/components/customer-nav";
import { CustomerOrderDetailLive } from "@/components/customer-order-detail-live";
import { OrderStatus, MailboxStatus } from "@/domain";

interface CustomerOrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CustomerOrderDetailPage({
  params,
}: CustomerOrderDetailPageProps) {
  const currentUser = await requireAuthenticatedUser();

  let order;
  try {
    order = await OrderService.getOrderForCustomer(
      params.id,
      currentUser.id,
      currentUser.role === "ADMIN"
    );
  } catch (err: any) {
    return (
      <div className="min-h-screen bg-slate-50">
        <CustomerNav currentUser={currentUser} />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Access Restricted
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You do not have permission to view this order. Orders are strictly isolated to their owning customer account.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
    notFound();
  }

  const formattedOrder = {
    id: order.id,
    domain: order.domain,
    provider: order.provider as "google" | "microsoft",
    mailboxCount: order.mailboxCount,
    status: order.status as OrderStatus,
    idempotencyKey: order.idempotencyKey,
    createdAt: order.createdAt,
    mailboxes: order.mailboxes.map((m) => ({
      id: m.id,
      emailAddress: m.emailAddress,
      status: m.status as MailboxStatus,
    })),
    auditLogs: order.auditLogs.map((l) => ({
      id: l.id,
      fromStatus: l.fromStatus,
      toStatus: l.toStatus,
      actionBy: l.actionBy,
      reason: l.reason,
      createdAt: l.createdAt,
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <CustomerNav currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CustomerOrderDetailLive initialOrder={formattedOrder} />
      </main>
    </div>
  );
}

