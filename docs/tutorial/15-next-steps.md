# 15: 発展課題 — ここから先に進むために

このチュートリアルで、あなたは実際のテトリスコードを通じてTypeScriptとプログラム設計を学びました。この章では学んだことをさらに発展させる方法を紹介します。

## この教材で学んだことのまとめ

まずは、これまでに学んだ知識を整理しましょう。

| トピック | 該当ファイル | 核となる考え方 |
|----------|-------------|---------------|
| TypeScriptの型 | [02: TypeScript基礎](./02-typescript-basics.md) | 型でバグを防ぐ。実行前にエラーを発見 |
| モジュール分割 | [03: プロジェクト構造](./03-project-structure.md) | 大きなプログラムは小さなファイルに分割する |
| テトリスのルール | [04: テトリス仕様](./04-tetris-spec.md) | 実装すべきルールを明確にする |
| 型定義の一元管理 | [05: 型定義ファイル](./05-types-definitions.md) | 全モジュールが共通の型を参照する |
| 盤面管理 | [06: Boardモジュール](./06-board-module.md) | 関数群で状態を持たない設計 |
| ピースと回転 | [07: Pieceモジュール](./07-piece-module.md) | SRS回転と壁蹴りテーブル |
| ランダム生成 | [08: Randomizerモジュール](./08-randomizer-module.md) | 7-bagアルゴリズムで公平性を担保 |
| 設定管理 | [09: Configモジュール](./09-config-module.md) | 外部ファイルで設定を分離 |
| ゲームエンジン | [10: Gameモジュール](./10-game-engine.md) | 状態管理とルール、Lock Delay |
| 描画 | [11: Rendererモジュール](./11-renderer-module.md) | Canvas、3Dセル、関心の分離 |
| 入力処理 | [12: InputManagerモジュール](./12-input-module.md) | DAS/ARR、コールバック |
| エントリポイント | [13: main.ts](./13-main-entry.md) | モジュールの配線、ゲームループ |
| 全体連携 | [14: 全体の組み立て](./14-assembly.md) | 依存関係、SOLID原則 |

そして何より、この教材全体を通じて一貫していた考え方があります。

- **関心の分離**: 1つのモジュールは1つのことだけをする
- **依存関係の方向**: 「依存される側」は「依存する側」を知らない
- **型による契約**: 型定義でモジュール間のインターフェースを明確にする

これらの考え方はテトリスに限らず、あらゆるプログラムの設計で役立ちます。

## 発展課題（難易度順）

ここからは、実際にコードを改造して学びを深める課題を紹介します。**コードを読むだけでは身につきません。手を動かすことではじめて理解が深まります。**

各課題には「どこを変更するか」のヒントも付けています。まずは自分で考えてみてから、ヒントを見てください。

### 1. ハイスコアのローカル保存（簡単）

**目標**: ゲームオーバー時にスコアをブラウザに保存し、次回起動時に表示する。

**学べること**: ブラウザのストレージAPI、JSONシリアライズ（データを文字列に変換すること）

**改造のヒント**:
```
改造箇所: src/game/Game.ts（gameOver 処理の周辺）
使うAPI: localStorage.setItem(), localStorage.getItem()

1. gameOver 時に、現在のスコアを localStorage に保存する
2. Game のコンストラクタまたは start() で localStorage からハイスコアを読み込む
3. types.ts の ScoreState に highScore フィールドを追加する
4. Renderer でハイスコアを表示する
```

```typescript
// ヒントコード（Game.tsのgameOver処理に追加）
// localStorage に保存
const highScore = localStorage.getItem('tetris-high-score');
const currentScore = this.scoreState.score;
if (highScore === null || currentScore > Number(highScore)) {
  localStorage.setItem('tetris-high-score', String(currentScore));
}
```

**考えてみよう**:
- localStorage に保存できるのは文字列だけ。数値やオブジェクトを保存するにはどうすればいいか？
- ハイスコアだけでなく、過去10回分のスコア履歴を保存するには？

### 2. BGM・効果音の追加（中級）

**目標**: ピース固定、ライン消去、ゲームオーバー時に効果音を鳴らす。

**学べること**: Web Audio API、音声ファイルの管理、非同期読み込み

**改造のヒント**:
```
改造箇所: src/game/Game.ts（効果音を鳴らすタイミング）
新規ファイル: src/audio/AudioManager.ts

設計の考え方:
- AudioManager を新しいモジュールとして追加する
- Game は AudioManager を知らない（関心の分離を守る）
- main.ts で Game のイベント（ライン消去など）を監視して AudioManager を呼ぶ
```

```typescript
// ヒントコード（簡易版: Game のメソッド内で直接音を鳴らす）
private playSe(name: string): void {
  const audioCtx = new AudioContext();
  const osc = audioCtx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = name === 'clear' ? 800 : 200;
  osc.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

// ライン消去時に呼ぶ
private clearLines(): void {
  // ...消去処理...
  this.playSe('clear');  // 効果音
}
```

**考えてみよう**:
- 効果音を Game クラスに直接書くと、どんな問題が起きるか？（ヒント: テスト、差し替え）
- 本格的にやるなら AudioManager を分離したほうがいい。なぜか？

### 3. タッチ操作対応（中級）

**目標**: スマホやタブレットのタッチパネルで遊べるようにする。スワイプ・フリック・タップによる直感的な操作を実現する。

**学べること**: タッチイベント（`touchstart`/`touchend`）、スワイプとフリックの判定、マルチタッチ、モバイルブラウザの制御

#### 操作設計

キーボードと違い、タッチには「押しっぱなし」の概念がない。以下のような操作体系を最初に決める必要がある。

```
┌─────────────────┐
│  左タップ: 左移動    │
│  右タップ: 右移動    │
│  下スワイプ: ソフトドロップ  │
│  下フリック: ハードドロップ  │
│  中央タップ: 右回転    │
│  上スワイプ: 左回転    │
│  長押し: Hold      │
└─────────────────┘
```

**タップ / スワイプ / フリックの違い:**
- **タップ**: 指を置いてすぐ離す。移動距離が小さい。クリック相当
- **スワイプ**: 指をなぞって離す。**移動距離**で判定
- **フリック**: 指を勢いよくはじいて離す。**移動速度**で判定

テトリスでは「下になぞる → ソフトドロップ」「下にはじく → ハードドロップ」と割り当てると直感的。

#### 実装上の注意点

| 問題 | 対策 |
|------|------|
| **DAS/ARR がタッチに使えない** | キーボードの「押しっぱなし連続移動」はタッチに存在しない。タップ連打またはタッチ用の独自リピート処理を実装する |
| **ブラウザのデフォルト動作が邪魔** | `touch-action: none` をCSSに設定 + `e.preventDefault()` でスクロール・ピンチズーム・プルリフレッシュを全て潰す |
| **マルチタッチの競合** | 2本指で同時操作するケース（左移動しながら回転など）を考慮する。`touches` 配列で複数指を管理 |
| **スワイプとフリックの誤判定** | 「ゆっくり降ろす」と「一気に落とす」の境界が曖昧。`touchend` 時の移動速度（`距離 / 時間`）で閾値を設定し、実機で調整する |
| **タッチ領域が狭い** | 盤面の左右余白もタップ領域にする。盤面上のタップは回転、盤面外の左右は移動、と領域を分ける |
| **触覚フィードバックがない** | 押したつもりが押せてない事故が起きやすい。視覚的フィードバック（タップ時に一瞬光るなど）を入れると改善する |
| **テストが困難** | エミュレータではタッチ速度や同時押しが再現できない。実機必須 |

#### 改造のヒント

```
改造箇所: src/input/InputManager.ts
新規ファイル: src/input/TouchHandler.ts（タッチ処理を分離）

1. TouchHandler を新規作成し、タッチイベントのハンドラを追加
2. スワイプの方向と距離、フリックの速度を検出
3. 対応する GameAction に変換して fireAction
4. InputManager に TouchHandler を統合。キーボードとタッチの両対応にする
```

```typescript
// ヒントコード（TouchHandler の骨組み）
class TouchHandler {
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private fireAction: (action: GameAction) => void;

  constructor(canvas: HTMLCanvasElement, fireAction: (a: GameAction) => void) {
    this.fireAction = fireAction;
    canvas.addEventListener('touchstart', e => this.onStart(e), { passive: false });
    canvas.addEventListener('touchend', e => this.onEnd(e), { passive: false });
  }

  private onStart(e: TouchEvent): void {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.startTime = Date.now();
    e.preventDefault();
  }

  private onEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.startX;
    const dy = e.changedTouches[0].clientY - this.startY;
    const dt = Date.now() - this.startTime;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      // タップ: 左右領域で移動、中央で回転
      const canvasWidth = (e.target as HTMLElement).getBoundingClientRect().width;
      if (e.changedTouches[0].clientX < canvasWidth * 0.3) {
        this.fireAction('moveLeft');
      } else if (e.changedTouches[0].clientX > canvasWidth * 0.7) {
        this.fireAction('moveRight');
      } else {
        this.fireAction('rotateCW');
      }
    } else if (Math.abs(dx) > Math.abs(dy)) {
      // 横スワイプ: 移動
      this.fireAction(dx > 0 ? 'moveRight' : 'moveLeft');
    } else {
      // 縦: 速度でスワイプ/フリック判定
      const speed = dist / dt;  // px/ms
      if (dy > 0 && speed > 0.5) {
        this.fireAction('hardDrop');  // 下フリック
      } else if (dy > 0) {
        this.fireAction('softDrop');  // 下スワイプ
      } else {
        this.fireAction('rotateCCW'); // 上スワイプ
      }
    }
    e.preventDefault();
  }
}
```

**考えてみよう**:
- タップ・スワイプ・フリックの閾値（`dist < 10`、`speed > 0.5`）はどう決めるべきか？実機で調整する前提で考える
- マルチタッチで同時操作（左へ移動しながらソフトドロップ）は可能か？`touches` 配列をどう使う？
- Hold は長押し（`setTimeout` 500ms）と2本指タップのどちらが使いやすいか？
- 盤面サイズが小さいスマホで、タップ領域（左30% / 中央40% / 右30%）は十分か？

### 4. アニメーション演出（中級）

**目標**: ライン消去時の点滅アニメーションを追加する。消去されるラインが白く光ってから消える。

**学べること**: アニメーションの状態管理、時間経過による描画変化、Rendererにおける状態の追加

**改造のヒント**:
```
改造箇所: src/renderer/Renderer.ts、src/game/Game.ts

1. Renderer に「消去アニメーション中」の状態を追加
2. Game がライン消去を検出したら、Renderer にアニメーション開始を通知
3. 一定時間（300ms）、該当行を点滅表示
4. アニメーション終了後に実際にラインを消去
```

```typescript
// ヒントコード（Renderer に追加するアニメーション状態）
private clearingRows: number[] = [];
private clearAnimTimer: number = 0;

startClearAnimation(rows: number[]): void {
  this.clearingRows = rows;
  this.clearAnimTimer = 0;
}

// render() 内で呼ぶ
private updateClearAnimation(deltaTime: number): void {
  if (this.clearingRows.length === 0) return;
  this.clearAnimTimer += deltaTime;

  // 100msごとに点滅
  const flash = Math.floor(this.clearAnimTimer / 100) % 2 === 0;
  // flash が true のときだけ白く描画、false のときは通常描画
}
```

**考えてみよう**:
- アニメーション中はゲームの進行を止めるべきか、止めないべきか？
- アニメーションが終わる前に次のライン消去が起きたらどうする？

### 5. リプレイ機能（難しい）

**目標**: プレイヤーの操作をすべて記録し、後で同じゲームを再現できるようにする。

**学べること**: イベントログ、タイムベースの再生、シリアライズ

**改造のヒント**:
```
新規ファイル: src/replay/ReplayRecorder.ts（記録用）
            src/replay/ReplayPlayer.ts（再生用）

設計の考え方:
- 全入力をタイムスタンプ付きで配列に保存
- 再生時は同じタイミングで入力を再現
- Randomizer のシード値を記録しておけば、同じピース順を再現できる
```

```typescript
// ヒントコード（記録の骨組み）
interface ReplayFrame {
  timestamp: number; // ゲーム開始からのms
  action: GameAction;
}

class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private startTime: number = 0;

  start(): void {
    this.frames = [];
    this.startTime = Date.now();
  }

  record(action: GameAction): void {
    this.frames.push({
      timestamp: Date.now() - this.startTime,
      action,
    });
  }

  export(): string {
    return JSON.stringify(this.frames);  // JSON文字列に変換
  }
}
```

**考えてみよう**:
- Randomizer の再現性をどう保証するか？（ヒント: 乱数生成器のシード固定）
- リプレイデータのサイズを小さくする工夫は？（ヒント: 差分記録）

### 6. マルチプレイヤー対戦（非常に難しい）

**目標**: WebSocket を使って2人のプレイヤーがリアルタイムで対戦できるようにする。相手にラインを送る「攻撃」も実装する。

**学べること**: リアルタイム通信、サーバーサイドプログラミング、非同期処理、競合状態

**改造のヒント**:
```
新規ファイル: server/ (Node.js サーバー)
            src/network/NetworkManager.ts (クライアント側)
必要な知識: WebSocket、Node.js、サーバーの基礎
```

この課題は非常に難しいので、まずは以下の段階に分けて取り組むことをおすすめします。

```
段階1: ローカルで2P対戦（1つのキーボードを2人で共有）
段階2: 同じ画面で2人同時プレイ（画面分割）
段階3: ネットワーク対戦（別々のPCで）
```

**考えてみよう**:
- 通信遅延（レイテンシ）をどう扱うか？
- 一方のプレイヤーが切断したときの処理は？
- 相手に送る「お邪魔ライン」の実装は？

### 7. AIプレイヤー（挑戦）

**目標**: コンピュータにテトリスを自動でプレイさせる。

**学べること**: 探索アルゴリズム、評価関数、シミュレーション

**改造のヒント**:
```
新規ファイル: src/ai/AIPlayer.ts

設計の考え方:
- AI は InputManager と同じインターフェースを持つ
- Game のコピー（シミュレーション用）を作って全パターンを試す
- 評価関数で「最も良い配置」を選ぶ
```

```typescript
// ヒントコード（AIの骨組み）
class AIPlayer {
  evaluate(board: BoardGrid, piece: Piece): number {
    // 評価項目（すべて低いほど良い）
    let score = 0;
    score += this.countHoles(board) * 100;       // 穴の数
    score += this.maxHeight(board) * 10;          // 最大高さ
    score += this.bumpiness(board) * 5;           // 凹凸
    score += this.completeLines(board) * -1000;   // 消せるライン（ボーナス）
    return score;
  }

  // 全配置をシミュレーションして最小スコアを選ぶ
  getBestMove(board: BoardGrid, piece: Piece, ghost: Position): GameAction[] {
    // 全ての回転と位置を試す
    // 評価関数でベストを選ぶ
    // その位置に到達するための操作手順を返す
    return [];
  }
}
```

**考えてみよう**:
- 評価関数の各項目の重み（係数）はどう決めるか？
- 現在のピースだけでなく、次のピースも考慮すべきか？
- 「このAI、人間より強い」をどう定義するか？

## 次の学習リソース

この教材を終えた後に役立つリソースを紹介します。

### TypeScript を深める

| リソース | 説明 | おすすめ度 |
|----------|------|-----------|
| [TypeScript公式ハンドブック](https://www.typescriptlang.org/docs/handbook/) | 日本語あり。型システムを体系的に学べる | ★★★★★ |
| [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/) | 無料のオンライン書籍。実践的 | ★★★★☆ |
| [型システム入門 プログラミング言語と型の理論](https://www.ohmsha.co.jp/book/9784274069116/) | 書籍。より理論的に学びたい人向け | ★★★☆☆ |

### Vite / フロントエンド

| リソース | 説明 |
|----------|------|
| [Vite公式ドキュメント](https://vitejs.dev/) | ビルドツールの理解を深める |
| [MDN Canvas API](https://developer.mozilla.org/ja/docs/Web/API/Canvas_API) | Canvas の全機能を網羅 |
| [MDN WebSocket API](https://developer.mozilla.org/ja/docs/Web/API/WebSocket) | リアルタイム通信に挑戦するときに |

### ゲームプログラミング

| リソース | 説明 |
|----------|------|
| [Game Programming Patterns](https://gameprogrammingpatterns.com/) | ゲームに特化した設計パターン集。無料で読める |
| 日本語訳「ゲームプログラミングパターン」 | 書籍。日本語でじっくり読みたい人向け |

### 設計・アーキテクチャ

| リソース | 説明 |
|----------|------|
| [Clean Architecture](https://www.oreilly.co.jp/books/9784915512548/) | ロバート・C・マーティンによる設計原則の古典 |
| [リーダブルコード](https://www.oreilly.co.jp/books/9784873119313/) | 読みやすいコードの書き方。まずはこれ |
| [SOLID原則の解説](https://www.youtube.com/results?search_query=SOLID+principles+typescript) | 動画で学びたい人向け |

## この教材で学んだ考え方を他のプロジェクトで活かす

テトリスという1つのゲームを通じて学んだ設計の考え方は、他のあらゆるプログラムに応用できます。

### ファイル分割の基準

```
「このファイルの責務は何か？」と自問する
→ 1行で答えられないなら、分割を検討する
```

**例**:
- 「盤面の衝突判定をする」 → Board モジュール（OK）
- 「ゲームのルールと描画と入力処理をする」 → 分割すべき

### 依存関係の方向

```
「AがBを知っている」の矢印が循環していないか確認する
→ 循環していたら、共通の型定義ファイルを間に置く
```

**テトリスでの実践**: Renderer が Game を知っていると循環は起きないが、Game も Renderer を知らないようにした（一方向の依存）。これにより「描画の変更がゲームロジックに影響しない」状態を実現した。

### 型の活用

```
「変更に強いコード ＝ 型で守られたコード」
実行時エラーをコンパイル時（書いている最中）に発見する
```

**テトリスでの実践**: `Piece` インターフェースを types.ts で定義し、Game と Renderer の両方がこれを参照する。`piece.type` に `'INVALID'` という値を入れようとしても、TypeScript がコンパイルエラーにしてくれる。

### 関心の分離

```
「どこまでがロジックで、どこからが表示か？」
常にこの線引きを意識する
```

**テトリスでの実践**:
- Game: 「ラインが消えたらスコアを加算する」という**ルール**
- Renderer: 「スコアが増えたら画面の数字を書き換える」という**表示**

ルールと表示が混ざると、「スコア表示を見やすくするためにフォントサイズを変えたら、スコア計算のロジックが動かなくなった」という事故が起きます。

## おわりに

ここまで読んでくれたあなたは、**「なんとなく書ける」から「なぜそう書くか説明できる」** への一歩を踏み出しました。

この教材の目的は「テトリスが作れるようになること」ではなく、「プログラムの設計を考えられるようになること」です。テトリスという具体的な題材を通じて、皆さんに伝えたかったのは以下の3つです。

1. **分割して統治せよ**: 大きな問題は小さく分割し、それぞれを独立したモジュールとして実装する
2. **依存関係をコントロールせよ**: 誰が誰を知っているかを常に意識する
3. **型を味方につけよ**: コンパイラにバグを発見させ、実行時エラーを減らす

最後に、プログラミングの上達に王道はありません。しかし近道はあります。

**コードを読む → 改造する → 壊す → 直す**

このサイクルを高速に回すことです。エラーを恐れないでください。エラーはあなたの理解が深まるサインです。

改造に挑戦するときは、以下の心構えを持ってください。

- 「動かなくなったらどうしよう」より「どう直せば動くようになるか」を考えよう
- 1度にたくさん変えようとしない。1行変えては動かす
- Git を使っているなら、こまめにコミットしよう。「ここまでは動いていた」というセーブポイントを作る
- わからなくなったら、このチュートリアルファイルを読み返そう。各モジュールの役割と設計判断が書いてある

この教材をきっかけに、あなたが自分自身のプロジェクトを作り出すことを願っています。

**→ [00: はじめに](./00-introduction.md)（もう一度最初から読み直す）**
**← 前のステップ：[14: 全体の組み立て](./14-assembly.md)**
