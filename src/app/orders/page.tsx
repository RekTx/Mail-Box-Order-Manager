import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/auth";
import { OrderService } from "@/services/order.service";
import { CustomerNav } from "@/components/customer-nav";
import { StatusBadge } from "@/components/status-badge";
import { ProviderBadge } from "@/components/provider-badge";
import { OrderStatus } from "@/domain";

export default async function CustomerOrdersPage() {
  const currentUser = await requireAuthenticatedUser();

  // Strictly query customer-isolated orders from service layer
  const orders = await OrderService.getCustomerOrders(currentUser.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <CustomerNav currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Action Bar */}
        <div className="sm:flex sm:items-center sm:justify-between mb-8 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Orders
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track provisioning status and access mailboxes for your domains.
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              New Order
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 shadow-sm px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              No orders found
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              You haven&apos;t placed any mailbox provisioning orders yet. Start by
              submitting your first company domain.
            </p>
            <div className="mt-6">
              <Link
                href="/orders/new"
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Create First Order
              </Link>
            </div>
          </div>
        ) : (
          /* Orders Table */
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3">
                    Domain
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Provider
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center">
                    Mailboxes
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Created At
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orders.map((order) => {
                  const dateStr = new Date(order.createdAt).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  );

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-4 pl-6 pr-3 font-mono font-medium text-slate-900">
                        {order.domain}
                      </td>
                      <td className="px-3 py-4">
                        <ProviderBadge provider={order.provider} />
                      </td>
                      <td className="px-3 py-4 text-center text-slate-700 font-semibold">
                        {order.mailboxCount}
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge status={order.status as OrderStatus} />
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-500">
                        {dateStr}
                      </td>
                      <td className="py-4 pl-3 pr-6 text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-900"
                        >
                          View Details
                          <span aria-hidden="true">&rarr;</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

