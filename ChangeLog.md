# ChangeLog

## [1.1.2] - 2026-07-01

### Changed
- **Hold キー変更**: `ShiftLeft` → `KeyS`

## [1.1.1] - 2026-07-01

### Changed
- **デフォルトキー配置をホームポジション型に変更**:
  - 左回転 (rotateCCW): `KeyZ` → `KeyD`
  - 右回転 (rotateCW): `KeyX` → `KeyF`
  - 左移動 (moveLeft): `ArrowLeft` → `KeyJ`
  - ソフトドロップ (softDrop): `ArrowDown` → `KeyK`
  - 右移動 (moveRight): `ArrowRight` → `KeyL`
- 併せて README.md、index.html 操作ガイド、public/config.toml、チュートリアルも更新

## [1.1.0] - 2026-07-01

### Added
- **docs/tutorial/16-github-pages-deployment.md**: GitHub Pages 公開手順のチュートリアルを追加。Pages の概要、デプロイ手順（gh-pages パッケージ / GitHub Actions）、トラブルシューティングを収録

### Changed
- **index.html**: favicon パスを絶対パス→相対パスに変更（GitHub Pages のサブパス対応）
- **src/config/config.ts**: config.toml の fetch パスを絶対パス→相対パスに変更
- **tsconfig.json**: `rootDir: "./src"` を追加（TypeScript 6 互換）
- **README.md**: GitHub Pages 公開セクションを追加。詳細はチュートリアルを参照する形式に変更
- **リポジトリ可視性**: Private → Public に変更（GitHub Pages 公開のため）

### Infrastructure
- GitHub Pages 有効化。公開URL: https://amenohimo.github.io/tetris/

## [1.0.2] - 2026-06-28

### Changed

#### デフォルトキー配置を変更
- **右回転 (rotateCW)**: `ArrowUp` → `KeyX`
- **Hold**: `KeyC` → `ShiftLeft` (左Shiftキー)
- **左回転 (rotateCCW)**: `KeyZ` のまま変更なし
- 併せて README.md のキー一覧表、TOML設定例、画面下部の操作ガイド表示も更新

### Fixed

#### 操作ガイド表示がゲーム盤面と重なる
- **原因**: `#controls-info` が `position: fixed` で常に画面下部に固定表示され、ゲーム盤面と重なっていた
- **修正**: z-index レイヤリングを導入。`#game-container` に `z-index: 1`、`#controls-info` に `z-index: 0` を設定。controls は盤面の背後に配置され、ゲーム領域の外（左右の余白部分）でのみ見える
- **併せて**: body に `flex-direction: column` + `overflow-y: auto` を追加し、縦方向レイアウトとスクロールに対応

### Changed
- public/config.toml: デフォルトキーを更新
- src/config/config.ts: DEFAULT_CONFIG のキーを更新
- index.html: 操作ガイド文字列を更新
- README.md: 操作一覧表とTOML例を更新
- src/style.css: レイヤリング構造 + レイアウト調整

## [1.0.1] - 2026-06-28

### Fixed

#### GAME OVER 時に Enter でリスタートできない
- **原因**: Enter キーのハンドラ (handleIdleStart) が `game.state === 'idle'` 時のみ動作し、初回ゲーム開始後に removeEventListener で削除されていた。gameOver 状態ではどのハンドラも Enter を受け付けなかった
- **修正**: gameOver 状態専用の Enter ハンドラを追加。game.state === 'gameOver' 時に game.restart() を呼び出す

#### 一番下から2行のラインが表示されない + ゴーストピースがずれる
- **原因**: Board は Tetris Guideline 準拠の内部22行 (HIDDEN_ROWS=2 のバッファ + VISIBLE_ROWS=20) で正しかったが、Renderer が board→canvas の座標変換を一切行わずに board の全22行を canvas の y=0 から描画していた。その結果:
  - board rows 0-1 (バッファ/非表示のはず) → canvas 上部に表示されてしまう
  - board rows 20-21 (可視部の下2行) → canvas 高さ (20行分) を超え画面外に
  - さらに、場当たり的な -2 補正を drawBoard/drawPiece にのみ適用したため、drawGhost との不整合でゴーストが2行ずれて表示された
- **修正**: Renderer に `boardYToCanvas(boardY: number): number` ヘルパーを追加 (`boardY - HIDDEN_ROWS`)。drawBoard/drawPiece/drawGhost の全描画箇所で一貫して使用。バッファ行 (y=0,1) はスキップし、board rows 2-21 を canvas rows 0-19 に正しくマッピング

### Changed
- src/game/Board.ts: ROWS=22, HIDDEN_ROWS=2 を維持（Tetris Guideline 準拠の正しい設計）
- src/renderer/Renderer.ts: boardYToCanvas() 追加、全描画メソッドで座標変換を統一
- src/main.ts: gameOver 時の Enter ハンドラ追加

### Added
: - play.bat: ワンクリック起動用バッチファイル。ダブルクリックで自動インストール + サーバー起動 + ブラウザ表示
- README.md: 起動セクションに play.bat によるワンクリック起動を追加
- public/favicon.ico: Tピースをモチーフにしたアプリアイコン（16–256px マルチサイズ）
- public/icon-256.png: 256x256 PNG版アイコン
- Tetris.lnk: play.bat へのショートカット（カスタムアイコン適用）
- index.html: favicon リンク追加

## [1.0.0] - 2026-06-28

### Added
- 初回リリース

### Features
- **7種テトリミノ**: I/O/T/S/Z/J/L 全7種。各4方向の形状定義を内蔵
- **SRS回転 + 壁蹴り**: Super Rotation System 準拠。JLSTZ用 (5パターン)、I用 (5パターン)、O用 (identity) の壁蹴りテーブルを実装
- **10x20 ボード**: 内部22行 (上部2行は隠し行)。衝突判定、ライン消去、ゴースト位置計算
- **ゴーストピース**: 落下先を半透明+枠線で表示。config.toml で表示/非表示切替可能
- **7-bag ランダマイザー**: Fisher-Yates シャッフルによる公平なピース生成。peek() で先読み対応
- **Hold機能**: 1ターン1回制限。同一ピース種類を連続でHoldできないガード付き
- **Nextプレビュー**: 最大3つの次ピースを右パネルに表示
- **スコアリング**: Single(100)/Double(300)/Triple(500)/Tetris(800) × レベル + ソフトドロップ(+1/行) + ハードドロップ(+2/行)
- **レベル進行**: 10ライン毎にレベルアップ。17段階の落下速度 (1000ms → 18ms)
- **Lock Delay**: 接地後500msの移動猶予。移動/回転でリセット (最大15回)。重力移動ではリセットしない
- **DAS/ARR 入力**: 初回167ms、リピート33ms (config.toml で調整可能)。moveLeft/moveRight/softDrop に適用
- **TOMLキー設定ファイル**: `public/config.toml` に全操作のキーバインドを定義。smol-toml でパース
- **Canvas 2D 描画**: `drawCell()` による3Dセル表現 (ハイライト, 影, スペキュラ)。軽量
- **ダークテーマUI**: グラデーションバックグラウンド、glowエフェクト、半透明オーバーレイ
- **ゲーム状態管理**: idle → playing → paused/gameOver の状態遷移。各状態に応じた画面表示
- **ポーズ/リスタート**: Escape でポーズ、R でリスタート (gameOver 時含む)
- **操作ガイド**: 画面下部にデフォルト操作一覧を表示

### Technical
- **Vite + TypeScript**: strict モード、target ES2022、module ESNext
- **smol-toml**: 軽量 (3KB) な TOMLパーサー。ブラウザで動作
- **Canvas 2D API**: 全描画を Canvas に統一。DOM操作最小化
- **モジュール構成**: `config/`, `game/`, `input/`, `renderer/` の4ディレクトリに責務分離
- **設計決定の詳細**: 各技術選定の理由は README.md の「設計決定の経緯」を参照
