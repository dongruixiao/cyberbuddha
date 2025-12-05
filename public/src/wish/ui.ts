// Wish UI: input handlers, amount selection, bless button
import { dom } from '../core/dom';
import { getState, setState, savePreferences } from '../core/state';
import { addMessage } from '../messages/queue';
import { makeWish } from './service';
import { triggerEffect } from '../effects/trigger';
import { startCoinFlip } from '../effects/background';
import { getChains } from '../wallet/ui';

// Debounce timer for typing effect
let typingTimer: number | null = null;
const TYPING_TIMEOUT = 800; // ms after last keystroke to stop effect

export function initWishUI(): void {
  // Buddha breathing effect when typing
  dom.wish.addEventListener('input', () => {
    dom.buddhaWrapper.classList.add('typing');

    // Clear existing timer
    if (typingTimer !== null) {
      clearTimeout(typingTimer);
    }

    // Stop effect after user stops typing
    typingTimer = window.setTimeout(() => {
      dom.buddhaWrapper.classList.remove('typing');
      typingTimer = null;
    }, TYPING_TIMEOUT);
  });

  // Also stop when input loses focus
  dom.wish.addEventListener('blur', () => {
    if (typingTimer !== null) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
    dom.buddhaWrapper.classList.remove('typing');
  });

  // Amount selection
  dom.amountSelect.addEventListener('click', (e) => {
    const opt = (e.target as HTMLElement).closest('.amount-opt');
    if (!opt) return;
    dom.amountSelect.querySelectorAll('.amount-opt').forEach(el => el.classList.remove('selected'));
    opt.classList.add('selected');
    setState('selectedAmount', parseFloat((opt as HTMLElement).dataset.amount!));
    savePreferences();
  });

  // Make wish on action button click
  dom.action.addEventListener('click', async () => {
    const amount = getState('selectedAmount');
    const address = getState('address');
    const chainIndex = getState('chainIndex');

    if (!address) {
      addMessage('connect wallet first, pilgrim', 'error');
      return;
    }

    try {
      dom.action.disabled = true;
      addMessage(`preparing $${amount} karma...`);
      const network = getChains()[chainIndex];
      const result = await makeWish(amount, dom.wish.value || undefined, network);
      console.log('[wish] payment success, triggering effect:', amount, result);
      addMessage(result.message, 'success');

      // Show warning if DB save failed
      if (result.warning) {
        addMessage(result.warning, 'error');
      }

      triggerEffect(amount);
      startCoinFlip(amount);
      dom.wish.value = '';
    } catch (e) {
      console.error('[wish] payment error:', e);
      addMessage((e as Error).message, 'error');
    }
    finally { dom.action.disabled = false; }
  });
}
