import type { OfferingTier, Network } from './types';

/**
 * PayAI Facilitator - supports mainnet and testnet
 */
export const FACILITATOR_URL = 'https://facilitator.payai.network';

/**
 * Available offering tiers
 */
export const OFFERINGS: OfferingTier[] = [
  { id: 'small', name: '小香', nameEn: 'Small Incense', price: '$0.10', path: '/api/offer/small' },
  { id: 'medium', name: '中香', nameEn: 'Medium Incense', price: '$1.00', path: '/api/offer/medium' },
  { id: 'large', name: '大香', nameEn: 'Large Incense', price: '$5.00', path: '/api/offer/large' },
  { id: 'premium', name: '高香', nameEn: 'Premium Incense', price: '$10.00', path: '/api/offer/premium' },
];

/**
 * Networks supported by x402-hono
 */
export const SUPPORTED_NETWORKS: Network[] = [
  'base',
  'base-sepolia',
  'polygon',
  'polygon-amoy',
  'avalanche',
  'avalanche-fuji',
  'solana',
  'solana-devnet',
  'sei',
  'sei-testnet',
  'iotex',
  'peaq',
  'abstract',
  'abstract-testnet',
  'story',
  'educhain',
  'skale-base-sepolia',
];

/**
 * Check if a network is supported
 */
export function isNetworkSupported(network: string): network is Network {
  return SUPPORTED_NETWORKS.includes(network as Network);
}

/**
 * Get offering by ID
 */
export function getOfferingById(id: string): OfferingTier | undefined {
  return OFFERINGS.find((o) => o.id === id);
}
