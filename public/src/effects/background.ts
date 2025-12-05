// PixiJS GPU-accelerated background animation
import * as PIXI from 'pixi.js';
import { BG_SUTRAS } from '../core/constants';

const ANIMATION_DURATION = 10;
const MAX_DELAY = 3;

let pixiApp: PIXI.Application | null = null;

interface SpriteData {
  baseOpacity: number;
  delay: number;
  is1024: boolean;
  sutra: string;
  originalText: string;
  targetText?: string;
}

interface TextSpriteWithData extends PIXI.Text {
  _data: SpriteData;
}

let textSprites: TextSpriteWithData[] = [];
let animating = false;
let animationStart = 0;
let tickerBound = false;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animationLoop(): void {
  if (!animating) return;

  const elapsed = (performance.now() - animationStart) / 1000;

  for (const sprite of textSprites) {
    const data = sprite._data;
    const itemTime = elapsed - data.delay;

    if (itemTime > 0 && itemTime < ANIMATION_DURATION) {
      const progress = easeInOut(itemTime / ANIMATION_DURATION);
      const angle = progress * Math.PI * 2;
      const scaleX = Math.cos(angle);

      sprite.scale.x = Math.abs(scaleX);
      const brightness = 1 + 2 * Math.sin(progress * Math.PI);
      sprite.alpha = data.baseOpacity * brightness;

      // Switch text when flipped to back side
      if (scaleX < 0 && sprite.text === data.originalText) {
        sprite.text = data.targetText || data.originalText;
      } else if (scaleX >= 0 && sprite.text !== data.originalText && itemTime < ANIMATION_DURATION / 2) {
        sprite.text = data.originalText;
      }
    } else if (itemTime >= ANIMATION_DURATION) {
      sprite.scale.x = 1;
      sprite.alpha = data.baseOpacity;
      sprite.text = data.targetText || data.originalText;
    }
  }

  // Animation complete
  if (elapsed >= ANIMATION_DURATION + MAX_DELAY) {
    animating = false;
    // Final state
    for (const sprite of textSprites) {
      sprite.scale.x = 1;
      sprite.alpha = sprite._data.baseOpacity;
      sprite.text = sprite._data.targetText || sprite._data.originalText;
      sprite._data.originalText = sprite._data.targetText || sprite._data.originalText;
    }
    // Stop ticker when animation completes (perf optimization)
    if (pixiApp && tickerBound) {
      pixiApp.ticker.remove(animationLoop);
      tickerBound = false;
    }
  }
}

export async function initPixiBackground(): Promise<void> {
  const container = document.getElementById('bg-container');
  if (!container) return;

  // Create PixiJS application
  pixiApp = new PIXI.Application();
  await pixiApp.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  container.appendChild(pixiApp.canvas);

  // Generate text sprites
  const textStyle = new PIXI.TextStyle({
    fontFamily: 'Courier New',
    fontSize: 12,
    fill: 0xffaa00,
  });

  // Measure x402 text width
  const measureText = new PIXI.Text({ text: 'x402', style: textStyle });
  const textWidth = measureText.width;
  measureText.destroy();

  let x = 0, y = 0;
  const lineHeight = 12 * 1.6;

  while (y < window.innerHeight + lineHeight) {
    x = (Math.random() - 0.5) * 50;
    while (x < window.innerWidth + 50) {
      const spacing = Math.random() * 30;
      const baseOpacity = 0.22 * (0.25 + Math.random() * 0.75);

      const sprite = new PIXI.Text({
        text: 'x402',
        style: new PIXI.TextStyle({
          fontFamily: 'Courier New',
          fontSize: 12,
          fill: 0xffaa00,
        })
      }) as TextSpriteWithData;

      sprite.x = x + (Math.random() - 0.5) * 12;
      sprite.y = y + (Math.random() - 0.5) * 10;
      sprite.alpha = baseOpacity;
      sprite.anchor.set(0.5, 0);

      // Store additional data for animation
      sprite._data = {
        baseOpacity,
        delay: Math.random() * MAX_DELAY,
        is1024: Math.random() < 0.5,
        sutra: BG_SUTRAS[Math.floor(Math.random() * BG_SUTRAS.length)],
        originalText: 'x402'
      };

      pixiApp.stage.addChild(sprite);
      textSprites.push(sprite);

      x += textWidth + 4 + spacing;
    }
    y += lineHeight;
  }

  console.log('[ui] pixi sprites initialized:', textSprites.length);

  // Handle window resize
  window.addEventListener('resize', () => {
    if (pixiApp) {
      pixiApp.renderer.resize(window.innerWidth, window.innerHeight);
    }
  });
}

export function startCoinFlip(amount: number = 2.048): void {
  // Start ticker if not already running (perf optimization)
  if (pixiApp && !tickerBound) {
    pixiApp.ticker.add(animationLoop);
    tickerBound = true;
  }

  // Set target text based on amount
  for (const sprite of textSprites) {
    const data = sprite._data;
    data.delay = Math.random() * MAX_DELAY;
    data.is1024 = Math.random() < 0.5;
    data.sutra = BG_SUTRAS[Math.floor(Math.random() * BG_SUTRAS.length)];

    if (amount >= 8.192) {
      data.targetText = `  ${data.sutra}  `;
    } else {
      data.targetText = data.is1024 ? '1024' : 'x402';
    }
  }

  animating = true;
  animationStart = performance.now();
}
