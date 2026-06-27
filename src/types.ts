export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: PieceType;
  shape: boolean[][];
  position: Position;
  rotation: number; // 0-3
}

export type Cell = PieceType | null;

export type BoardGrid = Cell[][];

export type GameState = 'idle' | 'playing' | 'paused' | 'gameOver';

export interface GameConfig {
  keys: {
    moveLeft: string;
    moveRight: string;
    softDrop: string;
    hardDrop: string;
    rotateCW: string;
    rotateCCW: string;
    hold: string;
    pause: string;
    restart: string;
  };
  timing: {
    dasDelay: number;
    arrDelay: number;
  };
  display: {
    blockSize: number;
    showGhost: boolean;
  };
}

export interface HoldInfo {
  type: PieceType | null;
  usedThisTurn: boolean;
}

export interface NextQueue {
  queue: PieceType[];
  bag: PieceType[];
}

export interface ScoreState {
  score: number;
  level: number;
  lines: number;
}