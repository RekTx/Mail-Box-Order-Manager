/**
 * Background worker boundary for mailbox provisioning jobs.
 * Implementation will be added in subsequent steps.
 */
export interface IWorkerJob {
  processPendingOrders(): Promise<void>;
}

export const WORKER_CONFIG = {
  intervalMs: Number(process.env.WORKER_INTERVAL_MS ?? 5000),
  batchSize: Number(process.env.WORKER_BATCH_SIZE ?? 10),
};

