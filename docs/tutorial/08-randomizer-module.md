# 08: Randomizerモジュール — 7-bag ランダム生成

テトリスのピースは毎回ランダムに与えられます。しかし「完全にランダム」だと問題があります。`src/game/Randomizer.ts` の **7-bag ランダマイザ**がどのようにその問題を解決しているか見ていきましょう。

## ランダム生成の課題

「完全にランダム」なテトリスを想像してください。コインを投げるように、毎回7種類のピースから無作為に1つを選びます。

数学的には次のようなことが起こりえます。

- 同じピースが4回連続で出る確率: `(1/7)^4 ≈ 0.04%` — 1000ゲームに1回は起こる
- 特定のピースが20回中出现しない確率: `(6/7)^20 ≈ 4.5%` — かなりありえる
- Iピースだけが連続で出て、盤面に詰められない — **ゲームとして不快**

競技テトリスではこうした**運の偏り**を減らすために、**7-bag 方式**が標準として採用されています。

## 7-bag アルゴリズムの考え方

7-bag のルールは極めてシンプルです。

1. 7種類のピースを **bag（袋）** に入れる
2. bagの中身をよくシャッフルする
3. 先頭から順に1つずつ取り出して使う
4. bagが空になったら、また7種類を入れ直してシャッフル

この方式の数学的性質：**任意の連続する7個のピースに、全種類が必ず1回ずつ出現する**

```
Bag1: [T, S, I, J, O, L, Z]  ← これを順に使う
      ↓↓↓↓↓↓↓
Bag2: [J, I, Z, L, T, S, O]  ← 使い切ったら次の bag
      ↓↓↓↓↓↓↓
Bag3: [S, T, O, Z, I, J, L]  ← 以下繰り返し
      ↓↓↓↓↓↓↓
```

「Iピースが全然来ない！」「Zだけ3連続！」といった極端な偏りを防げます。

## Fisher-Yates シャッフル

シャッフルには **Fisher-Yates（フィッシャー–イェーツ）アルゴリズム** を使います。

```typescript
// src/game/Randomizer.ts（概念）
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]; // 元の配列をコピー（副作用防止）
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // 0〜i のランダムな整数
    [arr[i], arr[j]] = [arr[j], arr[i]]; // 交換
  }
  return arr;
}
```

アルゴリズムの動作です。

```
初期状態: [I, O, T, S, Z, J, L]
                     ↑ i=6: [0〜6]からランダム選んで交換
                     ↓
          [I, L, T, S, Z, J, O]  ← Oが末尾に移動
                  ↑ i=5: [0〜5]からランダム選んで交換
                  ↓
          [I, L, T, J, Z, S, O]  ← Sが位置5に移動
              ↑ i=4: ...
```

i が末尾から前に進むにつれて、**未処理の範囲**が狭まっていきます。ループが終わるころには完全に均等なランダム順列ができあがります。

**なぜこのアルゴリズムなのか？**

- **完全に均等**: すべての並び順が同じ確率で出現する（数学的に証明されている）
- **計算量 O(n)**: 配列の長さに比例するだけの時間で終わる
- **インプレース**: 追加の大きなメモリがいらない

`Math.floor(Math.random() * (i + 1))` は「0以上 i+1未満のランダムな整数」を得るイディオムです。

### 試してみよう

```typescript
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
console.log(shuffleArray(pieces));
// 実行するたびに違う結果になる
// 例: ['T', 'J', 'I', 'Z', 'O', 'L', 'S']
// 例: ['Z', 'I', 'L', 'T', 'S', 'J', 'O']
```

複数回実行して、毎回違う順番になることを確認してみてください。

## `createRandomizer()` — クロージャによる設計

```typescript
// src/game/Randomizer.ts（概念）
export function createRandomizer(): Randomizer {
  let bag: PieceType[] = [];
  let bagIndex = 0;

  function ensureBagHasPieces(): void {
    if (bagIndex >= bag.length) {
      bag = shuffleArray(ALL_PIECES); // 新しいbagをシャッフル
      bagIndex = 0;
    }
  }

  return {
    next(): PieceType {
      ensureBagHasPieces();
      return bag[bagIndex++];
    },
    peek(n: number): PieceType[] {
      ensureBagHasPieces();
      const result: PieceType[] = [];
      for (let i = 0; i < n; i++) {
        // bagの境界をまたぐ可能性がある
        const idx = bagIndex + i;
        if (idx >= bag.length) {
          // 次のbagからも取る必要がある...（実際はもっと複雑）
        }
        result.push(bag[idx]);
      }
      return result;
    },
    reset(): void {
      bag = [];
      bagIndex = 0;
    },
  };
}
```

### なぜクラスではなくクロージャ？

`createRandomizer()` はクラスを使わず、**関数の中で関数を返す**設計（クロージャ）を採用しています。

```typescript
// クラス版
class RandomizerClass {
  private bag: PieceType[] = [];
  private bagIndex: number = 0;
  next() { /* ... */ }
}

// クロージャ版（現在の設計）
function createRandomizer() {
  let bag: PieceType[] = [];        // プライベート変数
  let bagIndex = 0;
  return {
    next() { /* bag と bagIndex を使う */ },
    peek() { /* bag と bagIndex を使う */ },
  };
}
```

クロージャとは、**関数が定義されたときのスコープを「閉じ込めて（close over）」保持する**仕組みです。`next()` と `peek()` は `createRandomizer()` が終了した後も、`bag` と `bagIndex` にアクセスできます。

クラスでも同じことができますが、クロージャには利点があります。

| 観点 | クラス | クロージャ |
|---|---|---|
| 記述量 | 多い（class, constructor, this...） | 少ない |
| `this` の混乱 | `this.bag` と書く必要あり | なし（単なる変数） |
| プライベート | TypeScriptの `private` はコンパイル時のみ | 外部から完全にアクセス不可 |

「外部から完全にアクセス不可」は重要です。クラスの `private` はTypeScriptのコンパイル時にしか機能せず、実行時にはアクセスできます。クロージャの変数は実行時にも本当に隠蔽されます。

### `ensureBagHasPieces()` — 自動補充

`next()` や `peek()` を呼ぶ前に、必ず `ensureBagHasPieces()` を呼びます。この関数は「bagが空なら自動で補充する」役割を持ちます。

ガード条件 `if (bagIndex >= bag.length)` は、「現在のbagを使い切った or bagが未初期化」を検出します。

### `next()` — 次のピースを取得

```typescript
next(): PieceType {
  ensureBagHasPieces();
  return bag[bagIndex++];
}
```

処理の流れです。

1. bagにピースが残っていることを確認（なければシャッフルして補充）
2. `bag[bagIndex]` で現在のピースを取得
3. `bagIndex++` でインデックスを進める

`bag[bagIndex++]` は「その行の処理では `bag[bagIndex]` を使い、**その後で** `bagIndex` を1増やす」というJavaScriptの構文です。

### `peek(n)` — n個先を覗き見

```typescript
peek(n: number): PieceType[] {
  ensureBagHasPieces();
  const result: PieceType[] = [];
  for (let i = 0; i < n; i++) {
    const idx = bagIndex + i;
    if (idx >= bag.length) {
      // 次のbagの先頭から取る（簡略化）
      result.push(shuffleArray(ALL_PIECES)[idx - bag.length]);
    } else {
      result.push(bag[idx]);
    }
  }
  return result;
}
```

`peek()` は「次に何が出るか」を消費せずに知るためのメソッドです。画面の **Nextプレビュー**（次に来るピースを表示するUI）のために必要です。

実装が単純な `next()` より少し複雑なのは、**bagの境界をまたぐ可能性がある**からです。

```
例: bag = [T, S, I], bagIndex = 2
peek(3) を呼ぶと...
  idx=2: bag[2] = I        ← bagの最後
  idx=3: bagを超えた！次のbagの0番目
  idx=4: 次のbagの1番目
```

現在のbagに残りが少ないとき、`peek(n)` は次のbagからもピースを取ってくる必要があります。

## 設計判断の解説

### なぜ7-bagがテトリスの標準なのか？

| 方式 | 性質 | 問題点 |
|---|---|---|
| 完全ランダム | 偏りが発生する | ゲームとして不愉快 |
| 7-bag（標準） | 7個ごとに全種類保証 | パターンを読まれやすい（競技者は次のbagを予想できる） |
| 履歴ベース | 最近出たピースを避ける | 実装が複雑、メリットが薄い |

7-bagは「ランダム性」と「公平性」のバランスが良いため、Tetris Guideline（公式仕様）で標準として採用されています。競技テトリス（TETR.IO や Jstris など）も全て7-bagを使っています。

### ランダムシードについて

このRandomizerはシード値（乱数の初期値）を設定できません。つまり、ゲームを起動するたびに異なるランダム列が生成されます。

なぜシードを実装しないのか？ 通常のプレイではシード値が必要ありません。シード値が必要なのは以下です。

- **リプレイ機能**: 同じゲームを再現する
- **デバッグ**: 特定のピースパターンを再現する

今のプロジェクトではこれらの要件がないため、シードは未実装です。

### 試してみよう

```typescript
type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
type Randomizer = {
  next(): PieceType;
  peek(n: number): PieceType[];
};

const ALL_PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createRandomizer(): Randomizer {
  let bag: PieceType[] = [];
  let bagIndex = 0;

  function ensureBagHasPieces() {
    if (bagIndex >= bag.length) {
      bag = shuffleArray(ALL_PIECES);
      bagIndex = 0;
      console.log('新しいbag:', bag.join(','));
    }
  }

  return {
    next(): PieceType {
      ensureBagHasPieces();
      return bag[bagIndex++];
    },
    peek(n: number): PieceType[] {
      ensureBagHasPieces();
      return bag.slice(bagIndex, bagIndex + n);
    },
    reset() {
      bag = [];
      bagIndex = 0;
    },
  };
}

const r = createRandomizer();

// 14個取り出して、7個ごとに全種類あるか確認
for (let i = 0; i < 14; i++) {
  const p = r.next();
  process.stdout.write(p + ' ');
  if ((i + 1) % 7 === 0) console.log(' ← 7個目');
}
// 出力例:
// 新しいbag: J, L, Z, I, T, O, S
// J L Z I T O S  ← 7個目（全種類揃っている）
// 新しいbag: S, Z, T, J, L, O, I
// S Z T J L O I  ← 14個目（全種類揃っている）
```

実行するたびに bag の順番は変わりますが、**7個ごとに全種類が1回ずつ出現する** ことを確認してください。

---

これでテトリスの基本モジュール（型・盤面・ピース・ランダマイザ）の解説は完了です。ここから先は [`./09-config-module.md`](./09-config-module.md) で、設定ファイルの読み込みシステムを見ていきます。

**→ 次のステップ：[09: Configモジュール](./09-config-module.md)**
**← 前のステップ：[07: Pieceモジュール](./07-piece-module.md)**
