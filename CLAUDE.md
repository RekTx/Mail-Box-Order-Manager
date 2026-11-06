# Mailbox Order Manager — Developer & Architecture Guide

## Build & Run Commands

```bash
# 1. Start PostgreSQL 16 database container
docker compose up -d

# 2. Apply database migrations and seed accounts
npx prisma migrate dev
npx prisma db seed

# 3. Start Next.js App Router development server (http://localhost:3000)
npm run dev

# 4. Start background mailbox provisioning worker (polls and provisions orders)
npm run worker

# 5. Run full test suite (Vitest)
npm test

# 6. Typecheck and production build
npx tsc --noEmit
npm run build
```

---

## Architectural Boundary Rules

### 1. Strict Typing
- TypeScript strict mode (`"strict": true`) enforced across the entire codebase.
- Zero untyped variables or loose type coercions. Domain contracts and Prisma generated types must be used explicitly.

### 2. Zero Business Logic in Presentation Layer
- **UI Components (`src/components/`, `src/app/`)**: Must strictly handle rendering, input collection, and client-side presentation states.
- **Server Actions & Route Handlers**: Must only authenticate the caller, validate input schemas via Zod, and delegate execution immediately to the service layer (`src/services/`).
- **Domain & Service Modules (`src/domain/`, `src/services/`)**: Centralize all status transitions, idempotency checks, transactional boundaries, and audit logging.

### 3. Application Boundary Validation
- All external inputs (form submissions, API queries) must be validated using Zod schemas (`src/domain/order.validation.ts`).
- Invalid payloads must return structured field-level errors before reaching the service layer.

### 4. Concurrency & Transactional Safety
- All status transitions and audit log writes must execute atomically inside Prisma interactive transactions (`prisma.$transaction`).
- Background job processing must acquire PostgreSQL row-level locks using `SELECT ... FOR UPDATE SKIP LOCKED` to guarantee that concurrent workers never double-claim or double-provision the same order.

