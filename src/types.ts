/**
 * Supported blockchain networks (aligned with x402-hono)
 */
export type Network =
  | 'base'
  | 'base-sepolia'
  | 'polygon'
  | 'polygon-amoy'
  | 'avalanche'
  | 'avalanche-fuji'
  | 'solana'
  | 'solana-devnet'
  | 'sei'
  | 'sei-testnet'
  | 'iotex'
  | 'peaq'
  | 'abstract'
  | 'abstract-testnet'
  | 'story'
  | 'educhain'
  | 'skale-base-sepolia';

/**
 * Offering tier configuration
 */
export interface OfferingTier {
  id: string;
  name: string;
  nameEn: string;
  price: string;
  path: string;
}

/**
 * Offering response after successful payment
 */
export interface OfferingResponse {
  success: boolean;
  message: string;
  blessing: string;
  type: string;
  txHash?: string;
}

/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  ADDRESS: string;
  NETWORK: Network;
  FACILITATOR_URL?: string;
}
