# 12: InputManagerモジュール — キーボード入力とDAS/ARR

キーボード入力の処理は一見簡単そうに見えます。「キーが押されたら反応すればいい」だけです。しかしテトリスには2種類の操作要求があります。

1. **1回押しで1回だけ反応**: 回転、Hold、ポーズ
2. **押しっぱなしで連続反応**: 左右移動、ソフトドロップ

`src/input/InputManager.ts` はこの両方を、DAS/ARRという仕組みで実現しています。

## 入力処理の難しさ

キーボード入力にはOS（オペレーティングシステム）のキーリピート機能があります。キーを押し続けると、一定時間後に同じ入力が繰り返されます。

しかし、OSのキーリピートに頼るのは問題です。

- OSやキーボードの設定でリピート速度が変わる
- ゲームごとに適切なリピート速度が異なる
- 競技プレイヤーは細かい調整を求める

そこでテトリスでは、OSのキーリピートを無効にし、自分でリピート制御を実装します。その仕組みが **DAS（Delayed Auto Shift）** と **ARR（Auto Repeat Rate）** です。

## GameAction 型 — アクションの抽象化

```typescript
// src/input/InputManager.ts（3-12行目）
export type GameAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hold'
  | 'pause'
  | 'restart';
```

`GameAction` は「ゲーム上の操作」を表す型です。具体的なキーコード（`ArrowLeft`, `KeyZ`）ではなく、抽象的なアクション名（`moveLeft`, `rotateCCW`）で管理します。

```typescript
// 悪い例：キーコードに直結した設計
if (e.code === 'ArrowLeft') { game.moveLeft(); }
if (e.code === 'KeyZ') { game.rotateCCW(); }
// → キー設定を変えたら、ここのコードも全部変える必要がある

// 良い例：アクションで抽象化
const action = keyCodeToAction.get(e.code);  // 設定からマッピング
if (action === 'moveLeft') { game.moveLeft(); }
// → キー設定を変えても、入力処理のコードは変わらない
```

なぜ抽象化するのでしょうか。**キー設定と入力処理の結合を疎（ゆるく）にする**ためです。設定ファイルでキーを変更しても、`InputManager` のコードは一切変える必要がありません。設定を読み込んで `rebuildKeyMap()` を呼ぶだけで新しいマッピングが適用されます。

## `REPEATABLE_ACTIONS` — リピート対象の指定

```typescript
// src/input/InputManager.ts（16-20行目）
const REPEATABLE_ACTIONS: ReadonlySet<GameAction> = new Set([
  'moveLeft',
  'moveRight',
  'softDrop',
]);
```

`ReadonlySet`（変更不可の集合）で、リピート（押しっぱなしで連続実行）すべきアクションを指定します。

- **リピートあり**: `moveLeft`, `moveRight`, `softDrop`
  - 左/右に移動し続けたい、ゆっくり落とし続けたい
- **リピートなし**: `hardDrop`, `rotateCW`, `rotateCCW`, `hold`, `pause`, `restart`
  - 1回押したら1回だけ反応すればいい

なぜ rotate はリピートしないのでしょうか。想像してみてください。回転キーを押しっぱなしにしたらピースが高速回転し続けるゲームを。ほとんどのプレイヤーが求めるのは「押したら1回転」です。

## DAS/ARR の仕組み

DAS（Delayed Auto Shift = 遅延付き自動連続移動）と ARR（Auto Repeat Rate = 自動リピート間隔）は、テトリス入力処理の根幹です。

```typescript
// src/input/InputManager.ts（22-25行目）
interface DasTimer {
  elapsed: number;   // 経過時間（ms）
  dasDone: boolean;  // DAS完了フラグ
}
```

### 動作フロー

```
キーを押す
  │
  ├──→ fireAction() を1回実行 ← 即時反応
  │
  └──→ DASタイマー開始
         │
         elapsed += deltaTime
         │
         elapsed >= DAS_DELAY(167ms)?
         │
         ├── Yes → fireAction() 実行
         │         DAS完了フラグ = true
         │         elapsed をリセット
         │         │
         │         elapsed += deltaTime
         │         │
         │         elapsed >= ARR_DELAY(33ms)?
         │         │
         │         ├── Yes → fireAction() 実行
         │         │         elapsed -= ARR_DELAY
         │         │         ループ（押している間繰り返す）
         │         │
         │         └── No → 次のフレームで再チェック
         │
         └── No → 次のフレームで再チェック
```

コードで見てみましょう。

```typescript
// src/input/InputManager.ts（61-79行目）
update(deltaTime: number): void {
  for (const [action, timer] of this.dasTimers) {
    timer.elapsed += deltaTime;

    // DASフェーズ
    if (!timer.dasDone) {
      if (timer.elapsed >= this.config.timing.dasDelay) {
        timer.dasDone = true;
        timer.elapsed -= this.config.timing.dasDelay;
        this.fireAction(action);  // DAS完了時の1回
      }
    }

    // ARRフェーズ（DAS完了後）
    if (timer.dasDone && this.config.timing.arrDelay > 0) {
      while (timer.elapsed >= this.config.timing.arrDelay) {
        timer.elapsed -= this.config.timing.arrDelay;
        this.fireAction(action);  // リピート実行
      }
    }
  }
}
```

`update()` は毎フレーム呼ばれ、`deltaTime`（前回からの経過時間）を受け取ります。

重要なのは **`while` ループ**です。フレームレートが60fps（1フレーム約16.7ms）の場合、ARR間隔（33ms）中に `update()` は約2回呼ばれます。`while` がないと、`elapsed` が `arrDelay` を超えても次のフレームまでアクションが実行されませんが、`while` があるので「超えた分はすぐに消費する」動作になります。

```
フレーム1: elapsed=16ms, arrDelay未満 → 何もしない
フレーム2: elapsed=33ms, arrDelay達成！→ fireAction, elapsed=0
フレーム3: elapsed=17ms → 何もしない
フレーム4: elapsed=34ms → fireAction, elapsed=1
```

もしフレームレートが低下して1フレーム50msかかる場合でも、`while` ループが適切に処理します。

```
フレーム1: elapsed=50ms → DAS完了(50>=167ではないが…あくまで例)
           while: 50>=33 → fireAction, elapsed=17
                 17>=33 → ループ終了
```

### デフォルト値の意味

```toml
[timing]
dasDelay = 167  # 約10フレーム（60fps換算）
arrDelay = 33   # 約2フレーム
```

- **DAS遅延（167ms）**: キーを押してから自動連続移動が始まるまでの時間
- **ARR間隔（33ms）**: 自動連続移動の間隔。約30回/秒

この値は競技テトリスで広く使われる標準値です。好みに応じて調整できます。

## `update(deltaTime)` でのDAS管理

`dasTimers` は `Map<GameAction, DasTimer>` で、複数のキーを同時に押した場合もそれぞれ独立して管理されます。

```typescript
// 例：左と下を同時押し
// dasTimers: {
//   'moveLeft' => { elapsed: 50, dasDone: false },
//   'softDrop' => { elapsed: 120, dasDone: false },
// }
```

`update()` は全てのタイマーをイテレート（反復処理）し、それぞれに同じロジックを適用します。

## キー設定の動的変更

```typescript
// src/input/InputManager.ts（82-104行目）
private rebuildKeyMap(): void {
  this.keyCodeToAction.clear();
  this.keyMap.clear();

  const entries: [string, GameAction][] = [
    [this.config.keys.moveLeft, 'moveLeft'],
    [this.config.keys.moveRight, 'moveRight'],
    // ... 全アクションのマッピング
  ];

  for (const [code, action] of entries) {
    if (code != null) {
      this.keyCodeToAction.set(code, action);
      this.keyMap.set(code, action);
    }
  }
}
```

`rebuildKeyMap()` はconfigからキーコード→アクションのマッピングを構築します。`Map`（キーと値のペアを保持するデータ構造）を使うことで、キーコードからアクションへの変換が `O(1)`（常に一定時間）で完了します。

### 2段階ルックアップ

```typescript
// src/input/InputManager.ts（106-112行目）
private handleKeyDown(e: KeyboardEvent): void {
  const code = e.code;
  let action = this.keyCodeToAction.get(code);
  if (action == null) {
    // e.code で見つからなければ e.key でも試す
    action = this.keyCodeToAction.get(e.key);
    if (action == null) return;
  }
  // ...
}
```

ブラウザのキーボードイベントには `e.code`（物理的なキー位置）と `e.key`（入力される文字）の2種類の識別子があります。

| キー | `e.code` | `e.key` |
|---|---|---|
| 左矢印 | `ArrowLeft` | `ArrowLeft` |
| Zキー（US配列） | `KeyZ` | `z` |
| Zキー（QWERTYのYの位置） | `KeyY` | `z`（配列によって変わる） |

**補足：`??`（nullish coalescing）演算子** — `??` は左辺が `null` または `undefined` の場合だけ右辺を返す演算子です。上のコードは `??` を使ってより簡潔に書けます。

```typescript
const action = this.keyCodeToAction.get(e.code)
  ?? this.keyCodeToAction.get(e.key);
if (action == null) return;
```

`||`（OR演算子）と似ていますが、`||` は `false` や `0` や `""`（空文字）も「偽」とみなして右辺にしてしまうのに対し、`??` は `null` / `undefined` だけを対象にします。

通常は `e.code` を使いますが、キーボード配列によっては `e.code` でマッチしないケースがあります。そこで `e.code` で見つからなければ `e.key` で再試行する2段階ルックアップにしています。

```typescript
// 例：設定ファイルに "z" と書かれている場合
// handleKeyDown の e.code は "KeyZ"、e.key は "z"
// → e.code の "KeyZ" ではマッチしない
// → e.key の "z" でマッチ！
```

## イベントリスナーの attach/detach

```typescript
// src/input/InputManager.ts（49-59行目）
attach(): void {
  window.addEventListener('keydown', this.boundKeyDown);
  window.addEventListener('keyup', this.boundKeyUp);
}

detach(): void {
  window.removeEventListener('keydown', this.boundKeyDown);
  window.removeEventListener('keyup', this.boundKeyUp);
  this.pressedKeys.clear();
  this.dasTimers.clear();
}
```

なぜイベントリスナー（特定のイベント発生時に呼ばれる関数）を動的に着脱するのでしょうか。

- **アイドル画面では入力を無視したい**: ゲーム開始前はキー操作を受け付けない
- **ポーズ中も特定のキーだけ受け付けたい**: ポーズ解除キーは有効にしたいが、移動は無視したい

`attach()` / `detach()` でリスナーの追加/削除を切り替えることで、細かい制御が可能です。`detach()` では `pressedKeys` と `dasTimers` もクリアしています。これは「ゲーム終了時に押されていたキーの状態をリセットする」ためです。

### `boundKeyDown` と `boundKeyUp` — thisの束縛

```typescript
// コンストラクタ（38-43行目）
this.boundKeyDown = this.handleKeyDown.bind(this);
this.boundKeyUp = this.handleKeyUp.bind(this);
```

`bind(this)` は「この関数が呼ばれたとき、`this` がインスタンス自身を指すようにする」ための操作です。

```typescript
// bind がない場合のトラブル
const manager = new InputManager(config);
window.addEventListener('keydown', manager.handleKeyDown);
// キーを押すと、handleKeyDown の中の this が window になってしまう！
// → this.config が undefined でエラー
```

イベントリスナーにメソッドを渡すと、`this` の参照が失われます。`bind(this)` で「この関数は常にこのインスタンスを this として扱う」と固定します。

## 押しているキーの重複検出

```typescript
// src/input/InputManager.ts（116-117行目）
if (this.pressedKeys.has(code)) return;  // すでに押されているキーは無視
this.pressedKeys.add(code);              // 押されたキーを記録
```

`pressedKeys` は現在押されているキーのコードを保持する `Set<string>`（文字列の集合）です。これにより「同じキーが2回押された」場合を検出し、重複実行を防ぎます。

キーリピートがOSレベルで発生している場合も、`pressedKeys` が重複を検出して弾きます。これでOSのキーリピートとDAS/ARRの競合を防いでいます。

### `e.preventDefault()` の理由

```typescript
e.preventDefault();  // 114行目
```

`preventDefault()` は「ブラウザのデフォルト動作をキャンセルする」メソッドです。矢印キーを押すとページがスクロールしたり、Spaceキーでページが下に移動するのを防ぎます。ゲーム中にこれらのデフォルト動作が発生すると、操作感が損なわれるので、すべてキャンセルします。

## 設計判断のまとめ

| 判断 | 理由 |
|---|---|
| クラス（class InputManager）を採用 | DASタイマーという状態管理が必要 |
| GameActionでアクションを抽象化 | キー設定変更に強い設計 |
| DAS/ARRを自前実装 | OSのキーリピートに依存しない安定した操作感 |
| `e.code` → `e.key` の2段階ルックアップ | キーボード配列の違いに対応 |
| `pressedKeys` Setで重複検出 | OSキーリピートとDAS/ARRの競合を防止 |
| attach/detach でリスナー着脱 | ゲーム状態に応じて入力を制御 |
| `bind(this)` でコンテキスト固定 | イベントリスナーでのthis喪失を防止 |
| `e.preventDefault()` | スクロール等のブラウザ標準動作を抑制 |

## 試してみよう

簡略版のDAS/ARRシステムを自分で実装して動かしてみましょう。

```typescript
// DAS/ARRの簡略シミュレーション
class SimpleDAS {
  private elapsed = 0;
  private dasDone = false;
  private dasDelay = 167;  // ms
  private arrDelay = 33;   // ms

  pressKey() {
    console.log('Key pressed! Immediate action triggered.');
    this.elapsed = 0;
    this.dasDone = false;
  }

  releaseKey() {
    console.log('Key released.');
    this.elapsed = 0;
    this.dasDone = false;
  }

  update(deltaTime: number): void {
    if (!this.dasDone) {
      this.elapsed += deltaTime;
      if (this.elapsed >= this.dasDelay) {
        this.dasDone = true;
        this.elapsed -= this.dasDelay;
        console.log('DAS triggered! Auto-repeat started.');
      }
    }

    if (this.dasDone) {
      this.elapsed += deltaTime;
      if (this.elapsed >= this.arrDelay) {
        const repeats = Math.floor(this.elapsed / this.arrDelay);
        this.elapsed = this.elapsed % this.arrDelay;
        console.log(`ARR: ${repeats} repeat(s)`);
      }
    }
  }
}

const das = new SimpleDAS();

// キーを押したシミュレーション（フレーム更新）
console.log('=== Press key ===');
das.pressKey();                    // 即時反応
das.update(16);                    // フレーム1（何も起こらない）
das.update(16);                    // フレーム2
// ... 合計167ms経過するまで ...

// 167ms後（約10フレーム後）
das.update(20);                    // DAS発動！
// その後、33msごとにリピート
das.update(17);                    // まだ
das.update(17);                    // ARR!

console.log('=== Release key ===');
das.releaseKey();                  // リリースで停止
das.update(50);                    // 何も起こらない
```

出力結果を観察すると、DASディレイ（167ms）後に初めてリピートが始まり、その後はARR間隔（33ms）でリピートしているのがわかります。

---

これでテトリスの全モジュール解説が完了しました。次の 13〜14 では、これらのモジュールがどのように組み合わさって動くかを見ていきます。

**← 前のステップ：[11: Rendererモジュール](./11-renderer-module.md)**
**→ 次のステップ：[13: main.tsエントリポイント](./13-main-entry.md)**
