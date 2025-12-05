# Cyber Buddha 赛博佛祖

```
                  _oo0oo_
                 o8888888o
                 88" . "88
                (|  -_-  |)
                 0\  =  /0
               ___/`---'\___
             .' \\|     |// '.
            / \\|||  :  |||// \
           / _||||| -:- |||||- \
          |   | \\\  -  /// |   |
          | \_|  ''\---/''  |_/ |
          \  .-\__  '-'  ___/-. /
        ___'. .'  /--.--\  `. .'___
     ."" '<  `.___\_<|>_/___.'  >' "".
    | | :  `- \`.;`\ _ /`;.`/ - ` : | |
    \  \ `_.   \_ __\ /__ _/   .-` /  /
=====`-.____`.___ \_____/___.-`___.-'=====
                  `=---='

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     賽 博 佛 祖          鏈 上 許 願
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

A Web3 wishing well powered by [x402 protocol](https://x402.org). Make a wish, pay with USDC, and let your prayers live on-chain forever.

## Features

- **On-chain Wishes** - Your wishes are stored permanently on the blockchain
- **Multi-chain Support** - Base, Polygon, Avalanche, and more
- **x402 Protocol** - Seamless USDC payments via EIP-3009
- **Cyberpunk Aesthetics** - ASCII art Buddha with GPU-accelerated effects
- **Wish Wall** - Browse all wishes from the community

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers |
| Backend | Hono + x402-hono |
| Frontend | TypeScript + Vite |
| Database | Cloudflare D1 |
| Payments | x402 Protocol (USDC) |
| Effects | PixiJS + Canvas |

## Supported Networks

| Network | Mainnet | Testnet |
|---------|---------|---------|
| Base | `base` | `base-sepolia` |
| Polygon | `polygon` | `polygon-amoy` |
| Avalanche | `avalanche` | `avalanche-fuji` |

## Development

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Setup

```bash
# Install dependencies
npm install

# Run frontend dev server (with HMR)
npm run dev:frontend

# Run backend dev server
npm run dev

# Build frontend
npm run build:frontend
```

### Environment Variables

Configure in `wrangler.toml`:

```toml
[vars]
NETWORK = "base-sepolia"  # or "base" for mainnet
```

Secrets (set via `wrangler secret put`):

```bash
wrangler secret put PRIVATE_KEY  # Wallet private key for x402
```

## Deployment

```bash
# Build and deploy to Cloudflare Workers
npm run deploy
```

## Project Structure

```
cyberbuddha/
├── src/                    # Backend (Cloudflare Worker)
│   ├── index.ts           # Hono routes + x402 middleware
│   └── config.ts          # Network configuration
├── public/                 # Frontend source
│   ├── index.html         # HTML shell
│   ├── src/               # TypeScript modules
│   │   ├── main.ts        # Entry point
│   │   ├── core/          # State, DOM, constants
│   │   ├── wallet/        # Wallet connection & payments
│   │   ├── wish/          # Wish submission
│   │   ├── effects/       # Visual effects (PixiJS, Canvas)
│   │   ├── messages/      # Message queue
│   │   └── wish-wall/     # Wish wall modal
│   └── styles/            # Modular CSS
├── dist/                   # Built frontend (served by Worker)
├── vite.config.ts         # Vite configuration
└── wrangler.toml          # Cloudflare Workers config
```

## API

### `GET /api/config`

Returns server configuration and supported amounts.

### `POST /api/wish`

Submit a wish (requires x402 payment).

```json
{
  "content": "Your wish here",
  "amount": "2.048"
}
```

### `GET /api/wishes?page=1&limit=10`

Fetch paginated wish wall.

## Payment Tiers

| Amount | Effect |
|--------|--------|
| $1.024 | Buddha Halo |
| $2.048 | Sanskrit Ripples |
| $4.096 | Lotus Bloom |
| $8.192 | Dharma Wheel |

## License

MIT

---

*May your wishes be heard on-chain.* 🙏
