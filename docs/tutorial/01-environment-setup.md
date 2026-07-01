# 開発環境のセットアップ — Node.js / Vite / TypeScript

## プログラムを動かすには何が必要か

まず、私たちが書いたプログラムがどうやって動くのか、全体像を理解しましょう。

```
[TypeScript (.ts)] --(コンパイル)--> [JavaScript (.js)] --(ブラウザで実行)--> [ゲームが動く]
```

1. 人間が読める形で **TypeScript** のコードを書く（`.ts` ファイル）
2. **TypeScriptコンパイラ**（`tsc`）がそれを **JavaScript** に変換する（`.js` ファイル）
3. ブラウザがそのJavaScriptを読み込んで実行する

今回のプロジェクトでは、この流れをもう少し便利にするために **Vite** というツールを使います。Viteは「開発中はコンパイル時間をほぼゼロにする」「本番用に最適化されたファイルを出力する」などの便利な機能を提供します。

## 必要なソフトウェア

このプロジェクトを動かすには、以下の3つが必要です：

1. **Node.js**: JavaScriptをサーバーサイド（ブラウザ以外の場所）で動かすための環境
2. **npm**: Node.jsに付属するパッケージ管理ツール。ライブラリのインストールに使う
3. **Vite**: 開発サーバーとビルドツール（後述）
4. **TypeScript**: JavaScriptに型を追加する言語（後述）

### Node.jsとは何か

Node.jsは、もともとブラウザでしか動かなかったJavaScriptを、PC上で直接実行できるようにするソフトウェアです。

「なぜブラウザで動くゲームなのにNode.jsが必要なのか？」と思うかもしれません。その理由は：

- **パッケージ管理**：npm（Node Package Manager）を使って、必要なライブラリ（後述する `smol-toml` など）をインストールするため
- **ビルドツールの実行**：ViteはNode.js上で動作する
- **開発サーバー**：Viteの開発サーバーもNode.jsで動く

つまり、**開発中に使うツール類を動かすため**にNode.jsが必要なのです。完成したゲーム自体はブラウザで動くので、プレイヤーはNode.jsをインストールする必要はありません。

### npmとは何か

npmは「必要なライブラリを自動でダウンロードしてくれる仕組み」です。

プログラムを書くとき、よく使われる機能は「自分で書かずに、誰かが作ったライブラリ（部品）を使う」のが普通です。例えば：

- **smol-toml**: TOML形式の設定ファイルを読み込むためのライブラリ
- **TypeScript**: TypeScriptをJavaScriptに変換するコンパイラ
- **Vite**: 開発サーバーとビルドツール

npmを使うと、`npm install` というコマンド1つで、これらのライブラリを全てダウンロードして準備してくれます。

## 実際のインストール手順

### 1. Node.jsのインストール

1. https://nodejs.org にアクセスする
2. 推奨版（LTS）のインストーラをダウンロードする
3. インストーラを実行する（全てデフォルト設定でOK）
4. インストールが完了したら、ターミナル（コマンドプロンプト / PowerShell）を開いて以下のコマンドを実行する

```bash
node --version
npm --version
```

それぞれ、バージョン番号（例：`v22.0.0` や `10.0.0`）が表示されれば成功です。表示されない場合は、ターミナルを再起動するか、Node.jsのインストールが正しく行われているか確認してください。

### 2. プロジェクトのセットアップ

プロジェクトのフォルダに移動します。このチュートリアルでは、ホームディレクトリ直下の `project/tetris/main` にプロジェクトを配置している前提で説明します。`main` というフォルダ名には理由があります（気にならなければ読み飛ばして構いません）。git worktree という機能を使うと、`main`、`fix1`、`future` のようにブランチごとにフォルダを並べて作業できます。その運用を想定し、あえてプロジェクト名の下に1階層作っています。

OS別の移動コマンドは以下の通りです。

```bash
# Windows（PowerShell）:
cd ~\project\tetris\main

# Windows（コマンドプロンプト）:
cd %USERPROFILE%\project\tetris\main

# Mac / Linux:
cd ~/project/tetris/main
```

> `~`（チルダ）は「ホームディレクトリ」を表す省略記号です。Windows では `C:\Users\（ユーザー名）`、Mac では `/Users/（ユーザー名）`、Linux では `/home/（ユーザー名）` を指します。

次に、依存関係（ライブラリ）をインストールします。

```bash
npm install
```

このコマンドを実行すると、`package.json` に書かれているライブラリが自動でダウンロードされ、`node_modules` というフォルダに保存されます。

**`node_modules` とは何か**：ダウンロードされたライブラリの実体が入っているフォルダです。このフォルダは非常に大きくなるため、通常はGitなどでバージョン管理しません（`.gitignore` で除外します）。必要なときはいつでも `npm install` で再作成できます。

### 3. 開発サーバーの起動

```bash
npm run dev
```

このコマンドを実行すると、ターミナルに以下のような表示が出ます：

```
  VITE v8.1.0  ready in 300 ms
  ➜  Local:   http://localhost:5173/
```

ブラウザを開き、`http://localhost:5173/` にアクセスしてください。テトリスが表示されれば成功です！

### 4. 開発サーバーの停止

開発サーバーを止めるには、ターミナルで `Ctrl+C` を押します。

## プロジェクトの設定ファイルを読む

このプロジェクトには、いくつかの設定ファイルがあります。それぞれが何を設定しているのか見てみましょう。

### package.json

`package.json` はプロジェクトの「卒業アルバム」のようなファイルです。プロジェクトの名前やバージョン、使っているライブラリの一覧が書かれています。

実際のファイル（プロジェクト直下の `package.json`）を見てみましょう：

```json
{
  "name": "tetris",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "smol-toml": "^1.3.1"
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "vite": "^8.1.0"
  }
}
```

**各項目の解説**：

| 項目 | 値 | 説明 |
|------|----|------|
| `name` | `"tetris"` | プロジェクトの名前 |
| `private` | `true` | このプロジェクトをnpmに公開しない設定 |
| `version` | `"1.0.0"` | バージョン番号（[SemVer](https://semver.org/)形式） |
| `type` | `"module"` | ファイルの読み込みにES Modules（`import`/`export`）を使うことを宣言 |
| `scripts` | オブジェクト | ショートカットコマンドの定義。`npm run dev` で `vite` コマンドが実行される |
| `dependencies` | オブジェクト | **本番環境でも必要な** ライブラリ。このゲームではTOMLパーサーの `smol-toml` だけ |
| `devDependencies` | オブジェクト | **開発中だけ必要な** ライブラリ。TypeScriptとVite |

**なぜ2種類の依存関係があるのか**：
- `dependencies`：ゲームを遊ぶユーザーも必要とするライブラリ（今回は `smol-toml` のみ）
- `devDependencies`：開発者だけが必要なツール（TypeScriptコンパイラ、Viteなど）

本番用のビルド（`npm run build`）では、`devDependencies` に書かれたツールは含まれません。これにより、完成したゲームのファイルサイズを小さく保てます。

**scriptsの解説**：

| コマンド | 実行内容 | 用途 |
|----------|---------|------|
| `npm run dev` | `vite` | 開発サーバーを起動 |
| `npm run build` | `tsc && vite build` | まずTypeScriptをチェック（型エラーがないか確認）し、その後本番用ファイルを生成 |
| `npm run preview` | `vite preview` | ビルド結果をローカルで確認 |

### tsconfig.json

`tsconfig.json` はTypeScriptコンパイラ（`tsc`）の設定ファイルです。TypeScriptがどう振る舞うかを指定します。

実際のファイル（プロジェクト直下の `tsconfig.json`）：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "sourceMap": true
  },
  "include": ["src"],
  "rootDir": "./src"
}
```

| オプション | 値 | 説明 |
|-----------|----|------|
| `target` | `"ES2022"` | コンパイル後のJavaScriptが使う言語バージョン。新しいほどブラウザの対応が必要だが、Viteが自動で調整する |
| `lib` | `["ES2022", "DOM", "DOM.Iterable"]` | 使える組み込み機能の一覧。`"DOM"` を指定することで `document.getElementById()` などが使える |
| `module` | `"ESNext"` | モジュール（ファイル分割）の方式。最新のES Modulesを使う |
| `strict` | `true` | **最も重要な設定**。すべての厳格な型チェックを有効にする |
| `include` | `["src"]` | コンパイル対象のフォルダ。`src/` の下にある `.ts` ファイルだけがコンパイルされる |
| `rootDir` | `"./src"` | TypeScriptのルートディレクトリ。これにより `src/` 以下のフォルダ構造がそのまま出力される |

**`strict: true` が重要な理由**：
TypeScriptの最大の利点は「型のチェック」です。`strict: true` を設定しないと、チェックが甘くなり、「せっかくTypeScriptを使っているのに型の恩恵を受けられない」という状況になります。このプロジェクトでは `strict: true` が有効になっています。

### vite.config.ts

Vite自体の設定ファイルです。このプロジェクトでは非常にシンプルな設定になっています。

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
});
```

| オプション | 値 | 説明 |
|-----------|----|------|
| `base` | `"./"` | ビルド後のファイルの基準パス。`"./"` とすると、サーバーのルート以外の場所に配置しても正しく動く |

`base: './'` は「ビルド後のHTMLが、画像やスクリプトを相対パス（.から始まるパス）で参照する」という意味です。これを指定しないと、ビルド後のファイルをサーバーのサブフォルダに置いたときに参照が切れる問題が発生します。

## TOML設定ファイル

このプロジェクトの特徴の1つが、キー設定を **TOML** 形式でカスタマイズできることです。設定ファイルは `public/config.toml` にあります：

```toml
[keys]
moveLeft = "KeyJ"
moveRight = "KeyL"
softDrop = "KeyK"
hardDrop = "Space"
rotateCW = "KeyF"
rotateCCW = "KeyD"
hold = "KeyS"
pause = "Escape"
restart = "KeyR"

[timing]
dasDelay = 167
arrDelay = 33

[display]
blockSize = 30
showGhost = true
```

TOMLは「人間が読みやすい設定ファイル形式」です。`[keys]` のようなセクションでグループ分けし、`key = "値"` または `key = 数値` で設定します。JSONよりコメントが書きやすく、YAMLよりシンプルなので、設定ファイルとして人気があります。

このファイルを編集して保存すると、ゲームを再起動しなくても次回起動時に新しい設定が反映されます。

## npm run build で何が起きるか

```bash
npm run build
```

このコマンドは `package.json` の `"build": "tsc && vite build"` によって、2つの処理を順番に実行します：

1. **`tsc`**: TypeScriptコンパイラがすべての `.ts` ファイルをチェックする。型エラーがあればここでエラーになってビルドが止まる
2. **`vite build`**: Viteが本番用に最適化されたファイルを `dist/` フォルダに出力する

ビルドが成功すると、`dist/` フォルダに以下のようなファイルが生成されます：

```
dist/
├── index.html
├── assets/
│   ├── index-xxxxx.js    # すべてのソースが1つにまとめられたJavaScript
│   └── index-xxxxx.css   # すべてのCSSが1つにまとめられたスタイルシート
```

ファイル名の `xxxxx` の部分はハッシュ値（ファイルの中身から計算した一意の値）です。ファイルの中身が変わるとハッシュ値も変わるため、ブラウザのキャッシュ問題を防げます。

## 開発サーバー（Vite）の便利な機能

Viteを開発中に使う最大の利点は **HMR（Hot Module Replacement）** です。

通常は、コードを変更したら手動でブラウザをリロードする必要があります。HMRを使うと、コードの変更を検出して、ブラウザをリロードせずに変更部分だけを自動で差し替えてくれます。

実際に試してみましょう：

1. `npm run dev` で開発サーバーを起動する
2. ブラウザでゲームが表示されていることを確認する
3. `src/style.css` を開き、`body` の `background` の色を少し変更する（例：`#0a0a1a` を `#1a0a0a` に）
4. 保存すると、ブラウザが自動で更新される（ページ全体のリロードなし）

## 自分で試してみよう

1. `npm run dev` で開発サーバーを起動し、ブラウザでテトリスが動くことを確認してください
2. `npm run build` を実行し、`dist/` フォルダが生成されることを確認してください
3. `public/config.toml` の `blockSize` を `40` に変更し、ゲームを再起動してセルのサイズが大きくなることを確認してください
4. `tsconfig.json` の `strict` を一時的に `false` に変更し、その後にまた `true` に戻してください（なぜこの設定が重要なのか考えてみてください）

## 用語集

| 用語 | 説明 |
|------|------|
| Node.js | JavaScriptをサーバーサイドで動かすための実行環境 |
| npm | Node.jsのパッケージ管理ツール |
| Vite | 高速な開発サーバーとビルドツール |
| TypeScript | JavaScriptに型を追加した言語。コンパイル時にバグを発見できる |
| TOML | 人間が読みやすい設定ファイル形式 |
| ESM (ES Modules) | JavaScriptの標準的なモジュールシステム。`import` / `export` を使う |
| コンパイル | プログラミング言語を別の言語に変換すること。ここではTypeScript→JavaScript |
| ビルド | ソースコードを本番実行可能な形式に変換する一連の処理 |
| node_modules | npmでインストールしたライブラリが保存されるフォルダ |
| HMR | コード変更をブラウザのリロードなしで即座に反映する仕組み |

**← 前のステップ：[00: はじめに](./00-introduction.md)**
**→ 次のステップ：[02: TypeScriptの基礎](./02-typescript-basics.md)**
