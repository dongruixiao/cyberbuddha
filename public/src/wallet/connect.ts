// Wallet connection management
import { setState, resetWalletState, type WalletType } from '../core/state';
import { getProvider, isMobile, isInWalletBrowser, openWalletApp } from './provider';
import { updateUI } from './ui';

export async function connectWallet(walletType: WalletType): Promise<void> {
  const provider = getProvider(walletType);

  // On mobile without provider, open wallet app via deep link
  if (!provider) {
    if (isMobile() && !isInWalletBrowser()) {
      openWalletApp(walletType);
      return; // Page will redirect to wallet app
    }
    throw new Error(`${walletType} not installed`);
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
  setState('address', accounts[0]);
  setState('chainId', parseInt(await provider.request({ method: 'eth_chainId' }) as string, 16));
  setState('walletType', walletType);
  setupWalletListeners(provider);
}

// Try to restore previously connected wallet (no popup)
export async function tryRestoreWallet(): Promise<void> {
  // Try MetaMask first, then Phantom
  for (const walletType of ['metamask', 'phantom'] as WalletType[]) {
    const provider = getProvider(walletType);
    if (!provider) continue;

    try {
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
      if (accounts.length > 0) {
        setState('address', accounts[0]);
        setState('chainId', parseInt(await provider.request({ method: 'eth_chainId' }) as string, 16));
        setState('walletType', walletType);
        setupWalletListeners(provider);
        updateUI();
        return;
      }
    } catch (e) {
      console.log(`[wallet] failed to restore ${walletType}:`, e);
    }
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function setupWalletListeners(provider: NonNullable<Window['ethereum']>): void {
  provider.removeAllListeners?.('accountsChanged');
  provider.removeAllListeners?.('chainChanged');
  provider.on('accountsChanged', (accs: unknown) => {
    if (!isStringArray(accs)) return;
    setState('address', accs[0] || null);
    if (!accs[0]) setState('walletType', null);
    updateUI();
  });
  provider.on('chainChanged', (chainId: unknown) => {
    if (typeof chainId === 'string') {
      setState('chainId', parseInt(chainId, 16));
      updateUI();
    }
  });
}

export function disconnectWallet(): void {
  resetWalletState();
  updateUI();
}
