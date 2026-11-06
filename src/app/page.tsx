import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav currentUser={currentUser} />

      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 mb-4">
          Enterprise Mailbox Provisioning
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Mailbox Order Manager
        </h1>
        <p className="mt-4 text-base text-slate-600 max-w-2xl mx-auto">
          Strictly layered Next.js architecture with PostgreSQL, pure state machine lifecycle transitions, concurrency-safe worker claiming, and full audit logging.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/admin"
            className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Open Admin Dashboard &rarr;
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-sm text-slate-900">Admin Control</h3>
            <p className="mt-1 text-xs text-slate-500">
              Paginated cross-tenant orders list with status and provider filters, audit timeline, and retry trigger.
            </p>
          </div>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-sm text-slate-900">Pure State Machine</h3>
            <p className="mt-1 text-xs text-slate-500">
              Deterministic transitions (`PENDING &rarr; PROVISIONING &rarr; ACTIVE / FAILED`), preventing illegal status mutations.
            </p>
          </div>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-sm text-slate-900">Concurrency-Safe Worker</h3>
            <p className="mt-1 text-xs text-slate-500">
              PostgreSQL row-level locking with `FOR UPDATE SKIP LOCKED` guarantees zero duplicate processing.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
