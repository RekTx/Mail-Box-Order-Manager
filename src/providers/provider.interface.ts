export interface ProvisionResult {
  success: boolean;
  mailboxEmail: string;
  errorMessage?: string;
}

export interface MailboxProvider {
  readonly name: "google" | "microsoft";
  provisionMailbox(domain: string, mailboxIndex: number): Promise<ProvisionResult>;
}

export interface ProviderOptions {
  failureRate?: number; // 0.0 to 1.0 (e.g. 0.15 for 15% failure rate)
  latencyMs?: number;   // Simulated latency in milliseconds
}

