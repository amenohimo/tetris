import type { Piece, Position, BoardGrid, Cell } from '../types';

export const COLS = 10;
export const ROWS = 22;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;

export function createBoard(): BoardGrid {
  const board: BoardGrid = [];
  for (let y = 0; y < ROWS; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < COLS; x++) {
      row.push(null);
    }
    board.push(row);
  }
  return board;
}

export function isValidPosition(
  shape: boolean[][],
  pos: Position,
  board: BoardGrid,
): boolean {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;

      const bx = pos.x + col;
      const by = pos.y + row;

      if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS) return false;
      if (board[by][bx] != null) return false;
    }
  }
  return true;
}

export function lockPiece(piece: Piece, board: BoardGrid): void {
  const { shape, position } = piece;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;

      const bx = position.x + col;
      const by = position.y + row;

      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
        board[by][bx] = piece.type;
      }
    }
  }
}

export function clearLines(board: BoardGrid): { board: BoardGrid; linesCleared: number } {
  const newBoard = board.filter((row) => row.some((cell) => cell === null));

  const linesCleared = ROWS - newBoard.length;

  while (newBoard.length < ROWS) {
    const emptyRow: Cell[] = [];
    for (let x = 0; x < COLS; x++) {
      emptyRow.push(null);
    }
    newBoard.unshift(emptyRow);
  }

  return { board: newBoard, linesCleared };
}

export function getGhostPosition(
  shape: boolean[][],
  pos: Position,
  board: BoardGrid,
): Position {
  let ghostY = pos.y;

  while (isValidPosition(shape, { x: pos.x, y: ghostY + 1 }, board)) {
    ghostY++;
  }

  return { x: pos.x, y: ghostY };
}
