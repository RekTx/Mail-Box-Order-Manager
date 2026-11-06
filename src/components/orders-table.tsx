"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { ProviderBadge } from "./provider-badge";
import { RetryButton } from "./retry-button";
import { AuditLogTimeline } from "./audit-log-timeline";
import { OrderStatus } from "@/domain";

export interface OrderRowItem {
  id: string;
  customerId: string;
  customerEmail: string;
  domain: string;
  provider: "google" | "microsoft";
  mailboxCount: number;
  status: OrderStatus;
  createdAt: string | Date;
  mailboxesCount: number;
  auditLogs: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    actionBy: string;
    reason?: string | null;
    createdAt: string | Date;
  }[];
}

interface OrdersTableProps {
  orders: OrderRowItem[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
        <svg
          className="mx-auto h-10 w-10 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-slate-900">No orders found</h3>
        <p className="mt-1 text-sm text-slate-500">
          Try clearing or adjusting your status and provider filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 sm:pl-6">
                Order ID
              </th>
              <th scope="col" className="px-3 py-3.5">
                Customer
              </th>
              <th scope="col" className="px-3 py-3.5">
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
                Created
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const dateDisplay = new Date(order.createdAt).toLocaleDateString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );

              return (
                <tr
                  key={order.id}
                  className={`transition-colors hover:bg-slate-50/70 ${
                    isExpanded ? "bg-slate-50" : ""
                  }`}
                >
                  <td colSpan={8} className="p-0">
                    <div className="grid grid-cols-1 divide-y divide-slate-100">
                      <div className="flex items-center px-4 py-4 sm:px-6">
                        {/* Order ID */}
                        <div className="w-32 pr-3 flex items-center gap-1.5 font-mono text-xs text-slate-800">
                          <button
                            type="button"
                            onClick={() => toggleExpand(order.id)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Toggle Audit Log Inspector"
                          >
                            <svg
                              className={`h-4 w-4 transform transition-transform ${
                                isExpanded ? "rotate-90 text-indigo-600" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                          <span title={order.id}>
                            {order.id.slice(0, 8)}...
                          </span>
                        </div>

                        {/* Customer Email */}
                        <div className="flex-1 min-w-[140px] px-3 font-medium text-slate-900 truncate">
                          {order.customerEmail}
                        </div>

                        {/* Domain */}
                        <div className="flex-1 min-w-[140px] px-3 font-mono text-slate-700 truncate">
                          {order.domain}
                        </div>

                        {/* Provider */}
                        <div className="w-28 px-3">
                          <ProviderBadge provider={order.provider} />
                        </div>

                        {/* Mailbox Count */}
                        <div className="w-24 px-3 text-center text-slate-700 font-semibold">
                          {order.mailboxCount}
                        </div>

                        {/* Status */}
                        <div className="w-36 px-3">
                          <StatusBadge status={order.status} />
                        </div>

                        {/* Created At */}
                        <div className="w-32 px-3 text-xs text-slate-500">
                          {dateDisplay}
                        </div>

                        {/* Actions */}
                        <div className="w-48 pl-3 text-right flex items-center justify-end gap-2">
                          <RetryButton
                            orderId={order.id}
                            status={order.status}
                          />

                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                            title="View Full Order Details"
                          >
                            Details
                          </Link>
                        </div>
                      </div>

                      {/* Expandable Audit Log Inspector */}
                      {isExpanded && (
                        <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-200">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Audit Log Inspector &bull; Order {order.id}
                            </h4>
                            <span className="text-xs text-slate-500">
                              {order.auditLogs.length} total event(s)
                            </span>
                          </div>
                          <AuditLogTimeline logs={order.auditLogs} />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

