import { MailboxProvider, ProviderOptions } from "./provider.interface";
import { GoogleProvider } from "./google.provider";
import { MicrosoftProvider } from "./microsoft.provider";

export * from "./provider.interface";
export * from "./google.provider";
export * from "./microsoft.provider";

export function getProvider(
  name: "google" | "microsoft",
  options?: ProviderOptions
): MailboxProvider {
  switch (name) {
    case "google":
      return new GoogleProvider(options);
    case "microsoft":
      return new MicrosoftProvider(options);
    default:
      throw new Error(`Unsupported provider: ${name}`);
  }
}
