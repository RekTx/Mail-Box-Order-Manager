# System Architecture & Design Patterns

The **Mailbox Order Manager** is structured around a strict layered architecture with clear domain boundaries, transactional consistency, and concurrency guarantees. This document details the four core architectural patterns, file locations, technical justifications, and explicitly rejected alternatives.

---

## 1. Strategy Pattern

- **File Locations**:
  - Interface Contract: [`src/providers/provider.interface.ts`](../src/providers/provider.interface.ts)
  - Concrete Providers: [`src/providers/google.provider.ts`](../src/providers/google.provider.ts), [`src/providers/microsoft.provider.ts`](../src/providers/microsoft.provider.ts)
  - Factory: [`src/providers/index.ts`](../src/providers/index.ts)

### Implementation
The system defines a unified `MailboxProvider` interface:
```typescript
export interface ProvisionResult {
  success: boolean;
  mailboxEmail: string;
  errorMessage?: string;
}

export interface MailboxProvider {
  readonly name: "google" | "microsoft";
  provisionMailbox(domain: string, mailboxIndex: number): Promise<ProvisionResult>;
}
```
Concrete strategies (`GoogleProvider`, `MicrosoftProvider`) encapsulate vendor-specific latency simulation, error models, and provisioning contracts. The factory function `getProvider(name)` dynamically resolves the correct strategy at runtime.

### Technical Justification
Decouples vendor-specific API contracts and failure heuristics from the core order lifecycle (Open/Closed Principle). The background worker interacts strictly with the `MailboxProvider` interface. Adding future vendors (e.g., AWS WorkMail, FastMail) requires implementing a new strategy without modifying any order processing logic.

### Explicitly Rejected Alternative
- **Inline Conditionals in Worker Loop**: Embedding `switch (order.provider)` blocks directly inside the worker loop was rejected due to high coupling, testing friction, and violation of the Single Responsibility Principle.

---

## 2. Finite State Machine (FSM)

- **File Locations**:
  - State Machine & Invariants: [`src/domain/state-machine.ts`](../src/domain/state-machine.ts)
  - Domain Types & Enums: [`src/domain/order.types.ts`](../src/domain/order.types.ts)

### Implementation
A pure, deterministic transition map governs the entire order lifecycle:
```typescript
export const ALLOWED_ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.PENDING]: [OrderStatus.PROVISIONING],
  [OrderStatus.PROVISIONING]: [OrderStatus.ACTIVE, OrderStatus.FAILED],
  [OrderStatus.ACTIVE]: [],
  [OrderStatus.FAILED]: [OrderStatus.PENDING], // Admin retry flow
};
```
State transitions are verified using pure assertion helpers (`assertTransition(from, to)`). Any attempt to execute an invalid transition throws a typed `InvalidStateTransitionError`.

```
                  ┌──────────────┐
                  │   PENDING    │◄──────────────┐
                  └──────┬───────┘               │
                         │                       │
                         ▼ (Worker Claim)        │
                  ┌──────────────┐               │
                  │ PROVISIONING │               │
                  └───┬──────┬───┘               │
                      │      │                   │
         All Succeeded│      │At Least 1 Failed  │
                      ▼      ▼                   │
       ┌──────────────┐      ┌──────────────┐    │ Admin
       │    ACTIVE    │      │    FAILED    ├────┘ Retry
       │  (Terminal)  │      └──────────────┘
       └──────────────┘
```

### Technical Justification
Guarantees domain invariants across concurrent operations. Terminal states (`ACTIVE`) are immutable, and `FAILED` orders can only return to `PENDING` via an authorized admin retry. Prevents illegal state jumps (e.g., jumping from `PENDING` directly to `ACTIVE` without provisioning).

### Explicitly Rejected Alternative
- **Ad-Hoc Database Column Updates**: Updating `status` directly in route handlers or controllers without validation was rejected because it easily leads to corrupted states, race conditions, and un-audited state jumps.

---

## 3. Layered Service Architecture

- **File Locations**:
  - Order Domain Service: [`src/services/order.service.ts`](../src/services/order.service.ts)
  - Audit Logging Service: [`src/services/audit.service.ts`](../src/services/audit.service.ts)
  - Application Boundary Schemas: [`src/domain/order.validation.ts`](../src/domain/order.validation.ts)

### Implementation
The application strictly enforces separation of concerns across layers:

```
[ Next.js App Router / Server Actions ]
                  │
                  ▼ (Input validation via Zod)
         [ Service Layer ]
     OrderService / AuditService
                  │
                  ▼ (Atomic Transactions & FSM Guards)
        [ Database (Prisma) ]
```

- **Presentation Layer (`src/app/`, `src/components/`)**: Handles UI rendering, form state, and client-side idempotency keys.
- **Delivery Tier (Server Actions)**: Authenticates callers, runs Zod schema parsing, and immediately delegates to service methods.
- **Service Layer (`src/services/`)**: Orchestrates multi-step interactive transactions, guarantees idempotency, enforces FSM transitions, and writes immutable audit entries.

### Technical Justification
Decouples database operations and business logic from the Next.js delivery framework. Enables comprehensive unit and integration testing of complex workflows (e.g., idempotency, atomic rollbacks) in headless Node.js test runners without launching HTTP servers.

### Explicitly Rejected Alternative
- **Fat Server Actions / Direct Prisma Calls in UI**: Embedding Prisma database queries directly within Server Actions or route handlers was rejected due to code duplication, leaking persistence details into UI components, and making unit testing impossible without full integration harnesses.

---

## 4. Queue Worker with Concurrency Control

- **File Locations**:
  - Background Worker: [`src/worker/mailbox.worker.ts`](../src/worker/mailbox.worker.ts)
  - Worker Config & Exports: [`src/worker/index.ts`](../src/worker/index.ts)

### Implementation
Worker instances claim pending orders using PostgreSQL's row-level locking with `FOR UPDATE SKIP LOCKED` inside an interactive Prisma transaction:
```sql
SELECT "id"
FROM "orders"
WHERE "status" = 'PENDING'::"OrderStatus"
ORDER BY "createdAt" ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```
1. **Worker 1** acquires a row-level lock on the oldest `PENDING` order.
2. Any concurrent **Worker 2** running the same query automatically skips the locked row and claims the next available order (or returns `null`).
3. While holding the lock, the worker atomically promotes the order status to `PROVISIONING` and commits the transaction with an audit log record.
4. The claimed order is subsequently provisioned slot-by-slot and promoted to `ACTIVE` or `FAILED`.

### Technical Justification
Eliminates race conditions and guarantees **zero duplicate processing** across distributed worker processes while keeping the infrastructure footprint minimal (PostgreSQL-only).

### Explicitly Rejected Alternative
- **External Message Brokers (e.g., Redis + BullMQ)**: Introducing Redis and separate queue brokers was rejected to avoid unnecessary operational complexity, extra container dependencies, and network overhead when PostgreSQL row-level locking natively handles the throughput requirements with zero additional infrastructure.
