// Message queue system for user notifications
import { dom } from '../core/dom';

const MSG_MAX = 5;
const MSG_LIFETIME = 6000; // ms

interface Message {
  text: string;
  type: string;
  id: number;
  el: HTMLElement | null;
}

const messages: Message[] = [];

function renderMessages(): void {
  // Use DocumentFragment to batch DOM operations (perf optimization)
  const fragment = document.createDocumentFragment();
  messages.forEach((msg, i) => {
    const el = document.createElement('div');
    el.className = `msg-item ${msg.type}`;
    // Newer = brighter, older = dimmer
    const opacity = 1 - (i / MSG_MAX) * 0.6;
    el.style.opacity = String(opacity);
    el.textContent = msg.text;
    msg.el = el;
    fragment.appendChild(el);
  });
  // Single DOM update instead of multiple appends
  dom.msgQueue.innerHTML = '';
  dom.msgQueue.appendChild(fragment);
}

export function addMessage(text: string, type: '' | 'error' | 'success' = ''): void {
  const msg: Message = { text, type, id: Date.now(), el: null };
  messages.unshift(msg);

  // Remove oldest if over limit
  while (messages.length > MSG_MAX) {
    const old = messages.pop();
    if (old?.el) old.el.remove();
  }

  renderMessages();

  // Auto fade out
  setTimeout(() => {
    const idx = messages.findIndex(m => m.id === msg.id);
    if (idx !== -1) {
      messages.splice(idx, 1);
      renderMessages();
    }
  }, MSG_LIFETIME);
}
