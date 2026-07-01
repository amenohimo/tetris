# CONTEXT

## Touch Zone Layout

タッチ操作用の画面ゾーン分け。盤面を基準に全ゾーンを定義する。ゾーンは優先順位（小さいゾーンが優先）で評価する。

```
┌────┬──────────────────┬────┐
│HOLD│                  │NEXT│
│    │                  │    │
│    │  ソフトドロップ    │    │
│    │  (盤面 上18行)    │    │
│SCOR│                  │    │
│E   ├──────────────────┤    │
│LEVE│ ハードドロップ     │    │
│L   │ (盤面 下2行)      │    │
│LINE├──────────────────┤    │
│S   │ ハードドロップ     │    │
│    │ (ゲーム枠外の下部)  │    │
└────┴──────────────────┴────┘
```

### ゾーン定義（優先順）

| ゾーン | 領域 | 操作 | 備考 |
|--------|------|------|------|
| Pause | 右上隅、NEXTパネル上端。幅は右パネル全体、高さは HOLD ボックスと同じ blockSize*6.5 | タップ | 右回転ゾーンより優先。playing時のみ反応 |
| Hold | 左パネル内のHOLD表示ボックス領域 | タップ | 左回転ゾーンより優先 |
| Hard Drop | 盤面の下2行（canvas Y: 18*blockSize〜20*blockSize）＋キャンバス外の下部領域 | タップ | |
| Soft Drop + Move | 盤面の上18行（canvas Y: 0〜18*blockSize） | 縦ドラッグ: softDrop、横ドラッグ: moveLeft/moveRight | touchmove の dx/dy を分解。dy → softDrop、dx → 左右移動 |
| CCW | 左パネル全体（Holdエリアを除く） | タップ | Holdエリア下端（blockSize*6.5）以降 |
| CW | 右パネル全体（Pauseエリアを除く） | タップ | Pauseエリア下端（blockSize*6.5）以降 |

### ゾーン座標（blockSize=bs の場合）

```
canvas 全体: width = bs*5 + bs*10 + bs*5 = 20*bs, height = 20*bs

左パネル:   x: 0〜5*bs,        y: 0〜20*bs
盤面:       x: 5*bs〜15*bs,    y: 0〜20*bs
右パネル:   x: 15*bs〜20*bs,   y: 0〜20*bs

ソフト+移動: x: 5*bs〜15*bs,    y: 0〜18*bs
ハード:      x: 5*bs〜15*bs,    y: 18*bs〜20*bs  + y > 20*bs（枠外）
Pause:       x: 15*bs〜20*bs,   y: 0〜6.5*bs
Hold:        左パネル内 HOLD 表示ボックス（boxX〜boxX+boxSize, boxY=2.5*bs, boxY+boxSize=6.5*bs）
CCW:         左パネル全体（y: 6.5*bs 以降）
CW:          右パネル全体（y: 6.5*bs 以降）
```

### ソフトドロップ / 横移動のレート

- 縦方向: `accumulatedDY >= blockSize` ごとに `softDrop` 1回発火。超えた分は蓄積
- 横方向: `accumulatedDX >= blockSize` ごとに `moveLeft` または `moveRight` 1回発火。超えた分は蓄積

## Touch State Machine

タッチ操作の状態遷移。playing 中のみゾーン分けを適用し、それ以外は全画面タップで状態遷移する。

「画面どこでもタップ」はキャンバス全体の任意の位置を1回タップする操作を指す。

| 状態 | 画面どこでもタップ | 右上タップ | 右上タップ（監視中） | ゾーン別操作（playing時のみ） |
|------|-------------|-----------|------------------|---------------------------|
| idle | Start | Start | — | — |
| playing | — | Pause | Restart | ソフト/ハード/回転/Hold/左右移動 |
| paused | Resume | Resume | Restart | — |
| gameOver | Restart | Restart | — | — |

- **idle / gameOver**: 全画面どこでもタップしても Start / Restart。ゾーン分け不要
- **playing**: ゾーン分けによる精密操作。右上タップのみ Pause
- **paused**: 全画面タップで即 Resume（とにかく戻りたい）。右上タップ後200ms以内に再度右上タップ → Restart（破壊的操作は意図的に限定）

### ダブルタップ Restart の仕組み（監視方式）

Pause/Resume に遅延を発生させず、タップ後に一定時間「監視状態」に入ることでダブルタップを検出する。

```
playing → 右上タップ → pause（即時）→ 200ms監視開始
  監視中に右上タップ → restart（監視終了）
  200ms経過 → 監視終了

paused → 右上タップ → resume（即時）→ 200ms監視開始
  監視中に右上タップ → restart（監視終了）
  200ms経過 → 監視終了
```

```
// 擬似コード
右上タップが来た:
  if (監視中): restart(); clearMonitoring(); return
  if (state === 'playing'): pause()
  if (state === 'paused'):  resume()
  startMonitoring(200ms)  // この200ms間に再度右上タップ → restart
```

### 初回チュートリアル表示

初回起動時（idle → playing への初回遷移時）、以下のチュートリアルを3秒間表示する。localStorage にフラグを保存し、2回目以降は表示しない。

表示スタイル: 半透明のダーク背景（`rgba(10, 10, 26, 0.85)`）に細い枠線（`#00f0f0`、幅1px）とグローエフェクト。テキストはゲーム内と同じ `Courier New` モノスペースで `#aaa`。各枠はフェードイン（0.3s）→ 表示（2.5s）→ フェードアウト（0.5s）。枠の形状は角丸（radius: 4px）で、ゲームの洗練されたUIに溶け込む。

| 表示位置 | 内容 | テキスト |
|---------|------|---------|
| 右上（NEXTパネル上部、Pauseゾーン） | Pause / Restart | 「PAUSE    Esc」「RESTART    Esc × 2」 |
| 左パネル（HOLD表示ボックス） | Hold | 「HOLD    S」 |
| 盤面左端 | 左回転 | 「CCW    D」 |
| 盤面右端 | 右回転 | 「CW    F」 |
| 盤面下部（下2行） | Hard Drop | 「HARD DROP    Space」 |

3秒経過後、全表示はスムーズにフェードアウト。以降は視覚的ノイズゼロ。

## Architecture Decision

タッチ処理は `src/input/TouchHandler.ts` に分離する。`InputManager.fireAction()` を `public` に変更し、TouchHandler から共有する。

キーボード・タッチ・コントローラー（将来）の3入力源はすべて `fireAction(action)` → Game への同一経路を使う。

TouchHandler は常時アタッチ（idle からの Start 検出のため）。detach 不要。`Game.state` はコールバック `() => game.state` で遅延参照する。

```typescript
// main.ts での配線イメージ
const touchHandler = new TouchHandler(canvas, () => game.state, input);
touchHandler.attach();
```

### ブラウザのデフォルト動作対策

- `touch-action: none` を Canvas に CSS で設定
- 全タッチイベントハンドラ内で `e.preventDefault()` を呼ぶ
- スクロール、ピンチズーム、ダブルタップズーム、プルリフレッシュをすべて抑制

### タッチ座標のゾーン変換

- タッチイベントの `clientX/clientY` をキャンバス座標に変換する際、`canvas.getBoundingClientRect()` で要素位置を取得し、スケーリングを考慮する
- Canvas の内部サイズと CSS 表示サイズの比（`canvas.width / rect.width`）で座標を正規化する

## Display Layout

- HOLD: 左上
- SCORE, LEVEL, LINES: HOLDの下（左側）
- NEXT: 右上（HOLDと同じ高さで揃う）
- Board: 中央
- Pause/Restart ゾーン: 右パネル上端 blockSize*6.5 の領域。HOLD ボックスと同じ高さ。通常は非表示。初回チュートリアル時のみ点線枠表示
