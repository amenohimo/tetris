import type { PieceType, Piece, Position, BoardGrid } from '../types';

// ---- Shape definitions (4 rotation states each) ----

const SHAPES: Record<PieceType, boolean[][][]> = {
  I: [
    // 0
    [
      [false, false, false, false],
      [true,  true,  true,  true],
      [false, false, false, false],
      [false, false, false, false],
    ],
    // 1
    [
      [false, false, true, false],
      [false, false, true, false],
      [false, false, true, false],
      [false, false, true, false],
    ],
    // 2
    [
      [false, false, false, false],
      [false, false, false, false],
      [true,  true,  true,  true],
      [false, false, false, false],
    ],
    // 3
    [
      [false, true, false, false],
      [false, true, false, false],
      [false, true, false, false],
      [false, true, false, false],
    ],
  ],

  O: [
    // 0 (all rotations same)
    [
      [true, true],
      [true, true],
    ],
    [
      [true, true],
      [true, true],
    ],
    [
      [true, true],
      [true, true],
    ],
    [
      [true, true],
      [true, true],
    ],
  ],

  T: [
    // 0
    [
      [false, true, false],
      [true,  true, true],
      [false, false, false],
    ],
    // 1
    [
      [false, true, false],
      [false, true, true],
      [false, true, false],
    ],
    // 2
    [
      [false, false, false],
      [true,  true, true],
      [false, true, false],
    ],
    // 3
    [
      [false, true, false],
      [true,  true, false],
      [false, true, false],
    ],
  ],

  S: [
    // 0
    [
      [false, true, true],
      [true,  true, false],
      [false, false, false],
    ],
    // 1
    [
      [false, true, false],
      [false, true, true],
      [false, false, true],
    ],
    // 2
    [
      [false, false, false],
      [false, true, true],
      [true,  true, false],
    ],
    // 3
    [
      [true, false, false],
      [true,  true, false],
      [false, true, false],
    ],
  ],

  Z: [
    // 0
    [
      [true, true, false],
      [false, true, true],
      [false, false, false],
    ],
    // 1
    [
      [false, false, true],
      [false, true, true],
      [false, true, false],
    ],
    // 2
    [
      [false, false, false],
      [true,  true, false],
      [false, true, true],
    ],
    // 3
    [
      [false, true, false],
      [true,  true, false],
      [true,  false, false],
    ],
  ],

  J: [
    // 0
    [
      [true, false, false],
      [true, true, true],
      [false, false, false],
    ],
    // 1
    [
      [false, true, true],
      [false, true, false],
      [false, true, false],
    ],
    // 2
    [
      [false, false, false],
      [true,  true, true],
      [false, false, true],
    ],
    // 3
    [
      [false, true, false],
      [false, true, false],
      [true,  true, false],
    ],
  ],

  L: [
    // 0
    [
      [false, false, true],
      [true,  true, true],
      [false, false, false],
    ],
    // 1
    [
      [false, true, false],
      [false, true, false],
      [false, true, true],
    ],
    // 2
    [
      [false, false, false],
      [true,  true, true],
      [true,  false, false],
    ],
    // 3
    [
      [true,  true, false],
      [false, true, false],
      [false, true, false],
    ],
  ],
};

// ---- Colors ----

const COLORS: Record<PieceType, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

// ---- SRS wall kick data ----

type KickKey = `${number}→${number}`;
type KickTable = Record<KickKey, Position[]>;

// JLSTZ piece kicks (SRS convention: y positive = up)
const JLSTZ_KICKS: KickTable = {
  '0→1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '1→0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '1→2': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '2→1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '2→3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  '3→2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '3→0': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '0→3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
};

// I piece kicks (SRS convention: y positive = up)
const I_KICKS: KickTable = {
  '0→1': [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -2, y: 1 }],
  '1→0': [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 2, y: -1 }],
  '1→2': [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 2, y: -1 }],
  '2→1': [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -2, y: 1 }],
  '2→3': [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 2, y: -1 }],
  '3→2': [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -2, y: 1 }],
  '3→0': [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -2, y: 1 }],
  '0→3': [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 2, y: -1 }],
};

// O piece kick (no real kicks — identity offsets for all transitions)
const O_KICKS: KickTable = {
  '0→1': [{ x: 0, y: 0 }],
  '1→0': [{ x: 0, y: 0 }],
  '1→2': [{ x: 0, y: 0 }],
  '2→1': [{ x: 0, y: 0 }],
  '2→3': [{ x: 0, y: 0 }],
  '3→2': [{ x: 0, y: 0 }],
  '3→0': [{ x: 0, y: 0 }],
  '0→3': [{ x: 0, y: 0 }],
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

// ---- Spawn positions ----

export const SPAWN_POSITIONS: Record<PieceType, Position> = {
  I: { x: 3, y: -1 },
  O: { x: 4, y: 0 },
  T: { x: 3, y: 0 },
  S: { x: 3, y: 0 },
  Z: { x: 3, y: 0 },
  J: { x: 3, y: 0 },
  L: { x: 3, y: 0 },
};

// ---- Piece list ----

export const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// ---- Helpers ----

function getKickTable(type: PieceType): KickTable {
  if (type === 'I') return I_KICKS;
  if (type === 'O') return O_KICKS;
  return JLSTZ_KICKS;
}

/**
 * Check if a piece shape at a given board position is valid:
 * within bounds (or above the board for rows < 0) and no overlap with filled cells.
 */
export function isValidPosition(
  shape: boolean[][],
  pos: Position,
  board: BoardGrid,
): boolean {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;

      const boardX = pos.x + col;
      const boardY = pos.y + row;

      // Allow cells above the board (y < 0)
      if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
        return false;
      }

      // If within the board, check for collision
      if (boardY >= 0 && board[boardY][boardX] !== null) {
        return false;
      }
    }
  }
  return true;
}

// ---- Piece factory ----

export function createPiece(type: PieceType): Piece {
  const shape = SHAPES[type][0];
  const position = { ...SPAWN_POSITIONS[type] };

  return {
    type,
    shape,
    position,
    rotation: 0,
  };
}

// ---- Rotation (SRS) ----

function tryRotate(
  piece: Piece,
  newRotation: number,
  board: BoardGrid,
): Piece | null {
  const { type, position, rotation: oldRotation } = piece;
  const newShape = SHAPES[type][newRotation];
  const kicks = getKickTable(type);
  const key: KickKey = `${oldRotation}→${newRotation}`;
  const offsets = kicks[key];

  if (!offsets) return null;

  for (const offset of offsets) {
    const newPos: Position = {
      x: position.x + offset.x,
      y: position.y - offset.y, // SRS y-axis: positive = up, board y-axis: positive = down
    };

    if (isValidPosition(newShape, newPos, board)) {
      return {
        type,
        shape: newShape,
        position: newPos,
        rotation: newRotation,
      };
    }
  }

  return null;
}

export function rotateCW(piece: Piece, board: BoardGrid): Piece | null {
  const newRotation = (piece.rotation + 1) % 4;
  return tryRotate(piece, newRotation, board);
}

export function rotateCCW(piece: Piece, board: BoardGrid): Piece | null {
  const newRotation = (piece.rotation + 3) % 4; // -1 mod 4
  return tryRotate(piece, newRotation, board);
}
