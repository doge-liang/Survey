# Survey

调研材料管理项目，支持 GitHub 开源项目分析和学术论文管理。使用 TypeScript + Bun 构建。

## 功能特性

- **GitHub 项目调研** - 深度分析开源项目架构、技术栈
- **学术论文阅读** - 论文元数据提取、引用分析、相关论文发现
- **调研合成** - 多项目/论文对比分析、知识图谱生成
- **领域探索** - 结构化学习路径、资源推荐

## 快速开始

```bash
# 安装
git clone <repo-url> && cd survey

# 环境变量（可选）
export GITHUB_TOKEN=...           # GitHub API (60 → 5000 req/hr)
export SEMANTIC_SCHOLAR_API_KEY=... # Semantic Scholar (100 → 5000 req/5min)
```

环境要求: Bun >= 1.0.0, Git

## Survey Skills

| Skill | 用途 | 输出目录 |
|-------|------|----------|
| `github-researcher` | GitHub 项目深度调研 | `research/github/{owner}/{repo}/` |
| `paper-reader` | 学术论文阅读分析 | `research/papers/{paper-id}/` |
| `survey-synthesizer` | 多源调研合成对比 | `research/surveys/{topic}/` |
| `domain-explorer` | 领域探索学习路径 | `research/domains/{domain}/` |
| `repo-manager` | 项目注册表管理 | `data/registries/repos.json` |

详细使用说明、触发词、输入输出格式 → [AGENTS.md](AGENTS.md)

## 典型工作流

```
探索领域 → "探索 RAG 领域" → research/domains/RAG/index.md
调研项目 → "研究 owner/repo" → research/github/owner/repo/README.md
阅读论文 → "阅读 arxiv:2005.14165" → research/papers/2005.14165/notes.md
综合分析 → "对比分析 RAG 框架" → research/surveys/RAG-frameworks/comparison.md
```

## 常用命令

```bash
# 仓库同步
bun scripts/sync-repos.ts --check --clone --pull
bun scripts/sync-repos.ts --verify-fix

# 仓库管理
bun scripts/repo-cli.ts list --json
bun scripts/repo-cli.ts get owner/repo --json

# 测试
bun test scripts/repo-cli.test.ts
bun test scripts/sync-repos.test.ts scripts/lib/repo-registry.test.ts

# 调研合成
bun scripts/test-synthesis.ts --topic "LLM" --json
```

详细命令说明 → [AGENTS.md](AGENTS.md)

## 目录结构

```
./scripts/          # 自动化脚本和 CLI
./data/             # 注册表和生成数据
./.opencode/skills/ # 项目 OpenCode Skills
./sources/github/   # GitHub 克隆的源码仓库
./research/github/  # GitHub 项目分析报告
./research/papers/  # 论文阅读笔记
./research/surveys/ # 调研合成报告
./research/domains/ # 领域学习路径
```

## API 限制

| 服务 | 免费限制 | 认证限制 |
|------|---------|---------|
| GitHub | 60 req/hr | 5000 req/hr |
| Semantic Scholar | 100 req/5min | 5000 req/5min |
| arXiv | 3 req/sec | - |

## 更多信息

- 详细开发规范 → [AGENTS.md](AGENTS.md)
- Skill 文档 → [.opencode/skills/README.md](.opencode/skills/README.md)

## 许可证

MIT
