# 09: Configモジュール — 設定ファイルの読み込みと活用

テトリスを遊ぶ人によって、操作感の好みは違います。キーの配置を変えたい、ブロックの大きさを調整したい、ゴーストを非表示にしたい。こうした要望に応えるのが `src/config/config.ts` の設定読み込みシステムです。

## 設定を外部ファイルにする理由

なぜ設定値をプログラムの中に直接（ハードコード）書かないのでしょうか。

```typescript
// ハードコード版（ダメな例）
const BLOCK_SIZE = 30;
const MOVE_LEFT_KEY = 'ArrowLeft';
```

これではキー配置を変えたくなったら、コードを直接書き換える必要があります。さらに、書き換えたコードを再ビルド（コンパイルし直す作業）しなければ反映されません。

外部設定ファイルには以下の利点があります。

- **ユーザーが自由に変更できる**: コードを触らずにテキストエディタで編集するだけ
- **コードを変更せずに挙動を変えられる**: 設定ファイルを差し替えるだけで動作が変わる
- **複数の設定を管理できる**: 後で「設定A」「設定B」のようなプリセットを持てる

### TOML形式を選んだ理由

設定ファイルの形式はいくつかあります。このプロジェクトでは **TOML**（TOML: Tom's Obvious, Minimal Language）を採用しています。

```toml
# public/config.toml（実際の設定ファイル）
[keys]
moveLeft = "ArrowLeft"
moveRight = "ArrowRight"

[timing]
dasDelay = 167
arrDelay = 33
```

TOMLの特徴は以下の通りです。

| 形式 | コメント | 構造化データ | 人間の読みやすさ |
|---|---|---|---|
| TOML（採用） | 書ける（`#`） | 優秀（セクション、テーブル） | とても読みやすい |
| JSON | 書けない | 優秀 | 括弧だらけで読みにくい |
| INI | 書ける（`;`） | 貧弱（ネストできない） | 読みやすいが表現力不足 |
| YAML | 書ける（`#`） | 優秀 | シンプルだがインデントに注意 |

コメントが書けることは案外重要です。「このキーは何の操作か」「この数値の意味は」を設定ファイル自体に書けるからです。

## デフォルト設定（DEFAULT_CONFIG）

```typescript
// src/config/config.ts（4-24行目）
const DEFAULT_CONFIG: GameConfig = {
  keys: {
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    softDrop: 'ArrowDown',
    hardDrop: 'Space',
    rotateCW: 'KeyX',
    rotateCCW: 'KeyZ',
    hold: 'ShiftLeft',
    pause: 'Escape',
    restart: 'KeyR',
  },
  timing: {
    dasDelay: 167,
    arrDelay: 33,
  },
  display: {
    blockSize: 30,
    showGhost: true,
  },
};
```

全設定項目にデフォルト値があります。なぜデフォルトが必要なのでしょうか。**設定ファイルが存在しない状態でもプログラムが動くようにするため**です。

各設定値の意味を確認しましょう。

| 設定項目 | デフォルト値 | 意味 |
|---|---|---|
| `keys.moveLeft` | `'ArrowLeft'` | 左移動に割り当てるキー |
| `keys.moveRight` | `'ArrowRight'` | 右移動に割り当てるキー |
| `keys.rotateCW` | `'KeyX'` | 右回転に割り当てるキー（CW = ClockWise = 時計回り） |
| `keys.rotateCCW` | `'KeyZ'` | 左回転に割り当てるキー（CCW = CounterClockWise = 反時計回り） |
| `keys.hold` | `'ShiftLeft'` | ホールドに割り当てるキー |
| `keys.pause` | `'Escape'` | ポーズに割り当てるキー |
| `keys.restart` | `'KeyR'` | リスタートに割り当てるキー |
| `timing.dasDelay` | `167` | DAS遅延（ミリ秒）。後述 |
| `timing.arrDelay` | `33` | ARR間隔（ミリ秒）。後述 |
| `display.blockSize` | `30` | 1ブロックのサイズ（ピクセル） |
| `display.showGhost` | `true` | ゴーストを表示するか |

## `loadConfig()` — 非同期読み込み

```typescript
// src/config/config.ts（35-72行目）
export async function loadConfig(): Promise<GameConfig> {
  try {
    const response = await fetch('/config.toml');
    if (!response.ok) {
      console.warn('Config not found, using defaults');
      return DEFAULT_CONFIG;
    }
    const text = await response.text();
    const parsed = parse(text) as any;

    const config: GameConfig = {
      keys: {
        moveLeft: parsed.keys?.moveLeft ?? DEFAULT_CONFIG.keys.moveLeft,
        moveRight: parsed.keys?.moveRight ?? DEFAULT_CONFIG.keys.moveRight,
        // ... 各フィールドを同様にマッピング
      },
      // ...
    };

    return config;
  } catch (e) {
    console.warn('Failed to load config, using defaults:', e);
    return DEFAULT_CONFIG;
  }
}
```

### `async function` と `await`

`async function` は「この関数は非同期処理（時間のかかる処理）を行う」という宣言です。

```typescript
// 非同期関数の例（概念）
async function getData() {
  const result = await fetch('/data.json');
  // await の間、プログラムは他の処理を続けられる
  return result;
}
```

`await` は「Promise（約束）が完了するのを待つ」ためのキーワードです。`fetch()` の戻り値はPromiseという「将来完了するかもしれない処理」を表すオブジェクトです。`await` をつけると、そのPromiseが完了するまで次の行に進みません。ただし、プログラム全体が止まるわけではなく、他のイベントは処理できます。

### `fetch()` でサーバーからファイル取得

`fetch('/config.toml')` はブラウザの標準機能で、サーバーにHTTPリクエスト（Web上でファイルを要求する仕組み）を送ります。ブラウザ上で動くJavaScriptがファイルを読む標準的な方法が `fetch` です。

なぜNode.jsの `fs.readFile()`（ファイル読み込み関数）を使わないのでしょうか。このゲームは**ブラウザで動く**からです。ブラウザのJavaScriptには `fs.readFile()` がありません。代わりに `fetch()` を使ってサーバーからファイルを取得します。

### エラーハンドリング — フォールトトレラント設計

`try...catch` ブロックで2種類のエラーを捕捉します。

1. **ファイルが見つからない**（`response.ok` が `false`）: `console.warn` で警告を出してデフォルト値を返す
2. **パースに失敗する**（`parse(text)` が例外を投げる）: `catch` で捕捉してデフォルト値を返す

```typescript
// エラー時の動作：すべてデフォルト値でフォールバック
console.warn('Config not found, using defaults');
return DEFAULT_CONFIG;
```

この設計を**フォールトトレラント設計**（fault-tolerant = 障害が起きても動き続ける）と呼びます。設定ファイルが壊れていても、プログラムがクラッシュすることはありません。「デフォルト値でとりあえず動く」という姿勢が重要です。

### `??`（null合体演算子）

```typescript
parsed.keys?.moveLeft ?? DEFAULT_CONFIG.keys.moveLeft
```

`??` は **null合体演算子**（nullish coalescing operator）です。左側の値が `null` または `undefined` の場合に限り、右側の値を使います。

```typescript
const a = null ?? 'default';     // 'default'
const b = undefined ?? 'default'; // 'default'
const c = '' ?? 'default';       // ''（空文字列はnull/undefinedではない）
const d = 0 ?? 'default';        // 0（0はnull/undefinedではない）
```

なぜ `||`（論理OR）ではだめなのでしょうか。

```typescript
// || の場合
const e = '' || 'default';   // 'default' ← 空文字列でも上書きされる！
const f = 0 || 100;          // 100 ← 0でも上書きされる！
```

`||` は「左側が **falsy（偽値）** なら右側を使う」という動作をします。falsyな値には `null`、`undefined`、`0`、`''`（空文字列）、`false` が含まれます。

でも、キー設定の空文字列や、数値の `0` は「有効な値」である可能性があります。`??` を使えば、本当に「値が設定されていない」ときだけデフォルトに頼れます。

### オプショナルチェイニング（`?.`）

`parsed.keys?.moveLeft` の `?.` は**オプショナルチェイニング**（optional chaining）です。`parsed.keys` が `null` や `undefined` のとき、エラーにせず `undefined` を返します。

```typescript
// オプショナルチェイニングがない場合
const k1 = parsed.keys.moveLeft;  // parsed.keys が null だとエラー！

// オプショナルチェイニングがある場合
const k2 = parsed.keys?.moveLeft; // null でも undefined になって止まる
```

設定ファイルの一部のセクションが欠けていても、プログラムがクラッシュしない仕組みです。

## 型安全な設定読み込み

`parse(text) as any` で一度 `any` 型（すべての型を許容する特殊な型）にキャストしています。

```typescript
const parsed = parse(text) as any;
```

なぜ `as any` を使うのでしょうか。`smol-toml`（TOMLパーサーのライブラリ）の `parse()` は汎用的な戻り値の型を持っています。TOMLはどんな構造でも書けるので、戻り値の型は `Record<string, unknown>`（キーが文字列、値が不明なオブジェクト）になります。

そのままでは `parsed.keys.moveLeft` の型が `unknown`（未知の型）になってしまい、TypeScriptの恩恵を受けられません。そこで `as any` で型チェックを一時的に緩め、そのあとで各フィールドを**個別にマッピング**して型の安全性を回復します。

```typescript
// 各フィールドを個別にマッピングすることで型安全を回復
const config: GameConfig = {
  keys: {
    moveLeft: parsed.keys?.moveLeft ?? DEFAULT_CONFIG.keys.moveLeft,
    // ↑ ここで string 型であることが保証される
  },
};
```

`GameConfig` 型（68-76行目、`src/types.ts` で定義）は各フィールドの型を厳密に定義しています。マッピングされた `config` はこの型に適合することが保証されます。

## `normalizeKey()` — キーコードの検証

```typescript
// src/config/config.ts（26-33行目）
export function normalizeKey(raw: string): string {
  if (raw.startsWith('Key')) return raw;      // KeyA-KeyZ
  if (raw.startsWith('Arrow')) return raw;     // ArrowLeft, ArrowRight...
  if (raw === 'Space') return raw;
  if (raw.startsWith('Digit')) return raw;     // Digit0-Digit9
  return raw;                                  // Escape, Enter...
}
```

この関数はキーコードが有効な形式かをチェックします。ブラウザのキーボードイベントでは、キーを識別する方法として `e.code`（物理的なキー位置）と `e.key`（入力される文字）の2種類があります。`e.code` の値は `KeyA`、`ArrowLeft`、`Space` のような形式で決まっています。

この関数は一見「何もしていない」ように見えます。引数を検証して、不正な値は弾くのではなく、そのまま通しています。これは **「どんな値が来ても安全に扱う」** という設計思想の現れです。

## 設計判断の解説

### なぜ設定を非同期で読み込むのか

`loadConfig()` が `async function` である理由は、`fetch()` が非同期API（非同期的に動作する仕組み）だからです。

ファイル読み込みは、ネットワーク経由でもローカルでも「待ち時間」が発生します。同期的（同期的 = 完了するまで待つ）に処理すると、その間プログラム全体が固まってしまいます。非同期にすることで、設定を読み込みながら他の初期化処理を進められます。

```typescript
// main.ts での使われ方（概念）
const config = await loadConfig();  // 設定を読み込みつつ
const game = new Game(config);     // Gameの構築も進められる
```

### なぜデフォルト値を別オブジェクトに分けるのか

`DEFAULT_CONFIG` が独立した定数である理由は2つあります。

1. **テスト容易性**: 「デフォルト値が正しいか」を独立してテストできる
2. **明確なfallback**: 「何か問題があったらこれに戻る」という安全網が明確になる

```typescript
// DEFAULT_CONFIG があれば、こんなテストが書ける
// test('デフォルト設定でblockSizeは30', () => {
//   expect(DEFAULT_CONFIG.display.blockSize).toBe(30);
// });
```

### なぜ `export { DEFAULT_CONFIG }` もしているのか

`loadConfig()` を使わずに直接デフォルト設定を参照したいケースがあります。たとえば設定画面のプレビューや、テストコードです。デフォルト値をエクスポート（外部から使えるように公開すること）することで、そうした用途にも柔軟に対応できます。

## 試してみよう

ブラウザの開発者ツール（F12キーで開く）で `fetch` と `??` の動作を試してみましょう。

```typescript
// 開発者ツールのコンソールで実行

// ?? の動作確認
const value1 = null ?? 'fallback';
console.log(value1); // "fallback"

const value2 = 0 ?? 'fallback';
console.log(value2); // 0（null/undefined以外はそのまま）

// fetch の動作確認
async function testFetch() {
  const response = await fetch('/config.toml');
  const text = await response.text();
  console.log('設定ファイルの内容:');
  console.log(text);
}

testFetch();
// 出力例:
// [keys]
// moveLeft = "ArrowLeft"
// moveRight = "ArrowRight"
// ...
```

また、ブラウザでゲームを起動した状態で `public/config.toml` を編集して、設定が反映されることを確認してみてください。

```toml
# config.toml の blockSize を変更
[display]
blockSize = 40  # ブロックを大きくする
```

設定ファイルを編集して保存した後、ゲームをリロード（F5）するとブロックサイズが変わっているはずです。

---

**→ 次のステップ：[10: Gameモジュール](./10-game-engine.md)**
**← 前のステップ：[08: Randomizerモジュール](./08-randomizer-module.md)**
