# AGENTS.md — Tetris プロジェクト用 AI エージェント指示

## バージョン管理

**バージョンの単一情報源は `package.json` の `version` フィールド。**

### ビルド時

`vite.config.ts` がビルド時に `package.json` からバージョンを読み取り、git の短縮ハッシュを付加して `__VERSION__` を生成する。

```
v1.2.0-a1b2c3d
```

手動で `vite.config.ts` のバージョン文字列を編集してはならない。

### バージョン更新手順

機能追加・バグ修正のコミット時に、以下の3ファイルを同時に更新すること：

1. **`package.json`** — `version` を適切なセマンティックバージョンに更新
2. **`ChangeLog.md`** — 新しいバージョンセクションに変更内容を追記
3. **`README.md`** — バージョンに依存する記述があれば更新

### プレコミットフック

`.git/hooks/pre-commit` が以下をチェックする：

- `src/` に変更があるのに `package.json` の `version` が前回コミットから変わっていない場合、**警告**を表示する（ブロックはしない）
- コミットを強行するには同じ `git commit` を再度実行する

キリのいいタイミングで `npm version patch`（または `minor` / `major`）を実行すること。このコマンドは `package.json` のバージョンを自動で bump し、git commit と tag を作成する。

### ChangeLog 記述ルール

- `## [X.Y.Z] - YYYY-MM-DD` の形式
- `### Added` / `### Changed` / `### Fixed` の3カテゴリ
- 各項目は **太字のサマリ**＋ `:` ＋ 詳細説明の形式
- 説明には**原因**と**影響**を含める（「〜を修正」だけでなく「〜が原因で〜が起きていた」）
- 技術的な変更はコードの場所（`src/game/Game.ts` など）を明記

### UI・動作の変更検証

UI変更時は以下を確認：
- `npm run build` が成功すること
- `npx gh-pages -d dist` でデプロイすること
- Pages の反映には通常 1-2 分かかるため、反映を確認してから報告すること
