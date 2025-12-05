# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Cyber Buddha Project Specification

## Project Overview

Cyber Buddha - A blockchain-powered wishing well built on x402 protocol.

- **Live Site**: https://fo.hackthoughts.com/
- **Current Branch**: v3 (Production Hardening)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers (Edge) |
| Backend | Hono + x402-hono |
| Frontend | TypeScript + Vite |
| Database | Cloudflare D1 (SQLite) |
| Payments | x402 Protocol (USDC) |
| Graphics | PixiJS + Canvas 2D |
| Validation | Zod |
| Testing | Vitest |

## Architecture

```
cyberbuddha/
├── src/                          # Backend (Cloudflare Workers)
│   ├── index.ts                  # Hono routes + x402 middleware
│   ├── types.ts                  # Shared TypeScript interfaces
│   └── config.ts                 # Network configuration
├── public/                       # Frontend source
│   ├── index.html                # HTML shell
│   ├── src/
│   │   ├── main.ts               # Entry point
│   │   ├── core/                 # State, DOM, constants
│   │   ├── wallet/               # Connection, payment, UI
│   │   ├── wish/                 # Wish submission
│   │   ├── effects/              # Visual effects (PixiJS, Canvas)
│   │   ├── messages/             # Notification queue
│   │   └── wish-wall/            # Wish wall modal
│   └── styles/                   # Modular CSS
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   └── integration/              # Integration tests
├── shared/                       # Shared types (frontend + backend)
├── dist/                         # Built frontend
├── vite.config.ts                # Vite configuration
└── wrangler.toml                 # Cloudflare Workers config
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/wish` | GET | Get payment configuration |
| `/api/wish` | POST | Submit wish with x402 payment |
| `/api/wishes` | GET | Paginated wish wall (limit, offset params) |

## Payment Flow

```
1. User clicks "BLESS" → POST /api/wish (no X-PAYMENT header)
2. Server returns 402 with payment requirements
3. Frontend creates EIP-712 signature (TransferWithAuthorization)
4. POST /api/wish with X-PAYMENT header (base64 encoded)
5. Server verifies with facilitator, settles payment
6. Wish saved to D1, success response returned
```

## Supported Networks

| Network | Chain ID | USDC Address |
|---------|----------|--------------|
| base | 8453 | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |
| base-sepolia | 84532 | 0x036CbD53842c5426634e7929541eC2318f3dCF7e |
| polygon | 137 | 0x3c499c542cef5e3811e1192ce70d8cc03d5c3359 |
| polygon-amoy | 80002 | 0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 |
| avalanche | 43114 | 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E |
| avalanche-fuji | 43113 | 0x5425890298aed601595a70AB815c96711a31Bc65 |

## Payment Tiers

| Amount | Effect | Constant |
|--------|--------|----------|
| $1.024 | Buddha light halo | `AMOUNT_TIER_1` |
| $2.048 | Sanskrit ripple | `AMOUNT_TIER_2` |
| $4.096 | Lotus bloom | `AMOUNT_TIER_3` |
| $8.192 | Dharma wheel + sutra | `AMOUNT_TIER_4` |

## Development Commands

```bash
# Install dependencies
npm install

# Run backend (Cloudflare Workers)
npm run dev

# Run frontend (Vite with HMR)
npm run dev:frontend

# Run tests
npm run test

# Build for production
npm run build:frontend

# Deploy
npm run deploy

# D1 Database
npx wrangler d1 execute cyberbuddha-wishes --local --file=schema.sql  # Local
npx wrangler d1 execute cyberbuddha-wishes --file=schema.sql          # Remote
```

---

# Architecture Review Findings (v3 Roadmap)

## Current Scores

| Dimension | Score | Status |
|-----------|-------|--------|
| Architecture | 6/10 | Good structure, needs abstraction |
| Code Quality | 6/10 | TypeScript good, unsafe patterns exist |
| Security | 5/10 | Basic protection, gaps exist |
| Reliability | 4/10 | No retry, no graceful degradation |
| Observability | 3/10 | Only console.log |
| Testing | 0/10 | Zero coverage |
| Developer Exp | 7/10 | Good docs |
| Prod Readiness | 3/10 | No CI/CD |

## Critical Issues (Must Fix)

### 1. Zero Test Coverage
- Payment flow MUST be tested (handles real money)
- EIP-712 signature generation critical
- Add Vitest with minimum 80% coverage on core paths

### 2. Payment Success but Data Loss Risk
```typescript
// BAD: src/index.ts:197-200
} catch (dbErr) {
  console.error(...);  // User paid but wish not saved, no notification
}
```
Fix: Return warning to user, implement compensation queue

### 3. Unprotected Global State
```typescript
// BAD: public/src/core/state.ts
export const state: AppState = { ... }  // Anyone can mutate
```
Fix: Encapsulate with getter/setter, add state machine

### 4. No Rate Limiting
All endpoints exposed to abuse. Add Cloudflare rate limiting rules.

## High Priority Issues

### 1. Unsafe Type Assertions
```typescript
// BAD
const error = err as { code?: number };
// GOOD
if (error instanceof Error) { ... }
// BETTER
const result = ErrorSchema.safeParse(err);
```

### 2. Incomplete XSS Protection
```typescript
// Current: only filters < >
content.replace(/[<>]/g, '')
// Should: use allowlist or DOMPurify
```

### 3. Magic Numbers
```typescript
// BAD
if (amount >= 8.192) { ... }
// GOOD
if (amount >= AMOUNT_TIERS.DHARMA_WHEEL) { ... }
```

### 4. Frontend/Backend Type Mismatch
- `src/types.ts` has 12 networks
- `public/src/core/constants.ts` has 6 networks
- Solution: shared/types.ts imported by both

---

# Code Style Guidelines

## Core Principles
- Clean, self-documenting code with clear naming
- Strict TypeScript, no `any`
- Modular design, single responsibility
- All inputs validated with Zod schemas
- All critical paths tested

## State Management
```typescript
// Use getter/setter pattern
import { getState, setState } from './core/state';

// Read
const address = getState('address');

// Write
setState('address', newAddress);
```

## Error Handling
```typescript
// Always use Result pattern for operations that can fail
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function makeWish(...): Promise<Result<WishResponse>> {
  try {
    // ...
    return { ok: true, value: response };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}
```

## Input Validation
```typescript
// Always validate with Zod
import { z } from 'zod';

const WishRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  content: z.string().max(200).optional(),
  network: z.enum(['base', 'base-sepolia', ...]),
});

// In handler
const result = WishRequestSchema.safeParse(body);
if (!result.success) {
  return c.json({ error: { code: 'INVALID_BODY', message: result.error.message } }, 400);
}
```

## Logging Convention
```typescript
// Structured logging with context
console.info('[WISH] Payment successful', {
  txHash,
  payer,
  amount,
  network,
  timestamp: Date.now(),
});
```

## Testing Requirements
- Unit tests for all utility functions
- Integration tests for payment flow
- Minimum 80% coverage on src/ and public/src/core/
- Mock external services (facilitator, wallet)

---

# Security Checklist

## Input Validation
- [ ] All API inputs validated with Zod
- [ ] Amount bounds: MIN_AMOUNT to MAX_AMOUNT
- [ ] Content length: max 200 chars
- [ ] Content sanitization: XSS prevention
- [ ] Network validation: only supported networks

## API Protection
- [ ] Rate limiting on all endpoints
- [ ] CORS configured properly
- [ ] No sensitive data in error messages
- [ ] CSP headers configured

## Secrets Management
- [ ] No secrets in client code
- [ ] Private keys in Cloudflare secrets
- [ ] Environment-specific configs

## Payment Security
- [ ] EIP-712 signature validation
- [ ] Amount verification before settlement
- [ ] Idempotency on payment processing
- [ ] Transaction logging for audit

---

# V3 Improvement Roadmap

## Phase 1: Critical Fixes (Blocking)
- [ ] Add Vitest, write payment flow tests
- [ ] Fix DB write failure notification
- [ ] Encapsulate state with getter/setter
- [ ] Add Cloudflare rate limiting

## Phase 2: Core Improvements (Stability)
- [ ] Add Zod input validation
- [ ] Unify frontend/backend types (shared/)
- [ ] Add Sentry error monitoring
- [ ] Facilitator retry with exponential backoff
- [ ] Complete XSS sanitization

## Phase 3: Production Excellence
- [ ] GitHub Actions CI/CD
- [ ] Structured logging (JSON)
- [ ] Business metrics dashboard
- [ ] E2E tests with Playwright
- [ ] CSP headers

---

# References

- x402 Protocol: https://x402.org
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Hono Framework: https://hono.dev/
- PayAI Facilitator: https://facilitator.payai.network
- Vitest: https://vitest.dev/
- Zod: https://zod.dev/
