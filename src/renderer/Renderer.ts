import type { Piece, BoardGrid, GameState, HoldInfo, ScoreState, Position, GameConfig, PieceType } from '../types';
import { HIDDEN_ROWS } from '../game/Board';


const BOARD_COLS = 10;
const BOARD_ROWS = 20;

const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

// Piece shapes for preview rendering (standard Tetris shapes at rotation 0)
const PREVIEW_SHAPES: Record<PieceType, boolean[][]> = {
  I: [
    [false, false, false, false],
    [true, true, true, true],
    [false, false, false, false],
    [false, false, false, false],
  ],
  O: [
    [true, true],
    [true, true],
  ],
  T: [
    [false, true, false],
    [true, true, true],
    [false, false, false],
  ],
  S: [
    [false, true, true],
    [true, true, false],
    [false, false, false],
  ],
  Z: [
    [true, true, false],
    [false, true, true],
    [false, false, false],
  ],
  J: [
    [true, false, false],
    [true, true, true],
    [false, false, false],
  ],
  L: [
    [false, false, true],
    [true, true, true],
    [false, false, false],
  ],
};

class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private blockSize: number;
  private config: GameConfig;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.config = config;
    this.blockSize = config.display.blockSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas 2D context');
    this.ctx = ctx;

    const PANEL_WIDTH = this.blockSize * 5;
    const BOARD_PIXEL = BOARD_COLS * this.blockSize;

    canvas.width = PANEL_WIDTH + BOARD_PIXEL + PANEL_WIDTH;
    canvas.height = BOARD_ROWS * this.blockSize;

    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
  }

  private boardYToCanvas(boardY: number): number {
    return boardY - HIDDEN_ROWS;
  }

  render(gameState: {
    board: BoardGrid;
    currentPiece: Piece | null;
    ghostPosition: Position | null;
    state: GameState;
    scoreState: ScoreState;
    holdInfo: HoldInfo;
    nextQueue: PieceType[];
  }): void {
    const { board, currentPiece, ghostPosition, state, scoreState, holdInfo, nextQueue } = gameState;
    const PANEL_WIDTH = this.blockSize * 5;

    // Clear and draw background
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Game content (only during active states)
    if (state !== 'idle' && state !== 'gameOver') {
      // Board area background
      this.ctx.fillStyle = '#0f0f2a';
      this.ctx.fillRect(PANEL_WIDTH, 0, BOARD_COLS * this.blockSize, BOARD_ROWS * this.blockSize);

      // Draw grid lines
      this.drawGrid();

      // Draw board cells
      this.drawBoard(board);

      // Draw ghost piece
      if (ghostPosition && currentPiece && this.config.display.showGhost) {
        this.drawGhost(currentPiece, ghostPosition);
      }

      // Draw current piece
      if (currentPiece) {
        this.drawPiece(currentPiece);
      }

      // Draw side panels
      this.drawHold(holdInfo);
      this.drawNext(nextQueue);
      this.drawScore(scoreState);
    }

    // Draw state overlays
    switch (state) {
      case 'idle':
        this.drawIdle();
        break;
      case 'paused':
        this.drawPause();
        this.drawTutorial();
        break;
      case 'gameOver':
        this.drawGameOver();
        break;
    }
  }

  private drawBoard(board: BoardGrid): void {
    for (let y = HIDDEN_ROWS; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const cell = board[y][x];
        if (cell) {
          this.drawCell(x, this.boardYToCanvas(y), PIECE_COLORS[cell]);
        }
      }
    }
  }

  private drawPiece(piece: Piece, alpha: number = 1): void {
    this.ctx.globalAlpha = alpha;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const drawX = piece.position.x + x;
          const drawY = this.boardYToCanvas(piece.position.y + y);
          if (drawY >= 0) {
            this.drawCell(drawX, drawY, PIECE_COLORS[piece.type]);
          }
        }
      }
    }
    this.ctx.globalAlpha = 1;
  }

  private drawGhost(piece: Piece, ghostPos: Position): void {
    const PANEL_WIDTH = this.blockSize * 5;

    this.ctx.globalAlpha = 0.15;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const drawX = ghostPos.x + x;
          const drawY = this.boardYToCanvas(ghostPos.y + y);
          if (drawY >= 0) {
            const cellX = PANEL_WIDTH + drawX * this.blockSize;
            const cellY = drawY * this.blockSize;
            const color = PIECE_COLORS[piece.type];

            this.ctx.fillStyle = color;
            this.ctx.fillRect(
              cellX + 1,
              cellY + 1,
              this.blockSize - 2,
              this.blockSize - 2
            );
          }
        }
      }
    }

    // Draw outline on top
    this.ctx.globalAlpha = 0.3;
    this.ctx.strokeStyle = PIECE_COLORS[piece.type];
    this.ctx.lineWidth = 1;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const drawX = ghostPos.x + x;
          const drawY = this.boardYToCanvas(ghostPos.y + y);
          if (drawY >= 0) {
            const cellX = PANEL_WIDTH + drawX * this.blockSize;
            const cellY = drawY * this.blockSize;
            this.ctx.strokeRect(
              cellX + 1,
              cellY + 1,
              this.blockSize - 2,
              this.blockSize - 2
            );
          }
        }
      }
    }
    this.ctx.globalAlpha = 1;
  }

  private drawGrid(): void {
    const PANEL_WIDTH = this.blockSize * 5;

    this.ctx.strokeStyle = '#1a1a3a';
    this.ctx.lineWidth = 0.5;

    for (let x = 0; x <= BOARD_COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(PANEL_WIDTH + x * this.blockSize, 0);
      this.ctx.lineTo(PANEL_WIDTH + x * this.blockSize, BOARD_ROWS * this.blockSize);
      this.ctx.stroke();
    }

    for (let y = 0; y <= BOARD_ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(PANEL_WIDTH, y * this.blockSize);
      this.ctx.lineTo(PANEL_WIDTH + BOARD_COLS * this.blockSize, y * this.blockSize);
      this.ctx.stroke();
    }
  }

  private drawHold(holdInfo: HoldInfo): void {
    const PANEL_WIDTH = this.blockSize * 5;
    const previewCellSize = this.blockSize * 0.8;

    // Panel background
    this.ctx.fillStyle = '#0d0d24';
    this.ctx.fillRect(0, 0, PANEL_WIDTH, this.canvas.height);

    // Label
    this.ctx.fillStyle = holdInfo.usedThisTurn ? '#555' : '#aaa';
    this.ctx.font = `bold ${this.blockSize * 0.7}px "Courier New", monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('HOLD', PANEL_WIDTH / 2, this.blockSize * 1.5);

    // Preview box
    const boxSize = previewCellSize * 5;
    const boxX = (PANEL_WIDTH - boxSize) / 2;
    const boxY = this.blockSize * 2.5;

    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    if (holdInfo.type) {
      const shape = PREVIEW_SHAPES[holdInfo.type];
      const color = PIECE_COLORS[holdInfo.type];

      // Calculate bounding box of shape
      let minX = shape[0].length, maxX = 0, minY = shape.length, maxY = 0;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const pieceW = (maxX - minX + 1) * previewCellSize;
      const pieceH = (maxY - minY + 1) * previewCellSize;
      const offsetX = boxX + (boxSize - pieceW) / 2;
      const offsetY = boxY + (boxSize - pieceH) / 2;

      this.ctx.globalAlpha = holdInfo.usedThisTurn ? 0.4 : 1;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (shape[y][x]) {
            this.drawPreviewCell(
              offsetX + (x - minX) * previewCellSize,
              offsetY + (y - minY) * previewCellSize,
              color,
              previewCellSize
            );
          }
        }
      }
      this.ctx.globalAlpha = 1;
    }
  }

  private drawNext(nextQueue: PieceType[]): void {
    const PANEL_WIDTH = this.blockSize * 5;
    const previewCellSize = this.blockSize * 0.7;

    // Panel background
    this.ctx.fillStyle = '#0d0d24';
    this.ctx.fillRect(
      PANEL_WIDTH + BOARD_COLS * this.blockSize,
      0,
      PANEL_WIDTH,
      this.canvas.height
    );

    const panelX = PANEL_WIDTH + BOARD_COLS * this.blockSize;

    // Label
    this.ctx.fillStyle = '#aaa';
    this.ctx.font = `bold ${this.blockSize * 0.7}px "Courier New", monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('NEXT', panelX + PANEL_WIDTH / 2, this.blockSize * 1.5);

    // Show up to 3 next pieces
    const maxPreview = Math.min(3, nextQueue.length);
    for (let i = 0; i < maxPreview; i++) {
      const pieceType = nextQueue[i];
      const shape = PREVIEW_SHAPES[pieceType];
      const color = PIECE_COLORS[pieceType];

      const boxSize = previewCellSize * 5;
      const boxX = panelX + (PANEL_WIDTH - boxSize) / 2;
      const boxY = this.blockSize * 2.5 + i * (boxSize + this.blockSize * 0.5);

      // Preview box
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(boxX, boxY, boxSize, boxSize);

      // Calculate bounding box of shape
      let minX = shape[0].length, maxX = 0, minY = shape.length, maxY = 0;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const pieceW = (maxX - minX + 1) * previewCellSize;
      const pieceH = (maxY - minY + 1) * previewCellSize;
      const offsetX = boxX + (boxSize - pieceW) / 2;
      const offsetY = boxY + (boxSize - pieceH) / 2;

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (shape[y][x]) {
            this.drawPreviewCell(
              offsetX + (x - minX) * previewCellSize,
              offsetY + (y - minY) * previewCellSize,
              color,
              previewCellSize
            );
          }
        }
      }
    }
  }

  private drawScore(scoreState: ScoreState): void {
    const panelWidth = this.blockSize * 5;

    this.ctx.fillStyle = '#aaa';
    this.ctx.font = `bold ${this.blockSize * 0.6}px "Courier New", monospace`;
    this.ctx.textAlign = 'center';

    // Position centered vertically between HOLD box bottom and canvas bottom
    const startY = this.blockSize * 9;
    const lineHeight = this.blockSize * 3.2;
    const valueOffset = this.blockSize * 1.2;

    // SCORE
    this.ctx.fillText('SCORE', panelWidth / 2, startY);
    this.ctx.fillStyle = '#888';
    this.ctx.font = `${this.blockSize * 0.55}px "Courier New", monospace`;
    this.ctx.fillText(
      String(scoreState.score).padStart(8, '0'),
      panelWidth / 2,
      startY + valueOffset
    );

    // LEVEL
    this.ctx.fillStyle = '#aaa';
    this.ctx.font = `bold ${this.blockSize * 0.6}px "Courier New", monospace`;
    this.ctx.fillText('LEVEL', panelWidth / 2, startY + lineHeight);
    this.ctx.fillStyle = '#888';
    this.ctx.font = `${this.blockSize * 0.55}px "Courier New", monospace`;
    this.ctx.fillText(
      String(scoreState.level),
      panelWidth / 2,
      startY + lineHeight + valueOffset
    );

    // LINES
    this.ctx.fillStyle = '#aaa';
    this.ctx.font = `bold ${this.blockSize * 0.6}px "Courier New", monospace`;
    this.ctx.fillText('LINES', panelWidth / 2, startY + lineHeight * 2);
    this.ctx.fillStyle = '#888';
    this.ctx.font = `${this.blockSize * 0.55}px "Courier New", monospace`;
    this.ctx.fillText(
      String(scoreState.lines),
      panelWidth / 2,
      startY + lineHeight * 2 + valueOffset
    );
  }

  private drawGameOver(): void {
    // Overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // GAME OVER text
    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = `bold ${this.blockSize * 2.5}px "Courier New", monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Glow effect
    this.ctx.shadowColor = '#ff0000';
    this.ctx.shadowBlur = 20;

    this.ctx.fillText(
      'GAME OVER',
      this.canvas.width / 2,
      this.canvas.height / 2 - this.blockSize * 2
    );

    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;

    // Score
    this.ctx.fillStyle = '#ccc';
    this.ctx.font = `${this.blockSize * 1}px "Courier New", monospace`;
    this.ctx.fillText(
      'Press ENTER or Tap to restart',
      this.canvas.width / 2,
      this.canvas.height / 2 + this.blockSize * 2
    );

    this.ctx.textBaseline = 'alphabetic';
  }

  private drawPause(): void {
    // Overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // PAUSED text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${this.blockSize * 2}px "Courier New", monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Glow
    this.ctx.shadowColor = '#00aaff';
    this.ctx.shadowBlur = 15;

    this.ctx.fillText(
      'PAUSED',
      this.canvas.width / 2,
      this.canvas.height / 2
    );

    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;

    this.ctx.textBaseline = 'alphabetic';
  }

  private drawIdle(): void {
    // Overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Title
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // TETRIS title
    this.ctx.fillStyle = '#00f0f0';
    this.ctx.font = `bold ${this.blockSize * 4}px "Courier New", monospace`;

    // Glow
    this.ctx.shadowColor = '#00f0f0';
    this.ctx.shadowBlur = 30;

    this.ctx.fillText(
      'TETRIS',
      this.canvas.width / 2,
      this.canvas.height / 2 - this.blockSize * 3
    );

    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;

    // Instruction
    this.ctx.fillStyle = '#aaa';
    this.ctx.font = `${this.blockSize * 1}px "Courier New", monospace`;
    this.ctx.fillText(
      'Press ENTER or Tap to start',
      this.canvas.width / 2,
      this.canvas.height / 2 + this.blockSize * 2
    );

    this.ctx.textBaseline = 'alphabetic';
  }

  private drawCell(x: number, y: number, color: string, size: number = this.blockSize): void {
    const PANEL_WIDTH = this.blockSize * 5;
    const cellX = PANEL_WIDTH + x * this.blockSize;
    const cellY = y * this.blockSize;

    // Darken color for base
    this.ctx.fillStyle = this.darkenColor(color, 0.3);
    this.ctx.fillRect(cellX + 1, cellY + 1, this.blockSize - 2, this.blockSize - 2);

    // Main fill
    this.ctx.fillStyle = color;
    this.ctx.fillRect(cellX + 2, cellY + 2, this.blockSize - 4, this.blockSize - 4);

    // Top-left highlight
    this.ctx.fillStyle = this.lightenColor(color, 0.4);
    this.ctx.fillRect(cellX + 1, cellY + 1, this.blockSize - 2, 2);
    this.ctx.fillRect(cellX + 1, cellY + 1, 2, this.blockSize - 2);

    // Bottom-right shadow
    this.ctx.fillStyle = this.darkenColor(color, 0.5);
    this.ctx.fillRect(cellX + 1, cellY + this.blockSize - 3, this.blockSize - 2, 2);
    this.ctx.fillRect(cellX + this.blockSize - 3, cellY + 1, 2, this.blockSize - 2);

    // Inner highlight (specular)
    this.ctx.fillStyle = this.lightenColor(color, 0.6);
    this.ctx.fillRect(cellX + 3, cellY + 3, this.blockSize - 8, 1);
    this.ctx.fillRect(cellX + 3, cellY + 3, 1, this.blockSize - 8);
  }

  private drawPreviewCell(x: number, y: number, color: string, size: number): void {
    // Darken color for base
    this.ctx.fillStyle = this.darkenColor(color, 0.3);
    this.ctx.fillRect(x, y, size, size);

    // Main fill
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    // Top-left highlight
    this.ctx.fillStyle = this.lightenColor(color, 0.4);
    this.ctx.fillRect(x, y, size, 1);
    this.ctx.fillRect(x, y, 1, size);

    // Bottom-right shadow
    this.ctx.fillStyle = this.darkenColor(color, 0.5);
    this.ctx.fillRect(x, y + size - 1, size, 1);
    this.ctx.fillRect(x + size - 1, y, 1, size);
  }

  private lightenColor(color: string, amount: number): string {
    const rgb = this.hexToRgb(color);
    return this.rgbToHex(
      Math.min(255, rgb.r + Math.floor((255 - rgb.r) * amount)),
      Math.min(255, rgb.g + Math.floor((255 - rgb.g) * amount)),
      Math.min(255, rgb.b + Math.floor((255 - rgb.b) * amount))
    );
  }

  private darkenColor(color: string, amount: number): string {
    const rgb = this.hexToRgb(color);
    return this.rgbToHex(
      Math.floor(rgb.r * (1 - amount)),
      Math.floor(rgb.g * (1 - amount)),
      Math.floor(rgb.b * (1 - amount))
    );
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  private drawTutorial(): void {
    const bs = this.blockSize;
    const PANEL_WIDTH = bs * 5;
    const previewCellSize = bs * 0.8;
    const boxSize = previewCellSize * 5;
    const boxX = (PANEL_WIDTH - boxSize) / 2;
    const boxY = bs * 2.5;
    const boardLeft = PANEL_WIDTH;
    const boardRight = PANEL_WIDTH + BOARD_COLS * bs;

    const accentColor = '#00f0f0';
    const textColor = '#aaa';

    this.ctx.save();

    // Glow effect
    this.ctx.shadowColor = accentColor;
    this.ctx.shadowBlur = 8;

    // 1. Hold (left panel HOLD box)
    this.drawTutorialBox(
      boxX, boxY, boxSize, boxSize,
      'HOLD\nS', textColor, accentColor
    );

    // 2. Pause/Restart (top-right panel)
    this.drawTutorialBox(
      boardRight + bs * 0.3, bs * 0.3,
      PANEL_WIDTH - bs * 0.6, bs * 6,
      'PAUSE\nEsc\n\nRESTART\nDouble-Tap / R', textColor, accentColor
    );

    // 3. Hard Drop (board bottom 2 rows)
    this.drawTutorialBox(
      boardLeft, (BOARD_ROWS - 2) * bs,
      BOARD_COLS * bs, bs * 2,
      'HARD DROP\nSpace', textColor, accentColor
    );

    // 4. CCW (left panel, below Hold)
    this.drawTutorialBox(
      bs * 0.3, bs * 7,
      PANEL_WIDTH - bs * 0.6, BOARD_ROWS * bs - bs * 7 - bs * 0.3,
      'CCW\nD', textColor, accentColor
    );

    // 5. CW (right panel, below Pause)
    this.drawTutorialBox(
      boardRight + bs * 0.3, bs * 7,
      PANEL_WIDTH - bs * 0.6, BOARD_ROWS * bs - bs * 7 - bs * 0.3,
      'CW\nF', textColor, accentColor
    );

    this.ctx.restore();
  }

  private drawTutorialBox(
    x: number, y: number, w: number, h: number,
    text: string, textColor: string, borderColor: string
  ): void {
    const radius = 4;

    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, radius);

    // Fill
    this.ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    this.ctx.fill();

    // Stroke
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Text (centered)
    this.ctx.shadowBlur = 0;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const lines = text.split('\n');
    const actionHeight = this.blockSize * 0.65;
    const keyHeight = this.blockSize * 0.5;

    // Calculate total height accounting for style-specific line heights
    let totalHeight = 0;
    let hi = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length === 0) {
        totalHeight += actionHeight * 0.5;
      } else {
        totalHeight += (hi % 2 === 0) ? actionHeight : keyHeight;
        hi++;
      }
    }

    let currentY = y + h / 2 - totalHeight / 2;
    const evenColor = textColor;
    const oddColor = '#666';
    let styleIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length === 0) {
        currentY += actionHeight * 0.5;
        continue;
      }

      const isAction = styleIndex % 2 === 0;
      styleIndex++;
      this.ctx.font = isAction
        ? `bold ${this.blockSize * 0.48}px "Courier New", monospace`
        : `${this.blockSize * 0.38}px "Courier New", monospace`;
      this.ctx.fillStyle = isAction ? evenColor : oddColor;

      this.ctx.fillText(lines[i], x + w / 2, currentY + (isAction ? actionHeight : keyHeight) / 2);
      currentY += isAction ? actionHeight : keyHeight;
    }
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((v) => {
          const hex = v.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }
}

export { Renderer };
