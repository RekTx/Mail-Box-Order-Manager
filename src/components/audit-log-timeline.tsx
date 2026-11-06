import { StatusBadge } from "./status-badge";

export interface AuditLogItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actionBy: string;
  reason?: string | null;
  createdAt: Date | string;
}

interface AuditLogTimelineProps {
  logs: AuditLogItem[];
}

export function AuditLogTimeline({ logs }: AuditLogTimelineProps) {
  if (!logs || logs.length === 0) {
    return (
      <p className="text-sm italic text-slate-500 py-3">
        No audit transitions recorded yet.
      </p>
    );
  }

  return (
    <div className="flow-root py-2">
      <ul role="list" className="-mb-8">
        {logs.map((log, logIdx) => {
          const isLast = logIdx === logs.length - 1;
          const dateStr = new Date(log.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "medium",
          });

          const isWorker = log.actionBy === "SYSTEM_WORKER";

          return (
            <li key={log.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ring-4 ring-white">
                    <span className="text-xs font-bold text-slate-600">
                      #{logIdx + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        {log.fromStatus ? (
                          <>
                            <StatusBadge status={log.fromStatus} size="sm" />
                            <span className="text-slate-400 font-bold">&rarr;</span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">INITIAL &rarr;</span>
                        )}
                        <StatusBadge status={log.toStatus} size="sm" />
                      </div>

                      <span className="text-xs text-slate-400">&bull;</span>

                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                          isWorker
                            ? "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {isWorker ? "SYSTEM_WORKER" : `Actor: ${log.actionBy}`}
                      </span>

                      <span className="ml-auto text-xs text-slate-500">
                        {dateStr}
                      </span>
                    </div>

                    {log.reason && (
                      <div className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-2 font-mono">
                        {log.reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

