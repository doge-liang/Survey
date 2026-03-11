# AGENTS.md - Survey 项目指南

## 项目概述

Survey 是一个调研材料管理项目，支持 GitHub 开源项目分析和学术论文管理。使用 TypeScript + Bun 构建。

包含 4 个 OpenCode Skills 用于自动化调研工作流。

---

## Build/Lint 命令

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

# 查看配置
bun scripts/config.ts
```

### 类型检查

```bash
bun build --no-build scripts/update-github-index.ts
```

---

## Survey Skills

### Skills 概述

| Skill | 用途 | 触发词示例 |
|-------|------|-----------|
| `github-researcher` | GitHub 项目调研 | "项目调研", "research this project" |
| `paper-reader` | 论文阅读分析 | "论文阅读", "read this paper" |
| `survey-synthesizer` | 调研合成对比 | "对比分析", "compare these" |
| `domain-explorer` | 领域探索学习 | "领域探索", "explore domain" |

### 使用方式

在 OpenCode 对话中直接使用触发词：

```
研究一下 vercel/next.js
阅读论文 https://arxiv.org/abs/2301.07041
对比分析 React 和 Vue
探索 RAG 领域
```

### 输出目录

| Skill | 输出目录 |
|-------|----------|
| `github-researcher` | `github/{owner}-{repo}/README.md` |
| `paper-reader` | `essay/{paper-id}/notes.md` |
| `survey-synthesizer` | `survey/{topic}/comparison.md` |
| `domain-explorer` | `domains/{domain}/learning-path.md` |

---

## 环境配置

### 必需

- Bun >= 1.0.0
- Git

### 环境变量

```bash
# LLM 分析（必需）
KIMI_API_KEY=your-api-key

# GitHub API（可选，提升限额 60 → 5000 req/hr）
GITHUB_TOKEN=ghp_your_token

# Semantic Scholar API（可选，提升限额 100 → 5000 req/5min）
SEMANTIC_SCHOLAR_API_KEY=your_key
```

---

## 代码风格指南

### Imports 组织顺序

1. Node.js 内置模块
2. 第三方库（如有）
3. 本地模块导入
4. 类型导入（使用 `import type`）

### 命名约定

| 类型 | 风格 | 示例 |
|------|------|------|
| 类 | PascalCase | `ProjectAnalyzer` |
| 函数/变量 | camelCase | `getProjectInfo` |
| 常量 | SCREAMING_SNAKE_CASE | `SKIP_DIRS` |
| 文件 | kebab-case | `update-github-index.ts` |

### 类型定义

- 使用 `interface` + JSDoc 定义对象类型
- 使用 `type` 定义联合类型

### 错误处理

```typescript
// 推荐：明确错误消息
try {
  const result = await riskyOperation();
} catch (error) {
  throw new Error(`Operation failed: ${error}`);
}

// 可接受：静默忽略需注释说明
try {
  return await readOptionalFile();
} catch {
  return undefined; // 文件不存在时返回 undefined
}
```

### 代码格式

- 缩进：2 空格
- 字符串：双引号或模板字符串
- 中英文混排：中英文之间加空格

---

## 目录结构

```
.
├── .opencode/skills/          # OpenCode Skills
│   ├── github-researcher/     # GitHub 项目调研
│   ├── paper-reader/          # 论文阅读
│   ├── survey-synthesizer/    # 调研合成
│   ├── domain-explorer/       # 领域探索
│   └── README.md              # Skills 详细文档
├── scripts/                   # TypeScript 脚本
│   ├── update-github-index.ts
│   ├── analyzer.ts
│   ├── llm.ts
│   ├── config.ts
│   └── types.ts
├── github/                    # GitHub 项目分析输出
├── essay/                     # 论文笔记输出
├── survey/                    # 调研合成输出
├── domains/                   # 领域探索输出
├── docs/                      # 文档资料
├── data/                      # 数据文件
└── archive/                   # 归档文件
```

---

## Git 提交规范

### 格式

```
type(scope): subject
```

### Type

| Type | 用途 |
|------|------|
| `feat` | 新功能/新文档 |
| `fix` | 修复错误 |
| `docs` | 文档更新 |
| `refactor` | 重构 |
| `chore` | 杂项 |

### Scope

`scripts` | `github` | `survey` | `essay` | `skills` | `data`

---

## Agent 工作准则

### 文档操作

- 新建：小写+连字符命名
- 编辑：保持原有风格
- 删除：确认无引用

### 脚本开发

- 遵循代码风格
- 添加 JSDoc 注释
- 完善错误处理
- 避免 `any`

### 数据处理

- 原始 → `data/raw/`
- 处理 → `data/processed/`
- **禁止修改原始数据**

### 自动提交

```bash
git add . && git commit -m "type(scope): subject" && git push
```

---

## 注意事项

1. 不提交敏感信息（API Key、密码等）
2. 及时归档过期内容到 `archive/`
3. 中英文之间加空格
4. `github/*/` 已加入 `.gitignore`