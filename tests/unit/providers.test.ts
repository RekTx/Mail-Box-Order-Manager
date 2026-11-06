import { describe, it, expect } from "vitest";
import {
  GoogleProvider,
  MicrosoftProvider,
  getProvider,
} from "../../src/providers";

describe("Mailbox Providers", () => {
  describe("GoogleProvider", () => {
    it("should provision mailbox successfully with 0% failure rate", async () => {
      const provider = new GoogleProvider({ failureRate: 0, latencyMs: 0 });
      expect(provider.name).toBe("google");

      const result = await provider.provisionMailbox("acme.com", 1);
      expect(result.success).toBe(true);
      expect(result.mailboxEmail).toBe("user1@acme.com");
      expect(result.errorMessage).toBeUndefined();
    });

    it("should simulate failure with 100% failure rate", async () => {
      const provider = new GoogleProvider({ failureRate: 1.0, latencyMs: 0 });
      const result = await provider.provisionMailbox("acme.com", 2);

      expect(result.success).toBe(false);
      expect(result.mailboxEmail).toBe("user2@acme.com");
      expect(result.errorMessage).toContain("Google Workspace API");
    });

    it("should respect latency simulation", async () => {
      const start = Date.now();
      const provider = new GoogleProvider({ failureRate: 0, latencyMs: 30 });
      await provider.provisionMailbox("acme.com", 1);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(25);
    });
  });

  describe("MicrosoftProvider", () => {
    it("should provision mailbox successfully with 0% failure rate", async () => {
      const provider = new MicrosoftProvider({ failureRate: 0, latencyMs: 0 });
      expect(provider.name).toBe("microsoft");

      const result = await provider.provisionMailbox("company.org", 3);
      expect(result.success).toBe(true);
      expect(result.mailboxEmail).toBe("user3@company.org");
      expect(result.errorMessage).toBeUndefined();
    });

    it("should simulate failure with 100% failure rate", async () => {
      const provider = new MicrosoftProvider({ failureRate: 1.0, latencyMs: 0 });
      const result = await provider.provisionMailbox("company.org", 4);

      expect(result.success).toBe(false);
      expect(result.mailboxEmail).toBe("user4@company.org");
      expect(result.errorMessage).toContain("Microsoft Graph API");
    });
  });

  describe("Provider Factory (getProvider)", () => {
    it("should return GoogleProvider for 'google'", () => {
      const provider = getProvider("google");
      expect(provider).toBeInstanceOf(GoogleProvider);
      expect(provider.name).toBe("google");
    });

    it("should return MicrosoftProvider for 'microsoft'", () => {
      const provider = getProvider("microsoft");
      expect(provider).toBeInstanceOf(MicrosoftProvider);
      expect(provider.name).toBe("microsoft");
    });

    it("should throw error for unsupported provider", () => {
      expect(() => getProvider("unsupported" as any)).toThrowError(
        /Unsupported provider/
      );
    });
  });
});

