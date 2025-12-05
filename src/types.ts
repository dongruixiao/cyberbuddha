/** Supported EVM networks */
export type Network =
  | 'base'
  | 'base-sepolia'
  | 'polygon'
  | 'polygon-amoy'
  | 'avalanche'
  | 'avalanche-fuji'
  | 'sei'
  | 'sei-testnet'
  | 'iotex'
  | 'peaq'
  | 'abstract'
  | 'abstract-testnet';

/** Wish request body */
export interface WishRequest {
  amount: string;    // USD amount, e.g. "1.00"
  content?: string;  // Optional wish content
  network?: string;  // Optional network override
}

/** Wish response after successful payment */
export interface WishResponse {
  message: string;
  blessing: string;
  txHash?: string;
}

/** Error response */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/** GET /api/wish response */
export interface WishConfig {
  network: Network;
  asset: string;
  minAmount: number;
  recipient: string;
}

/** Cloudflare Workers environment bindings */
export interface Env {
  ADDRESS: string;
  NETWORK: Network;
  FACILITATOR_URL?: string;
  DB: D1Database;
}

/** Wish record stored in D1 */
export interface WishRecord {
  id: number;
  tx_hash: string;
  payer: string;
  amount: number;
  content: string;
  network: string;
  created_at: number;
}

/** GET /api/wishes response */
export interface WishListResponse {
  wishes: WishRecord[];
  total: number;
}
