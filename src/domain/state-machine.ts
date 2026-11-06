import { OrderStatus } from "./order.types";

export class InvalidStateTransitionError extends Error {
  public readonly fromStatus: OrderStatus;
  public readonly toStatus: OrderStatus;

  constructor(fromStatus: OrderStatus, toStatus: OrderStatus) {
    super(
      `Invalid state transition: Cannot transition order status from '${fromStatus}' to '${toStatus}'.`
    );
    this.name = "InvalidStateTransitionError";
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    Object.setPrototypeOf(this, InvalidStateTransitionError.prototype);
  }
}

/**
 * Pure transition map representing the strict lifecycle of an Order:
 * - PENDING -> PROVISIONING
 * - PROVISIONING -> ACTIVE
 * - PROVISIONING -> FAILED
 * - FAILED -> PENDING (Retry flow)
 */
export const ALLOWED_ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.PENDING]: [OrderStatus.PROVISIONING],
  [OrderStatus.PROVISIONING]: [OrderStatus.ACTIVE, OrderStatus.FAILED],
  [OrderStatus.ACTIVE]: [],
  [OrderStatus.FAILED]: [OrderStatus.PENDING],
};

/**
 * Pure check to verify if a status transition is permitted.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ALLOWED_ORDER_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Pure assertion helper that throws `InvalidStateTransitionError` if transition is invalid.
 */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

