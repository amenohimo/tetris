# 07: Pieceモジュール — テトリミノの定義と回転

テトリスは7種類のブロックのかたまり「**テトリミノ**（tetromino）」で遊びます。このファイルでは、`src/game/Piece.ts` がどのようにテトリミノを定義し、回転を実現しているかを解説します。

## テトリミノとは？

テトリミノは4つの正方形（ミノ）がつながったブロックです。7種類それぞれに固有の形と色があり、回転によって形が変わります。

| 種類 | 形 | 色 |
|---|---|---|
| I | 一直線 | 水色 |
| O | 正方形 | 黄色 |
| T | T字型 | 紫 |
| S | S字型 | 緑 |
| Z | Z字型 | 赤 |
| J | J字型 | 青 |
| L | L字型 | オレンジ |

## SHAPES — 全ピース全回転状態の定義

```typescript
// src/game/Piece.ts（概念）
const SHAPES: Record<PieceType, boolean[][][]> = {
  T: [
    // 回転0
    [[false, true, false],
     [true,  true, true],
     [false, false, false]],
    // 回転1
    [[false, true, false],
     [false, true, true],
     [false, true, false]],
    // 回転2
    [[false, false, false],
     [true,  true, true],
     [false, true, false]],
    // 回転3
    [[false, true, false],
     [true,  true, false],
     [false, true, false]],
  ],
  // I, O, S, Z, J, L も同様に定義...
};
```

`Record<PieceType, boolean[][][]>` の意味を分解しましょう。

- `Record<K, V>`: キーがK型、値がV型のオブジェクト
- `PieceType`: キーは7種類のピース名
- `boolean[][][]`: 値は**3次元配列**

`boolean[][][]` はちょっと怖そうです。「3次元配列」と聞くと難しそうですが、中身はこうです。

```
SHAPES[ピースの種類]  →  4つの回転状態（boolean[][][] の外側）
SHAPES[T][0]         →  回転0の形（boolean[][] = 2次元のグリッド）
SHAPES[T][0][1]      →  回転0の2行目（boolean[] = 3要素）
SHAPES[T][0][1][2]   →  回転0の2行目3列目（boolean = false）
```

つまり「7種類 × 4回転状態 × グリッド」のデータ構造です。

**なぜ boolean[][] を使うのか？** ブロックがあるかないかだけを表現します。色情報は含みません。色は `piece.type` から `COLORS` 定数で引けるので、shapeは形だけに集中できます。

### なぜ回転状態を事前計算して持つのか？

「回転って計算式で求められないの？」と思うかもしれません。数学的には行列の回転計算で求められますが、このプロジェクトでは**事前計算した定数配列**を持っています。

理由は2つです。

1. **高速**: 計算式で毎回求めるより、配列を引くだけの方が速い
2. **エッジケースがない**: 行列計算だと浮動小数点の誤差や、グリッドサイズが3×3と4×4で混在する場合の複雑な処理が必要。定数ならそういう心配がない

### ピースごとのグリッドサイズ

ほとんどのピースは**3×3**のグリッドで表現されます。しかしIピースだけは**4×4**です。

理由は**SRS（Super Rotation System）** というテトリス公式の回転システムにあります。Iピースは他のピースと比べて細長い特殊な形なので、回転軸の位置が3×3だと中心からずれてしまいます。4×4にすることで、回転中心がグリッドの中央に来て、自然に回転できるようになります。

```
Tピース（3×3）:       Iピース（4×4）:
[ ][■][ ]            [ ][ ][ ][ ]
[■][■][■]           [■][■][■][■]
[ ][ ][ ]            [ ][ ][ ][ ]
                     [ ][ ][ ][ ]
```

## COLORS — 色定義

```typescript
// src/game/Piece.ts（概念）
const COLORS: Record<PieceType, string> = {
  I: '#00f0f0',  // 水色
  O: '#f0f000',  // 黄色
  T: '#a000f0',  // 紫
  S: '#00f000',  // 緑
  Z: '#f00000',  // 赤
  J: '#0000f0',  // 青
  L: '#f0a000',  // オレンジ
};
```

色は16進数カラーコード（`#RRGGBB`）で定義されています。Renderer（描画モジュール）が `COLORS[piece.type]` で色を取得します。色の選択基準は伝統的なテトリスカラーに準拠しています。

なぜPieceモジュールに色を定義するのか？ PieceType に対して「色」という属性を対応付けるのは自然だからです。Rendererが直接PieceTypeから色を引けるので、色の管理が1箇所で完結します。

## SRS壁蹴りテーブル

### 壁蹴りの概念

テトリスでピースを回転するとき、回転後の形が壁にぶつかることがあります。このとき、少し横にずらしてから置くことで回転を成功させる仕組みが**壁蹴り（wall kick）** です。

```
回転前             回転後に壁に当たる → 左にずらして解決
┌───┬───┬───┐      ┌───┬───┬───┐        ┌───┬───┬───┐
│   │ ■ │   │      │   │ ■ │   │        │ ■ │   │   │
├───┼───┼───┤      ├───┼───┼───┤  壁    ├───┼───┼───┤
│ ■ │ ■ │ ■ │  →  │   │ ■ │ ■ │  →    │ ■ │ ■ │   │
├───┼───┼───┤      ├───┼───┼───┤        ├───┼───┼───┤
│   │   │   │      │   │ ■ │   │        │ ■ │   │   │
└───┴───┴───┘      └───┴───┴───┘        └───┴───┴───┘
                   ↑ 壁にめり込んでる    ↑ 左に1マスずらした
```

壁蹴りテーブルには、回転の「元の状態→新しい状態」ごとに、5パターンのずらし量（オフセット）が定義されています。

### テンプレートリテラル型

```typescript
// src/game/Piece.ts（概念）
type KickKey = `${number}→${number}`;
// 例: '0→1'（回転0から回転1へ）, '2→3'（回転2から回転3へ）
```

これはTypeScriptの**テンプレートリテラル型**です。値そのものが型になる高度な機能で、「0→1」のような文字列リテラルのパターンを定義しています。

### 3種類の壁蹴りテーブル

Piece.ts には3つの壁蹴りテーブルがあります。

```typescript
const JLSTZ_KICKS: Record<KickKey, Position[]>;  // J, L, S, T, Z 用
const I_KICKS: Record<KickKey, Position[]>;       // I 用
const O_KICKS: Record<KickKey, Position[]>;       // O 用（空っぽ）
```

**なぜIピースは別テーブル？** Iピースは4×4と特別なサイズなので、壁蹴りの挙動も他のピースと異なります。I_KICKSはJLSTZ_KICKSとは別のオフセット値が定義されています。

**なぜOピースは壁蹴り不要？** Oピースは正方形です。どの回転状態でも形が変わりません。壁蹴りする必要がなく、O_KICKSは空っぽです。それでも定義しているのは、すべてのピースを同じコードで処理するための一貫性のためです。

### 壁蹴りテーブルの数値の意味

```typescript
// 例：'0→1'（回転0→回転1）の壁蹴りオフセット（概念）
const JLSTZ_KICKS = {
  '0→1': [
    { x: -1, y: 0 },   // 1: 左に1マス
    { x: -1, y: -1 },  // 2: 左に1、上に1（SRS座標系）
    { x: 0, y: 2 },    // 3: （ずらさず）下に2（？）
    { x: -1, y: 2 },   // 4: 左に1、下に2
  ],
  // ...
};
```

壁蹴りテーブルの `{ x, y }` は **SRS座標系**で書かれています。SRS座標系では **y正 = 上** です。

しかし、ゲームの盤面座標系では **y正 = 下** です（06で学びました）。そこで `tryRotate()` 関数の中で符号を反転しています。

```typescript
// Piece.ts tryRotate() 内（概念）
// SRSテーブルの y を反転させてから適用
const offset: Position = { x: kick.x, y: -kick.y };
```

`-kick.y` とすることで「SRSで上に1」→「ゲームで上に1（yを-1）」になります。

### 5パターンの意味

壁蹴りは最大5パターンのオフセット（ずらし位置）を「順番に」試して、最初に成功したものを採用します。1つめは「ずらさない（{x:0, y:0}）」であることが多く、これは単純に「壁に当たらないならそのまま回転できる」という意味です。JLSTZ用・I用・O用で3種類のテーブルを使い分けます。

## `createPiece()` — ファクトリ関数

```typescript
// src/game/Piece.ts（概念）
export function createPiece(type: PieceType): Piece {
  return {
    type: type,
    shape: SHAPES[type][0],         // 回転0の状態で生成
    position: { ...SPAWN_POSITIONS[type] }, // 種類ごとの出現位置
    rotation: 0,
  };
}
```

この関数は**ファクトリパターン**と呼ばれるデザインです。新しいオブジェクトの生成を1つの関数に集約します。

- `SHAPES[type][0]`: 回転0の状態の形を取得
- `SPAWN_POSITIONS`: ピース種類ごとに異なる出現位置

Iピースだけは特殊で、`SPAWN_POSITIONS[type]` の y が -1 になっています。これはIピースが盤面の**隠れ領域**から出現するためです（Iピースは4×4と大きいので、より上の方から出てこないと不自然）。

### 試してみよう

```typescript
type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
type Piece = {
  type: PieceType;
  shape: boolean[][];
  rotation: number;
};

// SHAPESの一部だけ簡略再現
const SHAPES: Record<string, boolean[][][]> = {
  T: [
    [[false, true, false],
     [true,  true, true],
     [false, false, false]],
  ],
};

function createPiece(type: PieceType): Piece {
  return {
    type,
    shape: SHAPES[type][0],
    rotation: 0,
  };
}

const tPiece = createPiece('T');
console.log(tPiece.type);    // "T"
console.log(tPiece.shape[1]); // [true, true, true]（2行目 = Tの横棒）
```

## `rotateCW()` / `rotateCCW()` — 時計回りと反時計回り

```typescript
// src/game/Piece.ts（概念）
export function rotateCW(piece: Piece, board: BoardGrid): Piece | null {
  const newRotation = (piece.rotation + 1) % 4;   // 回転値を1増やす
  return tryRotate(piece, newRotation, board);
}

export function rotateCCW(piece: Piece, board: BoardGrid): Piece | null {
  const newRotation = (piece.rotation + 3) % 4;   // 回転値を「実質的に」1減らす
  return tryRotate(piece, newRotation, board);
}
```

回転の方向は剰余演算（%）で決まります。

- 時計回り（CW）: `(rotation + 1) % 4` → 0→1→2→3→0→1...
- 反時計回り（CCW）: `(rotation + 3) % 4` → なぜ+3？ → `(3 + 3) % 4 = 2` つまり `-1` と同じ効果。`-1 % 4` は言語によって負の値になるので、`+3 % 4` で必ず正の値にする安全な書き方です。

### 試してみよう

```typescript
// 回転の方向をシミュレート
function nextRotationCW(current: number): number {
  return (current + 1) % 4;
}
function nextRotationCCW(current: number): number {
  return (current + 3) % 4;
}

console.log(nextRotationCW(0));   // 1
console.log(nextRotationCW(3));   // 0（一周）
console.log(nextRotationCCW(0));  // 3
console.log(nextRotationCCW(1));  // 0
```

## `tryRotate()` — 回転の核心

```typescript
// src/game/Piece.ts（概念）
function tryRotate(piece: Piece, newRotation: number, board: BoardGrid): Piece | null {
  const kicks = getKicks(piece.type, piece.rotation, newRotation);

  for (const kick of kicks) {
    const newPos: Position = {
      x: piece.position.x + kick.x,
      y: piece.position.y - kick.y,  // SRS座標→ゲーム座標に変換
    };

    if (isValidPosition(SHAPES[piece.type][newRotation], newPos, board)) {
      return {
        ...piece,
        shape: SHAPES[piece.type][newRotation],
        position: newPos,
        rotation: newRotation,
      };
    }
  }

  return null; // どのオフセットも使えなかった = 回転できない
}
```

処理の流れです。

1. `getKicks()` で、現在の回転状態 → 新しい回転状態の壁蹴りテーブルを取得
2. 5パターンのオフセットを**順番に**試す
3. 各オフセットで `isValidPosition()` を呼び、その位置で回転後の形が置けるか判定
4. 成功したら、新しい位置と回転状態で Piece を生成して返す
5. 全部失敗したら `null` を返す

**なぜ null を返すのか？**

回転できない場合、呼び出し元（Gameクラス）が「回転は失敗した」と判断する必要があります。回転できないときに元の Piece をそのまま返してしまうと、「回転したけど何も変わらなかった」のか「回転に失敗した」のか区別がつきません。`null` で失敗を明確に伝えます。

```typescript
// Gameクラス内の使われ方（概念）
const rotated = rotateCW(piece, board);
if (rotated !== null) {
  piece = rotated; // 回転成功
} else {
  // 何もしない（回転できなかったことを無視）
}
```

## 設計判断のまとめ

Pieceモジュールの設計には、以下の判断が隠れています。

| 判断 | 理由 |
|---|---|
| 回転状態を事前計算で持つ | 計算式より高速でエッジケースがない |
| Oピースにも4回転状態を定義 | 全ピースを同じコードで処理できる |
| 壁蹴りテーブルを3種類に分ける | ピースの形状の違いに対応 |
| SRS座標→ゲーム座標の変換を内部で行う | テーブルはSRS仕様のまま使える |
| 失敗時にnullを返す | 回転の成否を呼び出し元に伝える |

---

ここまでで、テトリスの基本部品（型・盤面・ピース）が揃いました。次は[`./08-randomizer-module.md`](./08-randomizer-module.md)で、ピースをランダムに生成する仕組みを学びます。

**→ 次のステップ：[08: Randomizerモジュール](./08-randomizer-module.md)**
**← 前のステップ：[06: Boardモジュール](./06-board-module.md)**
