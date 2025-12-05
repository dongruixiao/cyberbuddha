import type { Network } from './types';

/** PayAI Facilitator URL */
export const FACILITATOR_URL = 'https://facilitator.payai.network';

/** Minimum amount in USD */
export const MIN_AMOUNT = 0.01;

/** Maximum amount in USD */
export const MAX_AMOUNT = 10000;

/** USDC decimals */
export const USDC_DECIMALS = 6;

/** Supported networks */
export const SUPPORTED_NETWORKS: Network[] = [
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
];

/** USDC contract addresses per network */
export const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'polygon': '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  'polygon-amoy': '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  'avalanche': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  'avalanche-fuji': '0x5425890298aed601595a70AB815c96711a31Bc65',
};

export function isNetworkSupported(network: string): network is Network {
  return SUPPORTED_NETWORKS.includes(network as Network);
}

/** Convert USD amount to USDC atomic units */
export function usdToAtomicUnits(usd: number): string {
  return Math.floor(usd * 10 ** USDC_DECIMALS).toString();
}
