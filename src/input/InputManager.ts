import type { GameConfig } from '../types';

export type GameAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hold'
  | 'pause'
  | 'restart';

export type ActionCallback = () => boolean | void;

const REPEATABLE_ACTIONS: ReadonlySet<GameAction> = new Set([
  'moveLeft',
  'moveRight',
  'softDrop',
]);

interface DasTimer {
  elapsed: number;
  dasDone: boolean;
}

export class InputManager {
  private config: GameConfig;
  private actionHandlers: Map<GameAction, ActionCallback> = new Map();
  private dasTimers: Map<GameAction, DasTimer> = new Map();
  private pressedKeys: Set<string> = new Set();
  private keyCodeToAction: Map<string, GameAction> = new Map();
  private keyMap: Map<string, GameAction> = new Map();

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor(config: GameConfig) {
    this.config = config;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.rebuildKeyMap();
  }

  on(action: GameAction, callback: ActionCallback): void {
    this.actionHandlers.set(action, callback);
  }

  attach(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.pressedKeys.clear();
    this.dasTimers.clear();
  }

  update(deltaTime: number): void {
    for (const [action, timer] of this.dasTimers) {
      timer.elapsed += deltaTime;

      if (!timer.dasDone) {
        if (timer.elapsed >= this.config.timing.dasDelay) {
          timer.dasDone = true;
          timer.elapsed -= this.config.timing.dasDelay;
          this.fireAction(action);
        }
      }

      if (timer.dasDone && this.config.timing.arrDelay > 0) {
        while (timer.elapsed >= this.config.timing.arrDelay) {
          timer.elapsed -= this.config.timing.arrDelay;
          this.fireAction(action);
        }
      }
    }
  }

  private rebuildKeyMap(): void {
    this.keyCodeToAction.clear();
    this.keyMap.clear();

    const entries: [string, GameAction][] = [
      [this.config.keys.moveLeft, 'moveLeft'],
      [this.config.keys.moveRight, 'moveRight'],
      [this.config.keys.softDrop, 'softDrop'],
      [this.config.keys.hardDrop, 'hardDrop'],
      [this.config.keys.rotateCW, 'rotateCW'],
      [this.config.keys.rotateCCW, 'rotateCCW'],
      [this.config.keys.hold, 'hold'],
      [this.config.keys.pause, 'pause'],
      [this.config.keys.restart, 'restart'],
    ];

    for (const [code, action] of entries) {
      if (code != null) {
        this.keyCodeToAction.set(code, action);
        this.keyMap.set(code, action);
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const code = e.code;
    let action = this.keyCodeToAction.get(code);
    if (action == null) {
      action = this.keyCodeToAction.get(e.key);
      if (action == null) return;
    }

    e.preventDefault();

    if (this.pressedKeys.has(code)) return;
    this.pressedKeys.add(code);

    this.fireAction(action);

    if (REPEATABLE_ACTIONS.has(action)) {
      this.dasTimers.set(action, { elapsed: 0, dasDone: false });
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const code = e.code;
    let action = this.keyCodeToAction.get(code);
    if (action == null) {
      action = this.keyCodeToAction.get(e.key);
      if (action == null) return;
    }

    this.pressedKeys.delete(code);

    if (REPEATABLE_ACTIONS.has(action)) {
      this.dasTimers.delete(action);
    }
  }

  private fireAction(action: GameAction): boolean {
    const handler = this.actionHandlers.get(action);
    if (handler == null) return false;
    const result = handler();
    return result !== false;
  }
}
