// Sanskrit Ripple Effect
import { dom } from '../core/dom';
import { MANTRAS } from '../core/constants';

const RIPPLE_SIZE = 900;
const RIPPLE_CENTER = RIPPLE_SIZE / 2;
const RIPPLE_DURATION = 10000;

let rippleAnimating = false;
let rippleStart = 0;

interface RippleChar {
  text: string;
  angle: number;
  opacity: number;
}

interface Ripple {
  startRadius: number;
  maxRadius: number;
  delay: number;
  chars: RippleChar[];
  speed: number;
}

let ripples: Ripple[] = [];

function initRipples(): void {
  ripples = [];
  // Create 5 ripple rings, each carrying mantras
  for (let i = 0; i < 5; i++) {
    const mantraCount = 6 + i * 2; // Fewer in inner rings, more in outer
    const chars: RippleChar[] = [];
    for (let j = 0; j < mantraCount; j++) {
      chars.push({
        text: MANTRAS[Math.floor(Math.random() * MANTRAS.length)],
        angle: (j / mantraCount) * Math.PI * 2 + Math.random() * 0.2,
        opacity: 0.5 + Math.random() * 0.3
      });
    }
    ripples.push({
      startRadius: 50,
      maxRadius: 350,
      delay: i * 400, // Staggered delay per ring
      chars,
      speed: 0.08 + Math.random() * 0.02
    });
  }
}

function drawRipples(timestamp: number): void {
  const ctx = dom.rippleCanvas.getContext('2d')!;
  const elapsed = timestamp - rippleStart;
  ctx.clearRect(0, 0, RIPPLE_SIZE, RIPPLE_SIZE);

  let anyActive = false;

  for (const ripple of ripples) {
    const rippleTime = elapsed - ripple.delay;
    if (rippleTime < 0) {
      anyActive = true;
      continue;
    }
    if (rippleTime > RIPPLE_DURATION) continue;

    anyActive = true;
    const progress = rippleTime / RIPPLE_DURATION;

    // Ripple expansion
    const radius = ripple.startRadius + (ripple.maxRadius - ripple.startRadius) * progress;

    // Fade in/out
    let alpha = 1;
    if (progress < 0.1) alpha = progress / 0.1;
    else if (progress > 0.7) alpha = (1 - progress) / 0.3;

    // Draw ripple ring
    ctx.beginPath();
    ctx.arc(RIPPLE_CENTER, RIPPLE_CENTER, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(180, 150, 80, ${alpha * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw mantras on the ripple
    const rotation = (rippleTime / 1000) * ripple.speed;
    for (const char of ripple.chars) {
      const angle = char.angle + rotation;
      const x = RIPPLE_CENTER + Math.cos(angle) * radius;
      const y = RIPPLE_CENTER + Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      const fontSize = 14 + progress * 6; // Grow as it expands
      ctx.font = `300 ${fontSize}px "ZCOOL XiaoWei", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(200, 170, 80, ${alpha * char.opacity})`;
      ctx.shadowColor = 'rgba(180, 140, 30, 0.3)';
      ctx.shadowBlur = 4;
      ctx.fillText(char.text, 0, 0);

      ctx.restore();
    }
  }

  if (anyActive && rippleAnimating) {
    requestAnimationFrame(drawRipples);
  } else {
    rippleAnimating = false;
  }
}

export function startRipples(level: number): void {
  initRipples();
  // Adjust brightness based on level
  const brightnessMultiplier = 0.7 + level * 0.1;
  for (const ripple of ripples) {
    for (const char of ripple.chars) {
      char.opacity *= brightnessMultiplier;
    }
  }
  rippleAnimating = true;
  rippleStart = performance.now();
  requestAnimationFrame(drawRipples);
}
