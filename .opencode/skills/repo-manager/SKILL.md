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

## Registry Operations

### Registry File

Location: `data/repos.json`

### Registry Entry Format

```typescript
interface RepoEntry {
  id: string;           // Format: "owner/repo"
  url: string;          // GitHub URL
  owner: string;        // Repository owner
  repo: string;         // Repository name
  stars?: number;       // Star count (optional)
  tags?: string[];      // Category tags (optional)
  difficulty?: string;  // "beginner" | "intermediate" | "advanced"
  cloned_at?: string;   // ISO timestamp when cloned
  last_commit?: string; // Last known commit SHA
}
```

### Read Registry

```typescript
import { readFileSync } from "fs";
const registry = JSON.parse(readFileSync("data/repos.json", "utf-8"));
```

### Update Registry

Always validate before writing:

```typescript
import { writeFileSync } from "fs";

function updateRegistry(entries: RepoEntry[]) {
  // Validate all entries have required fields
  for (const entry of entries) {
    if (!entry.id || !entry.url || !entry.owner || !entry.repo) {
      throw new Error(`Invalid entry: ${JSON.stringify(entry)}`);
    }
    // Validate id format
    if (!entry.id.includes("/")) {
      throw new Error(`Invalid id format: ${entry.id}`);
    }
  }
  writeFileSync("data/repos.json", JSON.stringify(entries, null, 2));
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

### Add New Repo

1. Verify repo exists on GitHub
2. Create entry with required fields
3. Append to registry
4. Run sync to clone

```typescript
// Example: Add new repo
const newEntry = {
  id: "vercel/next.js",
  url: "https://github.com/vercel/next.js",
  owner: "vercel",
  repo: "next.js",
  tags: ["framework", "react", "ssr"],
  difficulty: "intermediate"
};

registry.push(newEntry);
updateRegistry(registry);
```

### Update Existing Entry

```typescript
// Find and update
const entry = registry.find(e => e.id === "vercel/next.js");
if (entry) {
  entry.tags = [...entry.tags, "production-ready"];
  updateRegistry(registry);
}
```

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
echo "[]" > data/repos.json
```

### Invalid Repo Format

- Ensure id matches "owner/repo" pattern
- Verify owner and repo fields match id
- Check URL is valid GitHub URL

### Sync Failures

Common causes:
- Network issues → Retry with backoff
- Rate limiting → Wait or use GITHUB_TOKEN
- Repo deleted/archived → Remove from registry
- Permissions → Check Git credentials

### Network Issues

```bash
# Check connectivity first
ping github.com

# Use GITHUB_TOKEN for higher rate limits
export GITHUB_TOKEN=ghp_your_token
```

## Quick Reference

### Commands

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
├── [0].id          "owner/repo"
├── [0].url         "https://github.com/owner/repo"
├── [0].owner       "owner"
├── [0].repo        "repo"
├── [0].stars?      number
├── [0].tags?       string[]
├── [0].difficulty? "beginner" | "intermediate" | "advanced"
├── [0].cloned_at?  ISO timestamp
└── [0].last_commit? SHA string
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Higher API rate limits (60 → 5000 req/hr) |

## Separation of Concerns

This skill ONLY manages:
- Registry file (data/repos.json)
- Repository cloning and syncing
- Registry maintenance

It does NOT:
- Analyze repository content → Use `github-researcher`
- Generate documentation → Use `github-researcher`
- Compare projects → Use `survey-synthesizer`