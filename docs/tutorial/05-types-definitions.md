# 05: 型定義ファイル — `src/types.ts` 完全解説

このファイルはテトリスプロジェクト全体で使う「型の辞書」です。すべてのTypeScriptファイルがここを参照することで、**データの形を統一**します。

## なぜ型定義を1つのファイルにまとめるのか？

ほとんどのプロジェクトでは、型定義を各モジュールに散らばせるか、1箇所に集めるかを選択します。このプロジェクトは**後者**を選びました。理由は3つです。

1. **importの循環を防ぐ** — AがBを、BがAをimportする「循環参照」を避けられます
2. **定義場所が明確** — 「この型はどこで定義されている？」という迷いがゼロになります
3. **全体像が一望できる** — プロジェクトで扱うデータ構造が58行で全て分かります

実際のファイルを見てみましょう。`src/types.ts` には58行のコードが書かれています。

## 1. `PieceType` — 7種類のピースを表す型

```typescript
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
```

これは **union type（共用体型）** と呼ばれるTypeScriptの機能です。パイプ記号 `|` で区切られた候補の**どれか1つ**だけを許します。

```typescript
let a: PieceType = 'T';  // OK
let b: PieceType = 'I';  // OK
let c: PieceType = 'X';  // エラー！ 'X'はPieceTypeではない
```

なぜ `string` ではなく専用の型にするのか？ 誤って存在しないピース名を書くと**コンパイル時点でエラー**になるからです。JavaScriptだけだとプログラムを動かすまで気づけません。

各文字列リテラル（`'I'` や `'O'` のような具体的な値）は **文字列リテラル型** と呼ばれ、その値しか代入できない型です。

### 試してみよう

TypeScript Playground（https://www.typescriptlang.org/play/）で以下を入力してみてください。

```typescript
type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

const ok: PieceType = 'O';  // OK
const ng: PieceType = 'X';  // 赤い波線が出るはず
```

`ng` の行にエラーが出れば成功です。TypeScriptが不正な値をブロックしています。

## 2. `Position` — グリッド上の座標

```typescript
export interface Position { x: number; y: number; }
```

**interface（インターフェース）** はオブジェクトの形を定義します。「xというnumber型のプロパティと、yというnumber型のプロパティを持つオブジェクト」という意味です。

ここで重要なのは `x` と `y` が **グリッド座標** であって**ピクセル座標ではない**ということです。テトリス盤面は10×22のマス目でできています。`Position { x: 3, y: 5 }` は「左から4列目、上から6行目のマス」を指します（配列は0始まりなのでx=3は4列目）。ピクセルと違って離散的な値しか取りません。

### `interface` と `type` の使い分け

このプロジェクトでは大まかに「オブジェクトの形を定義するときは `interface`、それ以外は `type`」という基準を使っています（`types.ts` で両方登場するので気づいたかもしれません）。

```typescript
// interface - オブジェクトの形
export interface Position { x: number; y: number; }

// type alias - 既存の型の組み合わせ
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Cell = PieceType | null;
```

**補足：交差型（intersection type）** — `&` 記号を使うと複数の型を合成できます。`types.ts` では使っていませんが、TypeScript の重要な機能です。

```typescript
type WithPosition = { x: number; y: number };
type WithColor = { color: string };
type ColoredPosition = WithPosition & WithColor;
// 結果: { x: number; y: number; color: string }
```

`interface` の `extends` に似ていますが、`&` は型（type）同士でも使える点が違います。

## 3. `Piece` — テトリミノの完全な状態

```typescript
export interface Piece {
  type: PieceType;
  shape: boolean[][];
  position: Position;
  rotation: number; // 0-3
}
```

4つのプロパティで1つのピースを表現します。

| プロパティ | 型 | 意味 |
|---|---|---|
| `type` | `PieceType` | どの種類か（色や形の決定に使う） |
| `shape` | `boolean[][]` | ブロックの有無を表す2次元配列 |
| `position` | `Position` | 盤面上の左上の座標 |
| `rotation` | `number` | 回転状態（0,1,2,3の4段階） |

### `shape: boolean[][]` の意味

`boolean[][]` は「boolean（真偽値）の2次元配列」です。Tピースの回転0の状態で見てみましょう（実際の定義は `src/game/Piece.ts` にあります）。

```
[ [false, true,  false],
  [true,  true,  true],
  [false, false, false] ]
```

`true` = そこにブロックがある、`false` = 空き。つまり3×3のグリッドでTの形を表現しています。

**疑問：なぜ `PieceType` そのものではなく `boolean` を使うの？**

もし `shape` を `PieceType[][]` にすると、「色情報」と「形情報」が混ざってしまいます。shapeが担当するのは「形」だけです。「色」は `type` プロパティから分かります。Board.tsの `lockPiece` 関数で盤面に書き込むときは、shapeのtrue/falseを見てブロックを置き、typeを見て色（ピースの種類）を決めます。

```typescript
// src/game/Board.ts（概念）
for (let row = 0; row < shape.length; row++) {
  for (let col = 0; col < shape[row].length; col++) {
    if (shape[row][col]) {  // ブロックがある
      board[boardY + row][boardX + col] = piece.type;  // PieceTypeを書き込む
    }
  }
}
```

## 4. `Cell` と `BoardGrid` — 盤面の構成要素

```typescript
export type Cell = PieceType | null;
export type BoardGrid = Cell[][];
```

盤面の1マス（Cell）は「何かのピースの一部」か「空」のどちらかです。

- `PieceType` が入っている → そのマスは埋まっていて、その種類の色で描画する
- `null` が入っている → 空きマス

なぜ `PieceType | null` なのでしょうか？

テトリスでは、盤面に置かれたブロックの**色**を覚えておく必要があります。単なる `boolean` だと「埋まっている」ことしか分からず、IピースなのかTピースなのか区別できません。Renderer（描画モジュール）は Cell の値を見て色を決めます（`src/game/Piece.ts` の `COLORS` 定数を参照）。

`BoardGrid` はその `Cell` を2次元に並べたものです。「22行×10列」のサイズになります。

```typescript
// イメージ：10列×22行の盤面
type BoardGrid = (PieceType | null)[][];
// BoardGrid[行][列] でアクセス
```

`Record<K, V>` は TypeScript のユーティリティ型で、「キーが K 型、値が V 型のオブジェクト」を表します。`Record<PieceType, string>` なら「キーは PieceType（7種類のピース名）、値は string（色のコード）」という意味です。似た機能として `Map<K, V>` がありますが、Record はオブジェクトリテラルとして書けるので設定値や定数に向いています。

### 試してみよう

Playgroundで空の盤面の一部を作ってみましょう。

```typescript
type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
type Cell = PieceType | null;

// 3行×4列の小さな盤面
const smallBoard: Cell[][] = [
  [null, null, null, null],   // 0行目
  [null, 'T',   null, null],  // 1行目にTブロック
  [null, null, null, null],   // 2行目
];

console.log(smallBoard[1][1]); // "T" と表示される
console.log(smallBoard[1][2]); // null と表示される
```

## 5. `Direction` — 方向を表す型

```typescript
export type Direction = 'up' | 'down' | 'left' | 'right';
```

`Direction` は4方向の文字列だけを許すunion型です。主にRenderer.ts内部でゴーストピースの描画位置をずらすために使われます。この型があることで、関数の引数に `string` ではなく `Direction` を使うと「誤って `'diagonal'` のようなありえない方向を渡す」ミスをコンパイル時に防げます。

```typescript
// Directionの使い方（src/renderer/Renderer.ts）
function getGhostOffset(dir: Direction): Position {
  switch (dir) {
    case 'down':  return { x: 0, y: 1 };
    case 'up':    return { x: 0, y: -1 };
    case 'left':  return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
  }
}
```

## 6. `GameState` — ゲームの状態を表す

```typescript
export type GameState = 'idle' | 'playing' | 'paused' | 'gameOver';
```

ゲームは4つの状態を行き来します。これは**ステートマシン（状態機械）** と呼ばれるデザインパターンです。「今どの状態か」によって、操作の受付や画面の表示を切り替えます。

```
idle → playing → paused → playing
                → gameOver
```

例えば「一時停止中はキー入力を受け付けない」「ゲームオーバー後は落ちてくるピースを止める」といった制御が `GameState` で一元管理できます。

`string` の union にしている理由は、`switch` 文で全ての状態を**網羅チェック**できるからです。

```typescript
function handleState(state: GameState) {
  switch (state) {
    case 'idle':     /* スタート画面 */ break;
    case 'playing':  /* ゲーム進行 */ break;
    case 'paused':   /* 一時停止 */ break;
    case 'gameOver': /* ゲームオーバー処理 */ break;
    // default が不要 = 全部網羅できている証拠
  }
}
```

> **補足：switch のフォールスルー** — 各 `case` の最後にある `break` を書き忘れると、次の `case` に処理が「落ちる」（フォールスルー）現象が起きます。
> ```typescript
> switch (x) {
>   case 1:
>     console.log('one');
>     // break を忘れた！
>   case 2:
>     console.log('two');  // x=1 でもこれが実行される！
> }
> ```
> このプロジェクトではすべての `case` に `break` または `return` を書くことで、フォールスルーを防いでいます。TypeScript の strict モード（noFallthroughCasesInSwitch）を有効にすると、このミスをコンパイル時に検出できます。

enum（列挙型）ではなく string の union にしたのは、TypeScriptのenumはコンパイル後に予想外のコードを生成することがあり、シンプルな文字列の方が分かりやすいからです。

## 7. `GameConfig` — 設定を束ねる

```typescript
export interface GameConfig {
  keys: {
    moveLeft: string;
    moveRight: string;
    // ...（実際のファイル参照）
  };
  timing: {
    fallInterval: number;
    // ...
  };
  display: {
    cellSize: number;
    // ...
  };
}
```
プロパティの前に `readonly` が付いている場合があります（実際の types.ts を参照）。`readonly` は「そのプロパティは読み取り専用」という意味で、一度設定した値を後から変更できなくします。これは「設定は読み込んだら変更しない」という設計意図を型で表現しています。誤って `config.keys.moveLeft = 'KeyA'` のように上書きしようとするとコンパイルエラーになります。

`GameConfig` は3つの**ネストされた（入れ子の）** サブセクションで構成されています。1つの大きなオブジェクトにせず、カテゴリごとにグループ化することで「キー設定をいじりたい→keysの中だけ見ればいい」と分かります。

ネストにした判断の背景：設定項目が増えても、関心のあるカテゴリだけ集中して読めるようになります。

## 8. シンプルな情報型 — `HoldInfo` と `ScoreState`

```typescript
export interface HoldInfo {
  type: PieceType | null;
  usedThisTurn: boolean;
}

export interface ScoreState {
  score: number;
  level: number;
  lines: number;
}
```

これらの型は「データの入れ物」としてのインターフェースです。

**`HoldInfo`**：ホールド（ピースを一旦保管する機能）の状態を表します。`type` は現在ホールドされているピースの種類、`usedThisTurn` は「このターンですでにホールドを使ったか」を示します。1ターンに1回しかホールドできないルールを実装するためにあります。

**`ScoreState`**：スコア、レベル、消したライン数の3つは常にセットで扱われるため、1つの型にまとめてあります。これにより関数の引数や戻り値がすっきりします。

```
悪い例：updateScore(score, level, lines) // 3つの独立した引数
良い例：updateScore(state)  // ScoreState 1つだけ
```

## 9. この設計が優れている理由

全ての型を `src/types.ts` に集約する判断には、以下の利点があります。

1. **型の定義場所が1箇所** — 「この型どこ？」が起きない
2. **循環importが起きない** — どのファイルも `../types.ts` だけを参照すればいい
3. **プロジェクトのデータ構造が一目で分かる** — 58行のファイルを見れば、このテトリスがどんなデータを扱うか全部把握できる
4. **最小限の表現** — 各型は必要最小限の情報だけを持ち、表現力を最大化している（例：`PieceType` → 色も形もこの型から導ける）

この「型が設計を語る」状態が、TypeScriptプロジェクトの理想的な姿です。次のファイル[`./06-board-module.md`](./06-board-module.md)では、これらの型を使って実際に盤面を操作する方法を見ていきます。

---

**→ 次のステップ：[06: Boardモジュール](./06-board-module.md)**
**← 前のステップ：[04: テトリスの仕様](./04-tetris-spec.md)**
