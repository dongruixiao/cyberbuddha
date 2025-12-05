// Wallet provider detection and management
import { dom } from '../core/dom';

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeAllListeners?: (event?: string) => void;
    };
    phantom?: {
      ethereum?: Window['ethereum'];
    };
  }
}

export type WalletType = 'metamask' | 'phantom';

export function getProvider(walletType: WalletType): Window['ethereum'] | null {
  if (walletType === 'metamask') {
    return window.ethereum?.isMetaMask ? window.ethereum : null;
  } else if (walletType === 'phantom') {
    return window.phantom?.ethereum;
  }
  return null;
}

export function detectWallets(): void {
  const hasMetaMask = !!window.ethereum?.isMetaMask;
  const hasPhantom = !!window.phantom?.ethereum;

  dom.optMetamask.classList.toggle('disabled', !hasMetaMask);
  dom.optPhantom.classList.toggle('disabled', !hasPhantom);

  if (!hasMetaMask) dom.optMetamask.title = 'MetaMask not installed';
  if (!hasPhantom) dom.optPhantom.title = 'Phantom not installed';
}
