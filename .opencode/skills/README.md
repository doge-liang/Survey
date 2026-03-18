# Survey Skills

调研辅助技能集合，提供 GitHub 项目分析、论文阅读、调研合成和领域探索功能。

## 概述

| Skill | 用途 | 输出目录 |
|-------|------|----------|
| `github-researcher` | GitHub 项目深度调研 | `research/github/{owner}/{repo}/` |
| `paper-reader` | 学术论文阅读分析 | `paper/{paper-id}/` |
| `survey-synthesizer` | 多源调研合成对比 | `survey/{topic}/` |
| `domain-explorer` | 领域探索学习路径 | `domains/{domain}/` |

## Skill Roles & Data Flow

### Skill 角色定义

| 角色 | 技能 | 说明 |
|------|------|------|
| **规划阶段 (Planning)** | `domain-explorer` | 探索新领域，生成学习路径规划 |
| **调研阶段 (Research)** | `github-researcher`, `paper-reader` | 并行调研 GitHub 项目和学术论文 |
| **合成阶段 (Synthesis)** | `survey-synthesizer` | 综合已有分析，生成对比报告 |

### 数据流

```
Planning Phase
    domain-explorer → domains/{domain}/
           ↓
Research Phase (可并行)
    github-researcher → research/github/*/
    paper-reader → paper/*/
           ↓
Synthesis Phase
    survey-synthesizer → survey/{topic}/
```

**注意**: `domain-explorer` 是**规划辅助技能**，用于在调研前确定学习方向和范围，而非调研流程的核心阶段。
---

## Skills 使用说明

### github-researcher

GitHub 项目深度调研，分析代码库结构、技术栈、架构设计。

**触发词:**
- `research this project`, `analyze repo`
- `项目调研`, `GitHub 分析`
- `deep dive into`, `understand this codebase`
- `技术栈分析`, `架构分析`

**输入格式:**
- GitHub URL: `https://github.com/owner/repo`
- 项目名: `owner/repo`
- 主题搜索: `vector database`, `LLM inference`

**使用示例:**
```
研究一下 karpathy/nanoGPT
分析 https://github.com/vercel/next.js
对比分析 vite 和 webpack
```

---

### paper-reader

学术论文阅读分析，提取元数据、分析引用、发现相关论文。

**触发词:**
- `read this paper`, `analyze this arxiv`
- `论文阅读`, `学术分析`
- `summarize this paper`, `what is this paper about`
- `find related papers`, `analyze citations`

**输入格式:**
- arXiv URL: `https://arxiv.org/abs/2301.12345`
- arXiv ID: `2301.12345`
- DOI: `10.1234/example`
- 论文标题: `Attention Is All You Need`

**使用示例:**
```
阅读这篇论文 https://arxiv.org/abs/2301.12345
分析这篇 arxiv: 2301.12345
这篇论文讲了什么: Attention Is All You Need
```

---

### survey-synthesizer

多源调研合成，对比分析多个项目或论文，生成知识图谱。

**触发词:**
- `compare these`, `对比分析`
- `synthesize survey`, `调研合成`
- `knowledge graph`, `知识图谱`
- `comparison report`, `对比报告`

**输入来源:**
- 项目分析: `research/github/*/README.md`
- 论文笔记: `paper/*/notes.md`

**使用示例:**
```
对比分析 React 和 Vue
调研合成 RAG 技术方案
为这些项目生成知识图谱
```

---

### domain-explorer

领域探索，生成结构化学习路径和资源清单。

**触发词:**
- `explore domain`, `领域探索`
- `learning path`, `学习路径`
- `入门指南`, `新手入门`
- `get started with`, `how to learn`
- `我想学`, `roadmap for`

**使用示例:**
```
探索 Rust 领域
我想学 LLM 微调
RAG 入门指南
生成 Kubernetes 学习路径
```

---

## 环境变量配置

### GITHUB_TOKEN

GitHub API 认证令牌，提升请求限额。

| 状态 | 请求限额 |
|------|----------|
| 未配置 | 60 次/小时 |
| 已配置 | 5000 次/小时 |

**获取方式:**
1. 访问 GitHub Settings → Developer settings → Personal access tokens
2. 创建 token，勾选 `public_repo` 权限
3. 设置环境变量: `GITHUB_TOKEN=ghp_xxxx`

### SEMANTIC_SCHOLAR_API_KEY

Semantic Scholar API 密钥，用于论文元数据和引用分析。

| 状态 | 请求限额 |
|------|----------|
| 未配置 | 100 次/5分钟 |
| 已配置 | 5000 次/5分钟 |

**获取方式:**
1. 访问 [Semantic Scholar API](https://www.semanticscholar.org/product/api)
2. 注册账号并申请 API Key
3. 设置环境变量: `SEMANTIC_SCHOLAR_API_KEY=xxxxx`

---

## 输出目录结构

```
Survey/
├── research/                  # GitHub 项目分析（生成的调研报告）
│   └── github/
│       └── {owner}/
│           └── {repo}/
│               ├── README.md      # 主报告
│               ├── analysis.md    # 详细分析 (可选)
│               └── notes.md       # 快速笔记 (可选)
│
├── sources/                   # 源代码仓库（克隆的原始项目）
│   └── github/
│       └── {owner}/
│           └── {repo}/        # 完整克隆的 GitHub 仓库
│   └── {owner}/
│       └── {repo}/
│           ├── README.md      # 主报告
│           ├── analysis.md    # 详细分析 (可选)
│           └── notes.md       # 快速笔记 (可选)
│
├── paper/                     # 论文笔记
│   └── {paper-id}/
│       ├── notes.md           # 阅读笔记
│       ├── metadata.json      # 元数据
│       └── citations.md       # 引用分析
│
├── survey/                    # 调研合成
│   └── {topic}/
│       ├── comparison.md      # 对比报告
│       ├── knowledge-graph.md # 知识图谱
│       └── survey-index.md    # 索引 (可选)
│
└── domains/                   # 领域探索
    └── {domain}/
        ├── index.md           # 主学习路径文档
        ├── resources.md       # 资源清单
        └── notes.md           # 探索笔记 (可选)
```

---

## 常见问题

### Q: 项目分析返回 403 错误?

**原因:** GitHub API 速率限制。

**解决方案:**
1. 配置 `GITHUB_TOKEN` 环境变量
2. 等待限制重置 (1小时后)
3. 减少并发请求

### Q: 论文无法获取全文?

**原因:** 论文为付费访问 (paywalled)。

**解决方案:**
1. 检查 arXiv 是否有预印本版本
2. 使用 Semantic Scholar 的 `openAccessPdf` 字段查找开放版本
3. Paper Reader 会基于摘要进行有限分析，并标注限制

### Q: 调研合成缺少数据?

**原因:** 输入分析文件不完整或不存在。

**解决方案:**
1. 先运行 `github-researcher` 或 `paper-reader` 生成分析文件
2. 检查 `research/github/*/README.md` 和 `essay/*/notes.md` 是否存在
3. 使用 `--force` 参数重新分析

### Q: 领域探索结果太宽泛?

**原因:** 查询主题过于宽泛 (如 "AI", "编程")。

**解决方案:**
- 细化主题: `LLM 推理优化` 而非 `AI`
- Domain Explorer 会提示选择子领域

### Q: 技能未正确触发?

**检查清单:**
1. 确认 `.opencode/skills/` 目录存在对应的 `SKILL.md`
2. 触发词与 SKILL.md 中的 description 匹配
3. 重启 OpenCode 会话

---

## API 限制汇总

| API | 免费限额 | 认证后限额 |
|-----|----------|------------|
| GitHub | 60 req/hr | 5000 req/hr |
| Semantic Scholar | 100 req/5min | 5000 req/5min |
| arXiv | 3 req/sec | N/A |
| DOI | 无限制 | N/A |

**建议:** 配置环境变量以获得更好的体验。