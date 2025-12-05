// Effect orchestration - triggers appropriate effect based on amount
import { startHalo } from './halo';
import { startDharmaWheel } from './dharma';
import { startRipples } from './ripple';
import { startLotus } from './lotus';

// Trigger different effects based on amount
// $1.024 = Buddha light halo
// $2.048 = Sanskrit ripples
// $4.096 = Lotus bloom
// $8.192 = Dharma wheel + sutra background
export function triggerEffect(amount: number): void {
  if (amount >= 8.192) {
    startDharmaWheel(4);
  } else if (amount >= 4.096) {
    startLotus(3);
  } else if (amount >= 2.048) {
    startRipples(2);
  } else {
    startHalo();
  }
}
