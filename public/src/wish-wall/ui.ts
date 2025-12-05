// Wish wall UI: modal, rendering, pagination
import { dom } from '../core/dom';
import { loadWishes, formatAddr, formatTime, getTxUrl, WishRecord } from './service';

interface WishWallState {
  page: number;
  total: number;
  perPage: number;
  loading: boolean;
}

const wishWallState: WishWallState = { page: 1, total: 0, perPage: 6, loading: false };

function renderWishes(wishes: WishRecord[]): void {
  if (!wishes.length) {
    dom.wishWallList.innerHTML = '<div class="wish-wall-empty">no wishes yet... be the first!</div>';
    return;
  }

  dom.wishWallList.innerHTML = wishes.map(w => `
    <div class="wish-item">
      <div class="wish-item-header">
        <span class="wish-item-addr">${formatAddr(w.payer)}</span>
        <div class="wish-item-meta">
          <span class="wish-item-amount">$${w.amount}</span>
          <span class="wish-item-network">${w.network}</span>
        </div>
      </div>
      <div class="wish-item-content">${w.content || '心诚则灵'}</div>
      <div class="wish-item-footer">
        <span>${formatTime(w.created_at)}</span>
        ${w.tx_hash ? `<a class="wish-item-tx" href="${getTxUrl(w.network, w.tx_hash)}" target="_blank" rel="noopener">[tx]</a>` : ''}
      </div>
    </div>
  `).join('');
}

function updateWishWallPagination(): void {
  const totalPages = Math.max(1, Math.ceil(wishWallState.total / wishWallState.perPage));
  dom.wishWallPage.textContent = `${wishWallState.page}/${totalPages}`;

  dom.wishWallPrev.classList.toggle('disabled', wishWallState.page <= 1);
  dom.wishWallNext.classList.toggle('disabled', wishWallState.page >= totalPages);
}

async function fetchWishes(page: number = 1): Promise<void> {
  if (wishWallState.loading) return;
  wishWallState.loading = true;

  try {
    const data = await loadWishes(page, wishWallState.perPage);

    wishWallState.page = page;
    wishWallState.total = data.total;

    renderWishes(data.wishes);
    updateWishWallPagination();
  } catch (e) {
    console.error('[WishWall] Failed to load wishes:', e);
    dom.wishWallList.innerHTML = '<div class="wish-wall-empty">failed to load wishes</div>';
  } finally {
    wishWallState.loading = false;
  }
}

export function showWishWall(): void {
  dom.wishWallModal.classList.add('show');
  fetchWishes(1);
}

export function hideWishWall(): void {
  dom.wishWallModal.classList.remove('show');
}

export function initWishWallUI(): void {
  // Wish wall event listeners
  dom.wishWallLink.addEventListener('click', showWishWall);
  dom.wishWallModal.addEventListener('click', (e) => {
    if (e.target === dom.wishWallModal) hideWishWall();
  });
  dom.wishWallPrev.addEventListener('click', () => {
    if (wishWallState.page > 1 && !wishWallState.loading) {
      fetchWishes(wishWallState.page - 1);
    }
  });
  dom.wishWallNext.addEventListener('click', () => {
    const totalPages = Math.ceil(wishWallState.total / wishWallState.perPage);
    if (wishWallState.page < totalPages && !wishWallState.loading) {
      fetchWishes(wishWallState.page + 1);
    }
  });
}
