---
name: repo-manager
description: |
  Manage GitHub repository registry and sync operations. Triggers: "同步所有项目", "sync all repos", "检查更新", "check updates", "更新项目", "update repo", "注册项目", "register repo". Handles repository cloning, syncing, and registry maintenance via data/repos.json.
---

# Repo Manager

Manage GitHub repository registry and sync operations for the Survey project.

## Mode Detection

| Trigger | Mode | Action |
|---------|------|--------|
| "同步所有项目", "sync all repos" | SYNC_ALL | Sync all repos in registry |
| "检查更新", "check updates" | CHECK_UPDATES | Check which repos have updates |
| "更新 xxx", "update xxx" | UPDATE_SINGLE | Update specific repo |
| "注册项目", "register repo" | REGISTER | Add new repo to registry |

## CLI Commands

Use `bun scripts/repo-cli.ts` for all registry operations. This is the preferred method over direct JSON manipulation.

### Command Reference

| Command | Purpose |
|---------|---------|
| `add <owner/repo>` | Add new repo to registry |
| `update <owner/repo>` | Update existing repo entry |
| `remove <owner/repo>` | Remove repo from registry |
| `get <owner/repo>` | Get repo details |
| `list` | List all repos in registry |
| `validate` | Check registry integrity |
| `repair` | Fix registry formatting issues |

### Add New Repo

```bash
bun scripts/repo-cli.ts add <owner/repo> [options]

Options:
  --description "desc"  Repository description
  --tags a,b,c          Comma-separated tags
  --level <level>       beginner | intermediate | advanced | expert
  --stars <number>      Star count
```

Examples:
```bash
# Add with basic info
bun scripts/repo-cli.ts add vercel/next.js

# Add with full metadata
bun scripts/repo-cli.ts add vercel/next.js \
  --description "The React Framework" \
  --tags react,framework,ssr \
  --level intermediate \
  --stars 120000
```

### Update Existing Repo

```bash
bun scripts/repo-cli.ts update <owner/repo> [options]

Options:
  --description "desc"  Update description
  --tags a,b,c          Replace tags
  --level <level>       Update difficulty level
  --stars <number>      Update star count (use "null" to remove)
```

Examples:
```bash
# Update level
bun scripts/repo-cli.ts update vercel/next.js --level advanced

# Update tags
bun scripts/repo-cli.ts update vercel/next.js --tags react,framework,production-ready

# Remove stars field
bun scripts/repo-cli.ts update vercel/next.js --stars null
```

### Remove Repo

```bash
bun scripts/repo-cli.ts remove <owner/repo>
```

### Get Repo Details

```bash
# Human-readable output
bun scripts/repo-cli.ts get vercel/next.js

# JSON output (for LLM parsing)
bun scripts/repo-cli.ts get vercel/next.js --json
```

### List All Repos

```bash
# Human-readable output (one ID per line)
bun scripts/repo-cli.ts list

# JSON output
bun scripts/repo-cli.ts list --json
```

### Validate Registry

```bash
# Human-readable output
bun scripts/repo-cli.ts validate

# JSON output
bun scripts/repo-cli.ts validate --json
```

### Repair Registry

Fixes formatting issues, normalizes entries:

```bash
bun scripts/repo-cli.ts repair
```

Use when:
- Registry has inconsistent formatting
- Fields are missing or malformed
- After manual JSON edits

## JSON Output Format

Use `--json` flag for machine-readable output, suitable for LLM parsing.

### get --json

```json
{
  "id": "vercel/next.js",
  "url": "https://github.com/vercel/next.js",
  "owner": "vercel",
  "repo": "next.js",
  "description": "The React Framework",
  "stars": 120000,
  "tags": ["react", "framework", "ssr"],
  "level": "intermediate",
  "valid": true
}
```

### list --json

```json
[
  { "id": "vercel/next.js", "url": "https://github.com/vercel/next.js", ... },
  { "id": "facebook/react", "url": "https://github.com/facebook/react", ... }
]
```

### validate --json

Valid registry:
```json
{ "valid": true, "count": 34 }
```

Invalid registry:
```json
{
  "valid": false,
  "errors": [
    { "id": "invalid-entry", "error": "Missing required field: url" }
  ]
}
```

## Registry Entry Format

```typescript
interface RepoEntry {
  id: string;           // Format: "owner/repo"
  url: string;          // GitHub URL
  owner: string;        // Repository owner
  repo: string;         // Repository name
  description?: string; // Short description
  stars?: number;       // Star count (optional)
  tags?: string[];      // Category tags (optional)
  level?: string;       // "beginner" | "intermediate" | "advanced" | "expert"
  cloned_at?: string;   // ISO timestamp when cloned
  last_commit?: string; // Last known commit SHA
  renamed_at?: string;  // ISO timestamp when renamed
}
```

## Sync Operations

### Primary Script

Use `bun scripts/sync-repos.ts` for all sync operations.

### Available Commands

| Command | Purpose |
|---------|---------|
| `bun scripts/sync-repos.ts` | Sync all repos (clone missing, pull existing) |
| `bun scripts/sync-repos.ts --check` | Check which repos have updates |
| `bun scripts/sync-repos.ts --clone` | Only clone missing repos |
| `bun scripts/sync-repos.ts --pull` | Only pull existing repos |
| `bun scripts/sync-repos.ts --update-registry` | Check and update renamed repos |
| `bun scripts/sync-repos.ts --update-registry --rename-dirs` | Update registry and rename local dirs |
| `bun scripts/sync-repos.ts --verify` | Verify registry integrity |
| `bun scripts/sync-repos.ts --verify-fix` | Auto-fix orphaned repos |
| `bun scripts/sync-repos.ts --verify-fix --concurrent N` | Fix with controlled concurrency |
| `bun scripts/sync-repos.ts <owner/repo>` | Sync single repo |

### Output Directory Convention

Cloned repositories go to: `github/{owner}/{repo}/`

This directory is gitignored - repos are local clones only.

## Registry Maintenance

### Check Renamed Repos

GitHub repos can be renamed. Use `--update-registry` to detect and fix:

```bash
bun scripts/sync-repos.ts --update-registry
```

This checks each repo's current name via GitHub API and updates the registry.

Use `--rename-dirs` to also rename local directories:

```bash
bun scripts/sync-repos.ts --update-registry --rename-dirs
```

### Registry Verification

Check and fix registry integrity issues:

```bash
# Verify registry integrity (dry run)
bun scripts/sync-repos.ts --verify

# Auto-fix orphaned repos (clone missing repos)
bun scripts/sync-repos.ts --verify-fix

# Fix with controlled concurrency (prevent system overload)
bun scripts/sync-repos.ts --verify-fix --concurrent 3
```

#### Verification Checks

| Check Type | Description | Auto-Fix |
|------------|-------------|----------|
| Orphaned entries | In registry but no local clone | Clone repo |
| Unindexed repos | Local repo but not in registry | Add to registry |
| Invalid entries | Missing required fields | Remove from registry |

#### Verification Report

Running `--verify` produces a report showing:
- Total repos in registry
- Orphaned entries (repos in registry without local clone)
- Unindexed repos (local repos not in registry)
- Invalid entries (malformed registry entries)

## Error Handling

### Registry File Not Found

```bash
# Create empty registry
echo '{"version":"1.0","updated_at":"2024-01-01T00:00:00Z","repos":[]}' > data/repos.json
```

### Invalid Repo Format

- Ensure id matches "owner/repo" pattern
- Verify owner and repo fields match id
- Check URL is valid GitHub URL

### Sync Failures

Common causes:
- Network issues -> Retry with backoff
- Rate limiting -> Wait or use GITHUB_TOKEN
- Repo deleted/archived -> Remove from registry
- Permissions -> Check Git credentials

### Network Issues

```bash
# Check connectivity first
ping github.com

# Use GITHUB_TOKEN for higher rate limits
export GITHUB_TOKEN=ghp_your_token
```

## Quick Reference

### Registry CLI Commands

| Operation | Command |
|-----------|---------|
| Add repo | `bun scripts/repo-cli.ts add <owner/repo>` |
| Update repo | `bun scripts/repo-cli.ts update <owner/repo> [options]` |
| Remove repo | `bun scripts/repo-cli.ts remove <owner/repo>` |
| Get repo | `bun scripts/repo-cli.ts get <owner/repo>` |
| List all | `bun scripts/repo-cli.ts list` |
| Validate | `bun scripts/repo-cli.ts validate` |
| Repair | `bun scripts/repo-cli.ts repair` |

### Sync Commands

| Operation | Command |
|-----------|---------|
| Sync all | `bun scripts/sync-repos.ts` |
| Check updates | `bun scripts/sync-repos.ts --check` |
| Clone missing | `bun scripts/sync-repos.ts --clone` |
| Pull existing | `bun scripts/sync-repos.ts --pull` |
| Fix renamed | `bun scripts/sync-repos.ts --update-registry` |
| Verify registry | `bun scripts/sync-repos.ts --verify` |
| Fix orphaned | `bun scripts/sync-repos.ts --verify-fix` |
| Sync single | `bun scripts/sync-repos.ts owner/repo` |

### Registry Schema

```
data/repos.json
├── version           "1.0"
├── updated_at        ISO timestamp
└── repos[]
    ├── [0].id          "owner/repo"
    ├── [0].url         "https://github.com/owner/repo"
    ├── [0].owner       "owner"
    ├── [0].repo        "repo"
    ├── [0].description?  string
    ├── [0].stars?       number
    ├── [0].tags?        string[]
    ├── [0].level?       "beginner" | "intermediate" | "advanced" | "expert"
    ├── [0].cloned_at?   ISO timestamp
    ├── [0].last_commit? SHA string
    └── [0].renamed_at?  ISO timestamp
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Higher API rate limits (60 -> 5000 req/hr) |

## Separation of Concerns

This skill ONLY manages:
- Registry file (data/repos.json)
- Repository cloning and syncing
- Registry maintenance

It does NOT:
- Analyze repository content -> Use `github-researcher`
- Generate documentation -> Use `github-researcher`
- Compare projects -> Use `survey-synthesizer`