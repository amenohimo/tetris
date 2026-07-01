# 16: GitHub Pages に公開しよう — 無料でWebサイトを公開する方法

この章では、あなたが作ったテトリスをインターネットに公開する手順を学びます。せっかく動くプログラムができたのですから、世界中の誰でも遊べるようにしましょう。

とはいえ、「サーバーを借りる」「ドメインを取得する」といった作業は敷居が高いですね。そこで登場するのが **GitHub Pages** です。GitHub Pages を使えば、それらの面倒な作業が**一切不要**で、Web サイトを無料で公開できます。

**この章の対象者:** 「コードは書けるけど、GitHub やサーバー周りはよくわからない」という人を想定しています。

**環境について:** Git Bash または PowerShell を使うことを想定しています。Windows のコマンドプロンプトを使う場合、`ls` の代わりに `dir` を使ってください。

---

## GitHub Pages とは

GitHub Pages は、GitHub が無料で提供している Web サイトのホスティングサービスです。

普通、Web サイトを公開するには以下のいずれかが必要になります。

- **レンタルサーバーを借りる**: 月々数百〜数千円。設定が面倒
- **VPS（仮想サーバー）を借りる**: 自分で Apache や nginx を設定する必要がある。敷居が高い
- **クラウドサービスを使う (AWS, GCP など)**: 無料枠はあるが、設定項目が多く初心者には難しい

GitHub Pages を使えば、これらが一切不要です。GitHub にファイルを push するだけで Web サイトとして公開されます。

### メリット

| 項目 | 内容 |
|------|------|
| **料金** | **完全無料**。クレジットカード登録も不要 |
| **設定の簡単さ** | リポジトリ設定で数クリック、またはコマンド1発 |
| **HTTPS** | 自動で HTTPS（暗号化通信）が有効になる。自分で証明書を用意する必要がない |
| **カスタムドメイン** | 自分のドメイン（例: `tetris.example.com`）を後から設定できる |
| **ビルド不要のホスティング** | このテトリスは Vite でビルド済みの静的ファイル（HTML + CSS + JS）なので、サーバーサイドの処理は一切不要です。Pages との相性が抜群です |

### 制限

| 制限 | 内容 |
|------|------|
| **静的ファイルのみ** | PHP, Python, Node.js などのサーバーサイド処理は動かない。このテトリスはフロントエンドのみなので問題ない |
| **リポジトリが Public であること** | 無料プランではリポジトリを公開（Public）にする必要がある。このプロジェクトにパスワードや秘密情報は含まれていないので問題ない |
| **ストレージ 1GB / 月間帯域 100GB** | テトリス1つなら余裕で収まる |

---

## なぜこのテトリスが GitHub Pages に適しているか

Vite でビルドした出力は `dist/` ディレクトリに生成されます。

```html
<script type="module" crossorigin src="./assets/index-xxxxx.js"></script>
<link rel="stylesheet" crossorigin href="./assets/index-yyyyy.css" />
<link rel="icon" type="image/x-icon" href="./favicon.ico" />
```

ここで注目してほしいのは、すべてのパスが `./`（相対パス）で書かれていることです。

**なぜ相対パス（`./`）が重要なのでしょうか？**

GitHub Pages で公開するサイトは、`https://<ユーザー名>.github.io/<リポジトリ名>/` というサブパス（`/tetris/` の部分）でアクセスされます。もしパスが絶対パス（`/` 始まり）で書かれていると、`/tetris/` の部分が無視されてしまい、ファイルが正しく読み込めません。相対パス（`./` 始まり）で書かれていれば、サブパス配下でも正しく動作します。

このテトリスでは `vite.config.ts`（L4）で `base: './'` と設定しているため、自動的に相対パスで出力されます。01章で設定した `base: './'` は、こういう理由で重要だったのです。

また、サーバーサイドの処理は一切ありません。`dist/` フォルダごと GitHub Pages にアップロードすればそのまま動きます。

---

## 前提条件

以下の準備ができていることを確認してください。

1. **GitHub アカウントを持っている**
   - まだない場合は https://github.com/signup で登録（無料）
   - アカウント名（ユーザー名）をメモしておいてください。例: `amenohimo`

2. **Git がインストールされている**
   - `git --version` をターミナルで実行してバージョンが表示されれば OK
   - 表示されない場合: https://git-scm.com/downloads からインストール

3. **Node.js と npm がインストールされている**
   - `node --version` と `npm --version` を実行してバージョンが表示されれば OK

4. **このプロジェクトが GitHub 上のリポジトリとして存在している**
   - まだの場合は以下の手順で作成してください。

### リポジトリを作成していない場合の手順

まだ GitHub にリポジトリを作成していない人は、以下の手順に従ってください。

```bash
# 1. GitHub にログインし、https://github.com/new を開く
# 2. Repository name に "tetris" と入力
# 3. Public を選択（Private だと GitHub Pages が使えない）
# 4. "Create repository" をクリック

# 5. ターミナルでこのプロジェクトのフォルダに移動
#    例: Windows（PowerShell）の場合 → cd ~\project\tetris\main
#    例: Windows（コマンドプロンプト）の場合 → cd %USERPROFILE%\project\tetris\main
#    例: Mac/Linux の場合 → cd ~/project/tetris/main
cd /path/to/tetris

# 6. 以下のコマンドを順に実行
git init
git add .
git commit -m "initial commit"

# 7. ブランチ名を main に変更（古いGitはデフォルトが master のため）
git branch -M main

# 8. 作成したリポジトリのリモートURLを設定
#    以下の YOUR_USERNAME は自分のGitHubユーザー名に置き換えること
git remote add origin https://github.com/YOUR_USERNAME/tetris.git

# 9. プッシュ
git push -u origin main
```

これで GitHub 上にコードがアップロードされました。

---

## デプロイ手順（2通りの方法）

### 方法A: gh-pages パッケージを使う（おすすめ）

最も簡単な方法です。コマンド2行で完了します。

**Step 1: プロジェクトをビルドする**

```bash
npm run build
```

このコマンドで `dist/` フォルダに公開用のファイルが生成されます。

```bash
ls dist/
# => assets/  config.toml  favicon.ico  index.html
```

**注意:** `dist/` が `.gitignore` に含まれていても問題ありません。`gh-pages` は `git add` を経由せずに直接ファイルをデプロイするため、Git 管理外のフォルダでも公開できます。

**事前準備:** `npx gh-pages` は GitHub へのプッシュに認証が必要です。事前に以下のいずれかで認証を済ませておいてください。
- GitHub CLI を使う場合: `gh auth login` を実行
- Personal Access Token を使う場合: GitHub の Settings → Developer settings → Personal access tokens でトークンを作成し、git の認証情報として設定

認証が通っているかは `gh auth status` で確認できます。

**Step 2: gh-pages パッケージでデプロイする**

```bash
npx gh-pages -d dist
```

**`npx` とは何でしょうか？** `npx` は npm に付属しているコマンドで、パッケージをインストールせずに一度だけ実行できる仕組みです。通常、ライブラリを使うには `npm install gh-pages` でインストールしてから使いますが、`npx` を使えばインストールの手間が省けます。初回は自動でダウンロードされるため、数十秒かかることがありますが、2回目以降はキャッシュが使われるため高速です。

**`gh-pages` ブランチとは何でしょうか？** このコマンドは内部で以下のことを自動で行います。

1. `dist/` フォルダの内容を `gh-pages` という名前のブランチにコピーする
2. そのブランチを GitHub にプッシュする
3. GitHub が自動で Web サイトとして公開する

`gh-pages` ブランチは「公開用ファイルだけを置く特別なブランチ」です。通常のソースコード（`src/` フォルダなど）は含まれず、ビルド結果だけが置かれます。こうすることで、ソースコードと公開ファイルを分離できます。

出力に `Published` と表示されれば成功です。

**Step 2.5: GitHub Pages のブランチ設定をする**

`npx gh-pages -d dist` で `gh-pages` ブランチは作成されました。次に GitHub 側で「このブランチを Web サイトとして公開する」設定が必要です。

1. ブラウザで GitHub のリポジトリページを開く
2. 「Settings」タブをクリック
3. 左側メニューの「Pages」をクリック
4. 「Source」セクションで「Deploy from a branch」を選択（すでに選択されていれば OK）
5. 「Branch」で `gh-pages` を選択、右のドロップダウンで `/ (root)` を選択
6. 「Save」をクリック

これで GitHub Pages が有効になり、しばらくするとサイトが公開されます。

**Step 3: 公開された URL にアクセスする**

URL の形式は以下の通りです。

```
https://<ユーザー名>.github.io/<リポジトリ名>/
```

例: `amenohimo` というユーザー名で `tetris` というリポジトリの場合:

```
https://amenohimo.github.io/tetris/
```

ブラウザでこの URL を開いて、テトリスが表示されれば完了です。

**反映まで1〜2分**かかることがあります。すぐに404が出ても、時間をおいてからリロードしてみてください。

**Step 4: 更新したいとき**

コードを変更したら、再度ビルドしてデプロイします。

```bash
npm run build          # 変更をビルド
npx gh-pages -d dist   # 再度デプロイ
```

この2行を実行するたびに GitHub Pages 上のサイトが更新されます。

**重要なポイント:** `npx gh-pages -d dist` は `main` ブランチに **一切触れません**。`dist/` の中身だけを `gh-pages` ブランチに直接プッシュします。そのため、ソースコードを `main` に `git push` していなくても、Web サイトだけ更新することができます。

なぜこのような仕組みになっているのでしょうか。GitHub Pages は **ソースコードの管理** と **Web サイトの公開** を別物として設計しているからです。

```
main ブランチ               gh-pages ブランチ         GitHub Pages
┌──────────────┐           ┌──────────────┐         ┌──────────────┐
│ src/         │           │ index.html   │────────▶│ Webサイト    │
│ package.json │  ←独立→  │ assets/*.js  │         │ として公開   │
│ tsconfig.json│           │ config.toml  │         └──────────────┘
│ ...          │           │ favicon.ico  │
└──────────────┘           └──────────────┘
  git push 任意               force push される
```

Pages は `gh-pages` ブランチだけを見て Web サイトを作ります。`main` ブランチは一切参照されません。

この分離には3つの利点があります。1つ目は、ソースコードを公開したくない場合（Privateリポジトリ + 有料プラン）でも、ビルド成果物だけを公開できること。2つ目は、公開用ファイルの履歴を残さないため、リポジトリが肥大化しないこと。3つ目は、ビルド結果とソースコードが混ざらず、それぞれ何を管理すべきかが明確になることです。

---

### 方法B: GitHub Actions で自動デプロイ（上級者向け）

「main ブランチにプッシュしたら自動で公開されてほしい」という場合は、GitHub Actions を使います。

`.github/workflows/deploy.yml` というファイルを作成し、以下の内容を記述してください。

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

この設定を行うと、以降は `git push` するだけで自動的にビルド → デプロイが実行されます。GitHub 上で処理が実行されるため、自分のパソコンでビルドする必要がなくなります。

**注意:** 初回だけは方法Aと同じく GitHub Pages の設定を有効にする必要があります。方法Aで一度デプロイしてから切り替えるとスムーズになります。

---

## うまくいかないときのチェックリスト

**Q: ブラウザで開くと 404 が表示される**

- [ ] 「Settings」→「Pages」で「gh-pages」ブランチが選択されているか確認 ← 初回デプロイで一番多い原因
- [ ] デプロイから2分以上経っているか？ 初回は反映に時間がかかることがあります
- [ ] URL は正しいか？ `https://<ユーザー名>.github.io/<リポジトリ名>/` になっているか確認
- [ ] リポジトリは Public になっているか？ GitHub のリポジトリページで確認。「Settings」→「General」→「Visibility」

**Q: デプロイは成功したが画面が真っ白**

- [ ] ブラウザのデベロッパーツール（F12）の「Console」タブにエラーが出ていないか確認
- [ ] パスが絶対パス（`/` 始まり）になっていないか？ `./` 始まりの相対パスが必要

**Q: npx gh-pages がエラーになる**

- [ ] GitHub にログインしているか？ `gh auth status` で確認
- [ ] `gh` CLI がインストールされているか？ `gh --version` で確認。インストールされていなければ https://cli.github.com/ からダウンロード
- [ ] 一度 `git push` してコードが GitHub 上にある状態にしてから実行する

**Q: npm run build が失敗する**

- [ ] `npm install` を実行して依存関係をインストールしたか？
- [ ] Node.js のバージョンが古すぎないか？ `node --version` が 18 以上必要

---

## 設計判断のまとめ

この章で学んだ設計判断をまとめます。

| 判断 | 理由 |
|------|------|
| `base: './'` を設定する | ビルド後のファイルがサブパス配下でも正しく動作するようにするため |
| `gh-pages` ブランチを使う | ソースコードと公開ファイルを分離し、公開用ファイルだけを管理するため |
| 静的ファイルとしてデプロイする | サーバーサイド処理が不要なフロントエンドのみのプロジェクトに最適なため |
| GitHub Actions で自動化する | push のたびに手動デプロイする手間を省くため |

---

## 自分で試してみよう

1. 方法Aを使って、自分のテトリスを GitHub Pages にデプロイしてみましょう。
2. デプロイが成功したら、スマートフォンからもアクセスして、モバイルでも動作することを確認してみましょう。
3. コードを少し変更して（例: 背景色を変える）、再度デプロイしてみましょう。変更が反映されることを確認してください。
4. 方法B（GitHub Actions）にも挑戦してみましょう。`.github/workflows/deploy.yml` を作成し、`git push` するだけで自動デプロイされることを確認してください。

---

## 用語集

| 用語 | 説明 |
|------|------|
| GitHub Pages | GitHub が無料で提供する Web サイトホスティングサービス |
| 静的ファイル | サーバーサイドの処理を必要としないファイル（HTML, CSS, JS など） |
| npx | npm に付属するコマンドで、パッケージをインストールせずに一度だけ実行できる仕組み |
| gh-pages ブランチ | 公開用ファイルだけを置く特別なブランチ。GitHub Pages が自動的にこのブランチの内容を Web サイトとして公開する |
| 相対パス | `./` や `../` で始まるパス表記。現在のファイルの位置を基準にパスを指定する |
| 絶対パス | `/` で始まるパス表記。ルート（最上位）を基準にパスを指定する |
| GitHub Actions | GitHub が提供する CI/CD（自動ビルド・デプロイ）サービス |
| デプロイ | プログラムを実行環境に配置し、利用可能な状態にすること |
| ホスティング | Web サイトのファイルをサーバーに置き、インターネット経由でアクセス可能にすること |
| HTTPS | ブラウザとサーバーの通信を暗号化するプロトコル。URL が `https://` で始まるサイトは安全 |

---

**← 前のステップ：[15: 発展課題](./15-next-steps.md)**
**→ 次のステップ：[00: はじめに](./00-introduction.md)（もう一度最初から）**
