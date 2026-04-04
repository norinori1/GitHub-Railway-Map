# GitHub Railway Map セットアップ手順

このドキュメントでは、**GitHub Railway Map** を動作させるために必要な操作をまとめています。

---

## 目次

1. [クイックスタート（ローカルで試す）](#1-クイックスタートローカルで試す)
2. [JSON データの準備（CORS 回避）](#2-json-データの準備cors-回避)
3. [Vercel へのデプロイ（推奨）](#3-vercel-へのデプロイ推奨)
4. [Cloudflare Workers へのデプロイ（代替）](#4-cloudflare-workers-へのデプロイ代替)
5. [GitHub Token の取得](#5-github-token-の取得)
6. [ポートフォリオへの組み込み](#6-ポートフォリオへの組み込み)

---

## 1. クイックスタート（ローカルで試す）

ブラウザで `index.html` を直接開いても、GitHub API の CORS 制限により **ユーザー名入力での自動取得は動作しません**。  
ただし、**JSON データ URL を使う方法**はローカルでも動作します。

### JSON ファイルを使ってローカルで表示

```bash
# 1. リポジトリをクローン（すでに手元にある場合はスキップ）
git clone https://github.com/norinori1/GitHub-Railway-Map.git
cd GitHub-Railway-Map

# 2. 任意の静的サーバーで起動（Python 例）
python3 -m http.server 8080
# または
npx serve .
```

ブラウザで `http://localhost:8080` を開き、JSON データ URL 欄に URL を入力してください。

---

## 2. JSON データの準備（CORS 回避）

CORS を回避する最も簡単な方法は、**あらかじめリポジトリデータを JSON として公開**することです。

### 手順

```bash
# 1. GitHub API からリポジトリデータを取得
curl "https://api.github.com/users/YOUR_USERNAME/repos?type=public&sort=created&per_page=100" \
  -o repos.json
```

> `YOUR_USERNAME` を自分の GitHub ユーザー名に置き換えてください。

```bash
# 2. repos.json を GitHub Pages / Vercel / 任意のサーバーにアップロード
# 例: GitHub の portfolio リポジトリに置く場合
git clone https://github.com/YOUR_USERNAME/YOUR_PORTFOLIO_REPO.git
cp repos.json YOUR_PORTFOLIO_REPO/
cd YOUR_PORTFOLIO_REPO
git add repos.json
git commit -m "Add repos.json"
git push
```

### JSON URL の形式

| ホスト方法 | URL 例 |
|-----------|--------|
| GitHub Pages | `https://YOUR_USERNAME.github.io/YOUR_REPO/repos.json` |
| raw.githubusercontent.com | `https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/repos.json` |
| Vercel | `https://your-site.vercel.app/repos.json` |

### ツールでの使用

Railway Map の **「JSON データ URL」** 欄に上記 URL を貼り付けて `Visualize` をクリックします。

---

## 3. Vercel へのデプロイ（推奨）

GitHub API プロキシ (`/api/github-user`) を有効にすると、**ユーザー名を入力するだけで自動取得**ができます。

### 前提

- Node.js（v18 以上）がインストールされていること
- [Vercel アカウント](https://vercel.com/) を持っていること
- GitHub Token を取得済み（[手順 5](#5-github-token-の取得) を参照）

### デプロイ手順

```bash
# 1. Vercel CLI をインストール
npm install -g vercel

# 2. プロジェクトディレクトリへ移動
cd GitHub-Railway-Map

# 3. Vercel にデプロイ（初回はブラウザでログインを求められます）
vercel
```

初回実行時に以下のような質問が表示されます：

| 質問 | 回答例 |
|------|--------|
| Set up and deploy? | `Y` |
| Which scope? | 自分のアカウントを選択 |
| Link to existing project? | `N`（新規作成）|
| Project name? | `github-railway-map`（任意）|
| Root directory? | そのまま Enter |
| Override settings? | `N` |

### 環境変数の設定（GitHub Token）

```bash
# Vercel に環境変数を設定
vercel env add GITHUB_TOKEN
# → プロンプトが表示されるので GitHub Token を貼り付ける
# → 環境を選択（Production / Preview / Development すべて推奨）
```

または Vercel ダッシュボードから設定する場合：

1. [https://vercel.com/dashboard](https://vercel.com/dashboard) を開く
2. プロジェクト → **Settings** → **Environment Variables**
3. `GITHUB_TOKEN` という名前で GitHub Token を追加

### 本番デプロイ

```bash
vercel --prod
```

デプロイ後に表示される URL（例：`https://github-railway-map.vercel.app`）にアクセスすると、  
ユーザー名入力から自動で路線図が生成できます。

---

## 4. Cloudflare Workers へのデプロイ（代替）

Vercel が使えない場合の代替手段です。

### 手順

```bash
# 1. Wrangler CLI をインストール
npm install -g wrangler

# 2. Cloudflare にログイン
wrangler login
```

以下の内容で `worker.js` を作成します：

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const user = url.searchParams.get('user');

    if (!user) {
      return new Response('user parameter required', { status: 400 });
    }

    let allRepos = [];
    let page = 1;

    try {
      while (page <= 5) {
        const resp = await fetch(
          `https://api.github.com/users/${user}/repos?page=${page}&per_page=100&type=public&sort=created`,
          {
            headers: {
              'Authorization': `token ${env.GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'GitHub-Railway-Map',
            }
          }
        );

        if (!resp.ok) throw new Error('GitHub API error');

        const repos = await resp.json();
        if (repos.length === 0) break;

        allRepos = allRepos.concat(repos);
        page++;
      }

      const topRepos = allRepos.slice(-50).map(r => ({
        name: r.name,
        created_at: r.created_at,
        language: r.language,
        url: r.html_url,
        description: r.description,
      }));

      return new Response(JSON.stringify(topRepos), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
};
```

```bash
# 3. シークレットを設定
wrangler secret put GITHUB_TOKEN
# → GitHub Token を入力

# 4. デプロイ
wrangler deploy
```

デプロイ後、`index.html` の `loadFromUser` 内のプロキシ URL を Workers の URL に書き換えてください。

---

## 5. GitHub Token の取得

GitHub API のレート制限（認証なし: 60 req/hour）を緩和するために Token を取得します。

### 手順

1. GitHub にログインし [https://github.com/settings/tokens](https://github.com/settings/tokens) を開く
2. **「Generate new token」** → **「Tokens (classic)」** をクリック
3. Note に任意の名前（例：`github-railway-map`）を入力
4. Expiration を設定（推奨: 90 days）
5. **`public_repo`** スコープのみにチェック
6. **「Generate token」** をクリック
7. 表示されたトークン（`ghp_...`）をコピー

> ⚠️ トークンはこのページを閉じると再表示されません。必ずコピーしてください。

---

## 6. ポートフォリオへの組み込み

### iframe で埋め込む

```html
<!-- 最小推奨サイズ: width=100%, height=700px -->
<iframe
  src="https://your-domain.vercel.app/?dataUrl=https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/repos.json"
  width="100%"
  height="700"
  style="border: none; border-radius: 8px;"
></iframe>
```

### URL パラメータ

| パラメータ | 説明 | 例 |
|-----------|------|-----|
| `?user=USERNAME` | GitHub ユーザー名（プロキシが必要） | `?user=apple502j` |
| `?dataUrl=URL` | JSON データの URL | `?dataUrl=https://example.com/repos.json` |

### 複数言語リポジトリをマニュアルで指定する場合の JSON 例

```json
[
  {
    "name": "ml-dashboard",
    "created_at": "2024-02-15T10:30:00Z",
    "language": ["TypeScript", "Python", "HTML"]
  },
  {
    "name": "cli-tool",
    "created_at": "2023-06-20T14:45:00Z",
    "language": "Rust"
  }
]
```

---

## まとめ：どの方法を選べばいい？

| 状況 | 推奨方法 |
|------|---------|
| とにかく手軽に試したい | JSON データ URL 方式（手順 2） |
| ユーザー名入力で自動表示したい | Vercel デプロイ（手順 3） |
| Vercel が使えない | Cloudflare Workers（手順 4） |
| ポートフォリオに埋め込みたい | JSON URL + iframe（手順 6） |

---

**最終更新:** 2026-04-04  
**対応バージョン:** 2.2.0
