export const UserRole = {
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const MailboxProviderType = {
  GOOGLE: "google",
  MICROSOFT: "microsoft",
} as const;
export type MailboxProviderType =
  (typeof MailboxProviderType)[keyof typeof MailboxProviderType];

export const OrderStatus = {
  PENDING: "PENDING",
  PROVISIONING: "PROVISIONING",
  ACTIVE: "ACTIVE",
  FAILED: "FAILED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const MailboxStatus = {
  PENDING: "PENDING",
  PROVISIONING: "PROVISIONING",
  ACTIVE: "ACTIVE",
  FAILED: "FAILED",
} as const;
export type MailboxStatus = (typeof MailboxStatus)[keyof typeof MailboxStatus];
