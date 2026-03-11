# Survey Skills for oh-my-opencode

## TL;DR

> **Quick Summary**: 创建 4 个自定义 Skills 来组织 GitHub 项目调研、学术论文阅读、调研合成和领域探索工作流。利用 oh-my-opencode 的内置能力（Librarian agent, websearch MCP）实现外部 API 集成，数据以 Markdown 格式存储。

> **Deliverables**:
> - `.opencode/skills/github-researcher/SKILL.md` - GitHub 项目调研 Skill
> - `.opencode/skills/paper-reader/SKILL.md` - 学术论文阅读 Skill
> - `.opencode/skills/survey-synthesizer/SKILL.md` - 调研合成 Skill
> - `.opencode/skills/domain-explorer/SKILL.md` - 领域探索 Skill
> - `.opencode/skills/README.md` - Skills 使用文档

> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Wave 1 (github-researcher, paper-reader) → Wave 2 (survey-synthesizer, domain-explorer) → Wave 3 (docs)

---

## Context

### Original Request
用户希望开发 Agentic Survey 助手，通过创建 oh-my-opencode Skills 来组织项目调研和论文阅读工作流。

### Interview Summary

**Key Discussions**:
- **平台选择**: OpenCode + oh-my-opencode 插件，扩展方式为自定义 Skills
- **Skills 范围**: 全部 4 个 Skills（github-researcher, paper-reader, survey-synthesizer, domain-explorer）
- **API 集成**: Semantic Scholar, arXiv, GitHub APIs
- **MCP 策略**: 不创建专用 MCP，使用内置 websearch MCP + 直接 HTTP 调用
- **数据存储**: Markdown 文件，使用现有 `github/`, `essay/` 目录
- **实现策略**: 重新实现，不依赖现有脚本

**Research Findings**:
- **oh-my-opencode 能力**: 11 个专业 agents, 26 个工具, 3 个内置 MCPs
- **Skill 格式**: YAML frontmatter + Markdown 内容
- **API 限制**: Semantic Scholar 100 req/5min (公开), arXiv 3 req/sec, GitHub 60 req/hr (公开)

### Metis Review

**Identified Gaps** (addressed):
- **API Keys**: 需要文档说明环境变量 (`GITHUB_TOKEN`, `SEMANTIC_SCHOLAR_API_KEY`)
- **Rate Limiting**: 每个 Skill 需要重试逻辑和指数退避
- **Edge Cases**: 大型仓库采样、付费论文处理、重复检测

**Guardrails Applied**:
- 不修改 oh-my-opencode 核心代码
- 不创建新的 MCP 服务器
- 不创建新的 agent 类型
- 每个 Skill 独立工作

---

## Work Objectives

### Core Objective
创建 4 个独立可用的 Survey Skills，每个都能单独触发执行特定调研任务，输出结构化的 Markdown 文档。

### Concrete Deliverables

| Skill | 触发词 | 输出位置 |
|-------|--------|----------|
| `github-researcher` | "research this project", "analyze repo", "项目调研" | `github/{owner}-{repo}/` |
| `paper-reader` | "read this paper", "论文阅读", "analyze arxiv" | `essay/{paper-id}/` |
| `survey-synthesizer` | "compare these", "synthesize survey", "调研合成" | `survey/{topic}/` |
| `domain-explorer` | "explore domain", "领域探索", "learning path" | `domains/{domain}/` |

### Definition of Done
- [x] 4 个 SKILL.md 文件已创建且格式正确
- [x] 每个 Skill 包含完整工作流（模式检测 → 执行阶段 → 输出生成）
- [x] 每个 Skill 包含错误处理指导
- [x] 测试命令可验证 Skill 功能
- [x] README.md 文档说明使用方法和环境变量
- [ ] 4 个 SKILL.md 文件已创建且格式正确
- [ ] 每个 Skill 包含完整工作流（模式检测 → 执行阶段 → 输出生成）
- [ ] 每个 Skill 包含 2+ QA 场景
- [ ] 测试命令可验证 Skill 功能
- [ ] README.md 文档说明使用方法和环境变量

### Must Have
- 4 个独立可用的 Skills
- 外部 API 集成（Semantic Scholar, arXiv, GitHub）
- 结构化 Markdown 输出
- 错误处理和重试逻辑

### Must NOT Have (Guardrails)
- 不修改 oh-my-opencode 核心
- 不创建新的 MCP 服务器
- 不创建新的 agent 类型
- 不添加 Skills 之间的直接依赖
- 不需要用户手动验证输出

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO（Skills 是提示模板，不需要测试框架）
- **Automated tests**: NO
- **Agent-Executed QA**: YES - 每个 Skill 包含验证场景

### QA Policy
每个 Skill 包含 Agent-Executed QA Scenarios：
- Happy path: 正常输入 → 预期输出
- Error case: 无效输入 → 优雅错误处理

### Evidence Capture
- `.sisyphus/evidence/skill-{name}-{scenario}.md`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — independent Skills):
├── Task 1: github-researcher SKILL.md [writing]
└── Task 2: paper-reader SKILL.md [writing]

Wave 2 (After Wave 1 — remaining Skills):
├── Task 3: survey-synthesizer SKILL.md [writing]
└── Task 4: domain-explorer SKILL.md [writing]

Wave 3 (After Wave 2 — documentation):
└── Task 5: Skills README.md [writing]

Wave FINAL (Verification):
└── Task F1: Verify all Skills trigger correctly [quick]
```

### Critical Path
Task 1,2 → Task 3,4 → Task 5 → F1

### Agent Dispatch Summary
- **Wave 1**: 2 tasks → `writing` category
- **Wave 2**: 2 tasks → `writing` category
- **Wave 3**: 1 task → `writing` category
- **FINAL**: 1 task → `quick` category

---

> 每个 Skill 是一个 SKILL.md 文件，包含 YAML frontmatter + Markdown 工作流指令。

- [x] 1. **Create github-researcher Skill**

  **What to do**:
  - 创建 `.opencode/skills/github-researcher/SKILL.md`
  - YAML frontmatter: name, description (触发词)
  - 工作流阶段:
    - Phase 0: 模式检测 (URL vs 主题 vs 项目名)
    - Phase 1: 信息收集 (GitHub API + websearch)
    - Phase 2: 项目分析 (架构、技术栈、复杂度)
    - Phase 3: 报告生成 (README.md 格式)
  - 包含 API 限流处理和重试逻辑
  - 包含大型仓库采样策略

  **Must NOT do**:
  - 不创建 MCP 服务器
  - 不修改 oh-my-opencode 核心

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - Reason: Skills 是文档型内容，需要结构化写作

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3, 4, 5
  - **Blocked By**: None

  **References**:
  - `github/oh-my-opencode/src/features/builtin-skills/skills/git-master.ts` - Skill 模板结构参考
  - `AGENTS.md` - Survey 项目结构
  - `scripts/analyzer.ts` - 现有分析逻辑参考

  **Acceptance Criteria**:
  - [ ] `.opencode/skills/github-researcher/SKILL.md` 文件存在
  - [ ] YAML frontmatter 包含 name 和 description
  - [ ] 包含至少 3 个工作流阶段
  - [ ] 包含错误处理指导

  **QA Scenarios**:
  ```
  Scenario: Happy path - Analyze public GitHub repo
    Tool: Bash (curl)
    Steps:
      1. Invoke skill with "research https://github.com/langchain-ai/langchain"
      2. Skill detects URL pattern, fetches repo info
      3. Output written to github/langchain-ai-langchain/README.md
    Expected Result: README.md contains architecture, tech stack, complexity
    Evidence: .sisyphus/evidence/skill-github-researcher-happy.md

  Scenario: Error case - Non-existent repo
    Steps:
      1. Invoke skill with "research https://github.com/nonexistent12345/fake"
      2. Skill detects 404 from GitHub API
      3. Returns error message with suggestions
    Expected Result: No files created, error message displayed
    Evidence: .sisyphus/evidence/skill-github-researcher-error.md
  ```

  **Commit**: YES
  - Message: `feat(skills): add github-researcher skill for project analysis`
  - Files: `.opencode/skills/github-researcher/SKILL.md`

- [x] 2. **Create paper-reader Skill**

  **What to do**:
  - 创建 `.opencode/skills/paper-reader/SKILL.md`
  - YAML frontmatter: name, description
  - 工作流阶段:
    - Phase 0: 输入类型检测 (arXiv URL/ID, DOI, 标题)
    - Phase 1: 元数据获取 (Semantic Scholar API + arXiv API)
    - Phase 2: 论文分析 (摘要、方法、贡献、引用)
    - Phase 3: 笔记生成 (notes.md 格式)
  - 处理付费论文（仅摘要）
  - 引用关系分析

  **Must NOT do**:
  - 不创建 MCP 服务器
  - 不下载付费论文全文

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - Reason: 学术写作需要结构化和专业性

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3, 4, 5
  - **Blocked By**: None

  **References**:
  - `github/oh-my-opencode/src/features/builtin-skills/skills/git-master.ts` - Skill 模板结构
  - Semantic Scholar API: `https://api.semanticscholar.org`
  - arXiv API: `http://export.arxiv.org/api/query`

  **Acceptance Criteria**:
  - [ ] `.opencode/skills/paper-reader/SKILL.md` 文件存在
  - [ ] 支持多种输入格式 (arXiv URL, DOI, 标题)
  - [ ] 包含引用分析功能

  **QA Scenarios**:
  ```
  Scenario: Happy path - Read arXiv paper
    Steps:
      1. Invoke skill with "read https://arxiv.org/abs/2301.07041"
      2. Skill extracts arXiv ID, fetches metadata
      3. Generates notes.md with summary, methods, citations
    Expected Result: `essay/2301.07041/notes.md` exists
    Evidence: .sisyphus/evidence/skill-paper-reader-happy.md

  Scenario: Error case - Invalid DOI
    Steps:
      1. Invoke skill with "read paper 10.0000/fake"
      2. Skill attempts lookup, gets 404
      3. Returns error with search suggestions
    Expected Result: No files created, helpful error message
    Evidence: .sisyphus/evidence/skill-paper-reader-error.md
  ```

  **Commit**: YES
  - Message: `feat(skills): add paper-reader skill for academic paper analysis`
  - Files: `.opencode/skills/paper-reader/SKILL.md`

- [x] 3. **Create survey-synthesizer Skill**

  **What to do**:
  - 创建 `.opencode/skills/survey-synthesizer/SKILL.md`
  - YAML frontmatter: name, description
  - 工作流阶段:
    - Phase 0: 输入解析 (项目列表、论文列表、主题)
    - Phase 1: 数据收集 (读取已有分析、补充搜索)
    - Phase 2: 对比分析 (技术栈、方法论、优缺点)
    - Phase 3: 合成报告 (comparison.md, knowledge-graph.md)
  - 支持多项目/多论文对比

  **Must NOT do**:
  - 不依赖其他 Skills 直接调用
  - 不创建新的数据格式

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - Reason: 需要综合分析和结构化输出

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1, 2 (需要已有分析作为输入)

  **References**:
  - `github/` - 已有项目分析目录
  - `essay/` - 已有论文笔记目录

  **Acceptance Criteria**:
  - [ ] `.opencode/skills/survey-synthesizer/SKILL.md` 文件存在
  - [ ] 支持多输入源对比
  - [ ] 生成结构化对比报告

  **QA Scenarios**:
  ```
  Scenario: Compare multiple projects
    Steps:
      1. Invoke skill with "compare langchain llamaindex"
      2. Skill reads existing analyses from github/
      3. Generates comparison.md with pros/cons table
    Expected Result: `survey/llm-frameworks/comparison.md` exists
    Evidence: .sisyphus/evidence/skill-survey-synthesizer-happy.md

  Scenario: Error case - No analysis found
    Steps:
      1. Invoke skill with "compare nonexistent-project"
      2. Skill checks github/, finds nothing
      3. Suggests running github-researcher first
    Expected Result: Helpful guidance message
    Evidence: .sisyphus/evidence/skill-survey-synthesizer-error.md
  ```

  **Commit**: YES
  - Message: `feat(skills): add survey-synthesizer skill for multi-source comparison`
  - Files: `.opencode/skills/survey-synthesizer/SKILL.md`

- [x] 4. **Create domain-explorer Skill**

  **What to do**:
  - 创建 `.opencode/skills/domain-explorer/SKILL.md`
  - YAML frontmatter: name, description
  - 工作流阶段:
    - Phase 0: 领域识别 (关键词提取、范围确定)
    - Phase 1: 资源搜索 (websearch MCP 搜索教程、论文、项目)
    - Phase 2: 内容筛选 (权威性、时效性评估)
    - Phase 3: 路径规划 (学习路径、资源推荐)
  - 生成 learning-path.md, resources.md

  **Must NOT do**:
  - 不创建外部服务依赖
  - 不预设领域知识

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - Reason: 教育内容需要清晰的逻辑结构

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1, 2

  **References**:
  - `github/oh-my-opencode/docs/guide/overview.md` - 文档结构参考

  **Acceptance Criteria**:
  - [ ] `.opencode/skills/domain-explorer/SKILL.md` 文件存在
  - [ ] 支持任意领域探索
  - [ ] 生成分级学习路径

  **QA Scenarios**:
  ```
  Scenario: Explore new domain
    Steps:
      1. Invoke skill with "explore RAG techniques"
      2. Skill searches for tutorials, papers, projects
      3. Generates learning-path.md with beginner/intermediate/advanced
    Expected Result: `domains/RAG/learning-path.md` exists
    Evidence: .sisyphus/evidence/skill-domain-explorer-happy.md

  Scenario: Error case - Too broad domain
    Steps:
      1. Invoke skill with "explore AI"
      2. Skill detects domain too broad
      3. Asks for clarification or suggests sub-domains
    Expected Result: Clarification request with suggestions
    Evidence: .sisyphus/evidence/skill-domain-explorer-error.md
  ```

  **Commit**: YES
  - Message: `feat(skills): add domain-explorer skill for learning path generation`
  - Files: `.opencode/skills/domain-explorer/SKILL.md`

- [x] 5. **Create Skills README Documentation**

  **What to do**:
  - 创建 `.opencode/skills/README.md`
  - 内容包括:
    - Skills 概述和用途
    - 每个 Skill 的使用方法和触发词
    - 环境变量配置 (`GITHUB_TOKEN`, `SEMANTIC_SCHOLAR_API_KEY`)
    - 输出目录结构说明
    - 常见问题和故障排除

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - Reason: 文档写作

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: F1
  - **Blocked By**: Task 1, 2, 3, 4

  **References**:
  - `github/oh-my-opencode/docs/guide/overview.md` - 文档风格参考

  **Acceptance Criteria**:
  - [ ] `.opencode/skills/README.md` 文件存在
  - [ ] 包含所有 4 个 Skills 的说明
  - [ ] 包含环境变量配置指南

  **Commit**: YES
  - Message: `docs(skills): add README with usage instructions`
  - Files: `.opencode/skills/README.md`


## Final Verification Wave

- [x] F1. **Skills Verification** — `quick`
  Verify all 4 Skills:
  1. Check all SKILL.md files exist in `.opencode/skills/*/`
  2. Validate YAML frontmatter (name, description present)
  3. Verify each Skill contains phases and QA scenarios
  4. Check README.md exists and documents all Skills
  Output: `Skills [4/4] | YAML Valid [4/4] | QA Scenarios [N/4] | VERDICT: PASS/FAIL`

---

## Commit Strategy

- **Commit 1**: `feat(skills): add github-researcher skill for project analysis`
- **Commit 2**: `feat(skills): add paper-reader skill for academic paper analysis`
- **Commit 3**: `feat(skills): add survey-synthesizer skill for multi-source comparison`
- **Commit 4**: `feat(skills): add domain-explorer skill for learning path generation`
- **Commit 5**: `docs(skills): add README with usage instructions`

---

## Success Criteria

### Verification Commands
```bash
# Verify Skills exist
ls -la .opencode/skills/*/SKILL.md

# Verify YAML format
grep -l "^name:" .opencode/skills/*/SKILL.md | wc -l  # Expected: 4

# Verify triggers
grep -l "description:" .opencode/skills/*/SKILL.md | wc -l  # Expected: 4
```

### Final Checklist
- [x] All 4 Skills created
- [x] Each Skill has name, description, phases
- [x] Each Skill has error handling
- [x] README.md documents usage
- [x] Environment variables documented
- [x] All 4 Skills created
- [x] Each Skill has name, description, phases
- [x] Each Skill has error handling
- [x] README.md documents usage
- [x] Environment variables documented
- [ ] All 4 Skills created
- [ ] Each Skill has name, description, phases
- [ ] Each Skill has QA scenarios
- [ ] README.md documents usage
- [ ] Environment variables documented