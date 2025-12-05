// Lotus Bloom Effect
import { dom } from '../core/dom';
import { LOTUS_CHARS } from '../core/constants';

const LOTUS_SIZE = 900;
const LOTUS_CENTER = LOTUS_SIZE / 2;
const LOTUS_DURATION = 10000;

let lotusAnimating = false;
let lotusStart = 0;

interface LotusPetal {
  angle: number;
  char: string;
  length: number;
  width: number;
  delay: number;
  opacity: number;
}

let lotusPetals: LotusPetal[] = [];

function initLotus(): void {
  lotusPetals = [];
  const petalCount = 12; // 12-petal lotus
  for (let i = 0; i < petalCount; i++) {
    lotusPetals.push({
      angle: (i / petalCount) * Math.PI * 2,
      char: LOTUS_CHARS[Math.floor(Math.random() * LOTUS_CHARS.length)],
      length: 280 + Math.random() * 70,
      width: 80 + Math.random() * 30,
      delay: Math.random() * 500,
      opacity: 0.5 + Math.random() * 0.3
    });
  }
}

function drawLotus(timestamp: number): void {
  const ctx = dom.lotusCanvas.getContext('2d')!;
  const elapsed = timestamp - lotusStart;
  ctx.clearRect(0, 0, LOTUS_SIZE, LOTUS_SIZE);

  if (elapsed > LOTUS_DURATION) {
    lotusAnimating = false;
    return;
  }

  const overallProgress = elapsed / LOTUS_DURATION;

  // Overall fade in/out
  let masterAlpha = 1;
  if (overallProgress < 0.1) masterAlpha = overallProgress / 0.1;
  else if (overallProgress > 0.8) masterAlpha = (1 - overallProgress) / 0.2;

  // Lotus rotation and bloom (smooth transition)
  const rotationDuration = 6000;
  const rotationProgress = Math.min(elapsed / rotationDuration, 1);
  // Smoother easing
  const easedRotation = 1 - Math.pow(1 - rotationProgress, 2);
  const rotation = easedRotation * Math.PI * 0.4 + (elapsed / 1000) * 0.02;

  ctx.save();
  ctx.translate(LOTUS_CENTER, LOTUS_CENTER);
  ctx.rotate(rotation);

  for (const petal of lotusPetals) {
    const petalTime = elapsed - petal.delay;
    if (petalTime < 0) continue;

    // Bloom expansion: slow and natural
    const expandDuration = 5000;
    const bloomProgress = Math.min(petalTime / expandDuration, 1);

    // Smooth ease-in-out function
    const eased = bloomProgress < 0.5
      ? 2 * bloomProgress * bloomProgress
      : 1 - Math.pow(-2 * bloomProgress + 2, 2) / 2;

    // Petal subtle breathing effect
    const breath = 1 + Math.sin(elapsed / 1200 + petal.angle) * 0.025;
    const length = petal.length * eased * breath;
    const width = petal.width * eased * breath;

    ctx.save();
    ctx.rotate(petal.angle);

    // Draw petal outline (Bezier curve)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      width * 0.5, -length * 0.3,
      width * 0.8, -length * 0.7,
      0, -length
    );
    ctx.bezierCurveTo(
      -width * 0.8, -length * 0.7,
      -width * 0.5, -length * 0.3,
      0, 0
    );

    // Petal gradient fill (subtle)
    const gradient = ctx.createLinearGradient(0, 0, 0, -length);
    gradient.addColorStop(0, `rgba(255, 180, 200, ${masterAlpha * petal.opacity * 0.25})`);
    gradient.addColorStop(0.5, `rgba(255, 200, 180, ${masterAlpha * petal.opacity * 0.18})`);
    gradient.addColorStop(1, `rgba(255, 220, 200, ${masterAlpha * petal.opacity * 0.08})`);

    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(255, 150, 180, 0.15)';
    ctx.shadowBlur = 6;
    ctx.fill();

    // Petal edge
    ctx.strokeStyle = `rgba(255, 180, 150, ${masterAlpha * petal.opacity * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Sanskrit on petal
    if (bloomProgress > 0.5) {
      const charAlpha = (bloomProgress - 0.5) * 2;
      ctx.font = '300 24px "ZCOOL XiaoWei", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(200, 150, 100, ${masterAlpha * charAlpha * petal.opacity * 0.6})`;
      ctx.shadowColor = 'rgba(180, 120, 60, 0.2)';
      ctx.shadowBlur = 2;
      ctx.fillText(petal.char, 0, -length * 0.5);
    }

    ctx.restore();
  }

  // Lotus center glow
  const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
  centerGlow.addColorStop(0, `rgba(255, 220, 150, ${masterAlpha * 0.35})`);
  centerGlow.addColorStop(0.5, `rgba(255, 200, 100, ${masterAlpha * 0.18})`);
  centerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = centerGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 60, 0, Math.PI * 2);
  ctx.fill();

  // Center Om symbol
  ctx.font = '300 42px "ZCOOL XiaoWei", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(200, 150, 50, ${masterAlpha * 0.5})`;
  ctx.shadowColor = 'rgba(180, 120, 30, 0.5)';
  ctx.shadowBlur = 6;
  ctx.fillText('ॐ', 0, 0);

  ctx.restore();

  if (lotusAnimating) {
    requestAnimationFrame(drawLotus);
  }
}

export function startLotus(level: number): void {
  initLotus();
  // Adjust brightness based on level
  const brightnessMultiplier = 0.7 + level * 0.1;
  for (const petal of lotusPetals) {
    petal.opacity *= brightnessMultiplier;
  }
  lotusAnimating = true;
  lotusStart = performance.now();
  requestAnimationFrame(drawLotus);
}
