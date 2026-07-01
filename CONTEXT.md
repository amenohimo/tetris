# CONTEXT

## Touch Zone Layout

タッチ操作用の画面ゾーン分け。盤面を基準に全ゾーンを定義する。

```
┌────┬──────────────────┬────┐
│HOLD│                  │NEXT│
│    │                  │    │
│    │  ソフトドロップ    │    │
│    │  (盤面 上20行)    │    │
│SCOR│                  │    │
│E   ├──────────────────┤    │
│LEVE│ ハードドロップ     │    │
│L   │ (盤面 下2行)      │    │
│LINE├──────────────────┤    │
│S   │ ハードドロップ     │    │
│    │ (ゲーム枠外の下部)  │    │
└────┴──────────────────┴────┘
```

- **ソフトドロップ**: 盤面の上20行。縦ドラッグで `touchmove` の移動量に応じて softDrop 発火
- **ハードドロップ**: 盤面の下2行＋ゲーム枠外の下部領域。タップで hardDrop 発火
- **左回転 / 右回転**: HOLD・NEXTパネルを含む盤面外の左右列全体
- **Hold**: 左パネルのHOLD表示エリアをタップ

## Touch State Machine

タッチ操作の状態遷移。playing 中のみゾーン分けを適用し、それ以外は全画面タップで状態遷移する。

「画面どこタップ」はキャンバス全体の任意の位置を1回タップする操作を指す。

| 状態 | 画面どこタップ | 右上タップ | 右上ダブルタップ | ゾーン別操作（playing時のみ） |
|------|-------------|-----------|----------------|---------------------------|
| idle | Start | Start | — | — |
| playing | — | Pause | — | ソフト/ハード/回転/Hold |
| paused | Resume | Resume | Restart | — |
| gameOver | Restart | Restart | — | — |

- **idle / gameOver**: 全画面どこをタップしても Start / Restart。ゾーン分け不要
- **playing**: ゾーン分けによる精密操作。右上タップのみ Pause
- **paused**: 全画面タップで即 Resume（とにかく戻りたい）。右上ダブルタップのみ Restart（破壊的操作は意図的に限定）

### 初回チュートリアル表示

初回起動時（idle → playing への初回遷移時）、以下のチュートリアルを3秒間表示する。localStorage にフラグを保存し、2回目以降は表示しない。

| 表示位置 | 内容 | 表現 |
|---------|------|------|
| 右上（NEXTパネル上部） | Pause / Restart | 点線枠で囲み「Tap to Pause」「Double-tap to Restart」と表示 |
| 左パネル（HOLD表示エリア） | Hold | 点線枠で囲み「Tap to Hold」と表示 |

以降は全表示を消し、視覚的ノイズゼロでプレイできる。

## Architecture Decision

タッチ処理は `src/input/TouchHandler.ts` に分離する。`InputManager.fireAction()` を `public` に変更し、TouchHandler から共有する。

キーボード・タッチ・コントローラー（将来）の3入力源はすべて `fireAction(action)` → Game への同一経路を使う。

## Display Layout

- HOLD: 左上
- SCORE, LEVEL, LINES: HOLDの下（左側）
- Pause/Restart: 右上オーバーレイ（キャンバス右上、パネルと独立）
- NEXT: 右上（Pause/Restartの下）
- Board: 中央（変更なし）
