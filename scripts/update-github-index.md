# GitHub 项目索引生成脚本

## 功能说明

此脚本用于自动生成 `github/` 目录下所有克隆项目的索引文件。

## 使用方法

### 方式一：直接运行
```bash
# 使用 Bun 运行
bun scripts/update-github-index.ts

# 或使用 Node.js
npx tsx scripts/update-github-index.ts
```

### 方式二：添加到 package.json scripts
```json
{
  "scripts": {
    "update-index": "bun scripts/update-github-index.ts"
  }
}
```

## 索引文件输出

脚本会生成 `github/README.md`，包含：
- 项目总数统计
- 按目录名排序的项目列表
- 每个项目的元数据（从 package.json 或 git remote 获取）
- 最后更新时间

## 项目信息来源

脚本按以下优先级获取项目信息：
1. **package.json**: 读取 `name`, `description`, `repository.url`
2. **Git remote**: 执行 `git remote -v` 获取仓库 URL
3. **目录名**: 如果以上都失败，使用目录名作为项目名称

## 索引格式

生成的 `github/README.md` 格式：

```markdown
# GitHub 项目索引

> 自动生成时间：2024-03-10
> 项目总数：28

| 目录 | 项目名 | 描述 | 仓库地址 |
|------|--------|------|----------|
| `code-yeongyu-oh-my-opencode` | oh-my-opencode | OpenCode 多代理编排插件 | [GitHub](https://github.com/code-yeongyu/oh-my-opencode) |
| `nanoGPT` | nanoGPT | 最简单的 GPT 训练框架 | [GitHub](https://github.com/karpathy/nanoGPT) |
```

## 与现有 README 的关系

此脚本生成的索引会**替换**现有的手动维护的 `github/README.md`。如果你想保留分类信息（如"阶段一：LLM 基础"），可以：

1. 将现有分类信息保存为 `github/CATEGORIES.md`
2. 脚本只生成简单的表格索引
3. 或者扩展脚本，读取配置文件来支持自定义分类

## 未来扩展

可以扩展脚本支持：
- 读取自定义的 `project-meta.json` 文件添加标签、难度、分类
- 生成 JSON 格式的索引供其他工具使用
- 检测更新（对比本地和远程仓库的 commit 时间）
- 生成项目依赖关系图
