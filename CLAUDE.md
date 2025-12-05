# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Cyber Buddha Project Specification

## Project Overview

Cyber Buddha - A blockchain-powered wishing well built on x402 protocol.

- **Live Site**: https://fo.hackthoughts.com/
- **Current Branch**: v2 (TypeScript + Cloudflare Workers)

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript (unified frontend/backend)
- **Backend Framework**: Hono
- **Payment Protocol**: x402 (EIP-3009 TransferWithAuthorization)
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla TypeScript + HTML, PixiJS for GPU rendering
- **Facilitator**: PayAI (https://facilitator.payai.network)

## Architecture

```
├── src/
│   ├── index.ts      # Hono API routes (wish, wishes, health)
│   ├── types.ts      # TypeScript interfaces
│   └── config.ts     # Network config, USDC addresses
├── public/
│   └── index.html    # Single-page frontend with all JS inline
├── schema.sql        # D1 database schema
└── wrangler.toml     # Cloudflare Workers config
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/wish` | GET | Get payment configuration |
| `/api/wish` | POST | Submit wish with x402 payment |
| `/api/wishes` | GET | Paginated wish wall (limit, offset params) |

## Payment Flow

1. User clicks "BLESS" → POST `/api/wish` without X-PAYMENT header
2. Server returns 402 with payment requirements
3. Frontend creates EIP-712 signature (TransferWithAuthorization)
4. POST `/api/wish` with X-PAYMENT header (base64 encoded)
5. Server verifies with facilitator, settles payment
6. Wish saved to D1, success response returned

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

- $1.024 → Buddha light halo effect
- $2.048 → Sanskrit ripple effect
- $4.096 → Lotus bloom effect
- $8.192 → Dharma wheel + sutra background

## Development Commands

```bash
# Install dependencies
npm install

# Run locally
npx wrangler dev

# Deploy to Cloudflare
npx wrangler deploy

# D1 Database commands
npx wrangler d1 execute cyberbuddha-wishes --local --file=schema.sql  # Local
npx wrangler d1 execute cyberbuddha-wishes --file=schema.sql          # Remote
```

## Code Style Guidelines

### Core Principles
- Clean, self-documenting code with clear naming
- Strict TypeScript, no `any`
- Modular design, single responsibility
- Production-grade error handling and logging

### Logging Convention
- Use structured logging with prefixes: `[WISH]`, `[WISHES]`, `[UI]`
- Log levels: `info` for normal flow, `warn` for recoverable issues, `error` for failures
- Include relevant context: amount, network, payer address, tx hash

### Security
- XSS prevention: sanitize user content before storage
- Amount validation: MIN_AMOUNT ($0.01) to MAX_AMOUNT ($10,000)
- Content length limit: 200 characters
- No secrets in client code

## Frontend Features

- **Wallet Support**: MetaMask, Phantom (EVM)
- **Network Switching**: Automatic chain switching via wallet_switchEthereumChain
- **localStorage Persistence**: Saves network type, chain index, selected amount
- **Visual Effects**: Canvas 2D for effects, PixiJS for GPU-accelerated background
- **Wish Wall**: Paginated modal showing all wishes with tx links

## Error Handling

Backend returns consistent error format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Error codes: `INVALID_BODY`, `INVALID_NETWORK`, `INVALID_AMOUNT`, `NOT_CONFIGURED`, `SETTLE_FAILED`, `DB_ERROR`, `PAYMENT_ERROR`

Frontend maps x402 errors to user-friendly messages:
- `insufficient_funds` → "insufficient USDC balance"
- `invalid_signature` → "signature verification failed"
- User rejection (code 4001) → "signature cancelled"

## References

- x402 Protocol: https://x402.gitbook.io/x402
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Hono Framework: https://hono.dev/
- PayAI Facilitator: https://facilitator.payai.network
