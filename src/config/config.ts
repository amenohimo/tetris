import { parse } from 'smol-toml';
import type { GameConfig } from '../types';

const DEFAULT_CONFIG: GameConfig = {
  keys: {
    moveLeft: 'KeyJ',
    moveRight: 'KeyL',
    softDrop: 'KeyK',
    hardDrop: 'Space',
    rotateCW: 'KeyF',
    rotateCCW: 'KeyD',
    hold: 'KeyS',
    pause: 'Escape',
    restart: 'KeyR',
  },
  timing: {
    dasDelay: 167,
    arrDelay: 33,
  },
  display: {
    blockSize: 30,
    showGhost: true,
  },
};

export function normalizeKey(raw: string): string {
  // Handle physical key codes like "Space", "ArrowLeft", "KeyZ"
  if (raw.startsWith('Key')) return raw; // KeyA-KeyZ
  if (raw.startsWith('Arrow')) return raw; // ArrowLeft, ArrowRight, etc.
  if (raw === 'Space') return raw;
  if (raw.startsWith('Digit')) return raw; // Digit0-Digit9
  return raw; // Escape, Enter, etc.
}

export async function loadConfig(): Promise<GameConfig> {
  try {
    const response = await fetch('./config.toml');
    if (!response.ok) {
      console.warn('Config not found, using defaults');
      return DEFAULT_CONFIG;
    }
    const text = await response.text();
    const parsed = parse(text) as any;

    const config: GameConfig = {
      keys: {
        moveLeft: parsed.keys?.moveLeft ?? DEFAULT_CONFIG.keys.moveLeft,
        moveRight: parsed.keys?.moveRight ?? DEFAULT_CONFIG.keys.moveRight,
        softDrop: parsed.keys?.softDrop ?? DEFAULT_CONFIG.keys.softDrop,
        hardDrop: parsed.keys?.hardDrop ?? DEFAULT_CONFIG.keys.hardDrop,
        rotateCW: parsed.keys?.rotateCW ?? DEFAULT_CONFIG.keys.rotateCW,
        rotateCCW: parsed.keys?.rotateCCW ?? DEFAULT_CONFIG.keys.rotateCCW,
        hold: parsed.keys?.hold ?? DEFAULT_CONFIG.keys.hold,
        pause: parsed.keys?.pause ?? DEFAULT_CONFIG.keys.pause,
        restart: parsed.keys?.restart ?? DEFAULT_CONFIG.keys.restart,
      },
      timing: {
        dasDelay: parsed.timing?.dasDelay ?? DEFAULT_CONFIG.timing.dasDelay,
        arrDelay: parsed.timing?.arrDelay ?? DEFAULT_CONFIG.timing.arrDelay,
      },
      display: {
        blockSize: parsed.display?.blockSize ?? DEFAULT_CONFIG.display.blockSize,
        showGhost: parsed.display?.showGhost ?? DEFAULT_CONFIG.display.showGhost,
      },
    };

    return config;
  } catch (e) {
    console.warn('Failed to load config, using defaults:', e);
    return DEFAULT_CONFIG;
  }
}

export { DEFAULT_CONFIG };