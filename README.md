# TETRIS

Vite + TypeScript + Canvas 製のブラウザテトリス。キー配置を TOML で変更可能。

---

## 目的

ブラウザ上で動作するテトリスゲーム。SRS回転、7-bagランダマイザー、Hold機能、ゴーストピースなど標準的なテトリスルールを実装。キーバインドは TOML 設定ファイルで任意に変更できる。

---

## 機能一覧

| 機能 | 説明 |
|------|------|
| 7種テトリミノ | I/O/T/S/Z/J/L の全7種類。SRS (Super Rotation System) による回転と壁蹴り対応 |
| Hold機能 | 現在のピースを一旦保持し、保持中のピースと入れ替え可能。1ターン1回の制限付き |
| ゴーストピース | 現在のピースの落下先を半透明で表示 |
| Nextプレビュー | 次の3つのピースを表示 |
| 7-bagランダマイザー | 7種のピースが均等に出現する公平なランダム生成 |
| スコアリング | Single/Double/Triple/Tetris のライン消去スコア + ソフト/ハードドロップボーナス |
| レベル進行 | 10ライン消去ごとにレベルアップ。レベルに応じて落下速度が上昇 |
| Lock Delay | 接地後500msの移動猶予。移動/回転でリセット（最大15回） |
| DAS/ARR入力 | キー押しっぱなし時の自動連続移動（設定変更可能） |
| タッチ操作 | スマートフォン・タブレット対応。盤面基準のゾーン分けで精密操作（Hard Drop / Soft Drop＋横移動 / 回転 / Hold / Pause） |
| TOMLキー設定 | `public/config.toml` を編集して全操作のキーバインドを変更可能 |
| ダークテーマUI | 3D表現のセル描画、グローエフェクト、グラデーションバックグラウンド |

---

## 使用方法

### 起動

**ワンクリック起動（推奨）:** `play.bat` をダブルクリックするだけで起動。初回は自動で依存関係をインストールし、ブラウザが開きます。

**手動起動:**
```bash
npm install
npm run dev
```

ブラウザが開き、テトリスがプレイ可能。デフォルトでは `http://localhost:5173` で起動。

### ビルド

```bash
npm run build    # dist/ に出力
npm run preview  # ビルド結果をプレビュー
```

### 操作（デフォルト）

| 操作 | キー | 変更方法 |
|------|------|----------|
| 左移動 | J / ← | `config.toml` → `moveLeft` |
| 右移動 | L / → | `config.toml` → `moveRight` |
| ソフトドロップ | K / ↓ | `config.toml` → `softDrop` |
| ハードドロップ | Space | `config.toml` → `hardDrop` |
| 右回転 | F | `config.toml` → `rotateCW` |
| 左回転 | D | `config.toml` → `rotateCCW` |
| Hold | S | `config.toml` → `hold` |
| ポーズ | Escape | `config.toml` → `pause` |
| リスタート | R | `config.toml` → `restart` |

### キー設定の変更

`public/config.toml` を編集:

```toml
[keys]
moveLeft = "KeyJ"
moveRight = "KeyL"
softDrop = "KeyK"
rotateCW = "KeyF"
rotateCCW = "KeyD"
hold = "KeyS"

[timing]
dasDelay = 167    # 初回移動までの遅延 (ms)
arrDelay = 33     # リピート間隔 (ms)

[display]
blockSize = 30    # 1セルのサイズ (px)
showGhost = true  # ゴースト表示
```

キーコードは `KeyA`-`KeyZ`、`ArrowLeft`-`ArrowDown`、`Space`、`Escape` など。ブラウザの `e.code` 値を使用。

---

## 学習リソース

このプロジェクトのソースコードを教材に、TypeScript / Vite / ゲーム開発の基礎を学べるチュートリアルを `docs/tutorial/` に用意しています。全17章構成で、コードを1行ずつ解説しながら「なぜそう書くのか」を説明します。

→ [チュートリアルを読む](docs/tutorial/00-introduction.md)

---

## 設計決定の経緯

| 決定 | 検討した選択肢 | 採用理由 | 不採用理由 |
|------|---------------|----------|-----------|
| ✅ レンダリング方式: Canvas | Canvas / DOM / WebGL | DOMより描画パフォーマンスが安定。WebGLほど複雑でなく、テトリスには十分。 | DOM: セル数が増えると再描画コスト大。WebGL: オーバーキル。 |
| ✅ 言語: TypeScript + Vite | TS+Vite / Vanilla JS / React | 型安全性でバグ防止。Viteの高速HMRで開発効率向上。 | Vanilla: 大規模化で保守困難。React: ゲームループと相性悪い。 |
| ✅ TOMLパーサー: smol-toml | smol-toml / toml / 自作パーサー | 軽量(3KB)でブラウザ対応。ESMでimport可能。 | toml: node.js専用でブラウザ非対応。自作: 工数対効果が悪い。 |
| ✅ 回転システム: SRS | SRS / 独自回転 / Arika | テトリス界の標準。壁蹴りテーブルが明確に定義されている。 | 独自: プレイヤーに違和感。Arika: SRSと差異があり標準外。 |
| ✅ ランダマイザー: 7-bag | 7-bag / 完全ランダム / 履歴ベース | 全ピースが公平に出現。極端な偏りがなく競技テトリス標準。 | 完全ランダム: 連続同じピースで不公平。履歴ベース: 複雑な割に7-bagと大差ない。 |
| ✅ 入力方式: DAS/ARR | DAS+ARR / 即時リピート / キーリピート依存 | OSのキーリピート速度に依存しない安定した操作性。競技テトリス標準。 | 即時リピート: 微調整不可。キーリピート依存: OS設定で操作感が変わる。 |

---

## アーキテクチャ

```
src/
├── main.ts              # エントリポイント、ゲームループ
├── types.ts             # 全型定義
├── style.css            # ダークテーマスタイル
├── game/
│   ├── Game.ts          # ゲームエンジン (state machine, 重力, スコア, Hold)
│   ├── Board.ts         # 10x22 グリッド管理 (衝突判定, ライン消去)
│   ├── Piece.ts         # テトリミノ定義 + SRS回転 + 壁蹴り
│   └── Randomizer.ts    # 7-bag ランダマイザー
├── renderer/
│   └── Renderer.ts      # Canvas描画 (3D cell, ゴースト, Hold/Next/Score表示)
├── input/
│   └── InputManager.ts  # キーボード入力 + DAS/ARR
└── config/
    └── config.ts        # TOMLコンフィグローダー
```

---

## GitHub Pages 公開

`dist/` を GitHub Pages にデプロイすればブラウザ上で公開できる。手順はチュートリアルを参照。

→ [チュートリアル: GitHub Pages に公開しよう](docs/tutorial/16-github-pages-deployment.md)

### 公開例

このリポジトリは以下のURLで公開済み。

<https://amenohimo.github.io/tetris/>

### 手動デプロイ

```bash
npm run build
npx gh-pages -d dist
```

---

## ライセンス

MIT
