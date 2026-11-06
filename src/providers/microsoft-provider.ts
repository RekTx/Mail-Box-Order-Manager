import { MailboxProviderType } from "@/domain";
import {
  IMailboxProvider,
  ProvisionMailboxResult,
} from "./mailbox-provider.interface";

export class MicrosoftMailboxProvider implements IMailboxProvider {
  readonly providerType = MailboxProviderType.MICROSOFT;

  async provisionMailboxes(
    domain: string,
    count: number,
    orderId: string
  ): Promise<ProvisionMailboxResult[]> {
    // Contract implementation placeholder
    return Array.from({ length: count }, (_, index) => ({
      emailAddress: `user${index + 1}@${domain}`,
      success: true,
      externalId: `ms_${orderId}_${index + 1}`,
    }));
  }
}

