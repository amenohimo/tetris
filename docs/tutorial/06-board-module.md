# 06: Boardモジュール — テトリスの盤面を管理する

前回（[05: 型定義ファイル](./05-types-definitions.md)）ではデータの形を学びました。今回はそのデータを使って、**実際にテトリスの盤面を操作する**方法を見ていきます。

## 盤面の表現方法

テトリスの盤面を想像してください。10列×20行のマス目が並んでいて、各マスには「ピースの色」か「空」が入ります。

このデータ構造は単純です。

```typescript
// 型の復習（src/types.ts）
type Cell = PieceType | null;          // 1マス = 色か空
type BoardGrid = Cell[][];              // 2次元配列
```

BoardGrid は **22行×10列** の2次元配列です。`board[row][col]` で特定のマスにアクセスします。行の添字が先に来るのは「2次元配列の外側が行」というJavaScriptの配列表現の自然な流れです。

なぜ2次元配列を使うのか？ 添字で直接目的のセルにアクセスできるからです。`board[5][3]` と書けば「上から6行目、左から4列目」のマスが一発で分かります。連結リストやオブジェクトよりも**圧倒的にシンプル**です。

## 定数の意味

`src/game/Board.ts` には4つの定数があります。

```typescript
export const COLS = 10;         // 横幅（列数）
export const ROWS = 22;         // 高さ（行数）
export const VISIBLE_ROWS = 20; // 実際に画面に見える行数
export const HIDDEN_ROWS = 2;   // 画面上部の隠れ領域の行数
```

「なぜ ROWS = 22 で、VISIBLE_ROWS = 20 なのか？」と思うでしょう。上部2行は**隠れ領域（hidden rows）** です。

テトリスでは新しいピースが盤面の**上から**出現します。しかし、いきなり画面上端に現れると不自然です。隠れ領域でピースを生成し、1フレーム目でプレイヤーに見える位置まで落ちてくる、という流れになります。

```
rows: 0-1    ← 隠れ領域（HIDDEN_ROWS = 2）ピースがここで生まれる
rows: 2-21   ← 見える部分（VISIBLE_ROWS = 20）
```

この設計は**Tetris Guideline**（テトリス公式の仕様書）に従ったものです。テトリスには「セルは20行見えていて、上部に見えない部分がある」というルールがあります。

## `createBoard()` — 空の盤面を作る

```typescript
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
```

`Array.from({ length: ROWS }, () => ...)` は「ROWS（22）個の要素を持つ配列を生成し、各要素をコールバック関数の戻り値で埋める」という処理です。

手順はこうです。

1. 22個の「行」を作る
2. 各行は `Array(COLS).fill(null)` で作られた10個の `null` が入った配列
3. 結果：22行 × 10列、全部 `null`

`null` は「何もない = 空きマス」を表します。`undefined` ではなく `null` を使っているのは、「意図的に空にした」ことを明確にするためです。

### 試してみよう

Playgroundで同じことを小さなサイズで試しましょう。

```typescript
type Cell = string | null;
type BoardGrid = Cell[][];

const ROWS = 5;
const COLS = 6;

function createBoard(): BoardGrid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

const board = createBoard();
console.log(board);
console.log(`行数: ${board.length}, 列数: ${board[0].length}`);
// 行数: 5, 列数: 6
```

## `isValidPosition()` — テトリスで最重要の関数

```typescript
// src/game/Board.ts — 概念を簡略化
export function isValidPosition(
  shape: boolean[][],
  pos: Position,
  board: BoardGrid
): boolean {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue; // 空きセルはスキップ

      const boardX = pos.x + col;     // 盤面上のX座標
      const boardY = pos.y + row;     // 盤面上のY座標

      // 左端・右端・下端を超えていないか？
      if (boardX < 0 || boardX >= COLS) return false;
      if (boardY >= ROWS) return false;

      // 上端（boardY < 0）は許可する（ピースがまだ出現途中）
      // 既に別のブロックが置かれていないか？
      if (boardY >= 0 && board[boardY][boardX] !== null) return false;
    }
  }
  return true; // 全てのブロックが有効な位置
}
```

この関数はテトリスで最も重要です。**「今の位置でこのピースを置けるか？」**を判定します。移動、回転、落下のすべてがこの関数に依存します。

判定ロジックを分解しましょう。

1. ピースの全ブロック（shapeの中でtrueのセル）を1つずつ調べる
2. そのブロックの盤面座標を計算する（`pos.x + col`, `pos.y + row`）
3. 以下をチェックする
   - 左端より左？ → 壁に当たっている
   - 右端より右？ → 壁に当たっている
   - 下端より下？ → 床の下に落ちている
   - 既にブロックがある？ → 別のピースと重なっている
4. どれにも引っかからなければ → 置ける！

**なぜ上端（`boardY < 0`）は許可するのか？**

新しいピースは盤面の上にある隠れ領域から出現します。生成時点では `pos.y` が負の値になることがあります（例えばIピースは y=-1 からスタート）。このとき盤面の範囲外ですが、**ブロックはまだ空中にあるだけで問題ではありません**。ただし `board[boardY]` にアクセスするとエラーになるので、`boardY >= 0` のガードが必要です。

### 試してみよう

```typescript
type Position = { x: number; y: number; };
const COLS = 10;
const ROWS = 22;

// 小さなTピースの形
const shape = [
  [false, true,  false],
  [true,  true,  true],
  [false, false, false],
];

function isValidPosition(shape: boolean[][], pos: Position): boolean {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;
      const boardX = pos.x + col;
      const boardY = pos.y + row;
      if (boardX < 0 || boardX >= COLS) return false;
      if (boardY >= ROWS) return false;
    }
  }
  return true;
}

console.log(isValidPosition(shape, { x: 3, y: 0 }));  // true（中央）
console.log(isValidPosition(shape, { x: 9, y: 0 }));  // false（右端のブロックがx=10）
console.log(isValidPosition(shape, { x: 3, y: 21 })); // false（下端を超える）
```

## `lockPiece()` — ピースを盤面に確定する

ピースがもう移動できなくなったら、盤面に**書き込んで確定**します。

```typescript
// src/game/Board.ts — 概念を簡略化
export function lockPiece(piece: Piece, board: BoardGrid): void {
  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (!piece.shape[row][col]) continue;

      const boardX = piece.position.x + col;
      const boardY = piece.position.y + row;

      // ガード：隠れ領域のブロックは無視
      if (boardY >= 0) {
        board[boardY][boardX] = piece.type; // PieceTypeを書き込む
      }
    }
  }
}
```

`isValidPosition` と非常に似た構造です。違いは「判定する」ではなく「書き込む」ことです。

`board[boardY][boardX] = piece.type` の部分で、空きマス（null）が、そのピースの種類（`'T'` や `'I'` など）に変わります。この PieceType は後でRendererが色を決めるのに使います。

隠れ領域（`boardY < 0`）のブロックは無視されます。なぜなら、隠れ領域にあるブロックは**プレイヤーに見えていない**からです。もしロック時に隠れ領域にブロックがあれば、それは「積み上がりすぎてゲームオーバー」の状態です。

## `clearLines()` — テトリスで一番気持ちいい処理

```typescript
// src/game/Board.ts — 概念を簡略化
export function clearLines(board: BoardGrid): { board: BoardGrid; linesCleared: number } {
  // 消えない行（空きセルが1つでもある行）だけを残す
  const newBoard = board.filter((row) => row.some((cell) => cell === null));
  const linesCleared = ROWS - newBoard.length;

  // 消えた行の分だけ空行を先頭に追加
  while (newBoard.length < ROWS) {
    const emptyRow: Cell[] = [];
    for (let x = 0; x < COLS; x++) {
      emptyRow.push(null);
    }
    newBoard.unshift(emptyRow);
  }

  return { board: newBoard, linesCleared };
}
```

ラインが揃うとその行が消えて、上の行が下にずれます。このアルゴリズムの流れです。

1. **消えない行を抽出する**: `row.some(cell => cell === null)` は「1つでも `null` があれば true」を返します。つまり、1つでも空きセルがある行は「消えない行」です。
2. **消えた行数を計算する**: 元の行数（22）から残った行数を引く
3. **空行を上に追加する**: 消えた行数ぶんの `null` で埋まった行を作り、残った行の前に結合する

`unshift` で空行を先頭に追加しているのは、新しい空行を上に積む処理をそのまま表現しているためです。`filter` で消えなかった行だけを残し、`while` ループで足りない行を先頭に追加します。

戻り値に新しい盤面と消去行数の**両方**を含めているのは、呼び出し元（Gameクラス）がスコア計算に消去行数を使うからです。

### 試してみよう

```typescript
type Cell = string | null;
type BoardGrid = Cell[][];

const COLS = 6;  // 小さめの盤面で実験

function clearLines(board: BoardGrid): { board: BoardGrid; linesCleared: number } {
  const newBoard = board.filter((row) => row.some((cell) => cell === null));
  const linesCleared = board.length - newBoard.length;

  while (newBoard.length < board.length) {
    const emptyRow: Cell[] = [];
    for (let x = 0; x < COLS; x++) {
      emptyRow.push(null);
    }
    newBoard.unshift(emptyRow);
  }
  return { board: newBoard, linesCleared };
}

// 4行の盤面を作る（2行目と3行目が全て埋まっている）
const board: BoardGrid = [
  [null, null, null, 'T', null, null],   // 消えない
  ['T', 'I', 'O', 'S', 'Z', 'L'],        // 消える！
  ['I', 'T', 'S', 'O', 'Z', 'L'],        // 消える！
  [null, 'T', null, null, null, null],   // 消えない
];

const result = clearLines(board);
console.log(`消えた行: ${result.linesCleared}`);     // 2
console.log(`新しい行数: ${result.board.length}`);     // 4
console.log(`1行目: ${result.board[0]}`);             // 全部null
```

## `getGhostPosition()` — ゴーストピースの位置計算

ゴーストピースとは「このまま落下するとどこに着地するか」を示す半透明のプレビューです。

```typescript
// src/game/Board.ts — 概念を簡略化
export function getGhostPosition(
  shape: boolean[][],
  pos: Position,
  board: BoardGrid
): Position {
  let ghostY = pos.y;
  // 床にぶつかるまでyを1ずつ増やす
  while (isValidPosition(shape, { x: pos.x, y: ghostY + 1 }, board)) {
    ghostY++;
  }
  return { x: pos.x, y: ghostY };
}
```

極めてシンプルなwhileループです。床上に衝突するまで `y` を1ずつ増やしていきます。タイムクリティカルではない処理なので、単純なループで十分です（計算量も最大で22回）。

## なぜBoardはクラスではなく関数の集まりなのか？

`Board.ts` にはクラス（class）がありません。すべて**独立した関数**です。

| アプローチ | メリット | デメリット |
|---|---|---|
| クラス（`class Board`） | 状態と操作が1箇所にまとまる | テストが複雑、継承の罠 |
| 関数群（現在の設計） | 純粋関数でテスト容易、依存が明確 | 状態を別の場所で持つ必要がある |

このプロジェクトでは「Boardの状態（盤面データ）はGameクラスが持ち、Board.tsはその操作だけを提供する」という分割を選びました。

**純粋関数（pure function）** とは、同じ入力に対して常に同じ出力を返し、外部の状態を変更しない関数です。`isValidPosition(shape, pos, board)` は「どんな順番で何度呼んでも」「同じ引数なら同じ結果」です。純粋関数の集まりにすることで、テトリスという複雑なゲームの**盤面操作だけを独立してテスト**できます。

```typescript
// テストが簡単
const board = createBoard();
const result = isValidPosition(someShape, { x: 3, y: 0 }, board);
// boardは変更されていないので、次のテストも安心
```

### 関数 vs メソッド

Board.ts の関数（`isValidPosition`, `createBoard`, `clearLines` など）はすべて**独立した関数**であり、クラスのメソッドではありません。一方、Game.ts の関数（`moveLeft`, `rotate` など）はクラスのメソッドです。この違いは設計上重要です。

- **関数**（Board.ts）: データを受け取り、結果を返す。状態を持たない → テストしやすい
- **メソッド**（Game.ts）: オブジェクトの状態を変更する。状態を持つ → カプセル化に向く

isValidPosition は「盤面と形状と位置を受け取り、置けるかどうかを返す」純粋関数です。「どのクラスに属する」ではなく「盤面に対する操作」として独立しています。

## グリッド座標の約束

テトリスに限らず、多くの2Dゲームでは座標系に約束事があります。

- **x（列）**: 左から右に増加（0〜9）
- **y（行）**: 上から下に増加（0〜21）

数学の授業で習うグラフと違って y が**下向きに増える**のは、コンピュータの画面座標が左上を原点にするからです。`board[0]` が一番上の行というわけです。

---

これで盤面操作の基本が分かりました。次は[`./07-piece-module.md`](./07-piece-module.md)で、テトリミノそのものの定義と回転の仕組みを学びます。

**→ 次のステップ：[07: Pieceモジュール](./07-piece-module.md)**
**← 前のステップ：[05: 型定義ファイル](./05-types-definitions.md)**
