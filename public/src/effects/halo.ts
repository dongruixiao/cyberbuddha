// Buddha light halo effect (CSS animation)
import { dom } from '../core/dom';

export function startHalo(): void {
  dom.buddhaLight.classList.remove('active');
  void dom.buddhaLight.offsetWidth; // Force reflow
  dom.buddhaLight.classList.add('active');
}
