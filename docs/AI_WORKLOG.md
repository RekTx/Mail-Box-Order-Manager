# AI Development Worklog

This document chronicles the development methodology, key prompts, AI assumptions, manual corrections, hand-crafted code, and time allocation for the **Mailbox Order Manager** project.

---

## 1. Planning & Execution Methodology

Development followed a strict phased bottom-up progression:
1. **Phase 1: Domain Modeling & Database Schema**: Defined PostgreSQL models via Prisma (`User`, `Order`, `Mailbox`, `AuditLog`), implemented the pure Finite State Machine, and established the Mailbox Provider Strategy pattern.
2. **Phase 2: Concurrency-Safe Queue Worker & Audit Engine**: Built the background job worker with PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` row-level locks, transactional state promotions, and audit trail logging.
3. **Phase 3: Admin Views & Protected Retry Flow**: Created the Admin dashboard with server-side pagination, status/provider filtering, inline expandable audit drawer, and protected `FAILED -> PENDING` retry action.
4. **Phase 4: Customer Portal & Live Polling**: Built customer order isolation, the idempotent order creation form with Zod validation, auto-refresh polling every 2.5s, and integration tests.
5. **Phase 5: Auth Refactoring, Polish & Documentation**: Replaced in-app role switchers with clean `/login` page and quick-fill buttons, added Edge route protection middleware, and generated submission documentation.

---

## 2. Key Prompts Used

Below are four representative verbatim prompts that drove the implementation across core phases:

### Phase 1: Foundational Architecture & Schema Setup
> *"We are building a Mailbox Order Manager using Next.js (App Router, Strict TypeScript) and PostgreSQL. Set up the complete foundational project structure, database configuration, and developer environment strictly following these requirements:
> - Layered architecture: `src/domain/`, `src/services/`, `src/providers/`, `src/worker/`, `src/app/`.
> - Docker compose with PostgreSQL 16 on port 5432 and `.env.example`.
> - Prisma schema for User, Order, Mailbox, AuditLog.
> - Database seed script with Admin (`admin@example.com`) and Customer (`customer@example.com`).
> - Pure domain state machine and Vitest test runner."*

### Phase 2: Safe Background Worker & Concurrency Control
> *"We are implementing the Provider Abstraction (Strategy Pattern) and the Safe Background Worker for the Mailbox Order Manager.
> Strictly adhere to the requirements:
> 1. Mock providers with simulated latency and random failure rate.
> 2. Background worker must be concurrency-safe: running it twice concurrently must NEVER process the same order twice.
> 3. Keep business and domain logic out of UI components and raw route handlers."*

### Phase 3: Admin Dashboard & Protected Retry Flow
> *"We are building the Admin Views and Retry Flow for the Mailbox Order Manager strictly following the project priority order:
> - Admin list with status and provider filters, pagination and a retry button; audit log inspector.
> - Simple seeded role/auth context (admin@example.com vs customer@example.com).
> - On FAILED orders, display active Retry button calling orderService.retryFailedOrder with audit log entry.
> - Include audit log view for each order displaying chronological timeline [fromStatus -> toStatus], timestamp, actor, and reason."*

### Phase 4: Customer Portal, Forms & Integration Tests
> *"We are implementing Priority #4: Customer Views for the Mailbox Order Manager.
> - No business logic in route handlers or components (delegate to src/services/order.service.ts).
> - Customer must only see their own orders.
> - Customer Order List (/orders) with empty state and '+ New Order' button.
> - Idempotent Order Creation Form (/orders/new) with Zod validation, client-side idempotencyKey generation, and duplicate prevention.
> - Order detail page (/orders/[id]) with live auto-refresh polling every 2 to 3 seconds until terminal status.
> - Integration test for order creation covering happy path, idempotency, and boundary validation."*

---

## 3. AI Assumptions & Manual Corrections

Throughout development, several AI assumptions were audited and corrected:

1. **Simulated Latency & Error Rate Calibration**:
   - *Initial AI Assumption*: Mock provider configurations defaulted to 50ms latency with a 15% failure rate for quick test execution.
   - *Correction*: Updated defaults in `src/providers/google.provider.ts` and `src/providers/microsoft.provider.ts` to the required **2-second per-mailbox latency** and **20% failure threshold**, while keeping constructor options configurable so unit tests run at 0ms.

2. **Worker CLI Polling Lifecycle**:
   - *Initial AI Assumption*: The worker class initially provided static helper methods (`claimNextPendingOrder`, `processOrder`, `runCycle`) intended to be triggered programmatically.
   - *Correction*: Appended a self-executing CLI polling loop with `process.on('SIGINT')` and `process.on('SIGTERM')` graceful shutdown handlers in `src/worker/mailbox.worker.ts`, guarded so it only runs when directly invoked via `npm run worker`.

3. **Authentication & Session Cleanliness**:
   - *Initial AI Assumption*: An in-app header switcher was initially implemented to allow toggling between seeded roles on any page.
   - *Correction*: Replaced the in-app role switcher with a dedicated `/login` page containing empty input fields, discrete quick-fill helper buttons, strict Next.js Edge middleware redirects, and a dedicated logout button.

---

## 4. Manual Hand-Crafted Code

The following sections were specifically refined and hand-crafted:
- **Direct CLI Execution Guard in Worker** ([`src/worker/mailbox.worker.ts`](file:///e:/interview/mail-one/src/worker/mailbox.worker.ts)):
  ```typescript
  const isDirectCliExecution =
    typeof process !== "undefined" &&
    process.argv &&
    process.argv[1] &&
    (process.argv[1].endsWith("mailbox.worker.ts") ||
      process.argv[1].endsWith("mailbox.worker.js") ||
      process.argv[1].includes("mailbox.worker"));

  if (isDirectCliExecution && process.env.NODE_ENV !== "test") {
    startWorker().catch((err) => {
      console.error("[Worker Fatal]:", err);
      process.exit(1);
    });
  }
  ```
- **Domain Format Regex** ([`src/domain/order.validation.ts`](file:///e:/interview/mail-one/src/domain/order.validation.ts)): Refined the domain validator regex (`/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-_]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/`) to support multi-level TLDs (e.g., `co.uk`) while rejecting invalid formats.
- **Strict Customer Isolation Invariants** ([`src/services/order.service.ts`](file:///e:/interview/mail-one/src/services/order.service.ts)): Added `getOrderForCustomer` to guarantee that tenant access rules are enforced in the domain service layer rather than in presentation routes.

---

## 5. Time Breakdown

| Development Phase | Focus Area | Time Spent |
|---|---|---|
| **Phase 1** | Schema design, Prisma migrations, Domain FSM, Provider Strategy pattern | ~45 mins |
| **Phase 2** | Concurrency-safe queue worker (`SKIP LOCKED`), atomic transactions, audit trail engine | ~45 mins |
| **Phase 3** | Admin dashboard, status/provider filters, server-side pagination, protected retry flow | ~45 mins |
| **Phase 4** | Customer order views, idempotent form with UUIDs, live polling detail view, integration tests | ~40 mins |
| **Phase 5** | Authentication refactoring, Edge middleware, test suite polish, submission documentation | ~35 mins |
| **Total** | | **~3.5 hours** |

