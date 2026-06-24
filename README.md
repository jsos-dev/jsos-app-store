# JSOS App Store

Community-driven app registry for [JSOS](https://jsos.dev) applications.

## How It Works

1. **Submit** — Open an Issue using the "Register New App" template
2. **Review** — A maintainer reviews your submission
3. **Approve** — Once approved, a PR is automatically created
4. **Merge** — After PR review, your app is registered
5. **Sync** — A scheduled workflow fetches latest data from your repo every 6 hours
6. **Discover** — Your app appears in the JSOS App Store

## Submitting an App

1. Go to [Issues](https://github.com/jsos-dev/jsos-app-store/issues/new?template=register-app.yml)
2. Fill out the form with your app's information
3. Submit and wait for maintainer review

### Requirements

- Your app must be a valid JSOS application
- Your `package.json` must include a `jsos` field with `id` and `startCommand`
- The repository must be public on GitHub

### App ID Format

Use the format `domain.category.name`:

```
dev.tool.markdown-editor
com.game.tetris
org.util.file-manager
```

## Repository Structure

```
jsos-app-store/
├── apps/                    # Registered app manifests
│   ├── dev.tool.app-a.json
│   └── com.game.app-b.json
├── store.json               # Auto-generated app data (DO NOT edit manually)
├── .github/
│   ├── ISSUE_TEMPLATE/      # Issue forms
│   └── workflows/           # CI/CD automation
└── scripts/
    └── sync-store.js        # Store sync script
```

## For Maintainers

### Reviewing Submissions

1. When a new Issue is opened with the `app-registration` label, review the submitted information
2. Verify the repository exists and contains a valid JSOS app
3. If approved: add the `approved` label — this triggers automatic PR creation
4. If rejected: add the `rejected` label and comment with the reason

### Labels

| Label | Purpose |
|-------|---------|
| `app-registration` | Auto-added to new submission Issues |
| `approved` | Maintainer approval — triggers PR creation |
| `rejected` | Submission rejected — triggers explanatory comment |

## How store.json Is Generated

The `sync-store.js` script runs every 6 hours via GitHub Actions:

1. Reads all `apps/*.json` files
2. For each app, fetches repo metadata and latest release from GitHub API
3. Aggregates data into `store.json`
4. Commits and pushes the updated file

The `store.json` file is consumed by the JSOS App Manager frontend.

## License

MIT
