// Wallet UI: modal, chain switcher, status display
import { dom } from '../core/dom';
import { getState, setState, savePreferences, type NetworkType } from '../core/state';
import { MAINNET_CHAINS, TESTNET_CHAINS } from '../core/constants';
import { WALLET_NAMES } from '../../../shared/types';
import { detectWallets } from './provider';
import { connectWallet, disconnectWallet } from './connect';
import { addMessage } from '../messages/queue';

export function getChains(): string[] {
  return getState('networkType') === 'mainnet' ? MAINNET_CHAINS : TESTNET_CHAINS;
}

export function updateUI(): void {
  const address = getState('address');
  if (address) {
    dom.wallet.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
    dom.walletStatus.classList.add('connected');
    dom.chainSwitcher.classList.add('connected');
  } else {
    dom.wallet.textContent = 'connect';
    dom.walletStatus.classList.remove('connected');
    dom.chainSwitcher.classList.remove('connected');
  }
}

export function updateChainDisplay(): void {
  const chains = getChains();
  const chainIndex = getState('chainIndex');
  dom.chainName.textContent = chains[chainIndex];
}

export function showWalletModal(): void {
  detectWallets();
  dom.walletModal.classList.add('show');
}

export function hideWalletModal(): void {
  dom.walletModal.classList.remove('show');
}

// Restore UI state from saved preferences
export function restoreUIState(): void {
  const networkType = getState('networkType');
  const selectedAmount = getState('selectedAmount');

  // Restore network toggle
  dom.networkToggle.forEach(el => {
    el.classList.toggle('selected', (el as HTMLElement).dataset.network === networkType);
  });

  // Restore amount selection
  dom.amountSelect.querySelectorAll('.amount-opt').forEach(el => {
    el.classList.toggle('selected', parseFloat((el as HTMLElement).dataset.amount!) === selectedAmount);
  });
}

export function initWalletUI(): void {
  // Chain navigation
  dom.chainPrev.addEventListener('click', () => {
    const chains = getChains();
    const currentIndex = getState('chainIndex');
    const newIndex = (currentIndex - 1 + chains.length) % chains.length;
    setState('chainIndex', newIndex);
    updateChainDisplay();
    savePreferences();
    addMessage(`switched to ${chains[newIndex]}`);
  });

  dom.chainNext.addEventListener('click', () => {
    const chains = getChains();
    const currentIndex = getState('chainIndex');
    const newIndex = (currentIndex + 1) % chains.length;
    setState('chainIndex', newIndex);
    updateChainDisplay();
    savePreferences();
    addMessage(`switched to ${chains[newIndex]}`);
  });

  // Wallet status click - show modal or disconnect
  dom.walletStatus.addEventListener('click', () => {
    if (getState('address')) {
      disconnectWallet();
      addMessage('wallet disconnected');
    } else {
      showWalletModal();
    }
  });

  // Wallet modal close (click outside)
  dom.walletModal.addEventListener('click', (e) => {
    if (e.target === dom.walletModal) hideWalletModal();
  });

  // Network toggle in modal
  dom.networkToggle.forEach(opt => {
    opt.addEventListener('click', () => {
      dom.networkToggle.forEach(el => el.classList.remove('selected'));
      opt.classList.add('selected');
      setState('networkType', (opt as HTMLElement).dataset.network as NetworkType);
      setState('chainIndex', 0); // Reset to first chain
      savePreferences();
    });
  });

  // Wallet option click
  document.querySelectorAll('.wallet-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      if (opt.classList.contains('disabled')) return;

      const walletType = (opt as HTMLElement).dataset.wallet as 'metamask' | 'phantom';
      hideWalletModal();

      try {
        const walletName = WALLET_NAMES[walletType] || walletType;
        addMessage(`connecting ${walletName}...`);
        await connectWallet(walletType);
        updateUI();
        updateChainDisplay();
        addMessage(`${walletName} connected (${getState('networkType')})`, 'success');
      } catch (e) {
        addMessage((e as Error).message, 'error');
      }
    });
  });
}
