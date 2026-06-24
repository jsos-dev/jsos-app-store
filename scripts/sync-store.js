const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN;
const HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  Authorization: `token ${TOKEN}`,
};

async function apiFetch(url) {
  const resp = await fetch(url, { headers: HEADERS });
  if (!resp.ok) {
    throw new Error(`GitHub API ${resp.status}: ${url}`);
  }
  return resp.json();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function findZipAsset(release) {
  if (!release.assets || release.assets.length === 0) return null;
  const zip = release.assets.find(a => a.name.endsWith('.zip'));
  return zip ? zip.browser_download_url : null;
}

// Convert GitHub URL to raw.githubusercontent.com URL to avoid 302 redirect
// Input:  https://github.com/user/repo/raw/main/icon.svg
// Output: https://raw.githubusercontent.com/user/repo/main/icon.svg
function toRawUrl(url) {
  if (!url) return url;
  const match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/);
  if (match) {
    return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`;
  }
  return url;
}

async function syncStore() {
  const appsDir = path.join(__dirname, '..', 'apps');

  if (!fs.existsSync(appsDir)) {
    console.log('No apps/ directory found, skipping sync.');
    return;
  }

  const files = fs.readdirSync(appsDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} app(s) to sync.`);

  const apps = [];
  const errors = [];

  for (const file of files) {
    const filePath = path.join(appsDir, file);
    try {
      const manifest = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const { owner, repo } = manifest.repository;

      console.log(`Syncing: ${manifest.id} (${owner}/${repo})`);

      // Fetch repo info
      const repoInfo = await apiFetch(`https://api.github.com/repos/${owner}/${repo}`);
      await sleep(500);

      // Fetch latest release
      let latestRelease = null;
      try {
        latestRelease = await apiFetch(
          `https://api.github.com/repos/${owner}/${repo}/releases/latest`
        );
        await sleep(500);
      } catch (e) {
        // No releases yet, that's fine
        console.log(`  No releases found for ${owner}/${repo}`);
      }

      apps.push({
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        category: manifest.category,
        tags: manifest.tags || [],
        repository: {
          owner,
          repo,
          url: repoInfo.html_url,
        },
        version: latestRelease ? latestRelease.tag_name : '0.0.0',
        author: {
          name: repoInfo.owner.login,
          url: repoInfo.owner.html_url,
          avatar: repoInfo.owner.avatar_url,
        },
        stars: repoInfo.stargazers_count,
        license: repoInfo.license ? repoInfo.license.spdx_id : null,
        icon: toRawUrl(manifest.icon) || toRawUrl(`${repoInfo.html_url}/raw/main/icon.svg`),
        updatedAt: repoInfo.pushed_at,
        latestRelease: latestRelease
          ? {
              tag: latestRelease.tag_name,
              date: latestRelease.published_at,
              zipUrl:
                findZipAsset(latestRelease) ||
                `${repoInfo.html_url}/archive/refs/tags/${latestRelease.tag_name}.zip`,
            }
          : null,
      });

      console.log(`  OK: v${latestRelease ? latestRelease.tag_name : '0.0.0'}, ${repoInfo.stargazers_count} stars`);
    } catch (e) {
      console.error(`  FAILED: ${file} — ${e.message}`);
      errors.push({ file, error: e.message });
    }
  }

  // Sort by stars descending
  apps.sort((a, b) => b.stars - a.stars);

  const store = {
    generatedAt: new Date().toISOString(),
    appCount: apps.length,
    apps,
  };

  if (errors.length > 0) {
    store.errors = errors;
  }

  const outputPath = path.join(__dirname, '..', 'store.json');
  fs.writeFileSync(outputPath, JSON.stringify(store, null, 2) + '\n');

  console.log(`\nSync complete: ${apps.length} apps written to store.json`);
  if (errors.length > 0) {
    console.log(`${errors.length} app(s) failed to sync.`);
  }
}

syncStore().catch(e => {
  console.error('Sync failed:', e);
  process.exit(1);
});
