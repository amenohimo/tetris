# 10: Gameモジュール — ゲームの心臓部

今まで学んだモジュール（Board、Piece、Randomizer）を統合するのが `src/game/Game.ts` です。348行のこのファイルは、テトリスというゲームそのものを実装しています。

## Gameクラスの責務

`Game` クラスは以下の役割を担います。

- 全モジュールを統括する司令塔
- ゲームのルール（スコア、レベル、重力、ロック）を実装
- 外部モジュール（Renderer、InputManager、main.ts）とのインターフェースを提供

```typescript
// main.ts での使われ方（概念）
const config = await loadConfig();
const game = new Game(config);
game.start();

// 毎フレームの更新
function gameLoop(deltaTime: number) {
  game.update(deltaTime);
  // RendererにはGameインスタンスではなく、必要なデータだけを渡す
  renderer.render({
    board: game.board,
    currentPiece: game.currentPiece,
    ghostPosition: game.ghostPosition,
    state: game.state,
    scoreState: game.scoreState,
    holdInfo: game.holdInfo,
    nextQueue: game.nextQueue,
  });
  requestAnimationFrame(gameLoop);
}
```

## なぜクラス（class Game）なのか？

Boardモジュール（Board.ts）は関数群だったのに対し、Gameはクラスです。なぜでしょうか。

```typescript
// 関数群 vs クラスの比較

// Board.ts: 状態を持たない関数群
export function createBoard(): Cell[][] { /* ... */ }
export function isValidPosition(/* ... */): boolean { /* ... */ }
export function clearLines(board: Cell[][]): /* ... */ { /* ... */ }

// Game.ts: 状態と操作をまとめたクラス
class Game {
  board: BoardGrid;         // ← 状態（プロパティ）
  currentPiece: Piece | null;
  private dropTimer: number; // ← privateな状態

  start(): void { /* ... */ }  // ← 操作（メソッド）
  update(deltaTime: number): void { /* ... */ }
  moveLeft(): boolean { /* ... */ }
}
```

クラスが適している理由は以下の通りです。

1. **状態をカプセル化する**: `dropTimer` や `isLocking` など、ゲームの内部状態は外部から直接触らせたくない
2. **複数のメソッドで状態を共有する**: `update()` も `moveLeft()` も同じ `board` や `currentPiece` を操作する
3. **「状態 + 操作」のひとかたまりを表現する**: これがオブジェクト指向設計の基本

Boardモジュールが関数群なのは、盤面自体は「データ」であり「操作」から分離できるからです。`isValidPosition(shape, position, board)` は盤面データを引数で受け取り、副作用（外部の状態を変えること）なしに結果を返します。

## パブリック vs プライベート

```typescript
// パブリック（外部から読み取り可能）
board: BoardGrid;
currentPiece: Piece | null;
ghostPosition: Position | null;
state: GameState;
scoreState: ScoreState;
holdInfo: HoldInfo;
nextQueue: PieceType[];

// プライベート（Game内部のみ）
private randomizer: Randomizer;
private dropTimer: number;
private lockDelay: number;
private lockMoves: number;
private isLocking: boolean;
```

なぜ外部に公開するプロパティがあるのでしょうか。**Rendererが読み取って描画するため**です。

Rendererは `game.board` を読んで盤面を描画し、`game.currentPiece` を読んで現在のピースを描画します。しかし、Rendererはこれらの値を**変更できません**。TypeScriptの型では `public` でも、設計としては「読み取り専用の公開」です。

```typescript
// Rendererでの使われ方（概念）
render(gameState: {
  board: BoardGrid;
  currentPiece: Piece | null;
  state: GameState;
  // Game全体ではなく、必要なプロパティだけを受け取る
}): void {
  this.drawBoard(gameState.board);
  this.drawPiece(gameState.currentPiece);
}
```

一方、`private` なプロパティはGameクラス自身しかアクセスできません。`dropTimer` は重力落下のタイミング管理に使いますが、外部から「タイマーをリセットする」ような操作はできません。これで不整合を防ぎます。

## コンストラクタ — 初期状態の構築

```typescript
// src/game/Game.ts（31-45行目）
constructor(config: GameConfig) {
  this.config = config;
  this.board = createBoard();
  this.currentPiece = null;
  this.ghostPosition = null;
  this.state = 'idle';           // まだゲーム開始前
  this.scoreState = { score: 0, level: 1, lines: 0 };
  this.holdInfo = { type: null, usedThisTurn: false };
  this.nextQueue = [];
  this.randomizer = createRandomizer();
  this.dropTimer = 0;
  this.lockDelay = 0;
  this.lockMoves = 0;
  this.isLocking = false;
}
```

各プロパティの初期値とその意味です。

| プロパティ | 初期値 | 意味 |
|---|---|---|
| `state` | `'idle'` | ゲーム開始前の待機状態。スタート画面を表示 |
| `scoreState` | `{ score: 0, level: 1, lines: 0 }` | まだ何も消していない |
| `holdInfo` | `{ type: null, usedThisTurn: false }` | ホールド未使用 |
| `currentPiece` | `null` | まだピースが落ちてきていない |
| `randomizer` | `createRandomizer()` | 7-bagランダマイザーを生成 |

`state = 'idle'` は重要です。コンストラクタでゲームを開始せず、`start()` メソッドを呼ぶまで待機します。これにより「設定画面を表示してからゲーム開始」といったフローが可能になります。

## `start()` — ゲーム開始

```typescript
// src/game/Game.ts（47-66行目）
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
```

`start()` では全状態をリセット（初期化）します。続いて最初のピースを `spawnPiece()` で生成します。

```typescript
private spawnPiece(): boolean {
  const type = this.getNextFromQueue();
  const piece = createPiece(type);

  if (!isValidPosition(piece.shape, piece.position, this.board)) {
    return false;  // 盤面が詰まっている → gameOver
  }

  this.currentPiece = piece;
  this.updateGhost();
  return true;
}
```

`spawnPiece()` が `false` を返すのは、新しいピースの出現位置がすでにブロックで埋まっている場合です。つまり**ゲームオーバー**です。

## `update(deltaTime)` — ゲームループの中核

```typescript
// src/game/Game.ts（72-103行目）
update(deltaTime: number): void {
  if (this.state !== 'playing') return;  // 1

  if (!this.currentPiece) {               // 2
    if (!this.spawnPiece()) {
      this.state = 'gameOver';
      return;
    }
  }

  this.dropTimer += deltaTime;            // 3

  if (this.dropTimer >= this.getDropInterval()) { // 4
    const moved = this.tryMoveDown();
    if (!moved) {
      this.isLocking = true;              // 5
    } else if (this.isLocking) {
      this.isLocking = false;
      this.lockDelay = 0;
      this.lockMoves = 0;
    }
    this.dropTimer = 0;
  }

  if (this.isLocking) {                   // 6
    this.lockDelay += deltaTime;
    if (this.lockDelay >= LOCK_DELAY_MS) {
      this.lockCurrentPiece();
    }
  }
}
```

`update()` は毎フレーム（1秒間に約60回）呼ばれます。`deltaTime` は前回のフレームからの経過時間（ミリ秒）です。

処理の流れを追いましょう。

1. **playing状態かチェック**: ポーズ中やゲームオーバーなら何もしない
2. **現在のピースがない → 生成**: `spawnPiece()` が失敗したらゲームオーバー
3. **重力タイマー加算**: `dropTimer` に経過時間を足す
4. **インターバル経過 → 下に移動**: 十分時間が経ったら `tryMoveDown()` で1マス下へ
5. **移動失敗 → ロック開始**: 下に移動できなければ接地状態に
6. **ロック中 → 時間経過で確定**: `LOCK_DELAY_MS`（500ms）経過で `lockCurrentPiece()`

このループがテトリスの根幹です。プレイヤーが何もしなくても、時間の経過とともにピースは落ちていきます。

### なぜ `tryMoveDown()` でロックが解除されるのか

`tryMoveDown()` が成功したとき、`isLocking` が `true` なら解除しています（89-93行目）。これは「ピースが崖の上にあったが、重力で1段下に落ちた」という状況を表します。接地状態ではなくなったので、ロックをキャンセルします。

## 重力システム

```typescript
// src/game/Game.ts（6-9行目）
const DROP_INTERVALS: readonly number[] = [
  1000, 793, 618, 473, 355, 262, 190, 135, 94, 64,
  43, 43, 43, 28, 28, 28, 18,
];

private getDropInterval(): number {
  const index = Math.min(this.scoreState.level - 1, DROP_INTERVALS.length - 1);
  return DROP_INTERVALS[index];
}
```

`DROP_INTERVALS` はレベルごとの落下間隔（ミリ秒）を定義した配列です。

| レベル | 間隔（ms） | 1マス落ちる速度 |
|---|---|---|
| 1 | 1000 | 1秒に1マス |
| 5 | 355 | 約3マス/秒 |
| 10 | 43 | 約23マス/秒（かなり速い） |
| 15 | 18 | 約55マス/秒（ほぼ瞬間） |

なぜ配列で管理するのでしょうか。計算式 `1000 - (level - 1) * 50` のような単純な式でもよさそうに思えます。しかし配列にすることで、レベルごとの値を**自由に調整**できます。たとえばレベル3だけ「難しくしすぎ」と感じたら、配列の1要素を変えるだけです。

`readonly number[]` は「この配列は読み取り専用（変更禁止）」というTypeScriptの修飾子です。ゲーム中に誤って値を書き換えるバグを防ぎます。

```typescript
// コンパイルエラーになるので安全
DROP_INTERVALS[0] = 500; // Error: Cannot assign to readonly
```

## スコアリング

```typescript
// src/game/Game.ts（236-241行目）
const LINE_SCORES = [0, 100, 300, 500, 800];
const baseScore = LINE_SCORES[linesCleared] ?? 800;
this.scoreState.score += baseScore * this.scoreState.level;
this.scoreState.lines += linesCleared;
this.scoreState.level = Math.floor(this.scoreState.lines / 10) + 1;
```

ライン消去のスコアは消したライン数に応じて決まります。

| 消したライン数 | 名称 | 基本スコア |
|---|---|---|
| 0 | - | 0 |
| 1 | Single | 100 |
| 2 | Double | 300 |
| 3 | Triple | 500 |
| 4 | **Tetris** | 800 |

各スコアにはレベル倍率（`baseScore * level`）がかかります。高レベルほど1回の消去で得られるスコアが大きくなります。これは「高レベルほどリスクが高いので、リターンも大きくする」というゲームデザインです。

レベルは消去した累計ライン数から計算します。

```typescript
this.scoreState.level = Math.floor(this.scoreState.lines / 10) + 1;
```

`Math.floor()` は小数点以下を切り捨てる関数です。10ライン消すごとにレベルが1上がります。

### ソフト/ハードドロップの加点

```typescript
// ソフトドロップ（117-122行目）
softDrop(): boolean {
  if (!this.currentPiece || this.state !== 'playing') return false;
  const moved = this.tryMove(0, 1);
  if (moved) {
    this.scoreState.score += 1;  // 1マスにつき1点
    this.dropTimer = 0;
  }
  return moved;
}

// ハードドロップ（124-143行目）
hardDrop(): void {
  if (!this.currentPiece || this.state !== 'playing') return;
  const ghost = getGhostPosition(/*...*/);
  const rowsDropped = ghost.y - this.currentPiece.position.y;
  this.scoreState.score += rowsDropped * 2;  // 1マスにつき2点
  this.currentPiece = { ...this.currentPiece, position: ghost };
  this.lockCurrentPiece();
}
```

ソフトドロップ（↓キーでゆっくり落とす）は1マス1点、ハードドロップ（Spaceキーで一気に落とす）は1マス2点です。これは積極的に落下操作をするプレイヤーへのボーナスです。

## Hold機能

```typescript
// src/game/Game.ts（169-200行目）
hold(): void {
  if (!this.currentPiece || this.state !== 'playing') return;
  if (this.holdInfo.usedThisTurn) return;  // 1ターン1回の制限

  const currentType = this.currentPiece.type;

  if (this.holdInfo.type === null) {
    // Holdに何もない: 現在のピースを預けて次のピースを出す
    this.holdInfo.type = currentType;
    this.currentPiece = null;
    this.ghostPosition = null;
    this.spawnPiece();
  } else {
    // 同じピースの再Hold禁止
    if (this.holdInfo.type === currentType) return;

    // Holdにあるものと交換
    const heldType = this.holdInfo.type;
    this.holdInfo.type = currentType;

    const newPiece = createPiece(heldType);
    if (!isValidPosition(newPiece.shape, newPiece.position, this.board)) {
      this.state = 'gameOver';
      return;
    }
    this.currentPiece = newPiece;
    this.updateGhost();
  }

  this.holdInfo.usedThisTurn = true;  // 使用済みマーク
}
```

Hold機能には3つの制限があります。

1. **1ターン1回**: `usedThisTurn` フラグで制御。`lockCurrentPiece()` で次のピースが出たときにリセット（245行目）
2. **同じピースの再Hold禁止**: 同じピースを何度もHoldして時間を稼ぐのを防止
3. **Hold不可能ならゲームオーバー**: Holdから戻した位置が埋まっていたらゲームオーバー

## Lock Delay システム

```typescript
const LOCK_DELAY_MS = 500;    // 500ms
const LOCK_MOVES_MAX = 15;    // 最大15回の操作

private onPieceManipulated(): void {
  this.updateGhost();
  if (this.isLocking && this.lockMoves < LOCK_MOVES_MAX) {
    this.lockDelay = 0;       // 操作でロックタイマーをリセット
    this.lockMoves++;
  }
}
```

Lock Delay（ロックディレイ = 接地後の猶予時間）は、プレイヤーがピースを接地した後も操作できる猶予を与える仕組みです。

なぜこれが必要なのでしょうか。Lock Delayがないと、ピースが地面に触れた瞬間に固定されてしまいます。プレイヤーは「もう少し右にずらしたい」「回転させたい」と思っても操作できません。Lock Delayがあることで、接地後も500msの間は移動や回転ができます。

ただし、無限に操作できるとゲームバランスが崩れます。そこで**2つの制限**をかけています。

- **時間制限（500ms）**: 操作しなければ500msで固定
- **回数制限（15回）**: 操作でタイマーはリセットされるが、15回を超えると強制固定

### `tryMove()` と `tryMoveDown()` の違い

```typescript
// プレイヤー操作 → Lock Delayリセットあり
private tryMove(dx: number, dy: number): boolean {
  if (!this.currentPiece || this.state !== 'playing') return false;
  const newPos = { x: this.currentPiece.position.x + dx,
                   y: this.currentPiece.position.y + dy };
  if (isValidPosition(this.currentPiece.shape, newPos, this.board)) {
    this.currentPiece = { ...this.currentPiece, position: newPos };
    this.onPieceManipulated();  // ← Lock Delayをリセット！
    return true;
  }
  return false;
}

// 重力 → Lock Delayリセットなし
private tryMoveDown(): boolean {
  if (!this.currentPiece) return false;
  const newPos = { x: this.currentPiece.position.x,
                   y: this.currentPiece.position.y + 1 };
  if (isValidPosition(this.currentPiece.shape, newPos, this.board)) {
    this.currentPiece = { ...this.currentPiece, position: newPos };
    this.updateGhost();
    return true;
  }
  return false;
}
```

2つのメソッドを分ける理由は**Lock Delayのリセット有無**です。

- `tryMove()`: プレイヤー操作で呼ばれる。`onPieceManipulated()` でLock Delayをリセット
- `tryMoveDown()`: 重力で呼ばれる。リセットしない（重力でずっと回避し続けるのを防ぐ）

この区別がないと、重力落下で延々とLock Delayがリセットされ、永遠にピースが固定されなくなります。

## 設計判断の解説

### なぜScoreStateがインターフェース？

`ScoreState` は `src/types.ts`（55-59行目）で定義されたインターフェースです。

```typescript
export interface ScoreState {
  score: number;
  level: number;
  lines: number;
}
```

GameモジュールとRendererモジュールの両方で使われる型は、`types.ts` にまとめて定義します。こうすることで「Gameがスコアを更新し、Rendererがスコアを描画する」というデータの流れが、型定義1つで表現できます。

### なぜNextQueueをGameが管理する？

```typescript
private fillNextQueue(): void {
  while (this.nextQueue.length < QUEUE_MIN_SIZE) {
    this.nextQueue.push(this.randomizer.next());
  }
}
```

キュー（待ち行列）の管理をGameが行う理由は、「ピース生成の流れを一元管理する」ためです。Rendererは単に `nextQueue` を読み取って描画するだけです。もしRendererが直接Randomizerを呼ぶ設計だと、「描画のためにピースを消費してしまう」といった事故が起こりえます。

## 試してみよう

Gameクラスの代わりに、簡略版のゲームループを自分で動かしてみましょう。

```typescript
// 簡略版ゲームループのシミュレーション
type GameState = 'idle' | 'playing' | 'paused' | 'gameOver';

class SimpleGame {
  state: GameState = 'idle';
  dropTimer = 0;
  position = 0;  // ピースのY位置（簡略版）
  
  start() {
    this.state = 'playing';
    this.position = 0;
    console.log('Game started!');
  }
  
  update(deltaTime: number) {
    if (this.state !== 'playing') return;
    
    this.dropTimer += deltaTime;
    const interval = 1000; // レベル1相当
    
    if (this.dropTimer >= interval) {
      this.position++;
      this.dropTimer = 0;
      console.log(`Piece position: ${this.position}`);
      
      if (this.position >= 20) {
        console.log('Piece locked!');
        this.state = 'gameOver';
        console.log('Game Over!');
      }
    }
  }
}

const game = new SimpleGame();
game.start();

// 手動でティックを進める
game.update(300);  // 300ms経過（何も起こらない）
game.update(300);  // さらに300ms（まだ）
game.update(400);  // さらに400ms → 合計1000ms超過！1マス落下
game.update(1000); // さらに1マス
// → 20回繰り返すとゲームオーバー
```

実際のGameクラスでは `update()` が `requestAnimationFrame`（ブラウザのアニメーションループ）から呼ばれますが、原理は同じです。「タイマーをためて、一定量を超えたら行動する」という流れを理解してください。

---

**→ 次のステップ：[11: Rendererモジュール](./11-renderer-module.md)**
**← 前のステップ：[09: Configモジュール](./09-config-module.md)**
