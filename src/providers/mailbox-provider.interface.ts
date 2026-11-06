import { MailboxProviderType } from "@/domain";

export interface ProvisionMailboxResult {
  emailAddress: string;
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface IMailboxProvider {
  readonly providerType: MailboxProviderType;
  provisionMailboxes(
    domain: string,
    count: number,
    orderId: string
  ): Promise<ProvisionMailboxResult[]>;
}

