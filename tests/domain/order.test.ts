import { describe, it, expect } from "vitest";
import {
  CreateOrderInputSchema,
  OrderStatus,
  canTransitionOrder,
  ORDER_STATE_TRANSITIONS,
} from "../../src/domain";

describe("Domain: Order Validation", () => {
  it("should validate valid order input", () => {
    const validData = {
      customerId: "cust_123",
      domain: "example.com",
      provider: "google",
      mailboxCount: 5,
      idempotencyKey: "unique-key-12345",
    };

    const result = CreateOrderInputSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid domain", () => {
    const invalidData = {
      customerId: "cust_123",
      domain: "invalid_domain",
      provider: "google",
      mailboxCount: 5,
      idempotencyKey: "unique-key-12345",
    };

    const result = CreateOrderInputSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject mailboxCount outside 1-50 range", () => {
    const zeroCount = {
      customerId: "cust_123",
      domain: "example.com",
      provider: "microsoft",
      mailboxCount: 0,
      idempotencyKey: "unique-key-12345",
    };

    const overLimitCount = {
      customerId: "cust_123",
      domain: "example.com",
      provider: "microsoft",
      mailboxCount: 51,
      idempotencyKey: "unique-key-12345",
    };

    expect(CreateOrderInputSchema.safeParse(zeroCount).success).toBe(false);
    expect(CreateOrderInputSchema.safeParse(overLimitCount).success).toBe(false);
  });

  it("should reject unsupported provider", () => {
    const invalidProvider = {
      customerId: "cust_123",
      domain: "example.com",
      provider: "yahoo",
      mailboxCount: 5,
      idempotencyKey: "unique-key-12345",
    };

    const result = CreateOrderInputSchema.safeParse(invalidProvider);
    expect(result.success).toBe(false);
  });
});

describe("Domain: Order State Machine", () => {
  it("should allow valid transitions", () => {
    expect(canTransitionOrder(OrderStatus.PENDING, OrderStatus.PROVISIONING)).toBe(true);
    expect(canTransitionOrder(OrderStatus.PENDING, OrderStatus.FAILED)).toBe(true);
    expect(canTransitionOrder(OrderStatus.PROVISIONING, OrderStatus.ACTIVE)).toBe(true);
    expect(canTransitionOrder(OrderStatus.PROVISIONING, OrderStatus.FAILED)).toBe(true);
    expect(canTransitionOrder(OrderStatus.FAILED, OrderStatus.PENDING)).toBe(true);
  });

  it("should reject invalid transitions", () => {
    expect(canTransitionOrder(OrderStatus.PENDING, OrderStatus.ACTIVE)).toBe(false);
    expect(canTransitionOrder(OrderStatus.ACTIVE, OrderStatus.PENDING)).toBe(false);
    expect(canTransitionOrder(OrderStatus.ACTIVE, OrderStatus.FAILED)).toBe(false);
  });
});

