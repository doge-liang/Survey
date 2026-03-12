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

### 配置环境变量（可选）

```bash
# GitHub API - 提升限额 60 → 5000 req/hr
export GITHUB_TOKEN=ghp_your_token_here

# Semantic Scholar API - 提升限额 100 → 5000 req/5min
export SEMANTIC_SCHOLAR_API_KEY=your_key_here
```

---

## Survey Skills

本项目包含 4 个 OpenCode Skills，用于自动化调研工作流。

### Skills 概述

| Skill | 用途 | 输出目录 |
|-------|------|----------|
| `github-researcher` | GitHub 项目深度调研 | `github/{owner}-{repo}/` |
| `paper-reader` | 学术论文阅读分析 | `essay/{paper-id}/` |
| `survey-synthesizer` | 多源调研合成对比 | `survey/{topic}/` |
| `domain-explorer` | 领域探索学习路径 | `domains/{domain}/` |

---

### 1. github-researcher - GitHub 项目调研

深度分析 GitHub 项目，生成结构化报告。

**触发词**：
- `research this project`, `analyze repo`
- `项目调研`, `GitHub 分析`
- `deep dive into`, `技术栈分析`

**支持的输入格式**：

| 输入类型 | 示例 |
|---------|------|
| GitHub URL | `https://github.com/vercel/next.js` |
| 项目名 | `vercel/next.js` |
| 主题搜索 | `vector database`, `LLM inference` |
| 对比模式 | `compare vite and webpack` |

**使用示例**：
```
研究一下 karpathy/nanoGPT 的架构
分析 https://github.com/vercel/next.js
对比分析 vite 和 webpack
```

**输出**：`github/{owner}-{repo}/README.md`

---

### 2. paper-reader - 学术论文阅读

分析论文，提取元数据、方法、贡献，发现相关论文。

**触发词**：
- `read this paper`, `analyze this arxiv`
- `论文阅读`, `学术分析`
- `summarize this paper`, `find related papers`

**支持的输入格式**：

| 输入类型 | 示例 |
|---------|------|
| arXiv URL | `https://arxiv.org/abs/2301.07041` |
| arXiv ID | `2301.07041` |
| DOI | `10.1234/example` |
| 论文标题 | `Attention Is All You Need` |

**使用示例**：
```
阅读这篇论文 https://arxiv.org/abs/2301.07041
分析这篇 arxiv: 2301.07041
这篇论文讲了什么: Attention Is All You Need
```

**输出**：`essay/{paper-id}/notes.md`

---

### 3. survey-synthesizer - 调研合成

对比多个项目/论文，生成知识图谱。

**触发词**：
- `compare these`, `对比分析`
- `synthesize survey`, `调研合成`
- `knowledge graph`, `知识图谱`

**输入来源**：
- 已有项目分析：`github/*/README.md`
- 已有论文笔记：`essay/*/notes.md`

**使用示例**：
```
对比分析 React 和 Vue
调研合成 RAG 技术方案
为这些项目生成知识图谱
```

**输出**：`survey/{topic}/comparison.md`

---

### 4. domain-explorer - 领域探索

生成结构化学习路径和资源清单。

**触发词**：
- `explore domain`, `领域探索`
- `learning path`, `学习路径`
- `入门指南`, `我想学`

**使用示例**：
```
探索 Rust 领域
我想学 LLM 微调
RAG 入门指南
生成 Kubernetes 学习路径
```

**输出**：
- `domains/{domain}/learning-path.md` - 分级学习路径
- `domains/{domain}/resources.md` - 资源清单

---

## 目录结构

```
Survey/
├── .opencode/skills/          # OpenCode Skills
│   ├── github-researcher/     # GitHub 项目调研
│   ├── paper-reader/          # 论文阅读
│   ├── survey-synthesizer/    # 调研合成
│   ├── domain-explorer/       # 领域探索
│   └── README.md              # Skills 详细文档
│
├── github/                    # GitHub 项目分析
│   └── {owner}-{repo}/
│       └── README.md          # 项目调研报告
│
├── essay/                     # 论文笔记
│   └── {paper-id}/
│       └── notes.md           # 阅读笔记
│
├── survey/                    # 调研合成
│   └── {topic}/
│       └── comparison.md      # 对比报告
│
├── domains/                   # 领域探索
│   └── {domain}/
│       └── learning-path.md   # 学习路径
│
├── scripts/                   # TypeScript 脚本
│   ├── sync-repos.ts          # 项目同步脚本
│   └── generate-domain-index.ts # 领域索引生成
│
├── data/                      # 数据文件
│   ├── repos.json             # 项目注册表
│   └── generated/             # 自动生成的索引

│   ├── update-github-index.ts # 更新 GitHub 索引
│   ├── analyzer.ts            # 项目分析器
│   └── llm.ts                 # LLM 客户端
│
└── data/                      # 数据文件
```

---

## 典型工作流

```
1. 探索新领域
   "探索 RAG 领域" → domains/RAG/learning-path.md

2. 调研相关项目
   "研究 langchain-ai/langchain" → github/langchain-ai-langchain/README.md
   "研究 run-llama/llama_index" → github/run-llama-llama_index/README.md

3. 阅读关键论文
   "阅读 arxiv:2005.14165" → essay/2005.14165/notes.md

4. 综合分析
   "对比分析 RAG 框架" → survey/RAG-frameworks/comparison.md
```

---

## API 限制

| API | 免费限额 | 认证后限额 |
|-----|----------|------------|
| GitHub | 60 req/hr | 5000 req/hr |
| Semantic Scholar | 100 req/5min | 5000 req/5min |
| arXiv | 3 req/sec | N/A |

**建议**：配置环境变量以获得更好的体验。

---

## 多端同步

本项目支持通过 Git 实现多端数据同步。

### 项目注册表

所有已调研的项目记录在 `data/repos.json`，包含：
- 项目 URL 和元数据
- 克隆时间和最后 commit
- Tags 和难度级别

### 同步命令

```bash
# 同步所有项目（clone 或 pull）
bun scripts/sync-repos.ts

# 检查哪些项目有更新
bun scripts/sync-repos.ts --check

# 只克隆缺失的项目
bun scripts/sync-repos.ts --clone

# 只拉取已有项目
bun scripts/sync-repos.ts --pull

# 同步单个项目
bun scripts/sync-repos.ts vercel/next.js
```

### 新机器初始化

```bash
# 1. 克隆 Survey 仓库
git clone <repo-url>

# 2. 同步所有 GitHub 项目
bun scripts/sync-repos.ts
```

---

## 许可证

MIT


## 多端同步

本项目支持通过 Git 实现多端数据同步。



本项目支持通过 Git 实现多端数据同步。

### 项目注册表

所有已调研的项目记录在 `data/repos.json`，包含：
- 项目 URL 和元数据
- 克隆时间和最后 commit
- Tags 和难度级别

### 同步命令

```bash
# 同步所有项目（clone 或 pull）
bun scripts/sync-repos.ts

# 检查哪些项目有更新
bun scripts/sync-repos.ts --check

# 只克隆缺失的项目
bun scripts/sync-repos.ts --clone

# 只拉取已有项目
bun scripts/sync-repos.ts --pull

# 同步单个项目
bun scripts/sync-repos.ts vercel/next.js
```

### 新机器初始化

```bash
# 1. 克隆 Survey 仓库
git clone <repo-url>

# 2. 同步所有 GitHub 项目
bun scripts/sync-repos.ts
```

---

## 许可证

MIT


### 运行脚本

```bash
# 更新 GitHub 项目索引
bun scripts/update-github-index.ts

# 分析单个项目
bun scripts/analyzer.ts --project github/<project-name>

# 分析单个项目（仅打印信息，不调用 LLM）
bun scripts/analyzer.ts --project github/<project-name> --dry-run

# 强制重新分析（忽略缓存）
bun scripts/analyzer.ts --project github/<project-name> --force
```

### 类型检查

```bash
bun build --no-build scripts/update-github-index.ts
```

---

## 许可证

MIT