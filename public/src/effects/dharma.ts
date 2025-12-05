// Dharma Wheel - Sanskrit/Sutra text rotation effect
import { dom } from '../core/dom';
import { SUTRAS } from '../core/constants';

const DHARMA_SIZE = 900;
const DHARMA_CENTER = DHARMA_SIZE / 2;
const DHARMA_DURATION = 10000;

let dharmaAnimating = false;
let dharmaStart = 0;

interface DharmaChar {
  text: string;
  angle: number;
  opacity: number;
}

interface DharmaRing {
  radius: number;
  speed: number;
  fontSize: number;
  chars: DharmaChar[];
}

// Generate multiple rings - inner rings smaller, outer rings larger
const dharmaRings: DharmaRing[] = [];
const ringCount = 6;
for (let r = 0; r < ringCount; r++) {
  const radius = 80 + r * 55;
  const fontSize = 14 + r * 4; // Inner: 14px, Outer: 34px
  const circumference = 2 * Math.PI * radius;
  const charCount = Math.floor(circumference / (fontSize * 3.2));
  const speed = (r % 2 === 0 ? 1 : -1) * (0.15 + r * 0.03);
  const ring: DharmaRing = { radius, speed, fontSize, chars: [] };
  for (let i = 0; i < charCount; i++) {
    ring.chars.push({
      text: SUTRAS[Math.floor(Math.random() * SUTRAS.length)],
      angle: (i / charCount) * Math.PI * 2,
      opacity: 0.4 + Math.random() * 0.4
    });
  }
  dharmaRings.push(ring);
}

function drawDharmaWheel(timestamp: number): void {
  const ctx = dom.dharmaCanvas.getContext('2d')!;
  const elapsed = timestamp - dharmaStart;
  const progress = Math.min(elapsed / DHARMA_DURATION, 1);

  // Fade in then out
  let opacity = 1;
  if (progress < 0.1) {
    opacity = progress / 0.1;
  } else if (progress > 0.8) {
    opacity = (1 - progress) / 0.2;
  }

  ctx.clearRect(0, 0, DHARMA_SIZE, DHARMA_SIZE);

  if (opacity <= 0) {
    dharmaAnimating = false;
    return;
  }

  ctx.save();
  ctx.globalAlpha = opacity;

  // Draw each ring of text
  for (const ring of dharmaRings) {
    const rotation = (elapsed / 1000) * ring.speed;

    for (const char of ring.chars) {
      const angle = char.angle + rotation;
      const x = DHARMA_CENTER + Math.cos(angle) * ring.radius;
      const y = DHARMA_CENTER + Math.sin(angle) * ring.radius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      // Golden glowing text with classic font
      ctx.font = `300 ${ring.fontSize}px "ZCOOL XiaoWei", "Noto Serif SC", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(200, 160, 50, ${char.opacity * 0.6})`;
      ctx.shadowColor = 'rgba(180, 140, 30, 0.4)';
      ctx.shadowBlur = 5;
      ctx.fillText(char.text, 0, 0);

      ctx.restore();
    }
  }

  ctx.restore();

  if (dharmaAnimating) {
    requestAnimationFrame(drawDharmaWheel);
  }
}

export function startDharmaWheel(level: number): void {
  // level: 1=small, 2=medium, 3=large, 4=maximum
  // Randomize text and adjust brightness based on level
  const brightnessMultiplier = 0.6 + level * 0.15;
  for (const ring of dharmaRings) {
    for (const char of ring.chars) {
      char.text = SUTRAS[Math.floor(Math.random() * SUTRAS.length)];
      char.opacity = (0.3 + Math.random() * 0.5) * brightnessMultiplier;
    }
  }
  dharmaAnimating = true;
  dharmaStart = performance.now();
  requestAnimationFrame(drawDharmaWheel);
}
