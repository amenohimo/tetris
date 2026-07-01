import type { GameState, GameConfig } from '../types';
import type { InputManager, GameAction } from './InputManager';

const BLOCK_SIZE = 30; // default, overridden by config
const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const PANEL_WIDTH = 5; // in blocks
const PAUSE_ZONE_HEIGHT = 6.5; // in blocks (matches HOLD box height)
const DOUBLE_TAP_WINDOW = 200; // ms

export class TouchHandler {
  private getState: () => GameState;
  private input: InputManager;
  private canvas: HTMLCanvasElement;
  private blockSize: number;

  // Monitoring for double-tap restart
  private monitoring = false;
  private monitoringTimer: ReturnType<typeof setTimeout> | null = null;

  // Soft drop + move tracking
  private accumulatedDX = 0;
  private accumulatedDY = 0;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private touchActive = false;
  private touchStartX = 0;
  private touchStartY = 0;

  private boundStart: (e: TouchEvent) => void;
  private boundMove: (e: TouchEvent) => void;
  private boundEnd: (e: TouchEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    getState: () => GameState,
    input: InputManager,
    config: GameConfig
  ) {
    this.canvas = canvas;
    this.getState = getState;
    this.input = input;
    this.blockSize = config.display.blockSize;

    this.boundStart = (e) => this.onTouchStart(e);
    this.boundMove = (e) => this.onTouchMove(e);
    this.boundEnd = (e) => this.onTouchEnd(e);
  }

  attach(): void {
    this.canvas.addEventListener('touchstart', this.boundStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundMove, { passive: false });
    this.canvas.addEventListener('touchend', this.boundEnd, { passive: false });
  }

  // --------------- Event handlers ---------------

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const coords = this.toCanvasCoords(touch.clientX, touch.clientY);

    this.touchActive = true;
    this.touchStartX = coords.x;
    this.touchStartY = coords.y;
    this.lastTouchX = coords.x;
    this.lastTouchY = coords.y;
    this.accumulatedDX = 0;
    this.accumulatedDY = 0;
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.touchActive || e.touches.length !== 1) return;

    const state = this.getState();
    if (state !== 'playing') return;

    const touch = e.touches[0];
    const coords = this.toCanvasCoords(touch.clientX, touch.clientY);

    const dx = this.lastTouchX - coords.x; // left = positive
    const dy = coords.y - this.lastTouchY; // down = positive

    this.accumulatedDX += dx;
    this.accumulatedDY += dy;

    const threshold = this.blockSize;

    // Horizontal movement
    while (this.accumulatedDX >= threshold) {
      this.input.fireAction('moveLeft');
      this.accumulatedDX -= threshold;
    }
    while (this.accumulatedDX <= -threshold) {
      this.input.fireAction('moveRight');
      this.accumulatedDX += threshold;
    }

    // Vertical = soft drop
    while (this.accumulatedDY >= threshold) {
      this.input.fireAction('softDrop');
      this.accumulatedDY -= threshold;
    }

    this.lastTouchX = coords.x;
    this.lastTouchY = coords.y;
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (!this.touchActive) return;
    this.touchActive = false;

    const touch = e.changedTouches[0];
    const coords = this.toCanvasCoords(touch.clientX, touch.clientY);

    const state = this.getState();
    const totalDrag = Math.sqrt(
      (coords.x - this.touchStartX) ** 2 + (coords.y - this.touchStartY) ** 2
    );

    // If significant drag, treat as gesture not tap
    if (totalDrag >= this.blockSize * 0.5) return;

    // It's a tap — handle based on state
    this.handleTap(coords.x, coords.y, state);
  }

  // --------------- Tap handling ---------------

  private handleTap(x: number, y: number, state: GameState): void {
    // Monitoring window: second tap = restart
    if (this.isInPauseZone(x, y)) {
      if (this.monitoring) {
        this.clearMonitoring();
        this.input.fireAction('restart');
        return;
      }

      if (state === 'playing') {
        this.input.fireAction('pause');
        this.startMonitoring();
        return;
      }

      if (state === 'paused') {
        this.input.fireAction('pause'); // togglePause = resume
        this.startMonitoring();
        return;
      }
    }

    // Idle / GameOver: tap anywhere = start/restart
    if (state === 'idle') {
      this.input.fireAction('restart'); // Game.restart() handles idle → start
      return;
    }
    if (state === 'gameOver') {
      this.input.fireAction('restart');
      return;
    }

    // Paused: tap anywhere = resume
    if (state === 'paused') {
      this.input.fireAction('pause'); // togglePause = resume
      return;
    }

    // Playing: zone-based actions
    if (state === 'playing') {
      this.handlePlayingTap(x, y);
    }
  }

  private handlePlayingTap(x: number, y: number): void {
    // Check zones in priority order

    // Hold zone (inside left panel, HOLD box area)
    if (this.isInHoldZone(x, y)) {
      this.input.fireAction('hold');
      return;
    }

    // Hard drop zone (board bottom 2 rows + below canvas)
    if (this.isInHardDropZone(x, y)) {
      this.input.fireAction('hardDrop');
      return;
    }

    // CCW zone (left panel below Hold)
    if (this.isInCCWZone(x, y)) {
      this.input.fireAction('rotateCCW');
      return;
    }

    // CW zone (right panel below Pause)
    if (this.isInCWZone(x, y)) {
      this.input.fireAction('rotateCW');
      return;
    }

    // Board area tap (not a drag, not hard drop zone) — no action
  }

  // --------------- Zone detection ---------------

  private toCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private isInPauseZone(x: number, y: number): boolean {
    const bs = this.blockSize;
    return x >= bs * (PANEL_WIDTH + BOARD_COLS) && y < bs * PAUSE_ZONE_HEIGHT;
  }

  private isInHoldZone(x: number, y: number): boolean {
    const bs = this.blockSize;
    // HOLD box: boxY = bs*2.5, boxSize = bs*4, boxX = (PANEL_WIDTH*bs - boxSize)/2
    const panelPixel = bs * PANEL_WIDTH;
    const previewCellSize = bs * 0.8;
    const boxSize = previewCellSize * 5;
    const boxX = (panelPixel - boxSize) / 2;
    const boxY = bs * 2.5;
    return (
      x >= boxX &&
      x <= boxX + boxSize &&
      y >= boxY &&
      y <= boxY + boxSize
    );
  }

  private isInHardDropZone(x: number, y: number): boolean {
    const bs = this.blockSize;
    // Board bottom 2 rows + below canvas
    return (
      x >= bs * PANEL_WIDTH &&
      x < bs * (PANEL_WIDTH + BOARD_COLS) &&
      y >= bs * (BOARD_ROWS - 2)
    );
  }

  private isInCCWZone(x: number, y: number): boolean {
    const bs = this.blockSize;
    // Left panel, below Hold zone (y >= bs*6.5)
    return x < bs * PANEL_WIDTH && y >= bs * PAUSE_ZONE_HEIGHT;
  }

  private isInCWZone(x: number, y: number): boolean {
    const bs = this.blockSize;
    // Right panel, below Pause zone
    return (
      x >= bs * (PANEL_WIDTH + BOARD_COLS) &&
      y >= bs * PAUSE_ZONE_HEIGHT
    );
  }

  // --------------- Monitoring ---------------

  private startMonitoring(): void {
    this.clearMonitoring();
    this.monitoring = true;
    this.monitoringTimer = setTimeout(() => {
      this.monitoring = false;
      this.monitoringTimer = null;
    }, DOUBLE_TAP_WINDOW);
  }

  private clearMonitoring(): void {
    if (this.monitoringTimer != null) {
      clearTimeout(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    this.monitoring = false;
  }
}
