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

// Mobile detection
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if we're inside a wallet's in-app browser
export function isInWalletBrowser(): boolean {
  return !!(window.ethereum?.isMetaMask || window.phantom?.ethereum);
}

// Deep link URLs for mobile wallets
const DEEP_LINKS = {
  metamask: {
    // MetaMask universal link - opens the dApp in MetaMask browser
    universal: (url: string) => `https://metamask.app.link/dapp/${url}`,
    // Direct deep link (fallback)
    deeplink: (url: string) => `metamask://dapp/${url}`,
  },
  phantom: {
    // Phantom universal link for EVM
    universal: (url: string) => `https://phantom.app/ul/browse/${encodeURIComponent(`https://${url}`)}`,
    // Direct deep link
    deeplink: (url: string) => `phantom://browse/${encodeURIComponent(`https://${url}`)}`,
  },
};

// Open wallet app on mobile via deep link
export function openWalletApp(walletType: WalletType): void {
  const currentUrl = window.location.host + window.location.pathname;
  const links = DEEP_LINKS[walletType];

  // Try universal link first (works better on iOS)
  window.location.href = links.universal(currentUrl);
}

export function getProvider(walletType: WalletType): Window['ethereum'] | null {
  if (walletType === 'metamask') {
    return window.ethereum?.isMetaMask ? window.ethereum : null;
  } else if (walletType === 'phantom') {
    return window.phantom?.ethereum;
  }
  return null;
}

// Check if provider is available, considering mobile
export function isProviderAvailable(walletType: WalletType): boolean {
  // On desktop or in wallet browser, check for injected provider
  if (!isMobile() || isInWalletBrowser()) {
    return !!getProvider(walletType);
  }
  // On mobile outside wallet browser, we can use deep links
  return true;
}

export function detectWallets(): void {
  const mobile = isMobile();
  const inWalletBrowser = isInWalletBrowser();

  // On mobile outside wallet browser, show both options (will use deep links)
  if (mobile && !inWalletBrowser) {
    dom.optMetamask.classList.remove('disabled');
    dom.optPhantom.classList.remove('disabled');
    dom.optMetamask.title = 'Open in MetaMask';
    dom.optPhantom.title = 'Open in Phantom';
    return;
  }

  // Desktop or in-wallet browser: check for injected providers
  const hasMetaMask = !!window.ethereum?.isMetaMask;
  const hasPhantom = !!window.phantom?.ethereum;

  dom.optMetamask.classList.toggle('disabled', !hasMetaMask);
  dom.optPhantom.classList.toggle('disabled', !hasPhantom);

  if (!hasMetaMask) dom.optMetamask.title = 'MetaMask not installed';
  if (!hasPhantom) dom.optPhantom.title = 'Phantom not installed';
}
