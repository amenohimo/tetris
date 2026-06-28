# TypeScriptの基礎 — このプロジェクトで使われている機能を中心に

## TypeScriptとは何か

TypeScriptは **「型（type）が付けられるJavaScript」** です。

JavaScriptは自由な言語です。変数に数値を入れても文字列を入れてもエラーになりません。しかし、その自由さが原因で「思わぬバグ」が生まれます。

```javascript
// JavaScriptではこう書ける（バグの温床）
function add(a, b) {
  return a + b;
}
add(5, "10"); // "510" という文字列が返ってくる。数値の15ではない！
```

TypeScriptでは「この変数は数値です」と指定できるので、上記のようなミスをコンパイル時に発見できます。

```typescript
// TypeScriptでは型を指定する
function add(a: number, b: number): number {
  return a + b;
}
add(5, "10"); // コンパイルエラー！「string型をnumber型に代入できない」
```

**なぜ型が必要か**：

1. **バグの早期発見**: コードを実行する前に（編集中に）エラーを教えてくれる
2. **コードの意図が明確**: 「この関数は2つの数値を受け取って数値を返す」という意図が型でわかる
3. **開発体験の向上**: エディタで自動補完が効くようになり、開発が速くなる

## このプロジェクトで使われている機能だけに絞る

TypeScriptには非常に多くの機能がありますが、**この教材ではこのテトリスプロジェクトで実際に使われている機能だけを解説します**。全部を覚える必要はありません。実際のコードで出会ったものから覚えていけば十分です。

---

## 1. 変数宣言: `const` と `let`

### 基本

```typescript
const score = 0;    // 再代入できない（変更できない）
let frames = 0;     // 再代入できる（変更できる）
```

**実際のコードから**（`src/game/Game.ts` 37行目）：

```typescript
this.scoreState = { score: 0, level: 1, lines: 0 };
```

このように、初期値が変わらないものには `const` を使います。

### なぜ `const` が推奨されるか

```typescript
// ❌ 悪い例
let playerName = "Taro";
playerName = "Jiro"; // 書き換えられる（書き換えていいのか不安）

// ✅ 良い例
const playerName = "Taro";
// playerName = "Jiro"; // コンパイルエラー！変更できない
```

`const` を使うと「この値は変わらない」という保証になります。コードを読む人が安心できます。変更が必要な場合だけ `let` を使います。

**経験則**: 基本 `const` で書き、どうしても再代入が必要なときだけ `let` を使う。

**自分で試してみよう**:

```typescript
// 新しい .ts ファイルを作って試す
const greeting = "Hello";
// greeting = "Hi"; // この行のコメントを外すとエラーになる

let count = 0;
count = 1; // これはOK
console.log(count); // 1
```

---

## 2. プリミティブ型: `number`, `string`, `boolean`, `null`

TypeScriptの基本的な型です。

| 型 | 意味 | 例 |
|----|------|-----|
| `number` | 数値（整数も小数も同じ型） | `42`, `3.14`, `-1` |
| `string` | 文字列 | `"hello"`, `'world'`, `` `template` `` |
| `boolean` | 真偽値 | `true`, `false` |
| `null` | 「値がない」ことを表す | `null` |

**実際のコードから**（`src/types.ts` 17行目）：

```typescript
export type Cell = PieceType | null;
```

この `Cell` 型は「`PieceType` か、または `null`（何もない）」という意味です。テトリスの盤面の1マスは、ピースの一部（`PieceType`）か空（`null`）です。

**自分で試してみよう**:

```typescript
const playerLevel: number = 1;
const playerName: string = "Taro";
const isPlaying: boolean = true;
const nothing: null = null;

// TypeScriptは型を推論（自動推測）できるので、以下のように書いてもOK
const level = 1;       // number と自動的に判断される
const name = "Taro";   // string と自動的に判断される
```

---

## 3. 配列: `T[]` または `Array<T>`

配列は同じ型の値を並べたものです。

```typescript
const numbers: number[] = [1, 2, 3, 4, 5];
const names: Array<string> = ["I", "O", "T"]; // 別の書き方
```

**実際のコードから**（`src/types.ts` 19行目）：

```typescript
export type BoardGrid = Cell[][];
```

`Cell[][]` は「`Cell` の配列の配列」、つまり2次元配列です。テトリスの盤面を表現しています。

```typescript
// イメージ：10列 × 22行の盤面
// board[行][列] でアクセスする
const board: Cell[][] = [
  [null, null, null, null, null, null, null, null, null, null], // 行0
  [null, null, null, null, null, null, null, null, null, null], // 行1
  // ... 全部で22行
];
```

**自分で試してみよう**:

```typescript
const scores: number[] = [100, 300, 500, 800];
console.log(scores[0]); // 100
console.log(scores.length); // 4

const matrix: boolean[][] = [
  [true, false],
  [false, true],
];
console.log(matrix[0][1]); // false
```

---

## 4. オブジェクト型とインターフェース: `interface`

`interface` は「オブジェクトの形（型）」を定義する機能です。

```typescript
interface Position {
  x: number;
  y: number;
}

const pos: Position = { x: 3, y: 0 }; // このオブジェクトは必ず x と y を持つ
// pos.z = 5; // エラー！Positionにzはない
```

**実際のコードから**（`src/types.ts` 5-8行目）：

```typescript
export interface Position {
  x: number;
  y: number;
}
```

この `Position` インターフェースは「`x` と `y` という数値プロパティを持つオブジェクト」を表します。テトリスでは「盤面上の座標」を表現するために使われます。

**なぜ `interface` を使うのか**：
オブジェクトの「形」を定義することで、以下のようなメリットがあります：

1. **必須プロパティの保証**: `Position` 型の値は必ず `x` と `y` を持つ
2. **ドキュメントとして機能**: 「この関数は Position を受け取る」と書いてあれば、xとyの値が必要だとわかる
3. **エディタの補完**: 変数名を間違えてもエラーで教えてくれる

**自分で試してみよう**:

```typescript
interface Player {
  name: string;
  score: number;
  isActive: boolean;
}

const player1: Player = {
  name: "Taro",
  score: 100,
  isActive: true,
};

// player1.age = 20; // エラー！Playerにageはない
```

---

## 5. 型エイリアスとリテラル型: `type`

`type` は「型に別名（エイリアス）をつける」機能です。`interface` と似ていますが、より柔軟です。

**実際のコードから**（`src/types.ts` 1行目）：

```typescript
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
```

これは **文字列リテラル型** と **共用体型（Union Type）** という2つのテクニックを組み合わせたものです。

- **文字列リテラル型**: `'I'` は「文字列`'I'`という値だけを許容する型」
- **共用体型**: `|` で区切られた「どれか1つ」を意味する

つまり、`PieceType` は「`'I'`, `'O'`, `'T'`, `'S'`, `'Z'`, `'J'`, `'L'` のいずれか1つだけ」という型です。

```typescript
const piece: PieceType = 'I'; // OK
// const bad: PieceType = 'X'; // エラー！'X'はPieceTypeのメンバーではない
```

**なぜ文字列リテラル型を使うのか**：
「普通の文字列」としてしまうと、存在しないピース名（`'X'` など）を書いてもエラーになりません。リテラル型で制限することで、存在しないピース名を使うバグを防げます。

**実際のコードから2**（`src/types.ts` 21行目）：

```typescript
export type GameState = 'idle' | 'playing' | 'paused' | 'gameOver';
```

ゲームの状態も同様に、4つの文字列だけを許容する型として定義されています。

**`interface` と `type` の使い分け**（簡単に）：
- オブジェクトの形を定義する → `interface`
- 文字列の選択肢や、複数の型のいずれか → `type`
- 両方ともできることもあるが、上記の使い分けが一般的

**自分で試してみよう**:

```typescript
type Direction = 'up' | 'down' | 'left' | 'right';

function move(dir: Direction): void {
  console.log(`Moving ${dir}`);
}

move('up');   // OK
move('left'); // OK
// move('diagonal'); // エラー！Directionに'diagonal'はない
```

---

## 6. 関数の型: 引数と戻り値

TypeScriptでは、関数の引数と戻り値に型を指定できます。

```typescript
function add(a: number, b: number): number {
  return a + b;
}
```

- 引数 `a` と `b` は `number` 型
- 戻り値（`: number`）も `number` 型
- もし `return a + b` の代わりに `return "hello"` と書くと、コンパイルエラー

**実際のコードから**（`src/game/Game.ts` 105-107行目）：

```typescript
moveLeft(): boolean {
  return this.tryMove(-1, 0);
}
```

`moveLeft()` メソッドは戻り値として `boolean`（成功したら `true`、失敗したら `false`）を返すことが型で保証されています。

**省略記法: アロー関数**：

```typescript
// 従来の関数
function double(x: number): number {
  return x * 2;
}

// アロー関数（より短い書き方。モダンなTypeScriptでよく使われる）
const double = (x: number): number => x * 2;
```

アロー関数は `function` キーワードの代わりに `=>`（アロー）を使います。関数を短く書けます。

**自分で試してみよう**:

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}

const result = greet("Taro");
console.log(result); // Hello, Taro!

// 引数が複数の場合
function calcScore(lines: number, level: number): number {
  const scores = [0, 100, 300, 500, 800];
  return scores[lines] * level;
}

console.log(calcScore(1, 2)); // 200（100 × 2）
```

---

## 7. モジュール: `import` / `export`

モジュールは「ファイルを分割してプログラムを整理する単位」です。

```typescript
// types.ts — 他のファイルから使われる型をエクスポート（輸出）
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Board.ts — types.ts から型をインポート（輸入）
import type { PieceType } from '../types';
```

**なぜファイルを分割するのか**：
- **見通しが良くなる**: 1つのファイルが小さくなり、何が書いてあるか把握しやすい
- **再利用しやすい**: 必要な部品だけをインポートできる
- **チーム開発**: 複数人で別々のファイルを同時に編集できる

**exportの種類**：

```typescript
// 名前付きエクスポート（波カッコで受け取る）
export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// デフォルトエクスポート（波カッコなしで受け取る）
export default class Game { ... }

// 型のエクスポート
export type Position = { x: number; y: number };
```

**importの種類**：

```typescript
// 名前付きインポート
import { PIECE_TYPES } from './Piece';

// デフォルトインポート
import Game from './Game';

// 型だけのインポート（実行時には消える最適化）
import type { Position } from '../types';
```

**実際のコードから**（`src/main.ts` 1-4行目）：

```typescript
import { Game } from './game/Game';
import { Renderer } from './renderer/Renderer';
import { InputManager } from './input/InputManager';
import { loadConfig } from './config/config';
```

`main.ts` は4つのモジュールから機能をインポートして、すべてを「配線（つなぎ合わせる）」しています。

**自分で試してみよう**:

```typescript
// --- math.ts ---
export function add(a: number, b: number): number {
  return a + b;
}

export const PI = 3.14159;

// --- main.ts ---
import { add, PI } from './math';
console.log(add(2, 3)); // 5
console.log(PI); // 3.14159
```

---

## 8. クラス構文 — 状態と操作をひとまとめに

このプロジェクトでは Game.ts や InputManager.ts などで **クラス（class）** を使っています。クラスは「データ（プロパティ）」と「操作（メソッド）」をひとまとめにするTypeScript/JavaScriptの仕組みです。

### 基本の形

```typescript
class Game {
  // プロパティ（データ）
  score: number = 0;
  level: number = 1;

  // メソッド（操作）
  addScore(points: number): void {
    this.score += points;
  }
}
```

- **プロパティ**: クラスが持つデータ（`score`, `level`）
- **メソッド**: クラスが持つ関数（`addScore`）
- **`this`**: 「このインスタンス自身」を指すキーワード

### `this` キーワード — 「このインスタンス」を指す

```typescript
const game1 = new Game();
const game2 = new Game();

game1.addScore(100);  // this は game1 を指す → game1.score が 100 になる
game2.addScore(50);   // this は game2 を指す → game2.score が 50 になる
```

`this` は「メソッドが呼ばれたときの、そのインスタンス」を指します。`game1.addScore()` の中で `this` は `game1` を指し、`game2.addScore()` の中で `this` は `game2` を指します。

### コンストラクタ — 初期化の処理

```typescript
class Game {
  score: number;
  level: number;

  constructor(initialLevel: number) {
    this.score = 0;
    this.level = initialLevel;  // 引数で受け取った値で初期化
  }
}

const game = new Game(5);  // level が 5 でスタート
```

`constructor` は「インスタンスを作るときに自動的に呼ばれる特別なメソッド」です。引数を受け取ってプロパティを初期化するのに使います。

### 実際のコードから（src/game/Game.ts）

```typescript
class Game {
  board: BoardGrid;
  currentPiece: Piece | null = null;
  private dropTimer: number = 0;

  constructor(config: GameConfig) {
    this.board = createBoard();
    this.start();
  }

  start(): void {
    // ゲームを開始する処理
  }

  moveLeft(): boolean {
    return this.tryMove(-1, 0);
  }
}
```

ここでのポイント：
1. **`private`**: `private dropTimer` のように書くと「クラスの外からはアクセスできない」プロパティになる。カプセル化（内部の詳細を隠す設計）の基本
2. **型注釈**: プロパティにも `: BoardGrid` のように型を書く
3. **初期値**: `= null` や `= 0` のように初期値を直接書ける

### なぜクラスが必要か？

Boardモジュールは関数だけで実装されていました（`createBoard()`, `isValidPosition()`など）。一方Gameはクラスです。その理由：

- **関数群（Board.ts）**: 「データを渡すと結果を返す」だけ。状態を持たないのでクラスは不要
- **クラス（Game.ts）**: ゲームの進行状態（タイマー、スコア、レベル）をずっと覚えておく必要がある。状態をプロパティとして持ち、更新しながら動き続ける

### this の落とし穴 — イベントリスナーでの問題

```typescript
class InputManager {
  config: GameConfig;

  handleKeyDown(e: KeyboardEvent): void {
    console.log(this.config);  // ← ここでエラーになることが！
  }
}

// イベントリスナーに渡すと this が失われる
window.addEventListener('keydown', manager.handleKeyDown);
// handleKeyDown の中で this が manager ではなく window を指してしまう！
```

この問題の解決策として、`.bind(this)` で「this を固定する」方法があります：

```typescript
class InputManager {
  constructor(config: GameConfig) {
    this.config = config;
    // bind で this を固定した関数を作る
    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
  }
}
```

`.bind(this)` は「この関数が呼ばれたとき、常にこのインスタンスを this として使う」と固定します。これについては 12: InputManager モジュールで詳しく解説します。

### 自分で試してみよう

```typescript
class Counter {
  count: number = 0;

  increment(): void {
    this.count++;
  }

  getValue(): number {
    return this.count;
  }
}

const c = new Counter();
c.increment();
c.increment();
console.log(c.getValue()); // 2
```

---

## 9. ジェネリクス（超簡単に）

ジェネリクスは「型を引数のように受け取る」機能です。`<T>` という書き方をします。

```typescript
// T は「どんな型でもいい」という意味のプレースホルダー
function firstElement<T>(arr: T[]): T {
  return arr[0];
}

const num = firstElement([1, 2, 3]);     // number 型
const str = firstElement(['a', 'b']);    // string 型
```

上記の `firstElement` 関数は、配列の要素の型を自動的に推論して戻り値の型に使います。

**実際のコードから**（`src/game/Randomizer.ts` 15-21行目）：

```typescript
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

この `shuffleArray<T>` は「どんな型の配列でもシャッフルできる関数」です。`T` が `PieceType` のときは `PieceType[]` をシャッフルし、`T` が `number` のときは `number[]` をシャッフルします。ジェネリクスを使うことで、型ごとに同じ処理を書き直す必要がなくなります。

**自分で試してみよう**:

```typescript
// どんな型でも保持できるBox
interface Box<T> {
  value: T;
}

const numberBox: Box<number> = { value: 42 };
const stringBox: Box<string> = { value: "hello" };
```

---

## 10. `readonly`: 不変性の保証

`readonly` は「読み取り専用」を意味します。一度設定したら変更できないことを保証します。

```typescript
const numbers: readonly number[] = [1, 2, 3];
// numbers[0] = 10;  // エラー！readonly配列は変更できない
// numbers.push(4);  // エラー！pushもできない
```

**実際のコードから**（`src/game/Game.ts` 6-9行目）：

```typescript
const DROP_INTERVALS: readonly number[] = [
  1000, 793, 618, 473, 355, 262, 190, 135, 94, 64,
  43, 43, 43, 28, 28, 28, 18,
];
```

この `DROP_INTERVALS` は「レベルごとの落下間隔」を定義したテーブルです。ゲーム中に変更されることは決してありません。`readonly` をつけることで「変更しないでください」という意思表示になります。

もう1つ、`src/input/InputManager.ts` 16行目から：

```typescript
const REPEATABLE_ACTIONS: ReadonlySet<GameAction> = new Set([
  'moveLeft',
  'moveRight',
  'softDrop',
]);
```

`ReadonlySet` も同様に「変更しないセット」です。

**なぜ `readonly` を使うのか**：
- **意図の明確化**: 「この値は不変です」という宣言
- **バグの防止**: うっかり変更しようとしたときにエラーになる
- **安全な共有**: 関数の引数に `readonly` をつけると、関数の内部で変更されないことが保証される

**自分で試してみよう**:

```typescript
const config: { readonly port: number; readonly host: string } = {
  port: 3000,
  host: "localhost",
};

// config.port = 4000; // エラー！readonlyプロパティは変更できない
```

---

## 11. `as` と型アサーション

型アサーションは「私のほうが型についてよく知っている」とTypeScriptに伝える機能です。

```typescript
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
```

`document.getElementById()` は本来 `HTMLElement | null` という型を返します。しかし、このコードは「この要素は絶対にHTMLCanvasElement（canvas要素）である」とTypeScriptに伝えています。

**実際のコードから**（`src/main.ts` 9行目）：

```typescript
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas element #game-canvas not found');
```

その後、`!canvas` でnullチェックもしています。「まず型アサーションで型を教え、その後nullチェックで安全性を確認する」というパターンです。

**型アサーションの注意点**：
型アサーションは「コンパイラを黙らせる」だけで、実際の値が変わったわけではありません。間違った型アサーションをしても実行時エラーになるだけです。

```typescript
// ❌ 危険な使い方
const num = "42" as number; // コンパイルは通るが、実際はstring。numberのメソッドは使えない
```

**安全な代替案**：
型アサーションの代わりに型ガード（`typeof` や `instanceof` によるチェック）を使うほうが安全です。ただし、`as HTMLCanvasElement` のように「絶対に間違いない」ときは型アサーションが便利です。

**自分で試してみよう**:

```typescript
// HTMLの世界を再現した簡易例
interface User {
  name: string;
  age: number;
}

// サーバーから返ってきたデータ（型が不明）
const rawData: unknown = JSON.parse('{"name": "Taro", "age": 20}');

// 「このデータはUser型だ」とTypeScriptに伝える
const user = rawData as User;
console.log(user.name); // Taro
```

---

## 復習: このプロジェクトでの使われ方

これまで学んだTypeScriptの機能が、このテトリスプロジェクトでどのように使われているか、まとめてみましょう：

| 機能 | プロジェクトでの使用箇所 |
|------|------------------------|
| `const` / `let` | Game.ts全体。`const` が基本 |
| `number`, `string`, `boolean`, `null` | types.ts の Position, Cell など |
| `T[]` / `Array<T>` | BoardGrid (Cell[][]), 配列操作全般 |
| `interface` | Position, Piece, GameConfig, HoldInfo など |
| `type` + リテラル型 | PieceType, GameState, Direction |
| 関数の型 | Game.tsの全メソッド |
| `import` / `export` | 全ファイルの冒頭で使われている |
| ジェネリクス | Randomizer.ts の shuffleArray<T> |
| `readonly` | Game.ts の DROP_INTERVALS |
| `as` 型アサーション | main.ts の canvas 取得 |
| クラス / `this` | Game.ts 全体。ゲームの状態管理 |

## 用語集

| 用語 | 説明 |
|------|------|
| 型 (type) | 値の種類を表す。number, string, boolean など |
| インターフェース (interface) | オブジェクトの形を定義する仕組み |
| 型エイリアス (type alias) | 型に別名をつける仕組み |
| 共用体型 (union type) | `\|` で複数の型を「どれか1つ」として扱う |
| リテラル型 (literal type) | 特定の値だけを許容する型（例：`'I'`） |
| ジェネリクス (generics) | 型を引数のように受け取る仕組み |
| 型アサーション | プログラマが型を指定してコンパイラを信頼させる |
| モジュール | ファイルを分割する仕組み。`import` / `export` |
| readonly | 読み取り専用。変更不可の保証 |
| クラス (class) | データと操作をひとまとめにする仕組み |
| this | メソッド内で「そのインスタンス自身」を指すキーワード |

## 自分で試してみよう

1. このプロジェクトの `src/types.ts` を開き、すべての型定義を読んでみてください。どの行でどのTypeScript機能が使われているか分類してみましょう
2. `src/game/Game.ts` の `start()` メソッド（47行目）を見て、`const` / `let` / `readonly` がどのように使われているか確認してください
3. 新しい `.ts` ファイルを作成し、`PieceType` 型の変数を宣言して、7種類の文字列を代入してみてください。存在しない値を代入するとどうなるか試してください

**← 前のステップ：[01: 環境構築](./01-environment-setup.md)**
**→ 次のステップ：[03: プロジェクト構造](./03-project-structure.md)**
