# テトリスの仕様 — このゲームが従うルール

## テトリスとは何か

テトリスは、1985年にソビエト連邦のプログラマ、アレクセイ・パジトノフが開発したパズルゲームです。上の方から落ちてくるブロック（テトリミノ）をうまく積み重ね、横1列を揃えて消すのが目的です。

今では「Tetris Guideline」という標準仕様があり、このプロジェクトもそれに従っています。

## このゲームが実装しているルール一覧

| # | ルール | 説明 |
|---|--------|------|
| 1 | 盤面 | 10列 × 22行（表示は20行） |
| 2 | 7種のテトリミノ | I/O/T/S/Z/J/L |
| 3 | SRS回転 | Super Rotation System |
| 4 | 壁蹴り | 回転時に壁を避ける |
| 5 | 7-bagランダム生成 | 公平な出現順序 |
| 6 | ゴーストピース | 落下予測位置の表示 |
| 7 | Hold機能 | ピースの一時保管 |
| 8 | スコアリング | Single/Double/Triple/Tetris |
| 9 | レベル進行 | 10ラインごとにレベルアップ |
| 10 | Lock Delay | 接地後の移動猶予 |
| 11 | DAS/ARR | キーリピート制御 |

それぞれ詳しく見ていきましょう。

---

## 1. 盤面: 10列 × 22行

テトリスの盤面は **10列 × 22行** のグリッド（格子）です。ただし、画面に表示されるのは **20行** だけで、上部の **2行は隠れています**。

```
行0 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   ← 隠れ領域（バッファ行）
行1 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   ← ピースの生成位置
行2 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   ← ここから表示される（画面上端）
行3 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  ...
行21 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ← 画面下端
```

**実際のコードから**（`src/game/Board.ts` 3-6行目）：

```typescript
export const COLS = 10;
export const ROWS = 22;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
```

**なぜ22行で20行表示なのか**：
Tetris Guidelineの仕様です。ピースは盤面の上部2行（バッファ行）で生成されます。これにより、ピースが突然画面に現れるのではなく、上から降りてくるように見えます。

バッファ行の役割：
- ピースの生成スペースを確保する
- ピースが画面上端から「にゅっと出てくる」表現を可能にする
- ゲームオーバー判定：バッファ行で新しいピースが生成できなければゲームオーバー

---

## 2. 7種のテトリミノ

テトリスには7種類の基本ブロック（テトリミノ）があります。それぞれアルファベットの形に似ていることから名前がついています。

| ピース | 名前 | 色 | 形 |
|--------|------|----|-----|
| I | アイ | シアン `#00f0f0` | ████ |
| O | オー | イエロー `#f0f000` | ██<br>██ |
| T | ティー | パープル `#a000f0` | █<br>███ |
| S | エス | グリーン `#00f000` | ██<br>██ |
| Z | ゼット | レッド `#f00000` | ██<br> ██ |
| J | ジェイ | ブルー `#0000f0` | █<br>███ |
| L | エル | オレンジ `#f0a000` |  █<br>███ |

**実際のコードから**（`src/game/Piece.ts` 195-203行目）：

```typescript
const COLORS: Record<PieceType, string> = {
  I: '#00f0f0',  // シアン
  O: '#f0f000',  // イエロー
  T: '#a000f0',  // パープル
  S: '#00f000',  // グリーン
  Z: '#f00000',  // レッド
  J: '#0000f0',  // ブルー
  L: '#f0a000',  // オレンジ
};
```

ピースの形状は `boolean[][]`（真偽値の2次元配列）で表現されています。`true` のセルがブロックのある場所です。

```typescript
// Tピースの回転0の形状
[
  [false, true, false],   //  █
  [true,  true, true],    // ██
  [false, false, false],  //
]
```

**Iピース（4x4）が特別な理由**：
Iピースだけは3x3ではなく4x4の配列を使います。これはSRS回転の仕様で、Iピースは他のピースと異なる回転軸と壁蹴りテーブルを持つためです。

---

## 3. 回転システム（SRS）

**SRS = Super Rotation System**。テトリス界の標準回転方式です。

### 4方向の回転状態

各ピースには4つの回転状態があります：

```
  0 (初期状態)    1 (右90度)     2 (180度)      3 (左90度)

  █               █               ██              █
 ███              ██               █             ██
                  █                              █
```

回転は右回転（時計回り）と左回転（反時計回り）の2種類があります。

**実際のコードから**（`src/game/Piece.ts` 351-358行目）：

```typescript
export function rotateCW(piece: Piece, board: BoardGrid): Piece | null {
  const newRotation = (piece.rotation + 1) % 4;  // 0→1→2→3→0
  return tryRotate(piece, newRotation, board);
}

export function rotateCCW(piece: Piece, board: BoardGrid): Piece | null {
  const newRotation = (piece.rotation + 3) % 4;  // 0→3→2→1→0（-1 mod 4）
  return tryRotate(piece, newRotation, board);
}
```

`rotation` プロパティは `0`, `1`, `2`, `3` のいずれかで、それぞれ回転状態を表します。`(rotation + 1) % 4` で「1つ進めて、4になったら0に戻る」というサイクリックな回転を実現しています。

---

## 4. 壁蹴り（Wall Kick）

回転しようとしたとき、ピースが壁や他のブロックに当たっていたらどうなるでしょうか。そのまま回転を拒否すると、特にIピースなどで回転できる場面が極端に減ってしまいます。

**壁蹴り** は「回転時に壁に当たったら、少し横や上にずらして配置する」という仕組みです。

**考え方**：
回転しようとしたとき、まず標準位置（ずらさない）で試します。ダメなら次のオフセット候補を試します。最大5パターンのオフセットを順に試し、どれか1つでも成功すれば回転成功です。

```
例：Jピースが左壁で回転する場合

元の状態（回転0）:
█
███

右回転しようとするが左壁に当たる → 壁蹴り！
→ 右に1つずらす

成功！
 ██
 █
 █
```

**実際のコードから**（`src/game/Piece.ts` 319-348行目）：

```typescript
function tryRotate(piece: Piece, newRotation: number, board: BoardGrid): Piece | null {
  const { type, position, rotation: oldRotation } = piece;
  const newShape = SHAPES[type][newRotation];
  const kicks = getKickTable(type);
  const key: KickKey = `${oldRotation}→${newRotation}`;
  const offsets = kicks[key];

  for (const offset of offsets) {
    const newPos = {
      x: position.x + offset.x,
      y: position.y - offset.y,  // SRS: y正=上, 盤面: y正=下
    };
    if (isValidPosition(newShape, newPos, board)) {
      return { type, shape: newShape, position: newPos, rotation: newRotation };
    }
  }
  return null; // すべてのオフセットで失敗 → 回転できない
}
```

**壁蹴りテーブル**は各回転遷移ごとに5パターンのオフセットを持っています：

```typescript
// JLSTZピース用の壁蹴りテーブル（0→1: 回転0から回転1へ）
const JLSTZ_KICKS = {
  '0→1': [
    { x: 0, y: 0 },   // 1. ずらさない（標準位置）
    { x: -1, y: 0 },  // 2. 左に1
    { x: -1, y: 1 },  // 3. 左に1、上に1
    { x: 0, y: -2 },  // 4. 下に2
    { x: -1, y: -2 }, // 5. 左に1、下に2
  ],
  // ... 全8遷移 × 5パターン
};
```

**SRS座標系の注意点**：
SRSの壁蹴りテーブルでは「Y軸の正の方向が上」ですが、盤面の配列では「Y軸の正の方向が下」です。そのため、コードでは `y: position.y - offset.y` と、オフセットのyを反転しています（335行目）。

**IピースとOピースの壁蹴り**：
Iピースは独自の壁蹴りテーブルを持ちます（形が4x4と大きいため）。Oピースは壁蹴りが一切なく（回転しても形が変わらないため）、オフセットは常に `{x:0, y:0}` です。

---

## 5. 7-bag ランダム生成

**7-bag** は「7種類のピースを1セット（bag）としてシャッフルし、順に出す」方式です。

**仕組み**：

```
Bag 1: [T, I, S, O, Z, J, L] ← シャッフル
        ↓
        ↓ 出す（キューに入れる）
        ↓
Bag 2: [L, O, I, Z, J, T, S] ← 使い切ったらまたシャッフル
```

**実際のコードから**（`src/game/Randomizer.ts` 15-27行目）：

```typescript
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function refillBag(): void {
  bag = shuffleArray(PIECES);  // 7種をシャッフル
  bagIndex = 0;
}
```

この「Fisher-Yatesシャッフル」というアルゴリズムは、配列を公平に（すべての順列が等確率で）シャッフルできます。

**なぜ7-bagが「公平」なのか**：

完全ランダム方式（毎回7種からランダムに選ぶ）の場合、例えば「Iピースが3回連続で出る」「Sピースが10回出ない」といった偏りが頻繁に発生します。7-bag方式では **7個の中に必ず全種類が1回ずつ含まれる** ため、極端な偏りが防げます。

| 方式 | 公平さ | 予測可能性 | 採用例 |
|------|--------|-----------|--------|
| 完全ランダム | 低い（偏りが発生） | 低い | 初期のテトリス |
| 7-bag | 高い（均等に出現） | 中程度 | 競技テトリス標準 |
| 履歴ベース | 高い | 高い | 一部のパズルゲーム |

---

## 6. ゴーストピース

ゴーストピースは、現在操作しているピースが「どこに落下するか」を予測して半透明で表示する機能です。プレイヤーの補助機能で、ゲームの難易度には影響しません。

**実際のコードから**（`src/game/Board.ts` 71-83行目）：

```typescript
export function getGhostPosition(
  shape: boolean[][],
  pos: Position,
  board: BoardGrid,
): Position {
  let ghostY = pos.y;
  while (isValidPosition(shape, { x: pos.x, y: ghostY + 1 }, board)) {
    ghostY++;
  }
  return { x: pos.x, y: ghostY };
}
```

**ゴースト位置の計算方法**：
1. 現在のピースの位置からスタート
2. 1つ下の位置が有効（衝突しない）間は下げ続ける
3. 衝突したらその1つ上の位置がゴースト位置

**なぜゴーストが必要か**：
特に初心者にとって、「今落下中のピースがどこに着地するか」を正確に予測するのは難しいものです。ゴーストピースがあると、着地位置が視覚的にわかるため、より戦略的にピースを配置できます。

---

## 7. Hold機能

Hold機能を使うと、現在操作しているピースを「預けて」、別のピースと入れ替えることができます。

**ルール**：
- 1ターンに1回だけ使用できる（`usedThisTurn` フラグで管理）
- すでにHoldしてあるピースと同じ種類は再度Holdできない
- Holdしたピースは、次にHoldを使ったときに出現する

**実際のコードから**（`src/game/Game.ts` 169-199行目）：

```typescript
hold(): void {
  if (!this.currentPiece || this.state !== 'playing') return;
  if (this.holdInfo.usedThisTurn) return;  // 1ターンに1回だけ

  const currentType = this.currentPiece.type;

  if (this.holdInfo.type === null) {
    // Holdが空 → 現在のピースを預けて、キューから次のピースを出す
    this.holdInfo.type = currentType;
    this.currentPiece = null;
    this.spawnPiece();
  } else {
    // Holdにピースがある → 入れ替え
    if (this.holdInfo.type === currentType) return; // 同じ種類は不可
    const heldType = this.holdInfo.type;
    this.holdInfo.type = currentType;
    // 預けていたピースを新しく生成して現在のピースにする
    const newPiece = createPiece(heldType);
    this.currentPiece = newPiece;
  }
  this.holdInfo.usedThisTurn = true;
}
```

**Hold機能がゲームに与える影響**：
- 戦略性の向上：「今はTピースはいらない。次のピースまで保持しておこう」
- 難易度の軽減：不都合なピースを一時的に回避できる
- 競技テトリスでは必須機能

---

## 8. スコアリング

ラインを消去するとスコアが加算されます。消したライン数と現在のレベルに応じてスコアが決まります。

| 消したライン数 | 名称 | 基本スコア | Level 1でのスコア |
|---------------|------|-----------|-------------------|
| 1 | Single | 100 | 100 × 1 = 100 |
| 2 | Double | 300 | 300 × 1 = 300 |
| 3 | Triple | 500 | 500 × 1 = 500 |
| 4 | Tetris | 800 | 800 × 1 = 800 |

**実際のコードから**（`src/game/Game.ts` 236-241行目）：

```typescript
if (linesCleared > 0) {
  const LINE_SCORES = [0, 100, 300, 500, 800];
  const baseScore = LINE_SCORES[linesCleared] ?? 800;
  this.scoreState.score += baseScore * this.scoreState.level;
  this.scoreState.lines += linesCleared;
  this.scoreState.level = Math.floor(this.scoreState.lines / 10) + 1;
}
```

**スコア計算式**：
```
得点 = 基本スコア × レベル
```

**なぜレベルを掛けるのか**：
レベルが上がるほど落下速度が速くなり、ゲームが難しくなります。同じライン数でも高レベルではより大きなスコアが得られるため、「難易度が高いほど報酬が大きい」というゲームデザインになっています。

**ソフトドロップとハードドロップのボーナス**：
- **ソフトドロップ**（↓キーで1行落とすごと）：+1点（Game.ts 118行目）
- **ハードドロップ**（Spaceで一気に落とす）：落とした行数 × 2点（Game.ts 134行目）

```typescript
// ソフトドロップ
softDrop(): boolean {
  if (!this.currentPiece || this.state !== 'playing') return false;
  const moved = this.tryMove(0, 1);
  if (moved) {
    this.scoreState.score += 1;  // 1行につき1点
    this.dropTimer = 0;
  }
  return moved;
}

// ハードドロップ
hardDrop(): void {
  if (!this.currentPiece || this.state !== 'playing') return;
  const ghost = getGhostPosition(...);
  const rowsDropped = ghost.y - this.currentPiece.position.y;
  this.scoreState.score += rowsDropped * 2;  // 1行につき2点
  // ...
}
```

---

## 9. レベル進行と落下速度

**レベルアップ条件**：10ライン消去するごとにレベルが上がる。

**実際のコードから**（`src/game/Game.ts` 241行目）：

```typescript
this.scoreState.level = Math.floor(this.scoreState.lines / 10) + 1;
```

`Math.floor(this.scoreState.lines / 10) + 1` の計算：
- 0ライン → `Math.floor(0 / 10) + 1 = 1`
- 9ライン → `Math.floor(9 / 10) + 1 = 1`
- 10ライン → `Math.floor(10 / 10) + 1 = 2`
- 24ライン → `Math.floor(24 / 10) + 1 = 3`

レベルが上がると、ピースの落下間隔が短くなります。

**実際のコードから**（`src/game/Game.ts` 6-9行目）：

```typescript
const DROP_INTERVALS: readonly number[] = [
  1000, 793, 618, 473, 355, 262, 190, 135, 94, 64,
  43, 43, 43, 28, 28, 28, 18,
];
```

| レベル | 落下間隔 |
|--------|---------|
| 1 | 1000ms（1秒に1マス） |
| 2 | 793ms |
| 3 | 618ms |
| 4 | 473ms |
| 5 | 355ms |
| 6 | 262ms |
| 7 | 190ms |
| 8 | 135ms |
| 9 | 94ms |
| 10 | 64ms |
| 11-13 | 43ms（約23マス/秒） |
| 14-16 | 28ms（約35マス/秒） |
| 17 | 18ms（約55マス/秒）→ 事実上不可能に近い速度 |

**なぜレベル15（実際には17）まで定義されているか**：
最大プレイ時間を見積もるためです。レベル17は18ms間隔、つまり1秒間に約55マス落下する速度です。これは人間には事実上対応不可能な速度で、上限として設定されています。

---

## 10. Lock Delay

Lock Delayは「ピースが地面や他のブロックに接触してから、実際に固定されるまでの猶予時間」です。

**ルール**：
- 猶予時間は **500ms**（0.5秒）
- その間にピースを移動または回転すると、タイマーがリセットされる（最大**15回**）
- 猶予時間が切れるか、リセット回数が上限に達するとピースが固定される

**実際のコードから**（`src/game/Game.ts` 97-102行目）：

```typescript
if (this.isLocking) {
  this.lockDelay += deltaTime;
  if (this.lockDelay >= LOCK_DELAY_MS) {
    this.lockCurrentPiece();
  }
}
```

**Lock Delayリセットの仕組み**（321-327行目）：

```typescript
private onPieceManipulated(): void {
  this.updateGhost();
  if (this.isLocking && this.lockMoves < LOCK_MOVES_MAX) {
    this.lockDelay = 0;   // タイマーリセット
    this.lockMoves++;     // リセット回数をカウント
  }
}
```

**なぜ Lock Delay が必要か**：
Lock Delayがない場合、ピースが何かに触れた瞬間に固定されてしまいます。これでは「着地直後に横に滑り込ませる」（ドロップ後即移動）という操作ができず、プレイヤーの操作性が大幅に低下します。

Lock Delayによって、プレイヤーは「着地した後に最終調整をする」という余裕を得られます。ただし、無制限に遅延できるとゲームが崩壊するため、最大15回のリセット制限が設けられています。

---

## 11. DAS/ARR

DAS（Delayed Auto Shift）とARR（Auto Repeat Rate）は、キーを押し続けたときの自動リピート制御です。

**DAS**: キーを押してから、自動リピートが始まるまでの遅延。デフォルト **167ms**。
**ARR**: リピート間隔。デフォルト **33ms**（約30回/秒）。

**実際のコードから**（`src/input/InputManager.ts` 61-79行目）：

```typescript
update(deltaTime: number): void {
  for (const [action, timer] of this.dasTimers) {
    timer.elapsed += deltaTime;

    if (!timer.dasDone) {
      // DASフェーズ：最初のリピートまで待つ
      if (timer.elapsed >= this.config.timing.dasDelay) {
        timer.dasDone = true;
        timer.elapsed -= this.config.timing.dasDelay;
        this.fireAction(action);
      }
    }

    // ARRフェーズ：一定間隔で繰り返す
    if (timer.dasDone && this.config.timing.arrDelay > 0) {
      while (timer.elapsed >= this.config.timing.arrDelay) {
        timer.elapsed -= this.config.timing.arrDelay;
        this.fireAction(action);
      }
    }
  }
}
```

**動作の流れ**：
```
キーを押す
  ↓ 0ms
最初のアクション（1回だけ）
  ↓ 167ms（DAS待機中）
DAS完了 → リピート開始
  ↓ 33ms
ARR発動（2回目のアクション）
  ↓ 33ms
ARR発動（3回目のアクション）
  ↓ 33ms
ARR発動（4回目のアクション）
...キーを離すまで続く
```

**なぜOSのキーリピートを使わないのか**：
WindowsやMacのキーリピート（キーボード設定で変更可能）に依存すると、プレイヤーごとに操作感が変わってしまいます。DAS/ARRをゲーム側で実装することで、すべての環境で一貫した操作感を提供できます。

また、DASとARRを個別に設定できるようにすることで、競技性の高いゲームでは必須の機能となっています。`public/config.toml` でこれらの値を変更できます。

---

## 12. ゲーム状態と遷移

ゲームは以下の4つの状態を持ちます：

```
    ┌──────┐
    │ idle │ ← 起動直後
    └──┬───┘
       │ Enterキー
       ↓
   ┌─────────┐
   │ playing │ ← ゲームプレイ中
   └──┬──┬──┘
      │  │  ───── Escape ────→ ┌────────┐
      │  └────────────────────→ │ paused │
      │     （ゲームオーバー）     └───┬────┘
      │                            │ Escape
      │                            ↓
      │                         ┌─────────┐
      └── Enter/Rキー ───────→  │ playing │（再開）
                                └─────────┘
   ┌──────────┐
   │ gameOver │ ← ピースが積み上がった
   └────┬─────┘
        │ Enterキー
        ↓
   ┌─────────┐
   │ playing │（最初から）
   └─────────┘
```

**実際のコードから**（`src/game/Game.ts` 202-208行目）：

```typescript
togglePause(): void {
  if (this.state === 'playing') {
    this.state = 'paused';
  } else if (this.state === 'paused') {
    this.state = 'playing';
  }
}
```

---

## 用語集

| 用語 | 説明 |
|------|------|
| テトリミノ (Tetrimino) | テトリスに登場するブロックのこと。7種類ある |
| グリッド (Grid) | 盤面を構成するマス目。10列×22行 |
| バッファ行 (Hidden Rows) | 画面に見えない上部2行。ピースの生成に使う |
| SRS (Super Rotation System) | テトリスの標準回転システム |
| 壁蹴り (Wall Kick) | 回転時に壁を避けるためのオフセット |
| 7-bag | 7種のピースを1セットとしてシャッフルする方式 |
| ゴーストピース (Ghost Piece) | 落下予測位置を表示する半透明のピース |
| Hold | 現在のピースを預けて別のピースを使う機能 |
| Single/Double/Triple/Tetris | 同時に消したライン数の呼び方 |
| Lock Delay | ピース接地後、固定されるまでの猶予時間 |
| DAS (Delayed Auto Shift) | キー押下から自動リピート開始までの遅延 |
| ARR (Auto Repeat Rate) | 自動リピートの間隔 |

## 自分で試してみよう

1. `npm run dev` でゲームを起動し、最初の画面（idle状態）を確認してください。Enterキーを押すとplaying状態に遷移します
2. 実際にプレイしてみて、ゴーストピースが表示されていることを確認してください。`public/config.toml` の `showGhost` を `false` に変更して再起動し、ゴーストがない状態も体験してください
3. レベルが上がると落下速度が速くなることを確認してください。何ライン消去するとレベルが上がるでしょうか？答えはコードに書いてあります
4. `public/config.toml` の `dasDelay` を `500` に変更してみてください。左右キーの操作感がどう変わるか体験してください

---

**→ 次のステップ：[05: 型定義ファイル](./05-types-definitions.md)**
**← 前のステップ：[03: プロジェクト構造を理解する](./03-project-structure.md)**
