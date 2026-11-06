import { z } from "zod";

export const DomainRegex =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-_]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export const CreateOrderFormSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(DomainRegex, "Please provide a valid domain name (e.g., example.com)"),
  provider: z.enum(["google", "microsoft"], {
    errorMap: () => ({ message: "Provider must be either 'google' or 'microsoft'" }),
  }),
  mailboxCount: z.coerce
    .number()
    .int("Mailbox count must be an integer")
    .min(1, "Mailbox count must be at least 1")
    .max(50, "Mailbox count cannot exceed 50"),
  idempotencyKey: z
    .string()
    .min(8, "Idempotency key must be at least 8 characters")
    .max(128, "Idempotency key is too long"),
});

export type CreateOrderFormInput = z.infer<typeof CreateOrderFormSchema>;

export const CreateOrderInputSchema = CreateOrderFormSchema.extend({
  customerId: z.string().min(1, "Customer ID is required"),
});

export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;
