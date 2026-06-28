# 11: Rendererモジュール — Canvasで描画する

テトリスはブロックが動くゲームです。その「見た目」を担当するのが `src/renderer/Renderer.ts` です。610行とプロジェクト最大のファイルですが、「描画」という1つの責務に集中しています。

## Canvas API の基本

このRendererは **Canvas**（キャンバス）と呼ばれるブラウザの描画機能を使っています。

```html
<!-- HTMLでのCanvas要素（概念） -->
<canvas id="game-canvas" width="600" height="600"></canvas>
```

Canvasは「JavaScriptで自由に絵を描ける領域」です。四角形を描いたり、文字を書いたり、色を塗ったりできます。

```typescript
// Canvasの基本操作（概念）
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');  // 2D描画コンテキストを取得

ctx.fillStyle = '#ff0000';           // 塗りつぶし色を赤に設定
ctx.fillRect(10, 10, 50, 50);        // (10,10) に 50x50 の四角を描画

ctx.fillStyle = '#fff';              // 塗りつぶし色を白に
ctx.font = '20px monospace';         // フォント設定
ctx.fillText('Hello!', 100, 100);    // (100,100) に文字を描画
```

Canvasの座標系は左上が `(0, 0)` で、右に行くほど x が増え、下に行くほど y が増えます。これはゲームの盤面座標系と同じ方向です。

### フレームごとのクリア

ゲームでは毎フレーム（通常1秒間に60回）、画面を完全にクリアしてから全部を描き直します。これを**再描画（redraw）** と呼びます。

```typescript
function gameLoop() {
  // 1. 画面をクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. 全部を描き直す
  drawBoard();
  drawPiece();
  drawScore();
  // ...

  requestAnimationFrame(gameLoop);  // 次のフレームを要求
}
```

`clearRect(x, y, width, height)` は指定された矩形を透明にクリアします。`(0, 0, canvas.width, canvas.height)` でキャンバス全体をクリアしています。

**なぜ毎回クリアするのか？** 前のフレームの絵が残ったまま新しい絵を描くと、残像のように前の位置のブロックが表示され続けてしまいます。消してから描く、を毎回繰り返すのがゲーム描画の基本です。

### 状態の保存と復元

Canvasは「描画コンテキスト」に色や変形などの状態を持っています。`save()` と `restore()` でその状態を一時保存・復元できます。

```typescript
ctx.save();                    // 現在の状態を保存
ctx.translate(100, 50);        // 描画原点を移動
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 30, 30);   // (100, 50) の位置に描画される
ctx.restore();                 // 状態を戻す（原点も色も元通り）
// ctx.fillRect(0, 0, 30, 30); // 元の位置 (0, 0) に描画
```

テトリスのRendererでは、各描画領域（盤面、スコア、ホールド、ネクスト）を `save/restore` で区切ることで、お互いの描画設定が影響し合わないようにしています。

このセクションで説明したAPIはRenderer.tsの610行の中で繰り返し使われています。コードを読むときは「これは描画の前準備」「これは実際の描画」といった目印にしてください。

### なぜCanvasなのか？ DOMではないのか？

テトリス程度ならDOM（HTML要素）でも描画できますが、Canvasには以下の利点があります。

| 方式 | 利点 | 欠点 |
|---|---|---|
| Canvas（採用） | 描画パフォーマンスが安定、細かい制御が可能 | テキストの装飾がDOMより面倒 |
| DOM（HTML要素） | CSSで簡単に見た目を変えられる | セル数が多いと再描画が遅くなる |
| WebGL | 超高速、3D表現も可能 | 学習コストが高く、テトリスにはオーバーキル |

「テトリスにWebGLはいらない。DOMでは遅い。Canvasがちょうどいい」という判断です。

## 「ロジックと描画の分離」という設計思想

このプロジェクトの重要な設計思想が「ロジック（計算やルール）と描画の分離」です。

```typescript
// Renderer.ts の import（1-2行目）
import type { Piece, BoardGrid, GameState, HoldInfo, ScoreState, Position, GameConfig, PieceType } from '../types';
import { HIDDEN_ROWS } from '../game/Board';

// Game は一切 import していない！
```

**Rendererは `types.ts` だけをimportし、Gameクラスをimportしません。** これが分離の証です。

```typescript
// 分離の恩恵：Rendererは「ゲームのルール」を知らなくていい
// Gameは「どう描画されるか」を知らなくていい

// Game側（ルールだけに集中）
private lockCurrentPiece(): void {
  // ...ライン消去やスコア計算...
  // 「どう描画するか」は一切気にしない
}

// Renderer側（描画だけに集中）
render(gameState: { /* 必要なデータだけ受け取る */ }): void {
  this.drawBoard(gameState.board);
  this.drawPiece(gameState.currentPiece);
  // 「ゲームのルール」は一切気にしない
}
```

この分離の利点は以下の通りです。

- **描画方式を変えてもゲームロジックは不変**: CanvasからWebGLに変更しても、Game.tsは1行も変えません
- **ゲームロジックをテストするときに描画が邪魔にならない**: GameクラスのテストでCanvasは不要
- **役割の明確化**: 「このバグは描画の問題か、ルールの問題か」がすぐわかる

## `boardYToCanvas()` — 座標変換

```typescript
// src/renderer/Renderer.ts（82-84行目）
private boardYToCanvas(boardY: number): number {
  return boardY - HIDDEN_ROWS;
}
```

盤面は22行（`HIDDEN_ROWS = 2` + 表示20行）ですが、画面に表示するのは20行だけです。上の2行は**隠れ領域**で、ピースが上から出現するためのスペースです（[06: Boardモジュール](./06-board-module.md)参照）。

`boardYToCanvas()` はゲームの座標（0-21）を表示用の座標（0-19）に変換します。

```
ゲーム座標 Y=0 → 描画座標 Y=-2（隠れ領域なので描画しない）
ゲーム座標 Y=2 → 描画座標 Y=0（最上部）
ゲーム座標 Y=21 → 描画座標 Y=19（最下部）
```

## 3Dセルの描画（ベベル効果）

```typescript
// src/renderer/Renderer.ts（520-547行目）
private drawCell(x: number, y: number, color: string, size: number = this.blockSize): void {
  const PANEL_WIDTH = this.blockSize * 5;
  const cellX = PANEL_WIDTH + x * this.blockSize;
  const cellY = y * this.blockSize;

  // 1. 暗いベース（外枠）
  this.ctx.fillStyle = this.darkenColor(color, 0.3);
  this.ctx.fillRect(cellX + 1, cellY + 1, this.blockSize - 2, this.blockSize - 2);

  // 2. メインカラー
  this.ctx.fillStyle = color;
  this.ctx.fillRect(cellX + 2, cellY + 2, this.blockSize - 4, this.blockSize - 4);

  // 3. 左上のハイライト（明るい線）
  this.ctx.fillStyle = this.lightenColor(color, 0.4);
  this.ctx.fillRect(cellX + 1, cellY + 1, this.blockSize - 2, 2);  // 上辺
  this.ctx.fillRect(cellX + 1, cellY + 1, 2, this.blockSize - 2);  // 左辺

  // 4. 右下の影（暗い線）
  this.ctx.fillStyle = this.darkenColor(color, 0.5);
  this.ctx.fillRect(cellX + 1, cellY + this.blockSize - 3, this.blockSize - 2, 2); // 下辺
  this.ctx.fillRect(cellX + this.blockSize - 3, cellY + 1, 2, this.blockSize - 2); // 右辺

  // 5. 内側のハイライト（スペキュラ = 光の反射）
  this.ctx.fillStyle = this.lightenColor(color, 0.6);
  this.ctx.fillRect(cellX + 3, cellY + 3, this.blockSize - 8, 1);
  this.ctx.fillRect(cellX + 3, cellY + 3, 1, this.blockSize - 8);
}
```

各セルを単色の四角でなく、立体的に見せています。この技法を**ベベル**（bevel = 面取り）と呼びます。

```
セルの構造（模式図）:
┌──────────────────┐
│ ████ 左上ハイライト（明るい）│
│ ██░░░░ メインカラー         │
│ ██░░░░░░░░                 │
│ ██░░░░░░░░                 │
│ ██░░░░░░░░ ████ ハイライト   │
│ ████████████ 右下影（暗い）  │
└──────────────────┘
```

人間の視覚は「上から光が当たっている」と仮定して物を認識します。左上が明るく右下が暗いと、**凸（でこ）**に見えます。この原理を利用して、2Dの四角形を3Dのように見せています。

`lightenColor()` と `darkenColor()` は色の明るさを計算するヘルパーメソッドです。

```typescript
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
```

`hexToRgb()` は `#00f0f0` のような16進数カラーコードを `{ r: 0, g: 240, b: 240 }` に変換します。ライトネス処理（明るくしたり暗くしたり）はRGB値で計算した方が簡単だからです。

## 各描画要素の解説

### 1. 盤面グリッド

```typescript
// src/renderer/Renderer.ts（219-238行目）
private drawGrid(): void {
  const PANEL_WIDTH = this.blockSize * 5;
  this.ctx.strokeStyle = '#1a1a3a';  // 暗い青色の線
  this.ctx.lineWidth = 0.5;

  // 縦線（11本 = 10列 + 左右の枠）
  for (let x = 0; x <= BOARD_COLS; x++) {
    this.ctx.beginPath();
    this.ctx.moveTo(PANEL_WIDTH + x * this.blockSize, 0);
    this.ctx.lineTo(PANEL_WIDTH + x * this.blockSize, BOARD_ROWS * this.blockSize);
    this.ctx.stroke();
  }

  // 横線（21本 = 20行 + 上下の枠）
  for (let y = 0; y <= BOARD_ROWS; y++) {
    this.ctx.beginPath();
    this.ctx.moveTo(PANEL_WIDTH, y * this.blockSize);
    this.ctx.lineTo(PANEL_WIDTH + BOARD_COLS * this.blockSize, y * this.blockSize);
    this.ctx.stroke();
  }
}
```

`strokeStyle = '#1a1a3a'`（非常に暗い青）でグリッド線を描きます。明るすぎるとゲーム画面がごちゃごちゃして見えるので、背景と同化するように抑えています。

### 2. 固定ピース

```typescript
// src/renderer/Renderer.ts（141-149行目）
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
```

`board[y][x]` が `null` でないセル（= ブロックがある場所）だけを描画します。Y方向のループは `HIDDEN_ROWS` から始めることで、隠れ領域は描画しません。

### 3. アクティブピース

```typescript
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
```

`piece.shape`（booleanの2次元配列）を走査し、`true` のセルだけを描画します。`drawY >= 0` のチェックで、隠れ領域にあるピースの一部は描画しないようにしています。

### 4. ゴーストピース

```typescript
private drawGhost(piece: Piece, ghostPos: Position): void {
  this.ctx.globalAlpha = 0.15;  // 非常に薄く
  // ... アクティブピースと同じ形だが、半透明で描画 ...

  this.ctx.globalAlpha = 0.3;
  this.ctx.strokeStyle = PIECE_COLORS[piece.type];
  // ... 輪郭線も描画 ...
}
```

ゴーストピースは「現在のピースが落下した先の位置」を示す半透明の表示です。`globalAlpha = 0.15` でほとんど透明にし、輪郭線を `0.3` で描くことで「そこにあるけど、まだ実体じゃない」という視覚的表現を実現しています。

### 5. Holdプレビュー

```typescript
// src/renderer/Renderer.ts（240-300行目）
private drawHold(holdInfo: HoldInfo): void {
  // 左パネル（blockSize * 5 の幅）に表示
  const PANEL_WIDTH = this.blockSize * 5;

  // "HOLD" ラベル
  this.ctx.fillText('HOLD', PANEL_WIDTH / 2, this.blockSize * 1.5);

  // Holdにピースがある場合は、PREVIEW_SHAPES を使って描画
  if (holdInfo.type) {
    const shape = PREVIEW_SHAPES[holdInfo.type];
    const color = PIECE_COLORS[holdInfo.type];
    // ... 中央寄せで描画 ...
  }
}
```

Holdプレビューには `PREVIEW_SHAPES`（回転0の形だけを持った別の定数）を使います。現在のピースの形ではなく、標準的な形で表示するためです。

### 6. Nextプレビュー

```typescript
// src/renderer/Renderer.ts（302-369行目）
private drawNext(nextQueue: PieceType[]): void {
  // 右パネルに最大3つ表示
  const maxPreview = Math.min(3, nextQueue.length);
  for (let i = 0; i < maxPreview; i++) {
    const pieceType = nextQueue[i];
    const shape = PREVIEW_SHAPES[pieceType];
    // ... i 番目のピースを縦に並べて描画 ...
  }
}
```

Nextプレビューは `nextQueue` の先頭から最大3つを表示します。各ピースは枠（`strokeRect`）で囲まれ、その中に中央寄せで描画されます。

### 7. スコア表示

```typescript
// src/renderer/Renderer.ts（372-416行目）
private drawScore(scoreState: ScoreState): void {
  // SCORE / LEVEL / LINES の3項目を表示
  // 各ラベルは灰色（#aaa）、数値は白色（#fff）
  // 数値は8桁ゼロ埋め（padStart）
  this.ctx.fillText(
    String(scoreState.score).padStart(8, '0'),
    // ...
  );
}
```

`padStart(8, '0')` でスコアを「00000000」形式にします。テトリス風のクラシックな見た目を演出しています。

### 8. オーバーレイ

ゲームの状態に応じて、画面全体に半透明のオーバーレイ（重ねて描画する層）を表示します。

```typescript
// src/renderer/Renderer.ts（128-138行目）
switch (state) {
  case 'idle':
    this.drawIdle();       // "TETRIS" タイトル + "Press ENTER to start"
    break;
  case 'paused':
    this.drawPause();      // "PAUSED" + ブルーのグロー効果
    break;
  case 'gameOver':
    this.drawGameOver();   // "GAME OVER" + レッドのグロー効果 + スコア
    break;
}
```

各オーバーレイは `shadowColor` と `shadowBlur` で**グロー効果**（発光表現）を加えています。

```typescript
// グロー効果の例
this.ctx.shadowColor = '#ff0000';  // 赤い光
this.ctx.shadowBlur = 20;         // 20pxぼかす
this.ctx.fillText('GAME OVER', x, y);
this.ctx.shadowColor = 'transparent';  // リセット
this.ctx.shadowBlur = 0;
```

## PIECE_COLORS — 色の統一管理

```typescript
// src/renderer/Renderer.ts（8-16行目）
const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};
```

`Piece.ts` にも `COLORS` 定数がありますが、Renderer.tsにも `PIECE_COLORS` があります。なぜ重複するのでしょうか。

```typescript
// Piece.ts の COLORS（概念）
const COLORS: Record<PieceType, string> = { /* 同じ値 */ };
// → Pieceの生成ロジックで使う

// Renderer.ts の PIECE_COLORS（概念）
const PIECE_COLORS: Record<PieceType, string> = { /* 同じ値 */ };
// → 描画で使う
```

これらを分けることで依存関係をクリーンに保っています。

- **Piece.ts**: ゲームロジック用。Rendererのことは知らない
- **Renderer.ts**: 描画用。Pieceのことは知らない（`types.ts` の型だけを使う）

「同じ値なら共通化すればいい」と思うかもしれません。しかし共通化すると「描画のためだけにPieceモジュールをimportする」という依存関係が生まれます。描画方式を変えるときにゲームロジックも影響を受ける可能性が出てきます。

## `render()` メソッドの引数設計

```typescript
// src/renderer/Renderer.ts（86-94行目）
render(gameState: {
  board: BoardGrid;
  currentPiece: Piece | null;
  ghostPosition: Position | null;
  state: GameState;
  scoreState: ScoreState;
  holdInfo: HoldInfo;
  nextQueue: PieceType[];
}): void {
```

`render()` はGameインスタンス全体ではなく、1つのオブジェクト（RenderState）を受け取ります。必要な情報だけを選んで渡す設計です。

```typescript
// 悪い例：Game全体を渡す
render(game: Game): void {
  this.drawBoard(game.board);
  // game のどのプロパティにアクセスしてもいい → 制御不能
}

// 良い例：必要な情報だけを渡す
render(gameState: { board: BoardGrid; currentPiece: Piece | null; /* ... */ }): void {
  // 型で受け取れるデータが制限される
}
```

なぜGameインスタンスを渡さないのでしょうか。**不要な依存を作らないため**です。もし `render(game: Game)` と書いてしまうと、RendererはGameクラスをimportする必要があります。すると「描画のためにゲームの全機能にアクセスできる」状態になり、いつか「ここでgame.start()を呼んでもいいや」という誘惑に負けるかもしれません。

## 設計判断のまとめ

| 判断 | 理由 |
|---|---|
| Canvasを採用 | DOMより高速、WebGLよりシンプル |
| Gameをimportしない | ロジックと描画の分離を徹底 |
| 1つの RenderState オブジェクトを受け取る | 外部から渡せる情報を型で制限 |
| 各描画メソッドを分割（drawBoard, drawPiece等） | メソッドごとに責務を明確化 |
| 3Dベベル表現 | 視覚的な質感向上 |
| PIECE_COLORSをRendererに再定義 | 依存関係のクリーンな分離 |
| キャッシュやダーティフラグがない | テトリスは全面再描画でも十分高速（10x20=200セル） |
| blockSizeを設定可能にした | プレイヤーの好みに応じて調整可能 |

## 試してみよう

ブラウザの開発者ツールでCanvasの描画を直接試せます。

```typescript
// 開発者ツールのコンソールで実行
const canvas = document.createElement('canvas');
canvas.width = 200;
canvas.height = 200;
document.body.appendChild(canvas);  // 画面に表示

const ctx = canvas.getContext('2d');

// テトリス風の3Dセルを描画
function draw3DCell(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  const size = 40;

  // 暗いベース
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, size, size);

  // メインカラー（少し暗め）
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

  // 左上ハイライト
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 2, y + 2, size - 4, 2);
  ctx.fillRect(x + 2, y + 2, 2, size - 4);

  // 右下影
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 2, y + size - 4, size - 4, 2);
  ctx.fillRect(x + size - 4, y + 2, 2, size - 4);
}

// Tピースを描画
const shape = [
  [false, true, false],
  [true, true, true],
  [false, false, false],
];

for (let y = 0; y < shape.length; y++) {
  for (let x = 0; x < shape[y].length; x++) {
    if (shape[y][x]) {
      draw3DCell(ctx, x * 42 + 30, y * 42 + 30, '#a000f0');
    }
  }
}
```

このコードをコンソールに貼り付けると、紫色の3Dテトリスブロックが表示されます。

---

**→ 次のステップ：[12: InputManagerモジュール](./12-input-module.md)**
**← 前のステップ：[10: Gameモジュール](./10-game-engine.md)**
