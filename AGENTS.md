# AGENTS.md - Survey Repository Guide

## Project Overview

Survey is a TypeScript + Bun repository for research-material workflows.

- `scripts/` for automation and CLIs
- `data/` for registries and generated indexes
- `.opencode/skills/` for project-specific agent skills
- `research/` for generated outputs (papers, github analyses, surveys, domains)

## Build / Run / Test Commands

Run Bun commands directly. The root `package.json` is minimal.

```bash
# Run a single test file (PREFERRED)
bun test scripts/lib/repo-registry.test.ts
bun test scripts/lib/github-repos.test.ts
bun test scripts/repo-cli.test.ts

# Run all repo-owned tests explicitly (avoid bare bun test)
bun test scripts/repo-cli.test.ts scripts/sync-repos.test.ts scripts/lib/repo-registry.test.ts scripts/synthesis-lib.test.ts

# Watch mode for development
bun test --watch scripts/repo-cli.test.ts

# CLI scripts
bun scripts/sync-repos.ts --check
bun scripts/sync-repos.ts --clone
bun scripts/sync-repos.ts --pull
bun scripts/sync-repos.ts vercel/next.js

bun scripts/repo-cli.ts list --json
bun scripts/repo-cli.ts get vercel/next.js --json
bun scripts/repo-cli.ts validate

bun scripts/test-synthesis.ts --list-sources
bun scripts/test-synthesis.ts --topic "LLM" --json
bun scripts/test-synthesis.ts --validate-manifests

bun scripts/generate-domain-index.ts

# Path resolution utilities
bun scripts/project-paths.ts papers
bun scripts/project-paths.ts github
bun scripts/project-paths.ts --json
```

**Important:** **NEVER use bare `bun test`** — it discovers tests inside cloned repos under `sources/` and fails for unrelated reasons. Always specify explicit test file paths.

## Repository Structure

```
./
├── .opencode/skills/        # Project-specific OpenCode skills
├── data/
│   ├── registries/           # Repository registries (repos.json)
│   └── manifests/             # Research artifact manifests
├── docs/                    # Documentation
├── research/                   # Generated outputs (canonical location)
│   ├── papers/                # Paper reading outputs
│   ├── github/                # GitHub project analyses
│   ├── surveys/               # Survey synthesis outputs
│   └── domains/               # Domain learning-path outputs
├── sources/                 # Cloned source repositories
├── scripts/                 # TypeScript automation and tests
│   ├── lib/                # Shared script libraries
│   └── *.ts                # Entry point scripts
```

## Code Style Guidelines

### Imports
Group imports in order: 1) `bun:test` 2) `node:` built-ins 3) third-party 4) local values 5) local types

```typescript
import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import { something } from "./lib/something";
import type { SomeType } from "./lib/types";
```

### Formatting
- 2-space indentation, double quotes, semicolons
- Add spaces between Chinese and English in mixed text

### Naming
- Interfaces/types: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files: `kebab-case`

### Types
- Use `interface` for structured objects, `type` for unions
- Avoid `any` — use proper typing
- Use `string | null` only when null is part of the data model
- Use type guards for runtime validation

```typescript
function isRepo(value: unknown): value is Repo {
  return isObject(value) && typeof value.id === "string";
}
```

### Error Handling
- Throw errors with descriptive messages including context
- Use type guards instead of catching type errors
- For expected failures that are handled gracefully, catch and ignore

```typescript
// Good - descriptive error with context
throw new Error(`Failed to read registry at ${filePath}: ${error}`);

// Type guard - preferred over catching type errors
if (!isRepo(value)) {
  throw new Error("Invalid repo object");
}

// Ignoring expected failure
try { something(); } catch { /* Intentionally ignored */ }
```

### Async Patterns
- Use `async/await` over raw promises
- Always handle errors in async functions with try/catch or .catch()
- For CLI tools that may run concurrently, use `Promise.all()` for parallel execution

```typescript
async function fetchRepoData(owner: string, repo: string): Promise<Data> {
  try {
    return await fetchFromApi(owner, repo);
  } catch (error) {
    throw new Error(`Failed to fetch ${owner}/${repo}: ${error}`);
  }
}
```

## Testing Conventions
- Use Bun's `bun:test`
- Group with `describe(...)`, name `test(...)` by concrete behavior
- Use temp directories + `process.chdir()` for filesystem isolation
- Clean up with `fs.rmSync(..., { recursive: true, force: true })` in `afterEach()`
- Use `mock.restore()` when spies/mocks involved
- Capture stdout/stderr for CLI testing

```typescript
async function run(args: string[]) {
  const stdout: string[] = [];
  const exitCode = await runCli(args, {
    stdout: message => { stdout.push(message); },
    stderr: message => { stderr.push(message); },
  });
  return { exitCode, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
}
```

## Path Resolution

Use `scripts/lib/project-paths.ts` for all path access:

```typescript
import { resolvePath, getGithubPath, getPapersPath } from "./lib/project-paths";

// Get absolute path to any registered path
const githubPath = resolvePath("github", "owner", "repo");
const papersPath = getPapersPath();

// CLI helper
bun scripts/project-paths.ts [key] [subpath...]
```

**Registered path keys:** `papers`, `github`, `surveys`, `domains`, `registries`, `manifests`, `sources`

## Script and Data Rules
- Run scripts with `bun scripts/<name>.ts`
- For registry changes, use `scripts/lib/repo-registry.ts` or `scripts/repo-cli.ts`
- Do not rewrite `data/repos.json` with ad-hoc JSON logic
- Keep registry IDs in `owner/repo` format
- Do not commit secrets

## Commit Conventions

`type(scope): subject` format.

Scopes: `scripts`, `skills`, `data`, `survey`, `paper`, `github`, `docs`

Types: `feat`, `fix`, `docs`, `refactor`, `chore`

## OpenCode Skills

| Skill | Use when | Output |
|-------|----------|--------|
| `github-researcher` | "analyze this GitHub project", "research owner/repo", "调研 GitHub 项目", "understand this codebase", "deep dive into", "技术栈分析" | `research/github/{owner}/{repo}/` |
| `paper-reader` | "read this paper", "analyze this arxiv", "论文阅读", "学术分析", "summarize this paper", "what is this paper about", "find related papers", "analyze citations" | `research/papers/{id}/` |
| `survey-synthesizer` | "compare these projects", "synthesize survey", "调研合成", "knowledge graph", "知识图谱", "对比分析", "comparison report" | `research/surveys/{topic}/` |
| `repo-manager` | "同步所有项目", "sync all repos", "check updates", "update repo", "register repo" | `data/registries/repos.json` |
| `domain-explorer` | "explore a new domain", "领域探索", "learning path", "学习路径", "入门指南", "get started with", "how to learn", "我想学", "新手入门", "roadmap for", "introduction to", "beginner guide" | `research/domains/{domain}/` |

## Manifest Schema

Research artifacts use `manifest.json`:
- `version` — Schema version (semver)
- `kind` — Artifact type: `github-analysis`, `paper-notes`, `survey-synthesis`
- `id` — Unique identifier
- `source_type` — Origin: `github`, `arxiv`, `doi`, `manual`
- `upstream_url` — Link to original source
- `created_at` / `updated_at` — ISO 8601 timestamps

## Environment Variables

| Variable | Purpose |
|----------|---------|
| GITHUB_TOKEN | GitHub API auth (60 req/hr free, 5000/hr authenticated) |
| SEMANTIC_SCHOLAR_API_KEY | Paper metadata (100 req/5min free) |

## Verification Checklist

Before finishing any work:
1. Run relevant test file to verify correctness
2. If multiple script files changed, run the full explicit test list
3. Verify changed command examples still work
4. Run `bun scripts/project-paths.ts --json` to verify path resolution
