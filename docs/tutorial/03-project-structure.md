# プロジェクト構造 — ファイル分割の考え方と設計哲学

## 「なぜファイルを分けるのか」

プログラムを書くとき、最初は「1つのファイルに全部書いてしまおう」と考えがちです。実際、100行くらいのプログラムなら1ファイルでも問題ありません。

しかし、テトリスゲームのような（実際には約1200行の）プログラムになると、1ファイルに全部書くと大変なことになります：

- スクロールだけで30秒かかる
- 「あの関数は何行目だっけ？」と探す時間が増える
- 複数の機能が密接に混ざり合って、1箇所の修正が予期せぬ場所に影響する
- 複数人で同時に編集できない

**「関心の分離」** という考え方があります。これは「プログラムの異なる関心事（責任範囲）は、異なるモジュール（ファイル）に分ける」という原則です。

たとえばテトリスには以下のような「関心事」があります：

| 関心事 | 説明 | 質問 |
|--------|------|------|
| 盤面の状態管理 | どのマスに何が置かれているか | 「ここにピースは置ける？」 |
| テトリミノの定義 | 7種の形と回転 | 「Iピースを右回転すると？」 |
| 描画 | 画面にどう表示するか | 「このピースを青色で描いて」 |
| 入力処理 | キーボード入力をどう扱うか | 「←キーが押されたら左に動かして」 |
| 設定 | ユーザーのカスタマイズ | 「キー設定はTOMLで管理」 |

これらを1ファイルに書くと、「盤面の管理」のコードと「描画」のコードが混ざり合い、読みづらくなります。

## 実際のプロジェクト構造

このプロジェクトは以下のような構造になっています：

```
src/
├── main.ts              # エントリポイント、ゲームループ
├── types.ts             # すべての型定義
├── style.css            # ダークテーマのスタイル
├── game/                # ゲームのロジック
│   ├── Game.ts          # ステートマシン、重力、スコア、Hold
│   ├── Board.ts         # 10x22グリッド（衝突判定、ライン消去）
│   ├── Piece.ts         # テトリミノ定義 + SRS回転 + 壁蹴り
│   └── Randomizer.ts    # 7-bagランダマイザー
├── renderer/
│   └── Renderer.ts      # Canvas描画（3Dセル、ゴースト、Hold/Next/Score）
├── input/
│   └── InputManager.ts  # キーボード入力 + DAS/ARR
└── config/
    └── config.ts        # TOMLコンフィグローダー
```

それぞれのモジュールが担当する「責務（役割）」を見ていきましょう。

---

## 1. src/types.ts — すべての型定義を1箇所にまとめる

`src/types.ts` は、プロジェクト全体で使われるすべての型定義を1つのファイルにまとめています。

**なぜ types.ts にまとめるのか**：

1. **変更が1箇所で済む**: 例えば `PieceType` に新しいピースを追加する場合、types.ts の1箇所だけを変更すれば、他のモジュールが自動的に新しい型を使える
2. **他のモジュールが参照しやすい**: 「あの型はどこで定義されてる？」と探す必要がない。types.ts を見れば全部わかる
3. **循環参照を防ぐ**: モジュールAがモジュールBを参照し、モジュールBがモジュールAを参照する...という「循環参照」はプログラムの複雑さを爆発的に増やす。types.ts に型をまとめることで、型定義だけはどこからでも参照でき、循環参照のリスクを減らせる

**実際の内容を一部見てみましょう**：

```typescript
// src/types.ts（1-22行目）
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Direction = 'up' | 'down' | 'left' | 'right';
export interface Position { x: number; y: number; }
export type Cell = PieceType | null;
export type BoardGrid = Cell[][];
export type GameState = 'idle' | 'playing' | 'paused' | 'gameOver';
```

このファイルを見るだけで、このゲームで使われている「データの形」がすべて理解できます。

---

## 2. src/game/ — ゲームのロジックだけを集める

`src/game/` フォルダには、ゲームのルールに関するロジックだけが集められています。さらに4つのファイルに分割されています：

### Board.ts — 盤面の状態管理

**責務**: テトリスの盤面（10x22のグリッド）を管理する

具体的には：
- `createBoard()`: 空の盤面を作成する（8行目）
- `isValidPosition()`: 指定された位置にピースを置けるか判定する（20行目）
- `lockPiece()`: ピースを盤面に固定する（39行目）
- `clearLines()`: 揃った行を消去する（55行目）
- `getGhostPosition()`: ゴーストピースの位置を計算する（71行目）

```typescript
// Board.ts の核心部分 — 衝突判定
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
```

**なぜ Board.ts として独立させるのか**：
このファイルは「盤面というデータ構造」だけを扱います。ピースの形や回転、描画、入力のことは一切知りません。「盤面に関する操作」が必要なときは、この関数を呼べばいいわけです。

### Piece.ts — テトリミノの定義と回転

**責務**: 7種類のテトリミノの形状と、その回転ルール（SRS）を管理する

具体的には：
- `SHAPES`: 各ピースの4方向の形状データ（5-191行目）
- `createPiece()`: 指定された種類のピースを生成する（305行目）
- `rotateCW()` / `rotateCCW()`: 右回転 / 左回転を実行する（351-358行目）
- 壁蹴りテーブル: JLSTZ用、I用、O用の3種類（210-244行目）

```typescript
// Piece.ts のコアアイデア — 壁蹴り
// 回転時に壁に当たった場合、少し横にずらすためのオフセット値
const JLSTZ_KICKS: KickTable = {
  '0→1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  // ...
};
```

**なぜ Piece.ts として独立させるのか**：
テトリミノの形状や回転ルールは、テトリスというゲームの「仕様そのもの」です。盤面管理（Board.ts）とは独立しているため、別ファイルにするのが自然です。

### Randomizer.ts — ピースの生成順序

**責務**: どの順番でピースを出現させるかを決定する

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

**なぜ Randomizer.ts として独立させるのか**：
「どのようにピースを選ぶか」というアルゴリズムは、ピースの形（Piece.ts）や盤面（Board.ts）とは無関係です。将来「7-bag」から「14-bag」など別のアルゴリズムに変更する場合も、このファイルだけを変えれば済みます。

### Game.ts — 上記3つを統合するステートマシン

**責務**: Board、Piece、Randomizer の3つを統合し、ゲーム全体の流れを制御する

Game.ts が担当すること：
- ゲームの状態管理（idle → playing → paused / gameOver）
- 重力による自動落下（`update()` が毎フレーム呼ばれる）
- スコア計算（ライン消去時の得点）
- Hold機能
- Lock Delayの管理

```typescript
// Game.ts のゲームループ部分
update(deltaTime: number): void {
  if (this.state !== 'playing') return;
  if (!this.currentPiece) {
    if (!this.spawnPiece()) { this.state = 'gameOver'; return; }
  }
  this.dropTimer += deltaTime;
  if (this.dropTimer >= this.getDropInterval()) {
    const moved = this.tryMoveDown();
    if (!moved) { this.isLocking = true; }
    this.dropTimer = 0;
  }
  if (this.isLocking) {
    this.lockDelay += deltaTime;
    if (this.lockDelay >= LOCK_DELAY_MS) { this.lockCurrentPiece(); }
  }
}
```

**なぜ Game.ts が別に必要か**：
Board は「盤面というデータ」、Piece は「ピースの形」、Randomizer は「生成順序」をそれぞれ独立して管理しています。これらを「ゲーム」として統合するのが Game.ts の役割です。Game.ts は Board を使って衝突判定をし、Piece を使って回転をし、Randomizer を使って次のピースを取得します。

**もし1ファイルだったら？**：
仮に Board・Piece・Randomizer・Game をすべて1ファイルに書いたとします。その場合：

- ファイルが数百行になり、読みにくい
- 「盤面の初期化」を探すのにスクロールが必要
- 1つの関数を修正するときに、他の機能に影響しないか不安になる
- もし「描画」も同じファイルに入っていたら...さらに悪化する

ファイル分割は「探しやすさ」「理解のしやすさ」「変更の安全性」を高めます。

---

## 3. src/renderer/ — 描画を分離する理由

**責務**: ゲームの状態を画面に描画する

Renderer.ts は以下のことを担当します：
- Canvasの初期化とサイズ設定
- 盤面の描画（各セルの3D表現）
- 現在のピースとゴーストピースの描画
- Hold表示、Next表示、スコア表示
- ゲーム状態に応じたオーバーレイ描画（タイトル、PAUSED、GAME OVER）

```typescript
// Renderer.ts の核心 — 1セルの描画（3D表現）
private drawCell(x: number, y: number, color: string): void {
  // 暗い背景
  this.ctx.fillStyle = this.darkenColor(color, 0.3);
  this.ctx.fillRect(cellX + 1, cellY + 1, this.blockSize - 2, this.blockSize - 2);
  // メインの色
  this.ctx.fillStyle = color;
  this.ctx.fillRect(cellX + 2, cellY + 2, this.blockSize - 4, this.blockSize - 4);
  // 左上のハイライト（光が当たっている表現）
  this.ctx.fillStyle = this.lightenColor(color, 0.4);
  this.ctx.fillRect(cellX + 1, cellY + 1, this.blockSize - 2, 2);
  this.ctx.fillRect(cellX + 1, cellY + 1, 2, this.blockSize - 2);
  // 右下の影
  this.ctx.fillStyle = this.darkenColor(color, 0.5);
  this.ctx.fillRect(cellX + 1, cellY + this.blockSize - 3, this.blockSize - 2, 2);
  this.ctx.fillRect(cellX + this.blockSize - 3, cellY + 1, 2, this.blockSize - 2);
}
```

**なぜロジックと描画を分離するのか**：

1. **テスト容易性**: 描画処理を分離しておけば、「描画なしでロジック（Game, Board, Piece）だけをテスト」できる。自動テストでは描画の検証は難しいので、これは大きな利点
2. **差し替え可能性**: 将来、Canvas API の代わりに WebGL を使いたくなった場合、Renderer.ts だけを書き換えればいい。Game や Board は変更しなくて済む
3. **責務の明確化**: Game は「ゲームのルール」だけを考え、Renderer は「どう見せるか」だけを考える。お互いに干渉しない

---

## 4. src/input/ — 入力を分離する理由

**責務**: キーボード入力をゲームのアクションに変換する

InputManager.ts の役割：
- キー入力の検知（keydown / keyup イベント）
- キーコードからゲームアクションへのマッピング（`ArrowLeft` → `moveLeft`）
- DAS/ARRの実装（キーを押し続けたときの自動リピート）
- コールバック方式で Game のメソッドを呼び出す

```typescript
// main.ts での配線
input.on('moveLeft', () => game.moveLeft());
input.on('moveRight', () => game.moveRight());
input.on('hardDrop', () => game.hardDrop());
```

**なぜ入力を分離するのか**：
入力ソースが変わっても Game は変更しなくて済むからです。

例えば、現在はキーボード入力ですが、将来以下のような入力方法を追加する場合を考えてみてください：

- **ゲームパッド**: ジョイスティックの入力を検知する
- **タッチ操作**: スマホのタッチジェスチャーを検知する
- **リプレイ機能**: 保存された入力データを再生する

これらを実装するとき、新しい InputManager（例：`TouchInputManager.ts`）を作れば、Game はまったく変更せずに新しい入力方式に対応できます。InputManager が「入力 → アクション」の変換を受け持ち、Game は「アクション → ゲームの状態変化」だけを受け持つからです。

---

## 5. src/config/ — 設定を分離する理由

**責務**: TOML設定ファイルを読み込み、型安全な設定オブジェクトを提供する

config.ts の役割：
- `public/config.toml` をHTTPで取得する
- `smol-toml` パーサーでTOMLをパースする
- パースした値を `GameConfig` 型のオブジェクトに変換する
- 設定ファイルがない場合はデフォルト値を返す

```typescript
export async function loadConfig(): Promise<GameConfig> {
  try {
    const response = await fetch('/config.toml');
    const parsed = parse(text);
    return { keys: { ... }, timing: { ... }, display: { ... } };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}
```

**なぜ設定を分離するのか**：
設定ファイルの形式が変わっても Game は影響を受けないからです。

現在はTOML形式ですが、将来JSONに変更したくなった場合、config.ts だけを修正すれば Game 以下のモジュールは一切変更する必要がありません。逆に、もし設定読み込みのコードが Game.ts の中に書かれていたら、形式変更のたびに Game.ts を修正する必要があります。

---

## 6. src/main.ts — エントリポイント（配線役）

**責務**: すべてのモジュールを初期化し、つなぎ合わせる。ゲームループを駆動する。

main.ts は「薄い層」であることが重要です。つまり、main.ts には「ゲームのロジック」や「描画の詳細」は一切書かず、各モジュールの初期化と接続だけを行います。

```typescript
async function main(): Promise<void> {
  // 1. 設定を読み込む
  const config = await loadConfig();

  // 2. 各モジュールを初期化
  const game = new Game(config);
  const renderer = new Renderer(canvas, config);
  const input = new InputManager(config);

  // 3. 入力とゲームを接続（配線）
  input.on('moveLeft', () => game.moveLeft());
  input.on('moveRight', () => game.moveRight());
  // ...（略）

  // 4. ゲームループ
  function gameLoop(currentTime: number): void {
    input.update(deltaTime);
    game.update(deltaTime);
    renderer.render({ board: game.board, state: game.state, ... });
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);
}
```

**なぜこれが重要なのか**：
依存関係（どのモジュールがどのモジュールを使うか）を1箇所で管理できるからです。

- 「どの入力がどのゲームアクションに対応するか」は main.ts の配線で決まる
- キー設定を変えたい場合、config.toml を変えるだけでmain.tsの配線はそのまま
- 新しい機能を追加する場合、main.ts で新しい配線を追加するだけで済む

---

## 依存関係の方向

このプロジェクトでは、依存関係（あるモジュールが別のモジュールを「使う」関係）が一方方向になるように設計されています。

```
main.ts
  ├── game/Game.ts ──┬── game/Board.ts
  │                  ├── game/Piece.ts
  │                  └── game/Randomizer.ts
  ├── renderer/Renderer.ts
  ├── input/InputManager.ts
  └── config/config.ts
```

**依存関係のルール**：

1. **main.ts → すべてのモジュール**: main.ts は全てのモジュールを知っている。でも、個々のモジュールは main.ts のことを知らない
2. **Game.ts → Board, Piece, Randomizer**: Gameはこれら3つを使う。でも Board は Game を知らない
3. **Renderer.ts → types（のみ）**: Rendererは types.ts だけを参照する。Game のことは一切知らない

**なぜこの「一方方向」が重要なのか**：

もし依存関係が双方向（A→B かつ B→A）になると、以下の問題が起きます：

- **変更の連鎖**: Aを変更するとBにも影響し、Bを変更するとAにも影響する...という無限ループ
- **理解の困難さ**: Aのコードを読むにはBの知識が必要で、Bのコードを読むにはAの知識が必要。鶏が先か卵が先か

一方方向の依存関係なら、「上流（main.ts 側）」から「下流（Piece.ts 側）」への一方通行です。下流のモジュールを読むときは、それより下流の知識だけで理解できます。

**特に重要な設計判断**：Renderer.ts は Game.ts に依存しない

これは非常に重要な設計判断です。Renderer は描画だけを担当し、ゲームのロジック（Game）のことは知りません。render() メソッドには表示に必要なデータ（盤面、現在のピース、スコアなど）が引数として渡されます。

```typescript
// Renderer は Game のことを知らない！
// 必要なデータは引数で受け取る
renderer.render({
  board: game.board,
  currentPiece: game.currentPiece,
  state: game.state,
  scoreState: game.scoreState,
  // ...
});
```

これにより：
- Renderer を別のゲームでも使い回せる
- Renderer にバグがあっても Game のロジックに影響しない
- 「Game の変更 → Renderer も修正が必要」という事態を防げる

---

## 設計のまとめ

| ファイル | 責務 | 知っていること | 知らないこと |
|----------|------|---------------|-------------|
| main.ts | 配線、ゲームループ | 全モジュール | ゲームの詳細 |
| Game.ts | ゲームの状態と進行 | Board, Piece, Randomizer | 描画、入力、設定 |
| Board.ts | 盤面のデータ管理 | なし（純粋なデータ操作） | ゲーム全体の流れ |
| Piece.ts | テトリミノの形状と回転 | types.ts | 盤面、ゲーム |
| Randomizer.ts | ピースの生成順序 | types.ts | 盤面、ゲーム |
| Renderer.ts | 画面描画 | types.ts, Boardの定数 | Game、Piece、Input |
| InputManager.ts | キーボード入力 | types.ts | ゲームの詳細 |
| config.ts | 設定ファイルの読み込み | types.ts | ゲームの詳細 |

どのファイルも、「自分が担当する1つの仕事」だけに集中しています。これが「関心の分離」の実践です。

## 自分で試してみよう

1. `src/game/Board.ts` の `isValidPosition` 関数（20行目）を読んでみてください。この関数は Board.ts の中にありますが、Game.ts から呼ばれています。なぜ Board.ts に書かれているのか考えてください
2. `src/renderer/Renderer.ts` の `render` メソッド（86行目）を見て、Game のどのプロパティを受け取っているか確認してください。Renderer が Game のことを知らないとはどういうことか、実感してください
3. もし `InputManager` と `Game` を1つのファイルにまとめたらどうなるか想像してみてください。新しく「ゲームパッド対応」を追加するときに、何が困るでしょうか

**← 前のステップ：[02: TypeScriptの基礎](./02-typescript-basics.md)**
**→ 次のステップ：[04: テトリスの仕様](./04-tetris-spec.md)**
