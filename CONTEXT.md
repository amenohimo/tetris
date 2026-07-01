# CONTEXT

## Touch Zone Layout

タッチ操作用の画面ゾーン分け。盤面を基準に全ゾーンを定義する。

```
┌────┬──────────────────┬────┐
│HOLD│                  │⏸ ↺│  Pause/Restart
│    │                  ├────┤
│    │  ソフトドロップ    │NEXT│
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
- **Pause / Restart**: 右上の専用ゾーン（NEXTの上）。playing → pause、paused/gameOver → restart

## Architecture Decision

タッチ処理は `src/input/TouchHandler.ts` に分離する。`InputManager.fireAction()` を `public` に変更し、TouchHandler から共有する。

キーボード・タッチ・コントローラー（将来）の3入力源はすべて `fireAction(action)` → Game への同一経路を使う。

## Display Layout

- HOLD: 左上
- SCORE, LEVEL, LINES: HOLDの下（左側）
- Pause/Restart: 右上（NEXTの上）
- NEXT: 右上（Pause/Restartの下）
- Board: 中央（変更なし）
