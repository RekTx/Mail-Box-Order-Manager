
# Mailbox Order Manager

An enterprise-grade Mailbox Order Management application built with **Next.js (App Router, Strict TypeScript)**, **PostgreSQL via Prisma**, and **Tailwind CSS**. 

Features pure domain Finite State Machine transitions, concurrency-safe background worker processing using PostgreSQL row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`), customer order isolation with live polling, and an administrative inspection and retry portal.

---

## Demo Video


https://github.com/user-attachments/assets/dd57d83e-2b0c-4dc4-b332-e0eec5b64b03



---

## Prerequisites

- **Node.js**: v18.17.0+ (Tested on Node v20)
- **Docker & Docker Compose**: For local PostgreSQL container
- **npm** (or pnpm/yarn)

---

## Quickstart Guide (Under 10 Minutes)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd mailbox-order-manager
npm install
```

### 2. Start PostgreSQL Database
```bash
# Spins up PostgreSQL 16 on port 5432 with persistent volume
docker compose up -d
```

### 3. Run Migrations & Seed Database
```bash
# Push schema migrations and seed initial accounts (admin & customer)
npx prisma migrate dev
npx prisma db seed
```
*(Alternatively, if running without migrations: `npx prisma db push && npm run db:seed`)*

### 4. Start Next.js Web Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Start Background Provisioning Worker
In a separate terminal window:
```bash
npm run worker
```
The worker continuously polls for `PENDING` orders, safely locks rows with `SKIP LOCKED`, and simulates provisioning each mailbox with realistic latency and failure rates.

---

## Seeded Demo Credentials

| Role | Email | Password | Primary Dashboard |
|---|---|---|---|
| **Admin** | `admin@example.com` | `password123` | [`/admin`](http://localhost:3000/admin) |
| **Customer** | `customer@example.com` | `password123` | [`/orders`](http://localhost:3000/orders) |

> **Tip**: On the [`/login`](http://localhost:3000/login) page, click **"Fill Customer Account"** or **"Fill Admin Account"** to immediately populate the form fields with one click.

---

## Architectural Highlights

- **Pure Finite State Machine (`src/domain/state-machine.ts`)**: Deterministic transitions (`PENDING -> PROVISIONING -> ACTIVE | FAILED`, with `FAILED -> PENDING` admin retry).
- **Strategy Pattern (`src/providers/`)**: Decoupled mailbox providers (`GoogleProvider`, `MicrosoftProvider`) resolved via factory.
- **Concurrency-Safe Worker (`src/worker/mailbox.worker.ts`)**: Row-level locking via `SELECT ... FOR UPDATE SKIP LOCKED` guarantees zero duplicate processing across concurrent workers.
- **Idempotency Protection**: Client-side UUIDs combined with database unique constraints guarantee duplicate submissions return existing records without re-inserting.
- **Strict Customer Isolation**: Customers can only view and manage their own orders; cross-tenant access is rejected at the domain service layer.
- **Live Auto-Polling (`src/components/customer-order-detail-live.tsx`)**: Polling interval refreshes status every 2.5s until terminal state is reached.

---

## Running Automated Tests

Run the full Vitest unit and integration test suite:

```bash
npm test
```

### Test Coverage Summary (80 Tests across 9 Suites)
- **Domain Validation & Rules**: `tests/domain/order.test.ts` (6 tests)
- **Finite State Machine**: `tests/unit/state-machine.test.ts` (30 tests)
- **Provider Strategy & Latency**: `tests/unit/providers.test.ts` (8 tests)
- **Queue Worker Concurrency**: `tests/unit/worker.test.ts` (6 tests)
- **Order Service Business Logic**: `tests/unit/order-service.test.ts` (6 tests)
- **Admin Filtering & Pagination**: `tests/unit/admin-orders.test.ts` (3 tests)
- **Auth & Protected Actions**: `tests/unit/auth-protection.test.ts` (5 tests)
- **Login Flow & Sessions**: `tests/unit/login.test.ts` (8 tests)
- **Order Creation & Idempotency Integration**: `tests/integration/order-creation.test.ts` (8 tests)

### TypeScript Verification & Production Build
```bash
npx tsc --noEmit
npm run build
```

---

## Project Structure

```
├── CLAUDE.md                   # Quick developer command and boundary guide
├── README.md                   # Quickstart, setup, and overview guide
├── docker-compose.yml          # PostgreSQL 16 container definition
├── prisma/
│   ├── schema.prisma           # Prisma database schema definition
│   └── seed.ts                 # Idempotent database seed script
├── docs/
│   ├── ARCHITECTURE.md         # Detailed patterns, justifications & rejected alternatives
│   └── AI_WORKLOG.md           # Development worklog, prompts, corrections & time tracking
├── src/
│   ├── domain/                 # Pure domain types, FSM, and Zod validation schemas
│   ├── services/               # Transactional business logic & audit logging
│   ├── providers/              # Mailbox provider strategy implementations & factory
│   ├── worker/                 # Concurrency-safe queue worker (SKIP LOCKED)
│   ├── lib/                    # Prisma singleton & auth helpers
│   ├── components/             # Reusable UI components & live polling client components
│   ├── middleware.ts           # Next.js Edge route protection middleware
│   └── app/                    # Next.js App Router pages & Server Actions
└── tests/
    ├── domain/                 # Domain validation tests
    ├── unit/                   # Unit test suites (FSM, Providers, Worker, Service, Auth)
    └── integration/            # Multi-step integration tests
```

---

## Known Limitations & Production Considerations

1. **Mock Vendor Integrations**:
   - *Current Implementation*: Providers simulate 2-second per-mailbox API latency with a 20% random error rate in-memory.
   - *Production Path*: Replace mock strategies with official SDK/OAuth2 clients for Google Workspace Admin SDK and Microsoft Graph API.
2. **Session Authentication**:
   - *Current Implementation*: Uses standard cookie-based identity (`demo_user_email`) designed for quick demo and testing between seeded roles.
   - *Production Path*: Integrate NextAuth.js (Auth.js) or iron-session with encrypted JWT tokens, password hashing (Argon2id/bcrypt), and corporate SSO/SAML providers.
3. **Dedicated Worker Container**:
   - *Current Implementation*: Run as a separate Node.js process via `npm run worker`.
   - *Production Path*: Package into a dedicated Docker container deployed on ECS/Kubernetes with horizontal pod autoscaling based on queue depth.

