# ChangeLog

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
