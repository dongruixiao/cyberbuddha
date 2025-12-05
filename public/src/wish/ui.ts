// Wish UI: input handlers, amount selection, bless button
import { dom } from '../core/dom';
import { getState, setState, savePreferences } from '../core/state';
import { addMessage } from '../messages/queue';
import { makeWish } from './service';
import { triggerEffect } from '../effects/trigger';
import { startCoinFlip } from '../effects/background';
import { getChains } from '../wallet/ui';

export function initWishUI(): void {
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
      addMessage('please connect wallet first', 'error');
      return;
    }

    try {
      dom.action.disabled = true;
      addMessage(`preparing $${amount} payment...`);
      const network = getChains()[chainIndex];
      const result = await makeWish(amount, dom.wish.value || undefined, network);
      console.log('[Wish] Payment success, triggering effect for amount:', amount, result);
      addMessage(result.message, 'success');

      // Show warning if DB save failed
      if (result.warning) {
        addMessage(result.warning, 'error');
      }

      triggerEffect(amount);
      startCoinFlip(amount);
      dom.wish.value = '';
    } catch (e) {
      console.error('[Wish] Payment error:', e);
      addMessage((e as Error).message, 'error');
    }
    finally { dom.action.disabled = false; }
  });
}
