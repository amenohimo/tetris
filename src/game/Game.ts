import type { Piece, PieceType, BoardGrid, GameState, HoldInfo, ScoreState, Position, GameConfig } from '../types';
import { createBoard, isValidPosition, lockPiece, clearLines, getGhostPosition } from './Board';
import { createPiece, rotateCW, rotateCCW } from './Piece';
import { createRandomizer, type Randomizer } from './Randomizer';

const DROP_INTERVALS: readonly number[] = [
  1000, 793, 618, 473, 355, 262, 190, 135, 94, 64,
  43, 43, 43, 28, 28, 28, 18,
];

const LOCK_DELAY_MS = 500;
const LOCK_MOVES_MAX = 15;
const QUEUE_MIN_SIZE = 3;

class Game {
  board: BoardGrid;
  currentPiece: Piece | null;
  ghostPosition: Position | null;
  state: GameState;
  scoreState: ScoreState;
  holdInfo: HoldInfo;
  nextQueue: PieceType[];

  private randomizer: Randomizer;
  private config: GameConfig;
  private dropTimer: number;
  private lockDelay: number;
  private lockMoves: number;
  private isLocking: boolean;

  constructor(config: GameConfig) {
    this.config = config;
    this.board = createBoard();
    this.currentPiece = null;
    this.ghostPosition = null;
    this.state = 'idle';
    this.scoreState = { score: 0, level: 1, lines: 0 };
    this.holdInfo = { type: null, usedThisTurn: false };
    this.nextQueue = [];
    this.randomizer = createRandomizer();
    this.dropTimer = 0;
    this.lockDelay = 0;
    this.lockMoves = 0;
    this.isLocking = false;
  }

  start(): void {
    this.board = createBoard();
    this.randomizer.reset();
    this.nextQueue = [];
    this.fillNextQueue();
    this.scoreState = { score: 0, level: 1, lines: 0 };
    this.holdInfo = { type: null, usedThisTurn: false };
    this.dropTimer = 0;
    this.lockDelay = 0;
    this.lockMoves = 0;
    this.isLocking = false;
    this.currentPiece = null;
    this.ghostPosition = null;

    if (this.spawnPiece()) {
      this.state = 'playing';
    } else {
      this.state = 'gameOver';
    }
  }

  restart(): void {
    this.start();
  }

  update(deltaTime: number): void {
    if (this.state !== 'playing') return;

    if (!this.currentPiece) {
      if (!this.spawnPiece()) {
        this.state = 'gameOver';
        return;
      }
    }

    this.dropTimer += deltaTime;

    if (this.dropTimer >= this.getDropInterval()) {
      const moved = this.tryMoveDown();
      if (!moved) {
        this.isLocking = true;
      } else if (this.isLocking) {
        // Piece fell off a ledge — cancel locking
        this.isLocking = false;
        this.lockDelay = 0;
        this.lockMoves = 0;
      }
      this.dropTimer = 0;
    }

    if (this.isLocking) {
      this.lockDelay += deltaTime;
      if (this.lockDelay >= LOCK_DELAY_MS) {
        this.lockCurrentPiece();
      }
    }
  }

  moveLeft(): boolean {
    return this.tryMove(-1, 0);
  }

  moveRight(): boolean {
    return this.tryMove(1, 0);
  }

  softDrop(): boolean {
    if (!this.currentPiece || this.state !== 'playing') return false;

    const moved = this.tryMove(0, 1);
    if (moved) {
      this.scoreState.score += 1;
      this.dropTimer = 0;
    }
    return moved;
  }

  hardDrop(): void {
    if (!this.currentPiece || this.state !== 'playing') return;

    const ghost = getGhostPosition(
      this.currentPiece.shape,
      this.currentPiece.position,
      this.board,
    );

    const rowsDropped = ghost.y - this.currentPiece.position.y;
    this.scoreState.score += rowsDropped * 2;

    this.currentPiece = {
      ...this.currentPiece,
      position: ghost,
    };
    this.updateGhost();

    this.lockCurrentPiece();
  }

  rotateCW(): boolean {
    if (!this.currentPiece || this.state !== 'playing') return false;

    const rotated = rotateCW(this.currentPiece, this.board);
    if (rotated) {
      this.currentPiece = rotated;
      this.onPieceManipulated();
      return true;
    }
    return false;
  }

  rotateCCW(): boolean {
    if (!this.currentPiece || this.state !== 'playing') return false;

    const rotated = rotateCCW(this.currentPiece, this.board);
    if (rotated) {
      this.currentPiece = rotated;
      this.onPieceManipulated();
      return true;
    }
    return false;
  }

  hold(): void {
    if (!this.currentPiece || this.state !== 'playing') return;
    if (this.holdInfo.usedThisTurn) return;

    const currentType = this.currentPiece.type;

    if (this.holdInfo.type === null) {
      // Store current piece, spawn next from queue
      this.holdInfo.type = currentType;
      this.currentPiece = null;
      this.ghostPosition = null;
      if (!this.spawnPiece()) {
        this.state = 'gameOver';
        return;
      }
    } else {
      // Can't hold same piece type twice in a row
      if (this.holdInfo.type === currentType) return;

      const heldType = this.holdInfo.type;
      this.holdInfo.type = currentType;

      // Create fresh piece of the previously held type
      const newPiece = createPiece(heldType);
      if (!isValidPosition(newPiece.shape, newPiece.position, this.board)) {
        this.state = 'gameOver';
        return;
      }

      this.currentPiece = newPiece;
      this.updateGhost();
    }

    this.holdInfo.usedThisTurn = true;
  }

  togglePause(): void {
    if (this.state === 'playing') {
      this.state = 'paused';
    } else if (this.state === 'paused') {
      this.state = 'playing';
    }
  }

  // ---- Internal ----

  private spawnPiece(): boolean {
    const type = this.getNextFromQueue();
    const piece = createPiece(type);

    if (!isValidPosition(piece.shape, piece.position, this.board)) {
      return false;
    }

    this.currentPiece = piece;
    this.updateGhost();
    return true;
  }

  private lockCurrentPiece(): void {
    if (!this.currentPiece) return;

    // Write piece cells onto board
    lockPiece(this.currentPiece, this.board);

    // Clear completed lines
    const { board: newBoard, linesCleared } = clearLines(this.board);
    this.board = newBoard;

    // Award score
    if (linesCleared > 0) {
      const LINE_SCORES = [0, 100, 300, 500, 800];
      const baseScore = LINE_SCORES[linesCleared] ?? 800;
      this.scoreState.score += baseScore * this.scoreState.level;
      this.scoreState.lines += linesCleared;
      this.scoreState.level = Math.floor(this.scoreState.lines / 10) + 1;
    }

    // Allow holding again
    this.holdInfo.usedThisTurn = false;

    // Clear locking state
    this.dropTimer = 0;
    this.lockDelay = 0;
    this.lockMoves = 0;
    this.isLocking = false;
    this.currentPiece = null;
    this.ghostPosition = null;

    // Spawn next piece
    if (!this.spawnPiece()) {
      this.state = 'gameOver';
    }
  }

  private getDropInterval(): number {
    const index = Math.min(this.scoreState.level - 1, DROP_INTERVALS.length - 1);
    return DROP_INTERVALS[index];
  }

  private getNextFromQueue(): PieceType {
    if (this.nextQueue.length === 0) {
      this.fillNextQueue();
    }
    const type = this.nextQueue.shift()!;
    this.fillNextQueue();
    return type;
  }

  private fillNextQueue(): void {
    while (this.nextQueue.length < QUEUE_MIN_SIZE) {
      this.nextQueue.push(this.randomizer.next());
    }
  }

  /** Player-initiated movement (resets lock delay). */
  private tryMove(dx: number, dy: number): boolean {
    if (!this.currentPiece || this.state !== 'playing') return false;

    const newPos: Position = {
      x: this.currentPiece.position.x + dx,
      y: this.currentPiece.position.y + dy,
    };

    if (isValidPosition(this.currentPiece.shape, newPos, this.board)) {
      this.currentPiece = {
        ...this.currentPiece,
        position: newPos,
      };
      this.onPieceManipulated();
      return true;
    }
    return false;
  }

  /** Gravity-driven downward movement (does not extend lock delay). */
  private tryMoveDown(): boolean {
    if (!this.currentPiece) return false;

    const newPos: Position = {
      x: this.currentPiece.position.x,
      y: this.currentPiece.position.y + 1,
    };

    if (isValidPosition(this.currentPiece.shape, newPos, this.board)) {
      this.currentPiece = {
        ...this.currentPiece,
        position: newPos,
      };
      this.updateGhost();
      return true;
    }
    return false;
  }

  private onPieceManipulated(): void {
    this.updateGhost();

    if (this.isLocking && this.lockMoves < LOCK_MOVES_MAX) {
      this.lockDelay = 0;
      this.lockMoves++;
    }
  }

  private updateGhost(): void {
    if (!this.currentPiece) {
      this.ghostPosition = null;
      return;
    }

    if (this.config.display.showGhost) {
      this.ghostPosition = getGhostPosition(
        this.currentPiece.shape,
        this.currentPiece.position,
        this.board,
      );
    } else {
      this.ghostPosition = null;
    }
  }
}

export { Game };
