// Wallet connection management
import { state } from '../core/state';
import { getProvider, WalletType } from './provider';
import { updateUI } from './ui';

export async function connectWallet(walletType: WalletType): Promise<void> {
  const provider = getProvider(walletType);
  if (!provider) throw new Error(`${walletType} not installed`);

  const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
  state.address = accounts[0];
  state.chainId = parseInt(await provider.request({ method: 'eth_chainId' }) as string, 16);
  state.walletType = walletType;
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
        state.address = accounts[0];
        state.chainId = parseInt(await provider.request({ method: 'eth_chainId' }) as string, 16);
        state.walletType = walletType;
        setupWalletListeners(provider);
        updateUI();
        return;
      }
    } catch (e) {
      console.log(`[Wallet] Failed to restore ${walletType}:`, e);
    }
  }
}

function setupWalletListeners(provider: NonNullable<Window['ethereum']>): void {
  provider.removeAllListeners?.('accountsChanged');
  provider.removeAllListeners?.('chainChanged');
  provider.on('accountsChanged', (accs: unknown) => {
    const accounts = accs as string[];
    state.address = accounts[0] || null;
    if (!accounts[0]) state.walletType = null;
    updateUI();
  });
  provider.on('chainChanged', () => location.reload());
}

export function disconnectWallet(): void {
  state.address = null;
  state.chainId = null;
  state.walletType = null;
  updateUI();
}
