// api/github-user.js
// Vercel Serverless Function - GitHub API プロキシ
// CORS を回避し、複数言語統計 (10% 以上) を付与して返します。

export default async function handler(req, res) {
  // CORS ヘッダー
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { user } = req.query;

  if (!user) {
    return res.status(400).json({ error: 'user parameter required' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Railway-Map',
    ...(GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}),
  };

  try {
    // ステップ 1: リポジトリ一覧を全ページ取得（最大 5 ページ = 500 件）
    let allRepos = [];
    for (let page = 1; page <= 5; page++) {
      const resp = await fetch(
        `https://api.github.com/users/${encodeURIComponent(user)}/repos?page=${page}&per_page=100&type=public&sort=created`,
        { headers }
      );

      if (!resp.ok) {
        if (resp.status === 404) {
          return res.status(404).json({ error: `User "${user}" not found` });
        }
        return res.status(resp.status).json({ error: 'GitHub API error' });
      }

      const repos = await resp.json();
      if (!Array.isArray(repos) || repos.length === 0) break;

      allRepos = allRepos.concat(repos);
    }

    // 時系列で最新 50 件に絞る
    const targetRepos = allRepos
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-50);

    // ステップ 2 & 3: 言語統計を取得し 10% 以上の言語を抽出
    const reposWithLanguages = await Promise.all(
      targetRepos.map(async (repo) => {
        const base = {
          name: repo.name,
          created_at: repo.created_at,
          language: repo.language || 'Unknown',
          languages: repo.language ? [repo.language] : ['Unknown'],
          url: repo.html_url,
          description: repo.description,
        };

        try {
          const langResp = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo.name)}/languages`,
            { headers }
          );

          if (!langResp.ok) return base;

          const languageBytes = await langResp.json();
          const total = Object.values(languageBytes).reduce((a, b) => a + b, 0);
          if (total === 0) return base;

          const mainLanguages = Object.entries(languageBytes)
            .map(([lang, bytes]) => ({ language: lang, percentage: (bytes / total) * 100 }))
            .filter(item => item.percentage >= 10)
            .map(item => item.language);

          return {
            ...base,
            languages: mainLanguages.length > 0 ? mainLanguages : base.languages,
          };
        } catch (_) {
          return base;
        }
      })
    );

    return res.status(200).json(reposWithLanguages);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
