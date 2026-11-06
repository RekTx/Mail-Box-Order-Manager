export * from "./mailbox.worker";

export const WORKER_CONFIG = {
  intervalMs: Number(process.env.WORKER_INTERVAL_MS ?? 5000),
  batchSize: Number(process.env.WORKER_BATCH_SIZE ?? 10),
};
