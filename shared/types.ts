// Shared types used by both frontend and backend
import { z } from 'zod';

// Supported networks (full list)
export const SUPPORTED_NETWORKS = [
  'base',
  'base-sepolia',
  'polygon',
  'polygon-amoy',
  'avalanche',
  'avalanche-fuji',
  'sei',
  'sei-testnet',
  'iotex',
  'peaq',
  'abstract',
  'abstract-testnet',
] as const;

// Networks with USDC configured (subset we actually support for payments)
export const PAYMENT_NETWORKS = [
  'base',
  'base-sepolia',
  'polygon',
  'polygon-amoy',
  'avalanche',
  'avalanche-fuji',
] as const;

export type PaymentNetwork = (typeof PAYMENT_NETWORKS)[number];

export type Network = (typeof SUPPORTED_NETWORKS)[number];

// Payment amount tiers
export const AMOUNT_TIERS = {
  HALO: 1.024,
  RIPPLE: 2.048,
  LOTUS: 4.096,
  DHARMA: 8.192,
} as const;

export const AMOUNTS = Object.values(AMOUNT_TIERS);

// Validation schemas
export const WishRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Invalid amount format'),
  content: z.string().max(200, 'Content too long').optional(),
  network: z.enum(SUPPORTED_NETWORKS).optional(),
});

export type WishRequest = z.infer<typeof WishRequestSchema>;

// Response types
export interface WishResponse {
  message: string;
  blessing: string;
  txHash?: string;
  warning?: string; // Added for DB failure notification
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface WishConfig {
  network: Network;
  asset: string;
  minAmount: number;
  recipient: string;
}

export interface WishRecord {
  id: number;
  tx_hash: string;
  payer: string;
  amount: number;
  content: string;
  network: string;
  created_at: number;
}

export interface WishListResponse {
  wishes: WishRecord[];
  total: number;
}

// Network configuration
export interface NetworkConfig {
  chainId: number;
  name: string;
  usdc: string;
  explorer: string;
}

export const NETWORK_CONFIGS: Record<PaymentNetwork, NetworkConfig> = {
  base: {
    chainId: 8453,
    name: 'Base',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    explorer: 'https://basescan.org/tx/',
  },
  'base-sepolia': {
    chainId: 84532,
    name: 'Base Sepolia',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    explorer: 'https://sepolia.basescan.org/tx/',
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    usdc: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    explorer: 'https://polygonscan.com/tx/',
  },
  'polygon-amoy': {
    chainId: 80002,
    name: 'Polygon Amoy',
    usdc: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    explorer: 'https://amoy.polygonscan.com/tx/',
  },
  avalanche: {
    chainId: 43114,
    name: 'Avalanche',
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    explorer: 'https://snowtrace.io/tx/',
  },
  'avalanche-fuji': {
    chainId: 43113,
    name: 'Avalanche Fuji',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    explorer: 'https://testnet.snowtrace.io/tx/',
  },
};

// Constants
export const MIN_AMOUNT = 0.01;
export const MAX_AMOUNT = 10000;
export const MAX_CONTENT_LENGTH = 200;
export const FACILITATOR_URL = 'https://facilitator.payai.network';

// Default content
export const DEFAULT_WISH_CONTENT = 'may this merit reach all beings';
export const DEFAULT_WISH_PLACEHOLDER = 'namo://typing...';

// User-facing messages (zen meme edition)
export const MESSAGES = {
  // success
  PRAYER_HEARD: 'karma on-chain. buddha has seen it. no reply.',
  // warnings
  DB_SAVE_WARNING: 'wish recorded on-chain. wall updates when the universe allows.',
  // errors
  INSUFFICIENT_BALANCE: 'insufficient balance. consider cultivating more karma.',
  SIGNATURE_FAILED: 'signature invalid. not the signature you seek.',
  PAYMENT_EXPIRED: 'payment expired. karma timeout.',
  SIGNATURE_CANCELLED: 'transcendence cancelled by user',
  ALREADY_PROCESSED: 'already processed. greed is suffering.',
  INVALID_AMOUNT: 'invalid amount. karma cannot compute.',
} as const;

// Wallet display names
export const WALLET_NAMES: Record<string, string> = {
  metamask: 'MetaMask',
  phantom: 'Phantom',
} as const;

// Utility functions
export function usdToAtomicUnits(usd: number): string {
  return BigInt(Math.round(usd * 1_000_000)).toString();
}

export function atomicUnitsToUsd(atomic: string): number {
  return Number(BigInt(atomic)) / 1_000_000;
}

export function isNetworkSupported(network: string): network is Network {
  return SUPPORTED_NETWORKS.includes(network as Network);
}

export function sanitizeContent(content: string): string {
  return content
    .slice(0, MAX_CONTENT_LENGTH)
    .replace(/[<>"'&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[char] || char;
    });
}

// Result type for error handling
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
