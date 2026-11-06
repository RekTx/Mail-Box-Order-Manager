import { MailboxProviderType } from "@/domain";
import { IMailboxProvider } from "./mailbox-provider.interface";
import { GoogleMailboxProvider } from "./google-provider";
import { MicrosoftMailboxProvider } from "./microsoft-provider";

export * from "./mailbox-provider.interface";
export * from "./google-provider";
export * from "./microsoft-provider";

export function getMailboxProvider(provider: MailboxProviderType): IMailboxProvider {
  switch (provider) {
    case MailboxProviderType.GOOGLE:
      return new GoogleMailboxProvider();
    case MailboxProviderType.MICROSOFT:
      return new MicrosoftMailboxProvider();
    default:
      throw new Error(`Unsupported mailbox provider: ${provider}`);
  }
}

