# 14: 全体の組み立て — 全モジュールが連携する仕組み

ここまで12のファイルに分けて各モジュールを解説してきました。この章ではそれらが**1つのゲームとしてどう機能するか**を、具体的な操作トレースを通じて理解します。

## データの流れ（全体図）

テトリスにおける情報の流れは、以下の一方通行になります。

```
キー入力 → InputManager → Game → RenderState → Renderer → Canvas描画
```

各モジュールの責務をおさらいします。

| モジュール | 責務 | 知っていること |
|-----------|------|---------------|
| InputManager | キーボード入力 → GameActionに変換 | types.ts だけ |
| Game | 状態管理（盤面、スコア、ピース） | Board, Piece, Randomizer, types.ts |
| Renderer | Canvasへの描画 | types.ts だけ |
| main.ts | 上記3つを配線 | 全モジュールを知っている |

重要なのは `InputManager` と `Renderer` が **`Game` を知らない** ことです。main.ts だけがすべてのモジュールを知っています。これにより「描画の変更がゲームロジックに影響しない」「入力方式の追加がゲームに影響しない」という独立性が生まれます。

## [追跡1] 左矢印キーを押したときの完全な流れ

これから、ユーザーが左矢印キーを押してから画面に反映されるまでの全行程を追います。

### Step 1: ブラウザが keydown イベントを発火

ユーザーがキーボードの左矢印（←）を押すと、ブラウザが `KeyboardEvent`（キーボードに関するイベント）を生成します。このイベントには `e.code = 'ArrowLeft'` という情報が含まれています。

### Step 2: InputManager.handleKeyDown(e) が受け取る

```typescript
// src/input/InputManager.ts（該当箇所の概念）
handleKeyDown(e: KeyboardEvent): void {
  const code = e.code;  // 'ArrowLeft'

  // すでに押されているキーなら無視（重複防止）
  if (this.pressedKeys.has(code)) return;
  this.pressedKeys.add(code);

  // キーコード → アクション名 に変換
  const action = this.keyCodeToAction.get(code);
  // 'ArrowLeft' → 'moveLeft'

  // 即時実行（1回目の反応）
  this.fireAction('moveLeft');

  // moveLeft は REPEATABLE_ACTIONS に含まれている
  // → DASタイマーを開始
  this.dasTimers.set('moveLeft', { elapsed: 0, dasDone: false });

  e.preventDefault(); // ページスクロール防止
}
```

`keyCodeToAction`（`Map<string, GameAction>`）は設定ファイルから作られた変換表です。`'ArrowLeft'` → `'moveLeft'` という変換を行います。

`pressedKeys`（`Set<string>` = 文字列の集合）で「現在押されているキー」を管理し、同じキーの重複イベントを無視します（OSのキーリピート対策）。

`REPEATABLE_ACTIONS` に `moveLeft` が含まれているので、DASタイマーを開始します（この詳細は[12: InputManagerモジュール](./12-input-module.md)で解説済み）。

### Step 3: fireAction がコールバックを実行

```typescript
// src/input/InputManager.ts（該当箇所の概念）
private fireAction(action: GameAction): void {
  const callback = this.callbacks.get(action);
  if (callback) {
    callback(); // 登録された関数を実行
  }
}
```

`callback()` は main.ts で登録されたアロー関数 `() => game.moveLeft()` です。この1行で `Game.moveLeft()` が呼ばれます。

### Step 4: Game.moveLeft() が実行

```typescript
// src/game/Game.ts（該当箇所の概念）
moveLeft(): void {
  const newX = this.currentPiece.position.x - 1;
  if (this.tryMove(newX, this.currentPiece.position.y)) {
    // 移動成功 → onPieceManipulated() でゴースト更新とロック遅延リセット
    this.onPieceManipulated();
  }
}
```

`tryMove(newX, y)` の中で `Board.isValidPosition()` が呼ばれます（[06: Boardモジュール](./06-board-module.md)参照）。

```
現在のピース位置: (3, 10)
新しい位置:      (2, 10)  ← xが-1される

isValidPosition のチェック:
  1. x=2, y=10 が盤面の範囲内か？ → OK（0〜9の範囲）
  2. その位置に他のブロックはあるか？ → なければOK
  3. OK → 位置を更新
```

もし新しい位置が壁や他のブロックと重なっていた場合、`tryMove` は `false` を返し、移動は行われません。この処理が**壁蹴り**（[07: Pieceモジュール](./07-piece-module.md)参照）とは別の、通常移動での衝突判定です。

移動が成功すると `onPieceManipulated()` が呼ばれます。このメソッドは2つのことを行います。

1. **ゴースト位置の再計算**: ピースが動いたので、落下先の予測位置も変わる
2. **Lock Delayのリセット**: 接地後の移動猶予タイマーを最初からやり直し

### Step 5: 次のフレームでレンダリング

```typescript
// src/main.ts（62-70行目）
renderer.render({
  board: game.board,                 // 盤面の全セル
  currentPiece: game.currentPiece,   // 新しい位置のピース
  ghostPosition: game.ghostPosition, // 更新されたゴースト位置
  state: game.state,                 // ゲーム状態
  scoreState: game.scoreState,       // スコア情報
  holdInfo: game.holdInfo,           // Hold情報
  nextQueue: game.nextQueue,         // 次のピース列
});
```

Renderer はこの情報をもとに Canvas を**完全に再描画**します。

```typescript
// src/renderer/Renderer.ts（該当箇所の概念）
render(gameState: { ... }): void {
  this.clearCanvas();           // 画面をクリア
  this.drawBackground();        // 背景描画
  this.drawGrid();              // グリッド線描画
  this.drawBoard(gameState.board);  // 固定ブロック描画
  if (gameState.ghostPosition) {
    this.drawGhost(gameState.currentPiece, gameState.ghostPosition);
  }                            // ゴーストピース描画
  this.drawPiece(gameState.currentPiece); // アクティブピース描画
  this.drawHold(gameState.holdInfo);      // Hold表示
  this.drawNext(gameState.nextQueue);     // Next表示
  this.drawScore(gameState.scoreState);   // スコア表示
  this.drawOverlay(gameState.state);      // 状態オーバーレイ
}
```

各描画メソッドの詳細は[11: Rendererモジュール](./11-renderer-module.md)で解説済みです。

### 全体の流れを図解

```
[キーボード] → keydown('ArrowLeft')
     |
[InputManager] handleKeyDown
     ├─ pressedKeys で重複チェック
     ├─ keyCodeToAction で変換: 'ArrowLeft' → 'moveLeft'
     ├─ fireAction('moveLeft') → callback() を実行
     └─ DASタイマー開始
           |
[main.ts] callback = () => game.moveLeft()
           |
[Game] moveLeft()
     ├─ tryMove(x-1, y) で衝突チェック
     │     └─ Board.isValidPosition()
     ├─ 成功 → 位置を更新
     └─ onPieceManipulated()
           ├─ ゴースト再計算
           └─ Lock Delayリセット
           |
[次のフレーム: gameLoop]
     ├─ input.update(deltaTime)  // DAS進行
     ├─ game.update(deltaTime)   // 重力進行
     └─ renderer.render({...})   // 再描画
           |
[Renderer] 全パネルを再描画
     ├─ 盤面
     ├─ アクティブピース（新しい位置）
     ├─ ゴーストピース（更新済み）
     ├─ Hold/Next/Score
     └─ 状態オーバーレイ
           |
[Canvas] 画面に反映
```

## [追跡2] 重力による落下の流れ

次は、入力がなくても自動的に進む**重力落下**の流れです。

```typescript
// src/main.ts（56-60行目）
function gameLoop(currentTime: number): void {
  const deltaTime = Math.min(currentTime - lastTime, 100);
  lastTime = currentTime;

  input.update(deltaTime);   // DAS/ARRタイマーの更新
  game.update(deltaTime);    // ゲーム状態の更新

  renderer.render({...});    // 描画
}
```

`game.update(deltaTime)` の中身を追跡します。

```typescript
// src/game/Game.ts（該当箇所の概念）
update(deltaTime: number): void {
  if (this.state !== 'playing') return;  // プレイ中以外は何もしない

  // 重力による落下
  this.dropTimer += deltaTime;

  if (this.dropTimer >= this.getDropInterval()) {
    // 落下間隔に達した → 1マス下に移動を試みる
    this.dropTimer = 0;
    if (this.tryMoveDown()) {
      // 移動成功 → ゴースト更新
      this.onPieceManipulated();
    } else {
      // 移動失敗 → 接地 → Lock Delay開始
      this.isLocking = true;
    }
  }

  // Lock Delay処理
  if (this.isLocking) {
    this.lockDelay += deltaTime;
    if (this.lockDelay >= 500) { // 500ms経過
      this.lockCurrentPiece();    // ピースを固定
    }
  }
}
```

### 落下速度の計算

```typescript
private getDropInterval(): number {
  // レベルが上がるほど落下間隔が短くなる
  return Math.max(50, 1000 - (this.scoreState.level - 1) * 75);
}
```

レベル1では1000ms（1秒に1マス）、レベルが上がるごとに75msずつ短くなり、最低50msまで速くなります。

```
レベル1:  1000ms（1秒に1マス）
レベル5:   700ms
レベル10:  325ms
レベル13:  100ms（最低50msは下回らない）
```

### 接地から固定までの流れ

```
ピースが移動先のブロックにぶつかる
  → tryMoveDown() が false を返す
  → isLocking = true
  → lockDelay が加算開始
  → 500ms以内に移動・回転すれば lockDelay リセット
  → 500ms経過 → lockCurrentPiece()

lockCurrentPiece():
  1. 現在のピースを盤面に書き込む
  2. ライン消去を実行
  3. 新しいピースを生成
  4. 新しいピースが既に重なっていればゲームオーバー
```

この **Lock Delay** システムがあることで、プレイヤーは「ちょうど接地したタイミングでも、まだピースを横に滑り込ませたり回転させたりできる」という操作感を得ています。

## 「入出力と状態管理」の分離

このプロジェクトの設計は3つの大きな責務に分割されています。

| モジュール | カテゴリ | 役割 |
|-----------|---------|------|
| InputManager | **入力** | キーボード → ゲーム操作 |
| Game | **状態管理** | ルール、スコア、盤面 |
| Renderer | **出力** | 状態 → 画面表示 |

この分離を**関心の分離**（Separation of Concerns）と呼びます。1つのモジュールが複数の責務を持つと、以下の問題が起きます。

```typescript
// 悪い例：入力も状態管理も描画も1つのクラスに詰め込む
class GodClass {
  // キーハンドリング（300行）
  // ゲームルール（500行）
  // 描画処理（400行）
  // → 全部で1200行！どこを直せばいいかわからない
}
```

これを防ぐために、各モジュールは1つの責務だけに集中します。

```typescript
// 良い例：各モジュールは自分の仕事だけをする
class Game {
  // ゲームルールだけ（348行）
  // → バグが起きたら「ルールのバグ」→ Game だけ調べればいい
}
```

### なぜこの分離が重要なのか

**1. テスト容易性**

Gameクラスの単体テストで、キーボードやCanvasを用意する必要がありません。

```typescript
// Gameのテスト（概念）
const game = new Game(testConfig);
game.start();
game.moveLeft();  // 直接メソッドを呼べる
// → 入力も描画も関係なく、ロジックだけテストできる
```

**2. 差し替え可能性**

後で描画方式をCanvasからWebGLに変えたい場合、Rendererだけを書き換えればGameは一切変更不要です。

```typescript
// 将来の変更（概念）
// main.ts のこの行だけ変えればいい
const renderer = new WebGLRenderer(canvas, config);  // Canvas → WebGL
// Game.ts は変更不要！
```

**3. 並行開発**

Rendererの開発とGameの開発を同時に進められます。Rendererが完成していなくても、Gameのロジックだけ先にテストできます。

**4. バグの局所化**

「描画がおかしい」というバグが起きたら、Rendererだけ調べれば済みます。Gameの複雑なロジックを追う必要はありません。

## モジュール間の依存関係図

```
main.ts  ─────────────────────────────────────────┐
  ├── config/config.ts ─── smol-toml (npm)        │
  │       └── types.ts                            │
  ├── game/Game.ts                                │
  │       ├── game/Board.ts ─── types.ts          │
  │       ├── game/Piece.ts  ─── types.ts         │
  │       └── game/Randomizer.ts ─── types.ts     │
  ├── renderer/Renderer.ts ─── types.ts           │
  └── input/InputManager.ts ─── types.ts          │
                                                   │
  types.ts  ←──── 全モジュールが依存している  ←───┘
```

注目すべきは **types.ts がすべての矢印の中心** になっていることです。

### なぜ types.ts だけが全モジュールから参照されるのか

```typescript
// types.ts（src/types.ts 全58行）
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type GameState = 'idle' | 'playing' | 'paused' | 'gameOver';
export interface Position { x: number; y: number; }
// ... その他すべての型定義
```

types.ts は**型定義だけ**のファイルで、実行時のロジックは一切含みません。すべてのモジュールはこのファイルをimportすることで、**互いの実装を知らずに**データをやり取りできます。

```typescript
// 型を通じた間接的な依存（概念）
// Renderer は Game を知らないが、Game と同じ types.ts の型を参照している
import type { BoardGrid, Piece, GameState } from '../types';
// ↑ type を付けると「型情報だけをimport」する
// 実行時には消えるので、依存関係が生まれない
```

`import type` という構文は「型だけをインポートする」という意味です。JavaScriptにコンパイルされるとこの行は消えます。実行時に全く影響がないため、**依存関係をコードに残さない**方法として使われます。

### もし types.ts がなかったら

```typescript
// 悪い例：Renderer が Game を直接知っている
import { Game } from '../game/Game';  // ← これは避けたい

class Renderer {
  render(game: Game): void {  // Game に依存！
    // Game の全メソッドにアクセスできてしまう
    // → いつか game.start() をここで呼んでしまうかも
  }
}
```

この状態になると、Renderer を修正するときに「この変更はGameに影響しないか」を常に考慮する必要が生まれます。types.ts による間接参照が、この結合を断ち切っています。

## 関心の分離が生む実践的なメリット

### 例1：Rendererのバグでゲームの進行が止まらない

```typescript
// Renderer にバグがあっても Game は影響を受けない
renderer.render({...});  // ここでエラーが起きても...
game.update(deltaTime);  // こちらは正常に動き続ける

// なぜなら main.ts での呼び出し順が独立しているから
// （実際のコードではエラーが起きた時点で止まるが、
//  設計上「描画のバグがゲーム進行を壊す」ことはない構造）
```

### 例2：キー設定の変更がゲームロジックに影響しない

```toml
[keys]
moveLeft = "KeyA"  # ← ← キーを "ArrowLeft" から "KeyA" に変えても
```

Game.ts はこの変更を一切知りません。InputManager が内部の `keyCodeToAction` マップを更新するだけで、Game に届くのは `moveLeft` というアクション名だけだからです。

### 例3：後からゲームパッド対応を追加する

```typescript
// 新しい GamepadManager を追加する場合（概念）
const gamepad = new GamepadManager(config);

// main.ts で gamepad も同じコールバックに接続
gamepad.on('moveLeft', () => game.moveLeft());
gamepad.on('hardDrop', () => game.hardDrop());

// Game.ts は一切変更不要！
```

新しい入力方式を追加しても、Game は「コールバックで呼ばれる」というインターフェースが変わらないので影響を受けません。

## この設計が守っている SOLID 原則の初歩

**SOLID** はオブジェクト指向設計の5つの原則の頭文字です。このプロジェクトでは特に2つが意識されています。

### 単一責任の原則（SRP）

> クラスを変更する理由は1つだけであるべき

- **Game** を変更する理由: ゲームのルールが変わったとき
- **Renderer** を変更する理由: 描画方法を変えたいとき
- **InputManager** を変更する理由: 入力の扱い方を変えたいとき

それぞれに「変更理由」が1つしかありません。「スコア計算を直したいのに描画コードを読まなければならない」という事態は起きません。

### 依存逆転の原則（DIP）

> 具象（具体的な実装）ではなく、抽象（インターフェースや型）に依存せよ

このプロジェクトでは、types.ts の型定義が「抽象」の役割を果たしています。

```typescript
// DIPに従っている例
// Renderer は Game という具体クラスに依存せず、
// types.ts の Piece という型（抽象）に依存している
class Renderer {
  drawPiece(piece: Piece): void {  // Piece は types.ts の型
    // Game のことは一切知らなくていい
  }
}
```

## 試してみよう

コードを読むだけでなく、実際にモジュール間の依存関係を確認してみましょう。

```typescript
// ブラウザのコンソールで実行
// 各モジュールのインスタンスを調べる
console.log('=== モジュール間の依存関係 ===');

// TypeScriptの型情報は実行時には消えるので、
// instanceof を使って「どのクラスのインスタンスか」を確認
const game = window.__game; // グローバルに公開されている場合

if (game) {
  console.log('Gameインスタンスのメソッド:', Object.getOwnPropertyNames(Object.getPrototypeOf(game)));
}
```

実際にコードを変更して、分離の恩恵を体験してみましょう。

```typescript
// 1. main.ts の renderer.render() をコメントアウトしてみる
// renderer.render({...});  ← この行を消す

// 結果: 画面は真っ暗になるが、ゲームは動き続ける（コンソールで確認）
// → 描画とロジックが独立している証拠
```

```typescript
// 2. input.on('moveLeft', ...) をコメントアウトしてみる
// input.on('moveLeft', () => game.moveLeft());  ← 消す

// 結果: 左移動キーが効かなくなるが、他の操作は普通に動く
// → 各アクションのコールバックが独立している証拠
```

これらの実験を通じて「モジュールの分離」が実際に機能していることを確認できます。

---

**→ 次のステップ：[15: 発展課題](./15-next-steps.md)**
**← 前のステップ：[13: main.tsエントリポイント](./13-main-entry.md)**
