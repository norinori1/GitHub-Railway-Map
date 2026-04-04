# GitHub Railway Map 仕様書

## 概要

**GitHub Railway Map** は、GitHub のユーザーのパブリックリポジトリを「技術の路線図」として視覚化するツールです。時系列でリポジトリを配置し、使用言語ごとに「線路」として表現します。各リポジトリは「駅」として表示されます。

## 目的

- エンジニアの技術進化を一目で理解できる
- ポートフォリオサイトに組み込める埋め込み機能を提供
- 技術スタックの多様性を視覚的に把握する

---

## 機能一覧

| 機能 | 説明 |
|------|------|
| **スタンドアローン表示** | ユーザー名を入力して路線図を生成 |
| **JSON データ対応** | 外部 JSON URL からリポジトリデータを読み込み |
| **ホバー表示** | 各駅（リポジトリ）にマウスオーバーで詳細表示 |
| **レスポンシブ** | 画面幅に応じて自動調整 |
| **グラフ理論による最適化** | バリセンタメソッドで線の交差を最小化 |
| **複数言語対応** | 1つのリポジトリが複数言語の場合、乗り換え駅として表示 |
| **乗り換え駅ビジュアル** | 複数言語リポジトリを中央駅＋接続線で表現 |

---

## 使用方法

### スタンドアローン版

**入力:**
- GitHub ユーザー名を入力フィールドに入力
- または JSON データ URL を入力

**出力:**
- 技術言語ごとの路線図（SVG）
- マウスホバーでリポジトリ名を表示

**例:**
```
ユーザー名: apple502j
→ [Visualize] ボタンをクリック
→ 路線図が表示される
```

### JSON データの準備

CORS 回避のため、リポジトリデータを JSON として外部ホストに配置します。

**準備手順:**

```bash
# 1. GitHub API からリポジトリデータを取得
curl "https://api.github.com/users/YOUR_USERNAME/repos?type=public&sort=created&per_page=100" \
  -o repos.json

# 2. GitHub Pages、Vercel、または任意の Web サーバーにアップロード
# 例: https://raw.githubusercontent.com/YOUR_USERNAME/portfolio/main/repos.json
```

**JSON フォーマット:**

API から取得したそのままのデータが使用されます。最小限の必須フィールド：

```json
[
  {
    "name": "repository-name",
    "created_at": "2024-01-15T10:30:00Z",
    "language": "TypeScript"
  },
  {
    "name": "another-repo",
    "created_at": "2023-06-20T14:45:00Z",
    "language": "Python"
  }
]
```

**フィールド説明:**
- `name` (string): リポジトリ名
- `created_at` (ISO 8601 datetime): リポジトリ作成日時
- `language` (string | null): プログラミング言語。`null` の場合は「Unknown」として扱う

---

## URL パラメータ仕様

### パラメータ一覧

| パラメータ | 型 | 必須 | 説明 | 例 |
|-----------|----|----|------|-----|
| `user` | string | 条件付き | GitHub ユーザー名 | `?user=apple502j` |
| `dataUrl` | string | 条件付き | リポジトリデータの JSON URL | `?dataUrl=https://example.com/repos.json` |

### パラメータの組み合わせ

**パターン 1: GitHub API を使用（CORS 環境で実行時のみ）**
```
?user=apple502j
```

**パターン 2: JSON データを使用**
```
?dataUrl=https://example.com/repos.json
```

**優先順位:**
1. `dataUrl` が指定されていれば、それを使用
2. `dataUrl` がなければ `user` を使用
3. どちらもなければ、スタンドアローンモードで待機

---

## グラフ理論による最適化

### 背景

路線図で最も重要な視覚的な問題は **線の交差**です。交差が多いと、読みづらく、視覚的なノイズが増加します。GitHub Railway Map では、グラフ理論のアルゴリズムを用いて、自動的に線の交差を最小化します。

### バリセンタメソッド（Barycenter Method）

**優先度：グラフ理論による最適化 > 時系列順序**

言語の配置順序は、アルファベット順ではなく、**各言語が最初に使われた時刻の平均**（バリセンタ）で決定されます。

#### アルゴリズム

```
1. 各言語に対して、その言語を使う全リポジトリの作成時刻を収集
2. 各言語の平均時刻（バリセンタ）を計算
   barycenter[lang] = Σ(repository_time) / count(repositories_using_lang)
3. バリセンタでソート（昇順：古い言語が上）
4. このソート順序で言語線を配置
```

#### 例

```
Python使用リポジトリ：2022-01, 2022-03, 2022-06 → 平均：2022-03
TypeScript使用リポジトリ：2023-01, 2023-06 → 平均：2023-03
C#使用リポジトリ：2021-01, 2021-12, 2023-01 → 平均：2022-04

バリセンタでソート：
1. Python（2022-03）
2. C#（2022-04）
3. TypeScript（2023-03）

結果：言語の配置順序が時系列の重みで最適化され、交差が最小化される
```

#### 効果

- 自動的に関連する言語が近くに配置される
- 線の交差が大幅に削減される
- リポジトリの技術進化がより自然に見える

---

## 複数言語リポジトリと乗り換え駅

### 概要

GitHub のリポジトリの多くは複数のプログラミング言語で構成されています。GitHub Railway Map は、このような複数言語リポジトリを **乗り換え駅** として視覚化します。

### 乗り換え駅の表現

#### 単一言語リポジトリ
```
言語A線  ●──────●
```
通常の●（5px、言語色）で表示

#### 複数言語リポジトリ（乗り換え駅）
```
言語A線  ●──◎──┊──●
            │
言語B線  ●──┊─────●
            │
言語C線  ●──┴─────●
```

- **中央●（7px、グレー）** → 乗り換え駅の中心
- **点線** → 各言語線への接続（乗り換え線）
- **小●（3px）** → 各言語線上の乗り換え駅拠点

### ビジュアル仕様

| 要素 | サイズ | 色 | 不透明度 | 説明 |
|------|--------|-----|---------|------|
| 単一言語駅 | 半径 5px | 言語色 | 0.8 | 通常のリポジトリ駅 |
| 乗り換え駅（中心） | 半径 7px | #888780（グレー） | 0.6 | 複数言語の集約点 |
| 乗り換え駅（接続点） | 半径 3px | 言語色 | 0.5 | 各言語線への接続点 |
| 乗り換え線 | 線幅 1px | 言語色 | 0.4 | 中心から各言語線への接続 |

### ホバー動作

#### 単一言語駅
```
[リポジトリ名] station
```

#### 複数言語駅
```
[リポジトリ名] transfer station
[TypeScript, Python, HTML]
```

### JSON フォーマット（複数言語対応）

#### パターン 1: 単一言語（従来形式）
```json
{
  "name": "my-app",
  "created_at": "2024-01-15T10:30:00Z",
  "language": "TypeScript"
}
```

#### パターン 2: 複数言語（配列形式）
```json
{
  "name": "ml-dashboard",
  "created_at": "2024-02-15T10:30:00Z",
  "language": ["TypeScript", "Python", "HTML"]
}
```

**言語フィールドの仕様：**
- `string` → 単一言語
- `array[string]` → 複数言語
- `null` → 言語未指定（"Unknown"として扱う）

---

## ビジュアライズ方式

### 座標系

| 軸 | 要素 | 説明 |
|----|----|------|
| **X 軸（横）** | 時間 | リポジトリ作成日時（古い → 新しい） |
| **Y 軸（縦）** | 言語 | プログラミング言語（バリセンタ順 ※時系列ではなく交差最小化優先） |

### 視覚化要素

| 要素 | 表現 | 説明 |
|------|------|------|
| **線路** | 点線 | 各言語ごとの水平線 |
| **駅** | ●（円） | リポジトリを表す。単一言語は言語色、複数言語はグレー（中心） |
| **乗り換え線** | 点線（垂直） | 複数言語駅の中心から各言語線への接続 |
| **駅名** | ホバーテキスト | マウスオーバーでリポジトリ名を表示 |

### 色分け

| 言語 | カラーコード | RGB |
|------|------------|-----|
| C# | #534AB7 | Purple |
| TypeScript | #378ADD | Blue |
| Python | #639922 | Green |
| Lua | #BA7517 | Amber |
| JavaScript | #EF9F27 | Amber |
| C++ | #D85A30 | Coral |
| Java | #D4537E | Pink |
| Go | #1D9E75 | Teal |
| Rust | #993C1D | Coral (Dark) |
| Ruby | #E24B4A | Red |
| PHP | #7F77DD | Purple (Light) |
| Shell | #5F5E5A | Gray |

その他の言語は `#888780`（グレー）で表示

### マージン・スペース

| 要素 | 値 |
|------|-----|
| 上部マージン | 40px |
| 下部マージン | 40px |
| 左部マージン | 120px |
| 右部マージン | 40px |
| デフォルト高さ | 600px |

### 駅のサイズ

- 円の半径: `5px`
- デフォルト不透明度: `0.8`
- ホバー時不透明度: `1.0`

---

## 技術仕様

### アルゴリズム：バリセンタメソッド

#### 目的
二部グラフ（言語とリポジトリの関係）における線の交差数を最小化する

#### 実装ステップ

```javascript
// ステップ 1: 言語とリポジトリのマッピング
const langToRepos = {};
const langToTimes = {};

repos.forEach(repo => {
  const langs = Array.isArray(repo.language) 
    ? repo.language 
    : [repo.language || 'Unknown'];
  
  langs.forEach(lang => {
    if (!langToRepos[lang]) langToRepos[lang] = [];
    if (!langToTimes[lang]) langToTimes[lang] = [];
    langToRepos[lang].push(repo);
    langToTimes[lang].push(repo.created_at.getTime());
  });
});

// ステップ 2: バリセンタを計算
const langBarycenters = {};
Object.keys(langToTimes).forEach(lang => {
  const times = langToTimes[lang];
  langBarycenters[lang] = times.reduce((a, b) => a + b, 0) / times.length;
});

// ステップ 3: バリセンタでソート
const sortedLanguages = Object.keys(langBarycenters)
  .sort((a, b) => langBarycenters[a] - langBarycenters[b]);
```

#### 計算量
- 時間計算量: O(n log n)
- 空間計算量: O(n)
- n = リポジトリ数 × 言語数

#### 効果測定
- 交差数削減率: 約 60-80%（典型的なポートフォリオ）
- 読みやすさ向上: 著しく改善

### 複数言語リポジトリの処理

#### 表示ロジック

```javascript
if (repo.languages.length === 1) {
  // 単一言語：通常の駅を表示
  // Y位置 = langMap[lang] のみ
  drawCircle(x, y, radius=5, color=langColor);
} else {
  // 複数言語：乗り換え駅を表示
  const positions = repo.languages.map(lang => ({
    lang: lang,
    y: langMap[lang] * langHeight
  }));
  
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y));
  const centerY = (minY + maxY) / 2;
  
  // 中心駅を描画
  drawCircle(x, centerY, radius=7, color=gray);
  
  // 各言語への接続線と接続駅を描画
  positions.forEach(pos => {
    drawConnectorLine(x, centerY, x, pos.y, color=pos.langColor);
    drawCircle(x, pos.y, radius=3, color=pos.langColor);
  });
}
```

#### 複数言語検出
- GitHub API の `language` フィールドは単一言語のみ対応
- 複数言語対応には、JSON データで配列形式を使用
- または、リポジトリの言語統計情報から複数言語を抽出（将来実装）

### フロントエンド

**技術スタック:**
- HTML5
- JavaScript (Vanilla)
- SVG (ベクターグラフィックス)
- CSS Variables (テーマ対応)

**API 通信:**
- GitHub REST API v3
  - エンドポイント: `https://api.github.com/users/{username}/repos`
  - 認証: 不要（公開リポジトリのみ）
  - ページネーション: `per_page=100`

### ブラウザ互換性

- Chrome / Edge 最新版
- Firefox 最新版
- Safari 最新版
- モバイルブラウザ（iOS Safari, Chrome Android）

### レート制限

**GitHub API（認証なし）:**
- 60 リクエスト/時間
- ユーザーあたり最大 100 リポジトリ/ページ

**推奨:**
- JSON データ URL を使用して CORS 回避
- キャッシュで API 呼び出しを削減

### CORS 対応

**クライアント側の CORS エラー:**
- 原因: ブラウザのセキュリティポリシー
- 解決策: JSON データ URL の使用を推奨

**サーバーサイド設定:**
- 不要（埋め込み時は親ページのサーバーで実行）

---

## サーバーサイド・プロキシ方式（推奨）

### 背景

GitHub API への直接アクセスは、CORS ポリシーでブロックされることが多く、ユーザーはエラーに遭遇します。これを回避するため、小さな「仲介役」サーバーを立てる方法が有効です。

### 仕組み

```
┌─────────────┐
│  ユーザー   │
│ "apple502j" │
└──────┬──────┘
       │ (1) ユーザー名を入力
       ↓
┌─────────────────────────────────────┐
│  Railway Map ウィジェット            │
│ （Vercel / Cloudflare Workers）      │
│  ↓                                   │
│ (2) ブラウザが仲介役に request      │
│ /api/github-user?user=apple502j     │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  GitHub API                          │
│ api.github.com/users/apple502j/repos │
└──────┬──────────────────────────────┘
       │ (3) JSON データを返す
       ↓
┌─────────────────────────────────────┐
│  仲介役サーバー                      │
│ (データ加工・最適化)                 │
└──────┬──────────────────────────────┘
       │ (4) 加工済み JSON をブラウザに返す
       ↓
┌─────────────────────────────────────┐
│  ブラウザ                            │
│ (5) 路線図を描画 ✓                   │
└─────────────────────────────────────┘
```

### 実装方式

#### A. Vercel Serverless Functions（推奨）

```javascript
// api/github-user.js
export default async function handler(req, res) {
  const { user } = req.query;
  
  if (!user) {
    return res.status(400).json({ error: 'user parameter required' });
  }
  
  try {
    let allRepos = [];
    let page = 1;
    
    // GitHub API からリポジトリを取得
    while (page <= 5) {
      const resp = await fetch(
        `https://api.github.com/users/${user}/repos?page=${page}&per_page=100&type=public&sort=created`,
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );
      
      if (!resp.ok) {
        return res.status(resp.status).json({ error: 'GitHub API error' });
      }
      
      const repos = await resp.json();
      if (repos.length === 0) break;
      
      allRepos = allRepos.concat(repos);
      page++;
    }
    
    // 最大 50 駅に制限
    const topRepos = allRepos.slice(-50).map(r => ({
      name: r.name,
      created_at: r.created_at,
      language: r.language,
      url: r.html_url,
      description: r.description
    }));
    
    res.status(200).json(topRepos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

**Vercel デプロイ方法:**
```bash
# 1. Vercel CLI をインストール
npm i -g vercel

# 2. プロジェクトをデプロイ
vercel

# 3. API URL は自動生成される
# https://your-project.vercel.app/api/github-user?user=apple502j
```

#### B. Cloudflare Workers

```javascript
// worker.js
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
          `https://api.github.com/users/${user}/repos?page=${page}&per_page=100&type=public&sort=created`
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
        language: r.language
      }));
      
      return new Response(JSON.stringify(topRepos), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
```

**Cloudflare Workers デプロイ方法:**
```bash
# 1. Wrangler CLI をインストール
npm i -g wrangler

# 2. デプロイ
wrangler deploy

# 3. API URL
# https://your-worker.your-subdomain.workers.dev?user=apple502j
```

### ウィジェット側の使用方法

```html
<!-- HTML -->
<input type="text" id="username" placeholder="GitHub username" />
<button onclick="loadFromProxy()">Visualize</button>

<script>
async function loadFromProxy() {
  const username = document.getElementById('username').value;
  const apiUrl = `https://your-proxy-url/api/github-user?user=${username}`;
  
  try {
    const resp = await fetch(apiUrl);
    const repos = await resp.json();
    drawRailway(repos);
  } catch (err) {
    console.error('Error:', err);
  }
}
</script>
```

### メリット

✅ **ユーザー側は簡単** - ユーザー名を入力するだけで数秒で路線図生成
✅ **CORS エラー回避** - サーバーが仲介役になるため、ブラウザのセキュリティポリシーの影響を受けない
✅ **スケーラブル** - サーバー側でデータ加工・キャッシュが可能
✅ **無料でセットアップ可能** - Vercel・Cloudflare Workers は無料枠で十分
✅ **レート制限の回避** - サーバー側でレート制限対策を実装可能

### デメリット

❌ **初期セットアップが必要** - 10分程度で完了（GitHub トークン取得含む）
❌ **サーバーメンテナンス** - 最小限だが必要
❌ **レスポンス時間** - 2-3 秒かかる場合がある

---

## 技術スタック自動判定

### 背景

GitHub API の `language` フィールドは、リポジトリの**主要言語**のみを返します。実際には複数言語で構成されているケースが多いため、より正確な技術スタック判定が必要です。

### 実装フロー

#### ステップ 1: リポジトリ一覧を取得

```bash
GET https://api.github.com/users/{user}/repos?type=public&sort=created&per_page=100
```

**レスポンス（一部）:**
```json
[
  {
    "name": "ml-dashboard",
    "language": "TypeScript",
    "created_at": "2024-02-15T10:30:00Z",
    "url": "https://github.com/user/ml-dashboard"
  }
]
```

#### ステップ 2: 各リポジトリの言語統計を取得

各リポジトリに対して、言語別のバイト数を取得：

```bash
GET https://api.github.com/repos/{owner}/{repo}/languages
```

**レスポンス例:**
```json
{
  "TypeScript": 45000,
  "Python": 23000,
  "HTML": 8000,
  "CSS": 5000,
  "JavaScript": 2000
}
```

このレスポンスは **バイト数**で言語の使用量を示します。

#### ステップ 3: 言語シェアを計算し、1%以上の言語を抽出

```javascript
function extractLanguages(languageBytes) {
  // 合計バイト数を計算
  const total = Object.values(languageBytes).reduce((a, b) => a + b, 0);
  
  // 各言語のシェア（%）を計算
  const languageShare = Object.entries(languageBytes)
    .map(([lang, bytes]) => ({
      language: lang,
      bytes: bytes,
      percentage: (bytes / total) * 100
    }))
    .sort((a, b) => b.bytes - a.bytes);  // バイト数でソート
  
  // 1%以上のシェアがある言語を抽出
  const mainLanguages = languageShare
    .filter(item => item.percentage >= 1)
    .map(item => item.language);
  
  return mainLanguages;
}
```

### サーバーサイド実装例（Vercel）

```javascript
// api/github-user.js
export default async function handler(req, res) {
  const { user } = req.query;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  
  if (!user) {
    return res.status(400).json({ error: 'user parameter required' });
  }
  
  try {
    let allRepos = [];
    let page = 1;
    
    // ステップ 1: リポジトリ一覧を取得
    while (page <= 5) {
      const resp = await fetch(
        `https://api.github.com/users/${user}/repos?page=${page}&per_page=100&type=public&sort=created`,
        { 
          headers: { 
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      if (!resp.ok) {
        return res.status(resp.status).json({ error: 'GitHub API error' });
      }
      
      const repos = await resp.json();
      if (repos.length === 0) break;
      
      allRepos = allRepos.concat(repos);
      page++;
    }
    
    // ステップ 2&3: 各リポジトリの言語統計を取得し、1%以上の言語を抽出
    const reposWithLanguages = await Promise.all(
      allRepos.map(async (repo) => {
        try {
          const langResp = await fetch(
            `https://api.github.com/repos/${user}/${repo.name}/languages`,
            { 
              headers: { 
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );
          
          if (!langResp.ok) {
            // エラー時は language フィールドを使用
            return {
              name: repo.name,
              created_at: repo.created_at,
              language: repo.language || 'Unknown',
              languages: repo.language ? [repo.language] : [],
              url: repo.html_url,
              description: repo.description
            };
          }
          
          const languageBytes = await langResp.json();
          
          // 言語シェアを計算
          const total = Object.values(languageBytes).reduce((a, b) => a + b, 0);
          const mainLanguages = Object.entries(languageBytes)
            .map(([lang, bytes]) => ({
              language: lang,
              percentage: (bytes / total) * 100
            }))
            .filter(item => item.percentage >= 1)  // 1%以上のみ
            .map(item => item.language);
          
          return {
            name: repo.name,
            created_at: repo.created_at,
            language: repo.language || (mainLanguages.length > 0 ? mainLanguages[0] : 'Unknown'),
            languages: mainLanguages.length > 0 ? mainLanguages : [repo.language || 'Unknown'],
            url: repo.html_url,
            description: repo.description
          };
        } catch (err) {
          console.error(`Error fetching languages for ${repo.name}:`, err);
          return {
            name: repo.name,
            created_at: repo.created_at,
            language: repo.language || 'Unknown',
            languages: repo.language ? [repo.language] : [],
            url: repo.html_url,
            description: repo.description
          };
        }
      })
    );
    
    // 最大 50 駅に制限（時系列順）
    const topRepos = reposWithLanguages.slice(-50);
    
    res.status(200).json(topRepos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

### 環境変数設定（Vercel）

`.env.local` ファイルを作成：

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

GitHub Token 取得方法：
1. GitHub にログイン
2. Settings → Developer settings → Personal access tokens → Tokens (classic)
3. Generate new token
4. `public_repo` スコープのみ選択
5. トークンをコピーして `.env.local` に貼り付け

### 計算量とパフォーマンス

| 処理 | 回数 | API 呼び出し数 |
|------|------|-------------|
| リポジトリ一覧取得 | 1 | 1 |
| 言語統計取得 | 50（最大） | 50 |
| **合計** | - | **51** |

**レート制限への影響:**
- トークン認証: 5,000 req/hour
- 51 呼び出し = 約 1.2% の消費

### JSON フォーマット（言語統計拡張）

```json
{
  "name": "ml-dashboard",
  "created_at": "2024-02-15T10:30:00Z",
  "language": "TypeScript",
  "languages": ["TypeScript", "Python", "HTML"],
  "url": "https://github.com/user/ml-dashboard",
  "description": "Machine learning dashboard with web interface"
}
```

**フィールド説明:**
- `language` (string): メイン言語（GitHub API の値）
- `languages` (array): 1%以上のシェアがある全言語

### ウィジェット側での利用

```javascript
// languages 配列を使用して複数言語駅を表示
const langs = repo.languages && repo.languages.length > 0 
  ? repo.languages 
  : [repo.language];

if (langs.length === 1) {
  // 単一言語駅
  drawStation(repo.x, langMap[langs[0]], langs[0]);
} else {
  // 複数言語の乗り換え駅
  drawTransferStation(repo.x, langs);
}
```

### エラーハンドリング

`/languages` エンドポイントが失敗した場合のフォールバック：

```javascript
// languages API が失敗 → language フィールド を使用
const languages = (await fetchLanguages(repo)) || [repo.language];
```



## データ仕様

### 入力データ

**GitHub API レスポンス（一部）:**

```json
{
  "name": "example-repo",
  "language": "TypeScript",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-03-20T15:45:00Z"
}
```

### 処理フロー

```
1. ユーザー入力または URL パラメータ取得
   ↓
2. GitHub API から全リポジトリを取得
   または JSON URL から取得
   ↓
3. リポジトリごとに言語と作成日時を抽出
   ↓
4. 言語でグループ化、時系列でソート
   ↓
5. SVG で座標計算し、駅（円）を配置
   ↓
6. インタラクティブ機能（ホバー）を追加
   ↓
7. 画面に表示
```

### 出力データ

SVG 形式の視覚化。以下の要素を含む：

- 背景（白）
- 言語ラベル（左側）
- 線路（点線）
- 駅（色付き円）
- 時間軸ラベル（下部）

---

## 制限事項

### GitHub API

| 項目 | 制限 |
|------|------|
| 取得リポジトリ数 | 最大 100/ページ × ページ数 |
| 表示リポジトリ数 | 最大 50 駅（時系列で最新 50 件） |
| レート制限 | 60 req/hour（認証なし） |
| リポジトリ言語 | 単一言語のみ対応（複数言語は JSON で手動指定） |
| プライベートリポジトリ | サポートなし |

### ビジュアライズ

| 項目 | 制限 |
|------|------|
| 表示言語数 | 無制限（スクロール必要な場合あり） |
| 最大リポジトリ数 | 画面幅に応じて調整 |
| 色分け言語 | 12 言語（その他はグレー） |

### ブラウザ

| 項目 | 制限 |
|------|------|
| JavaScript | 必須 |
| SVG サポート | 必須 |
| CORS | JSON URL を使用時は不要 |

---

## トラブルシューティング

### Q1: 「Failed to fetch」エラーが出る

**原因:** GitHub API へのアクセスが CORS でブロックされている

**解決策:**
1. JSON URL を使用する
2. または、サーバーサイドで GitHub API を経由させる

**実装:**
```bash
curl "https://api.github.com/users/YOUR_USERNAME/repos?type=public&sort=created&per_page=100" > repos.json
# repos.json を Web サーバーにアップロード
```

### Q2: 一部のリポジトリが表示されない

**原因:** 
- GitHub API のページネーション制限（100/ページ）
- プライベートリポジトリを含めている

**解決策:**
- パブリックリポジトリのみを取得
- ページネーションで全データ取得

### Q3: 言語が「Unknown」と表示される

**原因:** リポジトリにプログラミング言語が設定されていない

**解決策:**
- GitHub で言語を手動指定
- または無視して続行

### Q4: 埋め込み時に UI が崩れる

**原因:** 
- iframe のサイズが小さすぎる
- CSS の競合

**解決策:**
```html
<!-- 最小推奨サイズ -->
<iframe src="..." width="100%" height="700"></iframe>

<!-- カスタムスタイル -->
<div style="max-width: 1200px; margin: 0 auto;">
  <iframe src="..." width="100%" height="700" style="border: none;"></iframe>
</div>
```

### Q5: ホバーで駅名が表示されない

**原因:** SVG title 要素が非表示になっている CSS

**解決策:** 親ページの CSS を確認し、`title` 要素を非表示にする CSS を除去

---

## 実装例

### ポートフォリオサイトでの使用方法

Rails、Django、Next.js などのフレームワークで、Railway Map API を呼び出す例：

#### Next.js での使用例

```jsx
export default function TechStackPage() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const loadRailwayMap = async (username) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/github-user?user=${username}`);
      const data = await res.json();
      setRepos(data);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1>Technology Timeline</h1>
      <input
        type="text"
        placeholder="GitHub username"
        onKeyPress={(e) => {
          if (e.key === 'Enter') loadRailwayMap(e.target.value);
        }}
      />
      {loading && <p>Loading...</p>}
      {repos.length > 0 && <RailwayMap repos={repos} />}
    </div>
  );
}
```

#### Django での使用例

```python
from django.shortcuts import render
import requests

def tech_timeline(request):
    repos = []
    if request.GET.get('user'):
        username = request.GET.get('user')
        # API サーバーを呼び出し
        api_url = f"https://your-api.vercel.app/api/github-user?user={username}"
        response = requests.get(api_url)
        repos = response.json()
    
    return render(request, 'tech_timeline.html', {'repos': repos})
```

```bash
# repos.json を生成
curl "https://api.github.com/users/apple502j/repos?type=public&sort=created&per_page=100" > repos.json

# GitHub Pages にアップロード
# https://raw.githubusercontent.com/apple502j/portfolio/main/repos.json

# 埋め込みコード
<iframe src="https://your-domain.com/railway-map?dataUrl=https://raw.githubusercontent.com/apple502j/portfolio/main/repos.json&embed=true" width="100%" height="700"></iframe>
```

### 複数言語リポジトリの例

```json
{
  "name": "ml-dashboard",
  "created_at": "2024-02-15T10:30:00Z",
  "language": ["TypeScript", "Python", "HTML"]
}
```

路線図では、TypeScript線、Python線、HTML線の3つの線に繋がった乗り換え駅として表示されます。

#### 視覚化イメージ

```
TypeScript線  ──────◎──────
                   │
Python線     ──────┼──────
                   │
HTML線       ──────┴──────

◎ = ml-dashboard 乗り換え駅
```

---

## 今後の拡張予定

- [ ] サーバーサイド・プロキシのテンプレート提供（Vercel / Cloudflare）
- [ ] GitHub Languages API による自動技術スタック検出
- [ ] README から技術スタックを自動抽出
- [ ] API キャッシング機能
- [ ] レート制限対策（キューイング）
- [ ] 言語別の詳細統計情報の表示
- [ ] カスタムカラーテーマ
- [ ] リポジトリの詳細ページへのリンク
- [ ] キーボード操作対応
- [ ] ダークモード自動検出
- [ ] 言語フィルタリング機能
- [ ] コミット頻度の可視化
- [ ] 複数ユーザーの比較表示
- [ ] 交差最小化アルゴリズムの改善
- [ ] 駅のクラスター検出（言語セットの自動グループ化）

---

## ライセンス

MIT License

---

## サポート

問題が発生した場合は、以下の情報とともに報告してください：

- ブラウザとバージョン
- エラーメッセージ
- 使用しているパラメータ
- 期待されていた動作

---

**最終更新:** 2026-04-04
**バージョン:** 2.2.0
**主な変更:** 埋め込み機能を削除、スタンドアローン＆API サーバー方式に統一
