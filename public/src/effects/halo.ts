// Buddha light halo effect (CSS animation)
import { dom } from '../core/dom';

export function startHalo(): void {
  // Remove active class and reset animation
  dom.buddhaLight.classList.remove('active');
  dom.buddhaLight.style.animation = 'none';

  // Use rAF to batch changes and avoid synchronous reflow
  requestAnimationFrame(() => {
    dom.buddhaLight.style.animation = '';
    dom.buddhaLight.classList.add('active');
  });
}
