// Main entry point - orchestrates all modules
import '../styles/variables.css';
import '../styles/layout.css';
import '../styles/wallet.css';
import '../styles/terminal.css';
import '../styles/effects.css';
import '../styles/wish-wall.css';

import { state } from './core/state';
import { initDOM } from './core/dom';
import { initWalletUI, updateUI, updateChainDisplay, restoreUIState } from './wallet/ui';
import { tryRestoreWallet } from './wallet/connect';
import { initWishUI } from './wish/ui';
import { fetchConfig } from './wish/service';
import { initPixiBackground } from './effects/background';
import { initWishWallUI } from './wish-wall/ui';
import { addMessage } from './messages/queue';

async function init(): Promise<void> {
  // Initialize DOM cache
  initDOM();

  // Initialize UI modules
  initWalletUI();
  initWishUI();
  initWishWallUI();

  // Initialize PixiJS background
  await initPixiBackground();

  try {
    // Fetch server config
    state.config = await fetchConfig();

    // Try to restore wallet connection
    await tryRestoreWallet();

    // Restore UI state from localStorage
    restoreUIState();

    // Update displays
    updateUI();
    updateChainDisplay();
  } catch (e) {
    addMessage('failed to load config', 'error');
    console.error('[Init] Error:', e);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
