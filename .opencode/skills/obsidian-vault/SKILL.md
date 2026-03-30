---
name: obsidian-vault
description: |
  Use when: user wants to interact with an Obsidian vault, read/write notes, search vault content, create daily notes, or sync research outputs to Obsidian. Triggers: "obsidian", "vault", "read note", "write note", "search vault", "sync to obsidian", "daily note", "create note in obsidian".
  DO NOT USE FOR: GitHub analysis (use github-researcher), paper reading (use paper-reader), or general web search.
  Output: Reads/writes to Obsidian vault via official CLI (must have Obsidian running)
---

# Obsidian Vault Integration

Interact with an Obsidian vault using the official Obsidian CLI (v1.12+).

## Prerequisites

**Obsidian must be running** — The CLI is a remote control for the Obsidian GUI app. If Obsidian is not running, the CLI will automatically launch it.

**Enable CLI:**
1. Open Obsidian → Settings → General
2. Find "Command line interface" and enable it
3. Restart terminal or run `source ~/.zprofile`

**Verify installation:**
```bash
obsidian version
```

---

## Vault Configuration

Vault path is read from `data/obsidian.json`:

```json
{
  "vault_path": "/path/to/your/obsidian-vault",
  "sync_direction": "survey_to_obsidian",
  "conflict_resolution": "survey_wins"
}
```

**Get vault path:**
```bash
VAULT=$(node -e "console.log(require('./data/obsidian.json').vault_path)")
echo $VAULT
```

**Important:** When using vault-specific commands, `vault=` parameter must come **first**.

---

## Commands

### obsidian:create(path, content, title?)

Create a new note with content.

```bash
# Create a new note (vault must be first parameter)
obsidian create vault="$VAULT" name="folder/note-name" content="# Title\n\nNote content..."

# Create with explicit title
obsidian create vault="$VAULT" name="research/papers/attention" title="Attention Is All You Need" content="..."
```

**Output:** Confirmation with created file path.

---

### obsidian:read(path)

Read the full content of a note.

```bash
# Read note content (output to stdout for piping)
obsidian read vault="$VAULT" file="research/papers/attention.md"
```

**Output format:**
```
# Attention Is All You Need

> **Quick Reference**
> - Authors: Vaswani et al.
> ...

## Summary

Note body content...
```

---

### obsidian:append(path, content)

Append content to an existing note.

```bash
# Append AI summary to paper note
obsidian append vault="$VAULT" file="research/papers/attention.md" content="\n\n## AI Summary\n\nAdded by research agent..."
```

---

### obsidian:rename(oldPath, newPath)

Rename a note.

```bash
obsidian rename vault="$VAULT" old="research/papers/attention.md" new="research/papers/1706.03762.md"
```

---

### obsidian:search(query)

Search vault for notes by content.

```bash
# Search by content
obsidian search vault="$VAULT" query="transformer"

# Search with context (show matching lines)
obsidian search:context vault="$VAULT" query="attention mechanism" limit=10
```

**Output format:**
```
Results: 3

1. research/papers/1706.03762/notes.md
2. research/surveys/llm-architectures/index.md
3. research/github/bert/README.md
```

---

### obsidian:list(path?)

List notes in vault or directory.

```bash
# List all notes
obsidian list vault="$VAULT"

# List notes in specific folder
obsidian list vault="$VAULT" path="research/papers"
```

---

### obsidian:daily

Open today's daily note (creates if not exists).

```bash
obsidian daily vault="$VAULT"

# Append to daily note
obsidian daily:append vault="$VAULT" content="- [ ] Review transformer paper"
```

---

### obsidian:exists(path)

Check if a note exists.

```bash
obsidian exists vault="$VAULT" file="research/papers/attention.md"
# Returns: true or false
```

---

## Frontmatter Conventions

All research notes should include YAML frontmatter at the top:

### Paper Notes

```yaml
---
id: "1706.03762"
title: "Attention Is All You Need"
source_type: "arxiv"
upstream_url: "https://arxiv.org/abs/1706.03762"
authors: ["Vaswani", "Shazeer", "Parmar", ...]
year: 2017
tags: ["transformer", "attention", "nlp"]
description: "Transformer architecture开创性论文..."
language: "zh"
level: "intermediate"
status: "active"
related:
  - { id: "arxiv:1706.03762", kind: "paper-notes" }
  - { id: "karpathy/nanoGPT", kind: "github-analysis" }
generated_by: "paper-reader"
created_at: "2026-03-30T10:00:00Z"
updated_at: "2026-03-30T10:00:00Z"
---
```

### GitHub Analysis

```yaml
---
id: "karpathy/nanoGPT"
title: "nanoGPT Analysis"
source_type: "github"
upstream_url: "https://github.com/karpathy/nanoGPT"
tags: ["deep-learning", "transformer", "gpt", "pytorch"]
description: "最简单、最快速的GPT训练框架..."
language: "zh"
level: "intermediate"
status: "active"
related:
  - { id: "arxiv:1706.03762", kind: "paper-notes", relationship: "derived" }
generated_by: "github-researcher"
created_at: "2026-03-18T10:00:00Z"
updated_at: "2026-03-18T10:00:00Z"
---
```

### Survey Notes

```yaml
---
id: "llm-agent-architecture"
title: "LLM Agent 架构调研"
category: "agent-design"
source_type: "survey"
tags: ["agent", "reasoning", "planning", "memory"]
description: "深入分析LLM Agent架构设计..."
level: "advanced"
date: "2026-03-30"
related_projects: ["LangChain", "AutoGPT", "Claude"]
related_papers: ["arXiv:2303.17580", "arXiv:2312.14852"]
language: "zh"
status: "active"
generated_by: "survey-synthesizer"
created_at: "2026-03-30T10:00:00Z"
updated_at: "2026-03-30T10:00:00Z"
---
```

---

## Sync Workflow

To sync Survey research outputs to Obsidian:

```bash
# 1. Read the research output
NOTES=$(obsidian read vault="$VAULT" file="research/papers/1706.03762/notes.md")

# 2. Append to Obsidian note
obsidian append vault="$VAULT" file="Inbox/paper-notes.md" content="$NOTES"

# Or create structured note
obsidian create vault="$VAULT" name="Research/Papers/1706.03762" content="$(cat research/papers/1706.03762/notes.md)"
```

---

## Limitations

| Limitation | Description |
|------------|-------------|
| **Obsidian must run** | CLI requires GUI app running in background |
| **No direct file write** | Must use `create`/`append` commands |
| **Append only** | No direct overwrite; use `rename` + `create` to replace |
| **Vault param first** | `vault=` parameter must come before other args |

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `obsidian:create(path, content)` | Create new note |
| `obsidian:read(path)` | Read note content |
| `obsidian:append(path, content)` | Append to note |
| `obsidian:rename(old, new)` | Rename note |
| `obsidian:search(query)` | Search vault |
| `obsidian:list(path?)` | List notes |
| `obsidian:daily` | Open daily note |
| `obsidian:exists(path)` | Check note exists |
