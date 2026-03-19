# Repository Optimization Implementation Plan

**For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix AGENTS.md duplicate content, normalize skill trigger consistency across docs, add targeted test coverage, trim README.md, and clean up catch blocks.

**Architecture:** Incremental cleanup pass — fix instruction drift first (affects every agent session), then add tests for durable operational scripts, then trim human-facing docs. Catch cleanup applied opportunistically to files touched by other tasks.

**Tech Stack:** TypeScript + Bun, bun:test

---

## Task Dependency & Ordering

```
[Task 1] ──► [Task 2]          Task 2 must run after Task 1 (AGENTS.md fix is pre-req)
    │                              │
    ▼                              ▼
[Tasks 3, 4, 5] ──► [Task 6]    Tasks 3-5 run in parallel; Task 6 can run in parallel with 3-5
    │
    ▼
[Tasks 3, 4, 5] ──► [Task 7]    Task 7 runs after Tasks 3-5 (uses touched files as scope)
```

---

## Atomic Commit Strategy

| Commit | Tasks | Description |
|--------|-------|-------------|
| `fix(agents): remove duplicate skill table lines 205-233` | Task 1 | Remove consecutive duplicate Project Skills section |
| `docs: normalize skill triggers across AGENTS.md README.md .opencode/skills/README.md` | Task 2 | Sync all trigger phrases to SKILL.md canonical forms |
| `test: add coverage for validate-manifest.ts` | Task 3 | 7 test cases covering valid/invalid/missing/parse-error scenarios |
| `test: add coverage for verify-research-integrity.ts` | Task 4 | 7 test cases covering orphaned entries, missing files, --fix no-op |
| `test: add coverage for generate-domain-index.ts` | Task 5 | 7 test cases covering indices, circular deps, frontmatter, errors |
| `docs: trim README.md to ≤120 lines, move details to skills/README.md` | Task 6 | Remove duplicate skill walkthroughs and directory structure |
| `refactor(scripts): clean up catch blocks in touched files` | Task 7 | `catch { // Intentionally ignored }` in validate-manifest.ts and generate-domain-index.ts |

---

## Task 1: Fix AGENTS.md Duplicate Content

**File:** `AGENTS.md:205-233`

**Duplicate structure:**
- Line 207: `Project-specific skills are in `.opencode/skills/{skill-name}/SKILL.md`:`
- Lines 209-219: First fenced table `## Project Skills | Skill | Use when | ...`
- Line 221: `Each skill has its own workflow and output conventions documented in its SKILL.md.`
- Line 223: `> **Note**: semantic-scholar-api is a low-level API tool...`
- Line 225: `Project-specific skills are in `.opencode/skills/{skill-name}/SKILL.md`:` ← DUPLICATE
- Lines 226-230: Bulleted list of skills
- Line 232: `Each skill has its own workflow and output conventions documented in its SKILL.md.` ← DUPLICATE

**Step 1:** Read lines 205-233 to confirm exact duplicate range.

**Step 2:** Replace the entire duplicate block (lines 225-232) with a single blank line, keeping the first canonical section (lines 207-223) intact. The first section is the source of truth.

**Step 3:** Verify with `lsp_diagnostics` on `AGENTS.md`.

---

## Task 2: Normalize Skill Triggers Across Docs

**Files:** `AGENTS.md` skill table, `README.md` skill sections, `.opencode/skills/*/SKILL.md`

### Trigger Inventory: Current vs. Canonical

The canonical trigger set for each skill is defined in the `description:` YAML block of each `SKILL.md` file. The goal is to make AGENTS.md and README.md match SKILL.md exactly.

#### `github-researcher`

| Location | Triggers |
|----------|----------|
| **SKILL.md canonical** | `analyze this GitHub project`, `research owner/repo`, `调研 GitHub 项目`, `understand this codebase` |
| README.md current (lines 76-80) | `research this project`, `analyze repo`, `项目调研`, `GitHub 分析`, `deep dive into`, `技术栈分析` |
| **Gap: missing** | `analyze this GitHub project`, `understand this codebase` |
| **Gap: README "分析这个项目"** | Present in AGENTS.md but not in README; needs adding to README |
| **Gap: "deep dive into"** | Present in README but not in SKILL.md canonical; either add to SKILL.md or remove from README |

**Action for README:** Add `analyze this GitHub project`, `understand this codebase` to trigger list. Add `分析这个项目` (from AGENTS.md) to trigger list.

**Action for SKILL.md:** Add `deep dive into` and `技术栈分析` to SKILL.md description to match existing README usage (prefer adding to SKILL.md since README reflects actual usage).

#### `paper-reader`

| Location | Triggers |
|----------|----------|
| **SKILL.md canonical** | `read this paper`, `analyze this arxiv`, `论文阅读`, `学术分析`, `summarize this paper`, `what is this paper about`, `find related papers`, `analyze citations` |
| README.md current (lines 107-111) | `read this paper`, `analyze this arxiv`, `论文阅读`, `学术分析`, `summarize this paper`, `find related papers` |
| **Gap: missing from README** | `what is this paper about`, `analyze citations` |

**Action for README:** Add `what is this paper about`, `analyze citations` to trigger list.

#### `survey-synthesizer`

| Location | Triggers |
|----------|----------|
| **SKILL.md canonical** | `compare these`, `对比分析`, `synthesize survey`, `调研合成`, `knowledge graph`, `知识图谱`, `comparison report`, `对比报告` |
| README.md current (lines 138-142) | `compare these`, `对比分析`, `synthesize survey`, `调研合成`, `knowledge graph`, `知识图谱` |
| **Gap: missing from README** | `comparison report`, `对比报告` |

**Action for README:** Add `comparison report`, `对比报告` to trigger list.

#### `domain-explorer`

| Location | Triggers |
|----------|----------|
| **SKILL.md canonical** | `explore domain`, `领域探索`, `learning path`, `学习路径`, `入门指南`, `get started with`, `how to learn`, `我想学`, `新手入门`, `roadmap for`, `introduction to`, `beginner guide` |
| README.md current (lines 165-169) | `explore domain`, `领域探索`, `learning path`, `学习路径`, `入门指南`, `我想学` |
| **Gap: missing from README** | `get started with`, `how to learn`, `新手入门`, `roadmap for`, `introduction to`, `beginner guide` |

**Action for README:** Add all 6 missing trigger phrases.

#### `repo-manager`

| Location | Triggers |
|----------|----------|
| **SKILL.md canonical** | `同步所有项目`, `sync all repos`, `检查更新`, `check updates`, `更新项目`, `update repo`, `注册项目`, `register repo` |
| README.md current (lines 191-196) | `同步所有项目`, `sync all repos`, `检查更新`, `check updates`, `更新项目`, `update repo`, `注册项目`, `register repo` |
| **Status** | ✓ Fully aligned — no changes needed |

### Normalization Steps

**Step 1:** Read each SKILL.md description block in parallel to extract canonical triggers:
- `.opencode/skills/github-researcher/SKILL.md` (line 4)
- `.opencode/skills/paper-reader/SKILL.md` (line 4)
- `.opencode/skills/survey-synthesizer/SKILL.md` (line 4)
- `.opencode/skills/domain-explorer/SKILL.md` (line 10)

**Step 2:** Update `AGENTS.md` skill table "Example prompts" column to match SKILL.md canonical triggers exactly.

**Step 3:** Update `README.md` skill section trigger lists to include all canonical triggers (fill the gaps identified above). For `github-researcher`, also reconcile `deep dive into` / `技术栈分析` — add them to SKILL.md description to preserve existing usage.

**Step 4 (Verification — Phase A):** Run these greps **after completing Task 2** (before Task 6). All must return ≥1:

```bash
# README.md — skill walkthrough sections still present at this stage
grep -c "analyze this GitHub project" README.md    # ≥1
grep -c "understand this codebase" README.md       # ≥1
grep -c "what is this paper about" README.md        # ≥1
grep -c "analyze citations" README.md               # ≥1
grep -c "comparison report" README.md               # ≥1
grep -c "get started with" README.md               # ≥1
grep -c "roadmap for" README.md                    # ≥1
grep -c "how to learn" README.md                  # ≥1
grep -c "新手入门" README.md                       # ≥1
grep -c "introduction to" README.md                # ≥1
grep -c "beginner guide" README.md                # ≥1

# AGENTS.md
grep -c "analyze this GitHub project" AGENTS.md    # ≥1
grep -c "understand this codebase" AGENTS.md       # ≥1
grep -c "what is this paper about" AGENTS.md       # ≥1
grep -c "analyze citations" AGENTS.md               # ≥1
grep -c "comparison report" AGENTS.md               # ≥1
grep -c "get started with" AGENTS.md               # ≥1
grep -c "roadmap for" AGENTS.md                   # ≥1
```

**Step 5 (Verification — Phase B):** Run these greps **after completing Task 6**. README.md has been trimmed; trigger phrases should now be absent and the pointer should be present:

```bash
# README.md triggers are now gone (trimmed away)
grep -c "get started with" README.md               # = 0
grep -c "roadmap for" README.md                   # = 0
grep -c "how to learn" README.md                  # = 0
grep -c "新手入门" README.md                       # = 0
grep -c "introduction to" README.md                # = 0
grep -c "beginner guide" README.md                # = 0

# README.md pointer is now present
grep -c "详见" README.md                          # ≥1 (cross-ref to .opencode/skills/README.md)
```

---

## Task 3: Write Tests for validate-manifest.ts

**Create:** `scripts/validate-manifest.test.ts`

**Reference:** `scripts/lib/manifest.ts` (validate function), `scripts/validate-manifest.ts` (CLI wrapper)

**Setup:** Use temp directories + `process.chdir()` for filesystem isolation. Use `fs.mkdtempSync` and `fs.rmSync` for cleanup.

### Test Cases

| # | Test name | Scenario | Assertions |
|---|-----------|----------|------------|
| 1 | `validateSingleFile accepts valid manifest` | Write a valid `manifest.json` (all required fields) to temp dir; call script with `--file` | Exit code 0; output includes `✅ Valid manifest` |
| 2 | `validateSingleFile rejects invalid manifest` | Write manifest with missing required field (`kind` absent) to temp dir | Exit code 1; output includes `❌ Invalid manifest` |
| 3 | `validateSingleFile handles non-existent file` | Call with `--file` pointing to non-existent path | Exit code 1; output includes `Failed to validate` |
| 4 | `validateSingleFile handles malformed JSON` | Write a file containing `{ broken json` to temp dir | Exit code 1; output includes `Failed to validate` |
| 5 | `validateAll handles non-existent research directory` | Create empty temp dir; `research/github` does not exist; call with `--all` | Exit code 0; output includes `does not exist yet (no manifests to validate)` |
| 6 | `validateAll reports valid and invalid manifests` | Create temp dir with `research/github/owner/repo/manifest.json` (valid) and `research/github/owner/repo2/manifest.json` (invalid); call with `--all` | Summary shows correct valid/invalid/total counts |
| 7 | `validateAll handles empty research directory` | Create `research/github/` with no subdirectories; call with `--all` | Exit code 0; output includes `No manifests found` |

**TDD note:** Write tests first. Run `bun test scripts/validate-manifest.test.ts` to confirm tests fail against current implementation before declaring done.

---

## Task 4: Write Tests for verify-research-integrity.ts

**Create:** `scripts/verify-research-integrity.test.ts`

**Reference:** `scripts/verify-research-integrity.ts`, `scripts/lib/manifest.ts`

### Test Cases

| # | Test name | Scenario | Assertions |
|---|-----------|----------|------------|
| 1 | `in-sync registry and research` | Create `data/repos.json` with 1 repo entry; create matching `research/github/{owner}/{repo}/README.md` and `manifest.json` (valid); run integrity check | Exit code 0; output includes `All integrity checks passed` |
| 2 | `orphaned registry entry` | Create `data/repos.json` with repo entry for `ghost/repo` but no `research/github/ghost/repo/` directory | Exit code 1; output includes orphaned entry `ghost/repo` |
| 3 | `orphaned research entry` | Create `research/github/orphan/repo/` with README and manifest, but no entry in `data/repos.json` | Exit code 1; output includes orphaned entry `orphan/repo` |
| 4 | `missing README with valid manifest` | Create registry entry + `research/github/{id}/manifest.json` (valid) but no `README.md` | Exit code 1; output includes `Missing README.md` for that id |
| 5 | `missing manifest with valid README` | Create registry entry + `research/github/{id}/README.md` but no `manifest.json` | Exit code 1; output includes `Missing manifest.json` for that id |
| 6 | `invalid manifest JSON` | Create registry entry + `research/github/{id}/README.md` + `research/github/{id}/manifest.json` containing `{ "broken` | Exit code 1; output includes `Invalid manifests` with parse error |
| 7 | `--fix flag outputs no-op message` | Run with `--fix` flag against a valid state | Output includes `Fix mode is enabled but not yet implemented`; script does NOT crash |

**Setup pattern:** Same temp dir + `process.chdir()` approach used in Task 3. Write valid manifest files using the `create()` factory from `lib/manifest.ts`.

**TDD note:** Write tests first.

---

## Task 5: Write Tests for generate-domain-index.ts

**Create:** `scripts/generate-domain-index.test.ts`

**Reference:** `scripts/generate-domain-index.ts`, uses `gray-matter` for frontmatter parsing

### Test Cases

| # | Test name | Scenario | Assertions |
|---|-----------|----------|------------|
| 1 | `generates correct forward index` | Create `domains/llm/learning-path.md` with frontmatter `id: llm, title: LLM, level: beginner`; run script | `data/generated/domain-index.json` exists; contains `domains.llm` with correct `id`, `title`, `level`; `stats.total_domains === 1`; `stats.by_level.beginner === 1` |
| 2 | `generates correct reverse index` | Create domain with `parents: [ai]`, `prerequisites: [python]`; run script | `data/generated/reverse-index.json` exists; `children.ai` includes `llm`; `dependents.python` includes `llm` |
| 3 | `handles empty domains directory` | Create empty `domains/` dir; run script | Exit code 0; `domain-index.json` has `stats.total_domains === 0`; output includes `Found 0 domain directories` |
| 4 | `handles non-existent domains directory` | Do not create `domains/`; run script | Exit code 0; output includes `Domains directory not found` |
| 5 | `detects circular dependency` | Create `domains/a/learning-path.md` with `prerequisites: [b]` and `domains/b/learning-path.md` with `prerequisites: [a]`; run script | Exit code 1; output includes `Circular dependency detected` |
| 6 | `parses domain without frontmatter` | Create `domains/db/learning-path.md` with plain markdown content starting with `# Database Basics`; run script | `domain-index.json` has entry for `db`; `title` extracted from heading; `level` inferred from content (`基础` → `beginner`) |
| 7 | `gray-matter parse error is handled` | Create domain file that causes `matter()` to throw; run script | Script continues; entry is skipped with `⚠️ Failed to parse` warning; other valid domains still processed |

**Setup:** Use `fs.mkdtempSync` for isolation. Set `process.chdir(tempDir)` before each test. Create `data/generated/` and `domains/` subdirs as needed. Use `fs.rmSync` in `afterEach` for cleanup.

**gray-matter dependency:** The script imports `gray-matter` at line 13. Ensure `gray-matter` is a project dependency before running tests (check `package.json`). If missing, install with `bun add gray-matter` before test creation.

**TDD note:** Write tests first.

---

## Task 6: Trim README.md Length

**Target:** Reduce `README.md` from **388 lines to ≤120 lines** (≈69% reduction).

**Files:** `README.md`, `.opencode/skills/README.md` (already exists, 265 lines)

### Current README.md Structure (388 lines total)

| Section | Lines | Action |
|---------|-------|--------|
| Header + 功能特性 | 1-10 | Keep (10 lines) |
| 快速开始 + 环境变量 | 11-34 | Keep (24 lines) |
| Skills 概述 table | 38-50 | Keep (13 lines) — brief table already in .opencode/skills/README.md |
| Skill Workflow diagram | 52-69 | Keep (18 lines) |
| github-researcher walkthrough | 72-100 | **Move to** `.opencode/skills/README.md` |
| paper-reader walkthrough | 102-130 | **Move to** `.opencode/skills/README.md` |
| survey-synthesizer walkthrough | 132-157 | **Move to** `.opencode/skills/README.md` |
| domain-explorer walkthrough | 159-183 | **Move to** `.opencode/skills/README.md` |
| repo-manager walkthrough | 185-204 | **Move to** `.opencode/skills/README.md` |
| 目录结构 | 206-256 | **Remove** — duplicate of AGENTS.md structure + exists in .opencode/skills/README.md |
| 典型工作流 | 258-276 | Keep (19 lines) — useful example |
| API 限制 | 278-288 | Keep (11 lines) |
| 多端同步 | 290-327 | Keep (38 lines) |
| 研究仓库索引 | 329-386 | **Remove or significantly trim** — generated content shouldn't be in README |
| 许可证 | 387-388 | Keep (2 lines) |

### README.md Rewrite Plan

After removing the 5 skill walkthroughs (≈130 lines), directory structure (≈50 lines), and research index (≈58 lines), and keeping all other sections:

**Keep (~85 lines):**
- Lines 1-34: Header, 功能特性, 快速开始, 环境变量
- Lines 38-69: Skills 概述 + Skill Workflow
- Lines 258-288: 典型工作流, API 限制
- Lines 290-388 minus trimmed sections

**Remove and add pointer:**
Replace each skill walkthrough section (≈130 lines) with a single cross-reference line:
```
详见 [.opencode/skills/README.md](./.opencode/skills/README.md)
```

**Remove entirely:**
- 目录结构 section (~50 lines) — duplicates AGENTS.md
- 研究仓库索引 section (~58 lines) — generated content that should not live in source README

### Steps

**Step 1:** Read `.opencode/skills/README.md` to confirm it already has complete skill documentation. It does (265 lines), so no new docs need to be created.

**Step 2:** Rewrite `README.md`:
- Remove lines 72-256 (skill walkthroughs + directory structure)
- Remove lines 329-386 (research index section)
- For each removed skill section, insert a pointer: `详见 [.opencode/skills/README.md](./.opencode/skills/README.md)`
- Keep all other sections

**Step 3:** Verify line count with `wc -l README.md` → must be ≤120.

**Note:** Task 2 (trigger normalization) updates trigger text in README.md skill sections. Task 6 removes those sections entirely. To avoid edit conflicts:
- **Chosen:** Complete Task 2 before Task 6. Task 2's trigger edits will be in the brief Skills 概述 table (lines 42-50), which is kept. Task 6 removes the detailed walkthroughs.

---

## Task 7: Clean Up Catch Blocks (Opportunistic)

**Scope:** Only files touched by Tasks 1-6. Apply `catch { // Intentionally ignored }` to bare `catch(error)` blocks.

### Pre-Task: Enumerate Catch Blocks

**Step 0 (mandatory):** Run the following grep to enumerate all `catch(error)` blocks in `scripts/`:

```bash
grep -n "catch (error)" scripts/**/*.ts
```

Current inventory (from this grep):

| File | Line | Current | Needs Fix? |
|------|------|---------|------------|
| `scripts/verify-research-integrity.ts` | 62 | `catch (error) { console.error(...); return []; }` | No — error is used |
| `scripts/verify-research-integrity.ts` | 111 | `catch (error) { return { valid: false, error: ... }; }` | No — error is used |
| `scripts/validate-manifest.ts` | 48 | `catch (error) { console.error(...); return false; }` | No — error is used |
| `scripts/validate-manifest.ts` | 110 | `catch (error) { /* Directory might not exist or be readable */ }` | Yes — bare catch, needs comment |
| `scripts/synthesis-lib.ts` | 142 | `catch (error) { ... }` | Inspect — is error used? |
| `scripts/synthesis-lib.ts` | 178 | `catch (error) { ... }` | Inspect |
| `scripts/synthesis-lib.ts` | 281 | `catch (error) { ... }` | Inspect |
| `scripts/synthesis-lib.ts` | 299 | `catch (error) { ... }` | Inspect |
| `scripts/repo-cli.ts` | 364 | `catch (error) { const message = error instanceof Error ? ... : String(error); ... }` | No — error is used |
| `scripts/migrate-repo-structure.ts` | 91 | `catch (error) { ... }` | Inspect |
| `scripts/generate-domain-index.ts` | 145 | `catch (error) { console.error(...); return null; }` | No — error is used |
| `scripts/generate-domain-index.ts` | 368 | `main().catch(console.error)` | Yes — `catch { // Intentionally ignored }` |

**Interpretation:**
- `catch { // Intentionally ignored }` pattern: used when the error is genuinely not needed — only line 110 (validate-manifest.ts) and line 368 (generate-domain-index.ts)
- All others use `error` in some way — they are **not** candidates for this cleanup

**Step 1:** Read lines around each candidate catch block (identified above) and verify whether `error` is used or genuinely ignored.

**Step 2:** Fix only the confirmed bare-ignore catches:
- `scripts/validate-manifest.ts:110` — add `// Intentionally ignored`
- `scripts/generate-domain-index.ts:368` — change `catch(console.error)` to `catch { // Intentionally ignored }`

**Step 3:** If additional `catch(error)` blocks are found in files touched by Tasks 1-6, apply the same fix.

---

## Verification Checklist

After each task, the corresponding verification runs. Final sign-off requires all of:

```
# Tests
bun test scripts/validate-manifest.test.ts          # PASS
bun test scripts/verify-research-integrity.test.ts  # PASS
bun test scripts/generate-domain-index.test.ts      # PASS

# Task 2 — Phase A (AGENTS.md triggers — permanent, not trimmed)
grep -c "analyze this GitHub project" AGENTS.md     # ≥1
grep -c "understand this codebase" AGENTS.md       # ≥1
grep -c "what is this paper about" AGENTS.md       # ≥1
grep -c "analyze citations" AGENTS.md               # ≥1
grep -c "comparison report" AGENTS.md               # ≥1
grep -c "get started with" AGENTS.md               # ≥1
grep -c "roadmap for" AGENTS.md                   # ≥1

# Task 2 — Phase B (README.md trimmed; pointer present)
grep -c "get started with" README.md               # = 0 (trimmed away)
grep -c "roadmap for" README.md                   # = 0 (trimmed away)
grep -c "how to learn" README.md                  # = 0 (trimmed away)
grep -c "新手入门" README.md                       # = 0 (trimmed away)
grep -c "introduction to" README.md                # = 0 (trimmed away)
grep -c "beginner guide" README.md                # = 0 (trimmed away)
grep -c "详见" README.md                          # ≥1 (pointer present)

# Task 1 — AGENTS.md dedup
grep "Project Skills" AGENTS.md                   # Exactly 1 occurrence
grep "Each skill has its own workflow" AGENTS.md   # Exactly 1 occurrence

# Task 6 — README length
wc -l README.md                                   # ≤120

# Task 7 — catch block fixes (correct pattern present)
grep "catch { // Intentionally ignored }" scripts/validate-manifest.ts     # ≥1
grep "catch { // Intentionally ignored }" scripts/generate-domain-index.ts # ≥1

# LSP diagnostics
lsp_diagnostics on all changed .ts files           # 0 errors
```
