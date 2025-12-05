// Global application state management with getter/setter pattern
import { AMOUNTS, WishConfig } from '../../../shared/types';

// localStorage keys
const STORAGE_KEYS = {
  NETWORK_TYPE: 'cb_networkType',
  CHAIN_INDEX: 'cb_chainIndex',
  AMOUNT: 'cb_amount',
} as const;

export type WalletType = 'metamask' | 'phantom';
export type NetworkType = 'mainnet' | 'testnet';

export interface AppState {
  address: string | null;
  chainId: number | null;
  config: WishConfig | null;
  chainIndex: number;
  selectedAmount: number;
  walletType: WalletType | null;
  networkType: NetworkType;
}

// Private state - not directly accessible
const _state: AppState = {
  address: null,
  chainId: null,
  config: null,
  chainIndex: loadNumber(STORAGE_KEYS.CHAIN_INDEX, 0),
  selectedAmount: loadAmount(),
  walletType: null,
  networkType: loadNetworkType(),
};

// State change listeners
type StateListener<K extends keyof AppState> = (value: AppState[K], oldValue: AppState[K]) => void;
const listeners: Partial<Record<keyof AppState, StateListener<keyof AppState>[]>> = {};

// Load helpers
function loadNumber(key: string, defaultValue: number): number {
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function loadAmount(): number {
  const stored = localStorage.getItem(STORAGE_KEYS.AMOUNT);
  if (stored === null) return 2.048;
  const parsed = parseFloat(stored);
  return AMOUNTS.includes(parsed) ? parsed : 2.048;
}

function loadNetworkType(): NetworkType {
  const stored = localStorage.getItem(STORAGE_KEYS.NETWORK_TYPE);
  return stored === 'testnet' ? 'testnet' : 'mainnet';
}

// Getter - returns immutable copy for objects, direct value for primitives
export function getState<K extends keyof AppState>(key: K): AppState[K] {
  const value = _state[key];
  // Return copy of objects to prevent mutation
  if (value !== null && typeof value === 'object') {
    return { ...value } as AppState[K];
  }
  return value;
}

// Get full state snapshot (immutable)
export function getStateSnapshot(): Readonly<AppState> {
  return {
    ..._state,
    config: _state.config ? { ..._state.config } : null,
  };
}

// Setter - validates and notifies listeners
export function setState<K extends keyof AppState>(key: K, value: AppState[K]): void {
  const oldValue = _state[key];

  // Skip if value hasn't changed
  if (oldValue === value) return;

  // Type-specific validation
  switch (key) {
    case 'selectedAmount':
      if (typeof value === 'number' && !AMOUNTS.includes(value)) {
        console.warn(`[state] invalid amount: ${value}`);
        return;
      }
      break;
    case 'networkType':
      if (value !== 'mainnet' && value !== 'testnet') {
        console.warn(`[state] invalid network type: ${value}`);
        return;
      }
      break;
    case 'chainIndex':
      if (typeof value === 'number' && value < 0) {
        console.warn(`[state] invalid chain index: ${value}`);
        return;
      }
      break;
  }

  // Update state
  _state[key] = value;

  // Notify listeners
  const keyListeners = listeners[key];
  if (keyListeners) {
    for (const listener of keyListeners) {
      try {
        listener(value, oldValue);
      } catch (err) {
        console.error(`[state] listener error for ${key}:`, err);
      }
    }
  }
}

// Batch update multiple state values
export function setStateMany(updates: Partial<AppState>): void {
  for (const [key, value] of Object.entries(updates)) {
    setState(key as keyof AppState, value as AppState[keyof AppState]);
  }
}

// Subscribe to state changes
export function onStateChange<K extends keyof AppState>(
  key: K,
  listener: StateListener<K>
): () => void {
  if (!listeners[key]) {
    listeners[key] = [];
  }
  listeners[key]!.push(listener as StateListener<keyof AppState>);

  // Return unsubscribe function
  return () => {
    const keyListeners = listeners[key];
    if (keyListeners) {
      const index = keyListeners.indexOf(listener as StateListener<keyof AppState>);
      if (index > -1) {
        keyListeners.splice(index, 1);
      }
    }
  };
}

// Save preferences to localStorage
export function savePreferences(): void {
  localStorage.setItem(STORAGE_KEYS.NETWORK_TYPE, _state.networkType);
  localStorage.setItem(STORAGE_KEYS.CHAIN_INDEX, _state.chainIndex.toString());
  localStorage.setItem(STORAGE_KEYS.AMOUNT, _state.selectedAmount.toString());
}

// Reset wallet-related state (for disconnect)
export function resetWalletState(): void {
  setState('address', null);
  setState('chainId', null);
  setState('walletType', null);
}

// Re-export WishConfig for convenience
export type { WishConfig };
