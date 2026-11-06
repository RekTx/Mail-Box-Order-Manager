import { describe, it, expect } from "vitest";
import {
  OrderStatus,
  canTransition,
  assertTransition,
  InvalidStateTransitionError,
  ALLOWED_ORDER_TRANSITIONS,
} from "../../src/domain";

describe("Domain State Machine", () => {
  describe("Valid Transitions", () => {
    it("should allow PENDING -> PROVISIONING", () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.PROVISIONING)).toBe(true);
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.PROVISIONING)
      ).not.toThrow();
    });

    it("should allow PROVISIONING -> ACTIVE", () => {
      expect(canTransition(OrderStatus.PROVISIONING, OrderStatus.ACTIVE)).toBe(true);
      expect(() =>
        assertTransition(OrderStatus.PROVISIONING, OrderStatus.ACTIVE)
      ).not.toThrow();
    });

    it("should allow PROVISIONING -> FAILED", () => {
      expect(canTransition(OrderStatus.PROVISIONING, OrderStatus.FAILED)).toBe(true);
      expect(() =>
        assertTransition(OrderStatus.PROVISIONING, OrderStatus.FAILED)
      ).not.toThrow();
    });

    it("should allow FAILED -> PENDING (Retry flow)", () => {
      expect(canTransition(OrderStatus.FAILED, OrderStatus.PENDING)).toBe(true);
      expect(() =>
        assertTransition(OrderStatus.FAILED, OrderStatus.PENDING)
      ).not.toThrow();
    });
  });

  describe("Rejection of Invalid Transitions", () => {
    const invalidTransitions: [OrderStatus, OrderStatus][] = [
      [OrderStatus.PENDING, OrderStatus.ACTIVE],
      [OrderStatus.PENDING, OrderStatus.PENDING],
      [OrderStatus.PENDING, OrderStatus.FAILED],
      [OrderStatus.ACTIVE, OrderStatus.PROVISIONING],
      [OrderStatus.ACTIVE, OrderStatus.FAILED],
      [OrderStatus.ACTIVE, OrderStatus.PENDING],
      [OrderStatus.ACTIVE, OrderStatus.ACTIVE],
      [OrderStatus.FAILED, OrderStatus.ACTIVE],
      [OrderStatus.FAILED, OrderStatus.PROVISIONING],
      [OrderStatus.FAILED, OrderStatus.FAILED],
      [OrderStatus.PROVISIONING, OrderStatus.PENDING],
      [OrderStatus.PROVISIONING, OrderStatus.PROVISIONING],
    ];

    it.each(invalidTransitions)(
      "should return false for invalid transition %s -> %s",
      (from, to) => {
        expect(canTransition(from, to)).toBe(false);
      }
    );

    it.each(invalidTransitions)(
      "should throw InvalidStateTransitionError for invalid transition %s -> %s",
      (from, to) => {
        expect(() => assertTransition(from, to)).toThrowError(
          InvalidStateTransitionError
        );
      }
    );

    it("should set correct error properties on InvalidStateTransitionError", () => {
      try {
        assertTransition(OrderStatus.ACTIVE, OrderStatus.PENDING);
        expect.fail("Should have thrown InvalidStateTransitionError");
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidStateTransitionError);
        const error = err as InvalidStateTransitionError;
        expect(error.name).toBe("InvalidStateTransitionError");
        expect(error.fromStatus).toBe(OrderStatus.ACTIVE);
        expect(error.toStatus).toBe(OrderStatus.PENDING);
        expect(error.message).toContain("ACTIVE");
        expect(error.message).toContain("PENDING");
      }
    });
  });

  describe("Exhaustive State Matrix Check", () => {
    it("should only allow precisely the defined transitions in ALLOWED_ORDER_TRANSITIONS", () => {
      const allStatuses = Object.values(OrderStatus);

      for (const from of allStatuses) {
        for (const to of allStatuses) {
          const isAllowedInMap = ALLOWED_ORDER_TRANSITIONS[from].includes(to);
          expect(canTransition(from, to)).toBe(isAllowedInMap);
        }
      }
    });
  });
});

