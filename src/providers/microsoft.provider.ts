import {
  MailboxProvider,
  ProvisionResult,
  ProviderOptions,
} from "./provider.interface";

export class MicrosoftProvider implements MailboxProvider {
  readonly name = "microsoft" as const;
  private readonly failureRate: number;
  private readonly latencyMs: number;

  constructor(options?: ProviderOptions) {
    this.failureRate = options?.failureRate ?? 0.15; // 15% default failure rate
    this.latencyMs = options?.latencyMs ?? 50;       // 50ms default simulated latency
  }

  async provisionMailbox(
    domain: string,
    mailboxIndex: number
  ): Promise<ProvisionResult> {
    // Simulate API network latency
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    const mailboxEmail = `user${mailboxIndex}@${domain}`;

    // Simulate random failure
    if (Math.random() < this.failureRate) {
      return {
        success: false,
        mailboxEmail,
        errorMessage: "Microsoft Graph API: License allocation or directory quota error.",
      };
    }

    return {
      success: true,
      mailboxEmail,
    };
  }
}

