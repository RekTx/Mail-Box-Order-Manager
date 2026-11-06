"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLiveOrderStatusAction } from "@/app/orders/actions";
import { StatusBadge } from "@/components/status-badge";
import { ProviderBadge } from "@/components/provider-badge";
import { AuditLogTimeline } from "@/components/audit-log-timeline";
import { OrderStatus, MailboxStatus } from "@/domain";

export interface CustomerOrderDetailData {
  id: string;
  domain: string;
  provider: "google" | "microsoft";
  mailboxCount: number;
  status: OrderStatus;
  idempotencyKey: string;
  createdAt: string | Date;
  mailboxes: {
    id: string;
    emailAddress: string;
    status: MailboxStatus;
  }[];
  auditLogs: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    actionBy: string;
    reason?: string | null;
    createdAt: string | Date;
  }[];
}

interface CustomerOrderDetailLiveProps {
  initialOrder: CustomerOrderDetailData;
}

export function CustomerOrderDetailLive({
  initialOrder,
}: CustomerOrderDetailLiveProps) {
  const [order, setOrder] = useState<CustomerOrderDetailData>(initialOrder);
  const [isPolling, setIsPolling] = useState(
    initialOrder.status === OrderStatus.PENDING ||
      initialOrder.status === OrderStatus.PROVISIONING
  );

  useEffect(() => {
    // If order has reached a terminal state (ACTIVE or FAILED), no need to poll
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PROVISIONING
    ) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    const intervalId = setInterval(async () => {
      const res = await getLiveOrderStatusAction(order.id);
      if (res.success && res.order) {
        setOrder((prev) => ({
          ...prev,
          status: res.order.status as OrderStatus,
          mailboxes: res.order.mailboxes as any,
          auditLogs: res.order.auditLogs as any,
        }));

        if (
          res.order.status === OrderStatus.ACTIVE ||
          res.order.status === OrderStatus.FAILED
        ) {
          setIsPolling(false);
          clearInterval(intervalId);
        }
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [order.id, order.status]);

  const activeMailboxesCount = order.mailboxes.filter(
    (m) => m.status === MailboxStatus.ACTIVE
  ).length;

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 mb-3"
        >
          &larr; Back to My Orders
        </Link>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono text-slate-900">
                  {order.domain}
                </h1>
                <StatusBadge status={order.status} />
                <ProviderBadge provider={order.provider} />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Order ID: <span className="font-mono text-slate-700">{order.id}</span>{" "}
                &bull; Created on {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>

            {isPolling && (
              <div className="mt-4 sm:mt-0 flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Provisioning in progress (live updates every 2.5s)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">
            Target Domain
          </span>
          <p className="mt-1 text-base font-mono font-semibold text-slate-900">
            {order.domain}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Provider: <span className="capitalize">{order.provider}</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">
            Provisioned Mailboxes
          </span>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {activeMailboxesCount} / {order.mailboxCount} Active
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${
                order.status === OrderStatus.ACTIVE
                  ? "bg-emerald-500"
                  : order.status === OrderStatus.FAILED
                  ? "bg-rose-500"
                  : "bg-blue-500"
              }`}
              style={{
                width: `${Math.round(
                  (activeMailboxesCount / (order.mailboxCount || 1)) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">
            Current Lifecycle State
          </span>
          <div className="mt-1">
            <StatusBadge status={order.status} size="sm" />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Key: {order.idempotencyKey.slice(0, 16)}...
          </p>
        </div>
      </div>

      {/* Two Column Layout: Mailboxes Slots Breakdown + Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mailboxes Breakdown */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Mailbox Provisioning Slots ({order.mailboxes.length})
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              @{order.domain}
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {order.mailboxes.map((mailbox, index) => (
              <div
                key={mailbox.id}
                className="flex items-center justify-between px-6 py-3.5 text-xs hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-slate-400 w-6">
                    #{index + 1}
                  </span>
                  <span className="font-mono text-slate-800 font-medium">
                    {mailbox.emailAddress}
                  </span>
                </div>
                <StatusBadge status={mailbox.status} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Audit Trail Visual Timeline */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Audit Trail &amp; Status Transitions
            </h3>
            <span className="text-xs text-slate-500">
              {order.auditLogs.length} Event(s)
            </span>
          </div>
          <AuditLogTimeline logs={order.auditLogs} />
        </div>
      </div>
    </div>
  );
}

