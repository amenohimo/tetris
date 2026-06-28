# 13: main.ts — すべてを結びつけるエントリポイント

これまで各モジュール（Board, Piece, Game, Renderer, InputManager）を個別に見てきました。このファイルはそれらを**配線**し、プログラムを起動する役割を担います。たった89行ですが、プログラム全体の骨格です。

## エントリポイントとは

**エントリポイント**（entry point = 入り口）とは、プログラムの起動時に最初に実行されるファイルのことです。

```json
// package.json（抜粋）
{
  "type": "module",              // "モダンなimport/exportを使います"という宣言
  "scripts": {
    "dev": "vite"                // Viteが起動し、index.html → main.ts を読み込む
  }
}
```

`package.json` の `"type": "module"` は「このプロジェクトではES Modules（`import`/`export` 構文）を使う」という宣言です。これがないと `import` 文が使えません。

```html
<!-- index.html（抜粋、概念） -->
<script type="module" src="/src/main.ts"></script>
```

ブラウザがこのHTMLを読み込むと、`src/main.ts` をエントリポイントとして実行を開始します。`script` タグに `type="module"` と書くことで、ブラウザに「これはモジュールとして読み込め」と指示しています。

## `import` 文の解説

```typescript
// src/main.ts（1-4行目）
import { Game } from './game/Game';
import { Renderer } from './renderer/Renderer';
import { InputManager } from './input/InputManager';
import { loadConfig } from './config/config';
```

4つの `import` 文は、このプログラムが使うモジュールを宣言しています。

- `{ Game }` — Gameクラス（`./game/Game` から）
- `{ Renderer }` — Rendererクラス（`./renderer/Renderer` から）
- `{ InputManager }` — InputManagerクラス（`./input/InputManager` から）
- `{ loadConfig }` — 設定読み込み関数（`./config/config` から）

### パスの書き方：相対パス

`./game/Game` の `./` は「同じディレクトリ」を意味します。`src/main.ts` から見て `src/game/Game.ts` というファイルを指しています。

| パス | 意味 | 解決先 |
|------|------|--------|
| `./game/Game` | 同じ階層の game/Game | `src/game/Game.ts` |
| `../renderer/Renderer` | 1つ上の階層の renderer/Renderer | （今回は使っていない） |

### なぜ `.ts` を書かないのか

`import { Game } from './game/Game'` と書きますが、実際のファイルは `Game.ts` です。Viteが自動で拡張子を解決してくれるので、`.ts` は不要です。Viteに限らず、TypeScriptの開発環境では拡張子を省略するのが一般的です。

## `async function main(): Promise<void>`

```typescript
// src/main.ts（6行目）
async function main(): Promise<void> {
```

**async**（非同期）と **await**（待機）は「時間のかかる処理を待ってから次に進む」ための仕組みです。

```typescript
// await がないとどうなるか（概念）
function badExample() {
  const config = loadConfig();  // loadConfigは時間がかかる（ファイル読み込み）
  // config にはまだ値が入っていない！
  const game = new Game(config); // config が undefined でエラー
}

// await があると正しく動く
async function goodExample() {
  const config = await loadConfig(); // 読み込みが完了するまで待つ
  const game = new Game(config);     // 安全に使える
}
```

`loadConfig()` は `public/config.toml` というファイルを読み込みます。ファイルの読み込みは一瞬で終わるとは限らず、待つ必要があります。`await` は「この処理が終わるまで次の行に進むな」という命令です。

`Promise<void>` は「この関数は戻り値はないけど（void = 空）、非同期で動きます」という型注釈です。async関数は常に **Promise**（約束 = 未来に結果が届くことを表す入れ物）を返すというルールがあります。

## モジュールの初期化順序

```typescript
// src/main.ts（7-14行目）
const config = await loadConfig();          // 1. 設定を読み込む
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement; // 2. HTML要素取得
if (!canvas) throw new Error('...');        // 3. エラーチェック
const game = new Game(config);              // 4. Game生成
const renderer = new Renderer(canvas, config); // 5. Renderer生成
const input = new InputManager(config);     // 6. InputManager生成
```

この順序には理由があります。**依存関係の解決**です。

```
config  ───┬──→ Game
           ├──→ Renderer  ───→ canvas
           └──→ InputManager
```

- `config` は Game, Renderer, InputManager の3つすべてに必要 → **最初に読み込む**
- `canvas` は Renderer に必要 → config の次に取得
- Game, Renderer, InputManager は互いに依存していない → どの順番でもいい

このように「依存されているものから先に作る」のが原則です。`config` は3つのモジュールに依存されているので最優先です。これを誤ると `undefined` エラーになります。

### `as HTMLCanvasElement` の意味

`document.getElementById('game-canvas')` が返す型は `HTMLElement | null` です。しかし実際にはこの要素は `<canvas>` タグなので、`HTMLCanvasElement` というより具体的な型に変換（キャスト）しています。`as` キーワードは「型を上書きする」ためのTypeScriptの構文です。

## コールバックの登録 — `input.on('moveLeft', () => game.moveLeft())`

```typescript
// src/main.ts（17-25行目）
input.on('moveLeft', () => game.moveLeft());
input.on('moveRight', () => game.moveRight());
input.on('softDrop', () => game.softDrop());
// ... 全9アクション
```

`input.on(アクション名, コールバック)` は「このアクションが発生したら、この関数を実行してね」とInputManagerに登録する処理です。

### コールバックとは

**コールバック**（callback = 後で呼ばれる関数）とは、関数を変数のように他の関数に渡すテクニックです。

```typescript
// コールバックの考え方（概念）
function 登録する(アクション, 後で実行する関数) {
  // この関数は「後で実行する関数」を覚えておく
  // ユーザーがキーを押したタイミングで呼び出す
}

// 実際の使い方
input.on('moveLeft',  後で実行する関数);  // 登録するだけ。まだ実行しない
// 後でユーザーが ← キーを押した → 登録した関数が実行される
```

### なぜアロー関数 `() => game.moveLeft()` なのか

```typescript
// なぜこう書かないのか？
input.on('moveLeft', game.moveLeft);  // 間違いではないが、危険
```

これには JavaScript の `this` の仕組みが関係します。

```typescript
// this の問題（概念）
class Game {
  private score = 0;
  
  moveLeft(): void {
    console.log(this.score); // this は Game のインスタンスを指すはず
  }
}

const game = new Game();
const fn = game.moveLeft;  // 関数だけを取り出す
fn(); // → this が undefined になる！（あるいは window を指す）
```

メソッドを「関数単体」として取り出すと、`this` の参照が失われます。`this` は「メソッドの呼び出し方」で決まるからです。

```
game.moveLeft()     // → this は game （正しい）
const fn = game.moveLeft; fn()  // → this は undefined （壊れる）
```

**アロー関数 `() => game.moveLeft()` はこの問題を解決します**。アロー関数は自分自身の `this` を持たず、外側のスコープ（この場合は main 関数）の `this` をそのまま使います。そのため「どのインスタンスのメソッドを呼ぶか」を固定できます。

```typescript
// アロー関数なら安全
input.on('moveLeft', () => game.moveLeft());
// このアロー関数は game という変数を覚えている（クロージャ）
// どのタイミングで呼ばれても、game.moveLeft() は正しく動く
```

この `game` への参照を覚えておく仕組みを**クロージャ**（closure = 閉包）と呼びます。アロー関数は定義された時点の変数を「閉じ込めて」保持します。

## ゲームループと requestAnimationFrame

```typescript
// src/main.ts（52-73行目）
let lastTime = performance.now();

function gameLoop(currentTime: number): void {
  const deltaTime = Math.min(currentTime - lastTime, 100);
  lastTime = currentTime;

  input.update(deltaTime);  // DAS/ARRの更新
  game.update(deltaTime);   // 重力、ロック遅延の更新
  renderer.render({...});   // 新しい状態を描画

  requestAnimationFrame(gameLoop);  // 次のフレームを要求
}
```

**ゲームループ**（game loop = ゲームの繰り返し処理）は、ゲームを動かし続けるための無限ループです。

1. 入力処理（DAS/ARRのタイマー更新）
2. ゲーム状態の更新（重力で落下、ロックタイマー）
3. 描画（新しい状態を画面に反映）
4. 次のフレームを要求 → 1に戻る

このループは1秒間に約60回実行されます（60fps）。

### なぜ `requestAnimationFrame` なのか

`requestAnimationFrame`（RFA）は「ブラウザが画面を描画する直前に、この関数を実行して」と予約するAPIです。

| 方法 | 問題点 |
|------|--------|
| `setInterval(gameLoop, 16)` | ブラウザの描画とズレる。タブを隠しても動き続ける |
| `requestAnimationFrame(gameLoop)` | ブラウザの描画と同期。タブを隠すと自動停止 |

`setInterval`（一定間隔で実行）は一見便利ですが、以下の問題があります。

- ブラウザが描画の準備ができる前に実行される → 無駄な処理
- タブをバックグラウンドにしても動き続ける → CPUとバッテリーの無駄
- フレームレートが変動する環境で不自然な挙動

`requestAnimationFrame` はこれらの問題を解決します。ブラウザが「さあ描画するぞ」というタイミングで呼ばれるため、無駄がありません。

### `deltaTime` の計算とキャップ

```typescript
const deltaTime = Math.min(currentTime - lastTime, 100);
```

`deltaTime`（デルタタイム = 差分時間）は「前回のフレームから何ミリ秒経過したか」を表します。

```
フレーム1: currentTime = 0ms    → deltaTime = 0
フレーム2: currentTime = 16.7ms → deltaTime = 16.7
フレーム3: currentTime = 33.4ms → deltaTime = 16.7
```

なぜ deltaTime が必要なのでしょうか。**フレームレートの変動に強いゲームを作るため**です。

```typescript
// deltaTime を使わない悪い例
function badUpdate() {
  this.dropTimer += 1;  // 毎フレーム1ずつ増やす
  // 60fps → 1秒間に60回増える
  // 30fps → 1秒間に30回しか増えない！
  // → フレームレートが変わるとゲーム速度が変わる
}

// deltaTime を使う良い例
function goodUpdate(deltaTime: number) {
  this.dropTimer += deltaTime;  // 経過時間（ms）を加算
  // 60fps → 1フレームで+16.7ms、1秒で+1000ms
  // 30fps → 1フレームで+33.3ms、1秒で+1000ms（同じ！）
  // → フレームレートに関係なくゲーム速度が一定
}
```

`deltaTime` を使えば、フレームレートが変動してもゲームの進行速度は同じになります。

### なぜ100msの上限（キャップ）をかけるのか

タブを長い間バックグラウンドにした後で戻すと、次のフレームとの時間差が数秒になることがあります。

```typescript
// タブを10秒間バックグラウンドにしていた場合
const deltaTime = 10000;  // 10秒分！
// → ゲームが10秒分一気に進行して即ゲームオーバー
```

`Math.min(deltaTime, 100)` は「deltaTime が最大でも100msを超えないようにする」という処置です。これで「タブを戻したときにゲームが暴走する」のを防ぎます。

## 初期描画とゲーム開始の流れ

```typescript
// src/main.ts（27-43行目）
// Enterでゲーム開始（idle画面用）
const handleIdleStart = (e: KeyboardEvent) => {
  if (e.code === 'Enter' && game.state === 'idle') {
    game.start();
    input.attach();  // キー入力の受付を開始
    window.removeEventListener('keydown', handleIdleStart); // 自分自身を削除
  }
};
window.addEventListener('keydown', handleIdleStart);

// Enterでリスタート（gameOver用）
const handleGameOverRestart = (e: KeyboardEvent) => {
  if (e.code === 'Enter' && game.state === 'gameOver') {
    game.restart();
  }
};
window.addEventListener('keydown', handleGameOverRestart);
```

### なぜ2つのハンドラに分けるのか

idle（アイドル = 待機中）用と gameOver（ゲームオーバー）用で別々のハンドラ（イベント処理関数）を用意しているのは、挙動を変えたいからです。

| 状態 | Enterを押したときの挙動 | ハンドラの寿命 |
|------|------------------------|----------------|
| idle | `game.start()` + `input.attach()` | 1回使ったら削除 |
| gameOver | `game.restart()` | 永続（ゲーム中も有効） |

idle用ハンドラは `removeEventListener` で自分自身を削除しています。なぜなら、idle状態は起動時の1回だけだからです。使い終わったイベントリスナーを残しておくと、無駄な処理が発生します。

一方、gameOver用ハンドラは削除しません。ゲームオーバーになるたびに何度でも使う可能性があるからです。

この「1回だけ実行したら消える」パターンは、初期化処理でよく使われます。

### `input.attach()` のタイミング

`input.attach()` は「キーボード入力の受付を開始する」メソッドです（[12: InputManagerモジュール](./12-input-module.md)参照）。

なぜゲーム開始時に `attach()` を呼ぶのでしょうか。idle画面ではユーザーが誤ってキーを押しても反応してほしくないからです。「ゲーム中だけキー入力を受け付ける」ために、`attach()` / `detach()` で入力のオンオフを切り替えています。

## `main().catch(console.error)` — エラーハンドリング

```typescript
// src/main.ts（89行目）
main().catch(console.error);
```

`main()` は `async function` なので、戻り値は `Promise<void>` です。async関数の中でエラーが発生しても、自動的には捕捉されません。

```typescript
// async関数のエラーは自動捕捉されない（概念）
async function main() {
  throw new Error('何かが壊れた');
}

main(); // エラーが発生したけど、誰も捕捉していない
// → コンソールに何も表示されず、エラーが握りつぶされる
```

`.catch(console.error)` は「もしエラーが発生したら、コンソールに表示して」という意味です。

```typescript
// 以下の2つは同じ意味
main().catch(console.error);
main().catch((error) => console.error(error));
```

`console.error` をそのまま渡せるのは、関数を値として渡しているからです。この書き方もコールバックの一種です。

## 設計判断：なぜ main.ts は薄いのか

main.ts は89行と短いですが、それは**意図的**です。main.ts の役割は「配線」だけだからです。

```
main.ts の役割:
  1. モジュールを import する
  2. インスタンスを生成する
  3. コールバックで接続する
  4. ゲームループを開始する
```

ゲームの複雑なロジック（スコア計算、衝突判定、重力制御）はすべて Game モジュールにあります。描画の細かい処理は Renderer にあります。main.ts はそれらを「つなぐ」だけです。

この設計の利点は**交換可能性**です。

```typescript
// 仮にWebGLレンダラーに変えたい場合
// main.ts の変更箇所:
const renderer = new WebGLRenderer(canvas, config);  // ここだけ変える
// → Game.ts は一切変更不要！
```

Game は Renderer のことを知りません。Renderer も Game のことを知りません。main.ts だけが両方を知っています。この「中央で配線する」構造が、モジュール間の独立性を高めています。

### import 文の順序にも理由がある

```typescript
// src/main.ts（1-4行目）
import { Game } from './game/Game';          // 自作モジュール
import { Renderer } from './renderer/Renderer';
import { InputManager } from './input/InputManager';
import { loadConfig } from './config/config';
```

このプロジェクトでは外部ライブラリ（smol-toml）のimportは `config.ts` の中に隠れています。もし外部ライブラリを直接使う場合は、自作モジュールより先に書くのが慣例です。

```typescript
// 一般的なimport文の順序
import { someLibrary } from 'some-library';  // 1. 外部ライブラリ（npm）
import { MyClass } from './my/MyClass';      // 2. 自作モジュール（相対パス）
```

この順序には「依存関係の明確化」という意味があります。外部ライブラリと自作モジュールを分けることで、「何がこのプロジェクト固有で、何が外部から来ているか」が一目でわかります。

## 試してみよう

ブラウザの開発者ツールで `requestAnimationFrame` の動作を確認してみましょう。

```typescript
// 開発者ツールのコンソールで実行
let frameCount = 0;
const startTime = performance.now();

function countFrames(timestamp: number) {
  frameCount++;
  const elapsed = timestamp - startTime;
  
  if (elapsed < 1000) { // 1秒間だけ測定
    requestAnimationFrame(countFrames);
  } else {
    console.log(`1秒間のフレーム数: ${frameCount}`);
    console.log(`平均fps: ${(frameCount / (elapsed / 1000)).toFixed(1)}`);
  }
}

requestAnimationFrame(countFrames);
```

通常は60fps前後になるはずです。タブをバックグラウンドにすると自動的に停止することも確認してみてください。

deltaTime の重要性を実感する実験もできます。

```typescript
// 2つのカウンターを比較
let badCounter = 0;
let goodCounter = 0;
let lastTime2 = performance.now();

function compareLoop(currentTime: number) {
  const dt = currentTime - lastTime2;
  lastTime2 = currentTime;

  badCounter++;        // フレームレートに依存
  goodCounter += dt;   // 実際の時間に依存

  console.log(
    `bad: ${badCounter} (フレーム数に比例), ` +
    `good: ${(goodCounter / 1000).toFixed(2)}秒 (実時間に比例)`
  );

  if (currentTime - startTime < 2000) {
    requestAnimationFrame(compareLoop);
  }
}

requestAnimationFrame(compareLoop);
```

`badCounter` は60fps環境と30fps環境で値が変わりますが、`goodCounter` はどちらでも約2.0秒になります。これが deltaTime を使う理由です。

---

**→ 次のステップ：[14: 全体の組み立て](./14-assembly.md)**
**← 前のステップ：[12: InputManagerモジュール](./12-input-module.md)**
