# Survey

调研材料管理项目，支持 GitHub 开源项目分析和学术论文管理。使用 TypeScript + Bun 构建。

## 功能特性

- **GitHub 项目调研** - 深度分析开源项目架构、技术栈
- **学术论文阅读** - 论文元数据提取、引用分析、相关论文发现
- **调研合成** - 多项目/论文对比分析、知识图谱生成
- **领域探索** - 结构化学习路径、资源推荐

## 快速开始

### 环境要求

- Bun >= 1.0.0
- Git

### 安装

```bash
git clone https://github.com/your-username/survey.git
cd survey
```

### 环境变量（可选）

```bash
export GITHUB_TOKEN=...    # GitHub API (60 → 5000 req/hr)
export SEMANTIC_SCHOLAR_API_KEY=...  # Semantic Scholar (100 → 5000 req/5min)
```

---

## Survey Skills

本项目包含 5 个 OpenCode Skills，用于自动化调研工作流。

### Skills 概述

| Skill                | 用途                | 输出目录                 |
| -------------------- | ------------------- | ------------------------ |
| `github-researcher`  | GitHub 项目深度调研 | `research/github/{owner}/{repo}/` |
| `paper-reader`       | 学术论文阅读分析    | `paper/{paper-id}/`      |
| `survey-synthesizer` | 多源调研合成对比    | `survey/{topic}/`        |
| `domain-explorer`    | 领域探索学习路径    | `domains/{domain}/`      |
| `repo-manager`       | 项目注册表管理      | -                        |

## 工作流程

1. **规划阶段**: domain-explorer → 生成学习路径
2. **调研阶段**: github-researcher + paper-reader → 并行调研
3. **合成阶段**: survey-synthesizer → 生成对比报告


## Skill 详细文档

各 Skill 的详细使用说明、触发词、输入输出格式，请参阅：

详见 [.opencode/skills/README.md](./.opencode/skills/README.md)


## 典型工作流

```
1. 探索新领域
   "探索 RAG 领域" → domains/RAG/index.md

2. 调研相关项目
   "研究 langchain-ai/langchain" → research/github/langchain-ai/langchain/README.md
   "研究 run-llama/llama_index" → research/github/run-llama/llama_index/README.md

3. 阅读关键论文
   "阅读 arxiv:2005.14165" → paper/2005.14165/notes.md

4. 综合分析
   "对比分析 RAG 框架" → survey/RAG-frameworks/comparison.md
```

---

## API 限制

GitHub: 60 req/hr (免费) → 5000 req/hr (认证)
Semantic Scholar: 100 req/5min (免费) → 5000 req/5min (认证)
arXiv: 3 req/sec


---

## 多端同步

```bash
# 同步所有项目
bun scripts/sync-repos.ts

# 检查更新 / 只克隆 / 只拉取
bun scripts/sync-repos.ts --check --clone --pull

# 验证注册表完整性
bun scripts/sync-repos.ts --verify

# 自动修复孤儿项目
bun scripts/sync-repos.ts --verify-fix
```

详见 [.opencode/skills/README.md](./.opencode/skills/README.md)

---


## 许可证

MIT
