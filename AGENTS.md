# AGENTS.md - Survey 项目管理指南

## 项目描述

本项目用于管理 Survey 相关的材料、文档和工作流程。主要内容包括：
- 调研需求文档
- 调研数据收集与整理
- 分析报告与结果导出
- 参考资料归档
- GitHub 开源项目分析
- 学术论文管理

---

## 文件组织结构

```
.
├── README.md              # 项目总览
├── AGENTS.md             # 本文件 - Agent 工作指南
├── github/               # GitHub 开源项目分析
│   └── {project-name}/   # 按项目名组织
├── essay/                # 学术论文
│   └── {topic}/          # 按主题组织
├── docs/                 # 文档资料
│   ├── requirements/     # 需求文档
│   ├── designs/          # 设计文档
│   └── references/       # 参考资料
├── data/                 # 数据文件
│   ├── raw/              # 原始数据
│   ├── processed/        # 处理后的数据
│   └── exports/          # 导出结果
├── scripts/              # 脚本工具
├── templates/            # 文档模板
└── archive/              # 归档文件
```

---

## 命名规范

### 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 文档 | 小写 + 连字符 | `survey-plan-2024.md` |
| 日期 | `YYYYMMDD` 或 `YYYY-MM-DD` | `2024-03-15-report.md` |
| 版本 | `v{n}` 后缀 | `requirements-v2.md` |
| 论文 | `{作者}-{年份}-{关键词}` | `smith-2024-llm-survey.pdf` |

### 目录命名

- **全部小写**
- **单数形式**: `doc/` 而非 `docs/`
- **描述性名称**: `raw-data/` 而非 `temp/`
- **GitHub 项目**: 使用 `owner/repo-name` 格式作为子目录名

---

## Markdown 编写规范

### 标题层级

```markdown
# 一级标题 - 文档标题（每文档仅一个）
## 二级标题 - 主要章节
### 三级标题 - 子章节
#### 四级标题 - 细节说明
```

### 列表格式

```markdown
- 无序列表项
  - 嵌套项（2空格缩进）
  - 另一个嵌套项

1. 有序列表
2. 第二项
```

### 代码块

```markdown
行内代码使用 \`反引号\`

代码块指定语言：
\`\`\`typescript
const example = "hello";
\`\`\`
```

### 链接与引用

```markdown
[链接文本](URL)
![图片描述](图片路径)

> 引用内容
> 多行引用
```

### 表格

```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容 | 内容 | 内容 |
```

---

## Git 提交规范

### 提交信息格式

```
type(scope): subject

[可选 body]

[可选 footer]
```

### Type（必填）

| Type | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能/新文档 | `feat(survey): 添加用户调研问卷` |
| `fix` | 修复错误 | `fix(docs): 修正数据统计错误` |
| `docs` | 文档更新（仅内容）| `docs(requirement): 更新调研目标` |
| `refactor` | 代码/结构重构 | `refactor(data): 重组数据目录结构` |
| `chore` | 杂项（配置、依赖等）| `chore: 更新项目配置` |

### Scope（可选）

| Scope | 描述 |
|-------|------|
| `survey` | 调研相关 |
| `data` | 数据处理 |
| `docs` | 文档相关 |
| `scripts` | 脚本工具 |
| `github` | GitHub 项目分析 |
| `essay` | 论文相关 |

### 示例

```
docs(survey): 添加 Q2 用户调研计划

- 包含调研目标
- 样本量计算
- 时间安排
```

```
feat(github): 添加 react-hook-form 项目分析

分析内容：
- 核心架构
- API 设计模式
- 性能优化策略
```

### 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 主分支，稳定版本 |
| `feature/*` | 功能分支 |
| `draft/*` | 草稿分支 |

---

## Agent 工作准则

### 1. 自动提交

每次完成请求后，检查文件变化并提交：

```bash
# 检查变更
git status
git diff

# 生成符合规范的 commit message
# 格式: type(scope): subject

# 提交并推送
git add .
git commit -m "type(scope): subject"
git push
```

### 2. 文档操作

- **新建文档**: 从 `templates/` 复制模板（如有）
- **编辑文档**: 保持原有格式风格
- **删除文档**: 确认无引用后再删除

### 3. 数据处理

- 原始数据放入 `data/raw/`
- 处理后数据放入 `data/processed/`
- 导出结果放入 `data/exports/`
- **禁止修改原始数据文件**

### 4. GitHub 项目分析

分析 GitHub 项目时，在 `github/{owner}-{repo}/` 下创建：
- `README.md` - 项目概述
- `analysis.md` - 详细分析
- `notes.md` - 个人笔记

### 5. 论文管理

管理论文时，在 `essay/{topic}/` 下创建：
- `{paper-name}.pdf` - 原始论文
- `{paper-name}-notes.md` - 阅读笔记
- `summary.md` - 主题总结

---

## 工具与命令

### 常用命令

```bash
# 查看项目结构
ls -la

# 搜索文件内容
grep -r "关键词" docs/

# 创建新目录
mkdir -p path/to/directory

# 文件操作
cp source dest    # 复制
mv source dest    # 移动/重命名
rm file           # 删除
```

### Git 常用命令

```bash
# 状态查看
git status
git log --oneline -10

# 分支操作
git branch feature/new-survey
git checkout feature/new-survey

# 提交操作
git add .
git commit -m "type(scope): subject"
git push origin HEAD
```

---

## 注意事项

1. **不要提交敏感信息**: 密码、API Key、个人信息等
2. **保持目录整洁**: 及时归档过期内容到 `archive/`
3. **文档即代码**: 遵循版本控制最佳实践
4. **中英文混排**: 中英文之间加空格，如 "使用 React 框架"
