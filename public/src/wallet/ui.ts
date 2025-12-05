// Wallet UI: modal, chain switcher, status display
import { dom } from '../core/dom';
import { state, savePreferences } from '../core/state';
import { MAINNET_CHAINS, TESTNET_CHAINS } from '../core/constants';
import { detectWallets } from './provider';
import { connectWallet, disconnectWallet } from './connect';
import { addMessage } from '../messages/queue';

export function getChains(): string[] {
  return state.networkType === 'mainnet' ? MAINNET_CHAINS : TESTNET_CHAINS;
}

export function updateUI(): void {
  if (state.address) {
    dom.wallet.textContent = `${state.address.slice(0, 6)}...${state.address.slice(-4)}`;
    dom.walletStatus.classList.add('connected');
    dom.chainSwitcher.classList.add('connected');
  } else {
    dom.wallet.textContent = 'connect wallet';
    dom.walletStatus.classList.remove('connected');
    dom.chainSwitcher.classList.remove('connected');
  }
}

export function updateChainDisplay(): void {
  const chains = getChains();
  dom.chainName.textContent = chains[state.chainIndex];
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
  // Restore network toggle
  dom.networkToggle.forEach(el => {
    el.classList.toggle('selected', (el as HTMLElement).dataset.network === state.networkType);
  });

  // Restore amount selection
  dom.amountSelect.querySelectorAll('.amount-opt').forEach(el => {
    el.classList.toggle('selected', parseFloat((el as HTMLElement).dataset.amount!) === state.selectedAmount);
  });
}

export function initWalletUI(): void {
  // Chain navigation
  dom.chainPrev.addEventListener('click', () => {
    const chains = getChains();
    state.chainIndex = (state.chainIndex - 1 + chains.length) % chains.length;
    updateChainDisplay();
    savePreferences();
    addMessage(`switched to ${chains[state.chainIndex]}`);
  });

  dom.chainNext.addEventListener('click', () => {
    const chains = getChains();
    state.chainIndex = (state.chainIndex + 1) % chains.length;
    updateChainDisplay();
    savePreferences();
    addMessage(`switched to ${chains[state.chainIndex]}`);
  });

  // Wallet status click - show modal or disconnect
  dom.walletStatus.addEventListener('click', () => {
    if (state.address) {
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
      state.networkType = (opt as HTMLElement).dataset.network as 'mainnet' | 'testnet';
      state.chainIndex = 0; // Reset to first chain
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
        addMessage(`connecting ${walletType}...`);
        await connectWallet(walletType);
        updateUI();
        updateChainDisplay();
        addMessage(`${walletType} connected (${state.networkType})`, 'success');
      } catch (e) {
        addMessage((e as Error).message, 'error');
      }
    });
  });
}
