// Global application state management
import { AMOUNTS } from './constants';

export interface WishConfig {
  network: string;
  asset: string;
  minAmount: number;
  recipient: string;
}

export interface AppState {
  address: string | null;
  chainId: number | null;
  config: WishConfig | null;
  chainIndex: number;
  selectedAmount: number;
  walletType: 'metamask' | 'phantom' | null;
  networkType: 'mainnet' | 'testnet';
}

// Load saved preferences from localStorage
const savedNetworkType = localStorage.getItem('cb_networkType') || 'mainnet';
const savedChainIndex = parseInt(localStorage.getItem('cb_chainIndex') || '0');
const savedAmount = parseFloat(localStorage.getItem('cb_amount') || '2.048');

export const state: AppState = {
  address: null,
  chainId: null,
  config: null,
  chainIndex: savedChainIndex,
  selectedAmount: AMOUNTS.includes(savedAmount) ? savedAmount : 2.048,
  walletType: null,
  networkType: savedNetworkType as 'mainnet' | 'testnet',
};

// Save preferences to localStorage
export function savePreferences(): void {
  localStorage.setItem('cb_networkType', state.networkType);
  localStorage.setItem('cb_chainIndex', state.chainIndex.toString());
  localStorage.setItem('cb_amount', state.selectedAmount.toString());
}
