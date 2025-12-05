// Wish wall service: API calls and data formatting
import { BLOCK_EXPLORERS } from '../core/constants';

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

export function formatAddr(addr: string | null): string {
  if (!addr) return '0x????...????';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getTxUrl(network: string, txHash: string): string {
  const base = BLOCK_EXPLORERS[network] || BLOCK_EXPLORERS['base-sepolia'];
  return base + txHash;
}

export async function loadWishes(page: number, perPage: number): Promise<WishListResponse> {
  const offset = (page - 1) * perPage;
  const res = await fetch(`/api/wishes?limit=${perPage}&offset=${offset}`);
  return res.json();
}
