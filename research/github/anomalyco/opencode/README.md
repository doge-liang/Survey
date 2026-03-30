---
id: anomalyco/opencode
title: OpenCode Analysis
source_type: github
upstream_url: "https://github.com/anomalyco/opencode"
generated_by: manual-research
created_at: "2026-03-22T00:00:00.000Z"
updated_at: "2026-03-22T10:35:00.000Z"
tags: [AI, Coding Agent, OpenSource, TypeScript, SolidJS, MCP, LLM]
language: zh
---
# OpenCode

> 开源 AI 编码智能体，127K Stars，GitHub Top 10 AI 项目

[![GitHub stars](https://img.shields.io/github/stars/anomalyco/opencode)](https://github.com/anomalyco/opencode)
[![License](https://img.shields.io/github/license/anomalyco/opencode)](https://github.com/anomalyco/opencode)

## 概述

OpenCode 是一个开源 AI 编码智能体（AI Coding Agent），能够独立完成开发任务、代码修改、调试和重构。它被描述为"终态编码智能体"，目标是让 AI 能够自主完成整个编码流程，而非仅仅是辅助补全。

**核心定位**：100% 开源的编码智能体，对标 Claude Code，但完全开源且 provider-agnostic（不绑定任何模型供应商）。

## 技术栈

| 类别 | 技术 |
|------|------|
| **语言** | TypeScript |
| **运行时** | Bun 1.3.10 |
| **核心框架** | Solid.js, Hono |
| **AI SDK** | Vercel AI SDK (`ai` 包) |
| **支持模型** | Anthropic, OpenAI, Google, AWS Bedrock, Azure, 本地模型等 |
| **数据库** | Drizzle ORM + PostgreSQL |
| **部署** | SST (Serverless Stack) |
| **构建工具** | Turbo, Vite |
| **UI** | Tailwind CSS 4, Shiki |
| **终端** | bun-pty (PTY) |
| **代码解析** | Tree-sitter (bash, 等) |
| **协议** | MCP (Model Context Protocol) |

### 关键依赖

- **AI 模型支持**：支持 15+ 模型提供商，包括 Anthropic Claude、OpenAI GPT、Google Gemini、AWS Bedrock、Azure OpenAI、Cohere、Groq、Mistral、Perplexity 等
- **代码解析**：Tree-sitter (bash)、web-tree-sitter
- **协议支持**：MCP SDK (@modelcontextprotocol/sdk)
- **向量搜索**：通过 OpenRouter AI SDK Provider 集成

## 项目结构

```
anomalyco/opencode/
├── packages/
│   ├── opencode/        # 核心 CLI 智能体
│   ├── app/             # Web 应用
│   ├── desktop/        # Tauri 桌面客户端
│   ├── desktop-electron/ # Electron 桌面版
│   ├── console/        # 后端控制台
│   ├── web/            # 营销网站
│   ├── docs/           # 文档站
│   ├── enterprise/      # 企业版
│   ├── sdk/             # JS SDK
│   ├── ui/              # UI 组件库
│   ├── util/            # 工具函数
│   ├── function/        # Serverless 函数
│   ├── script/          # 脚本
│   ├── plugin/          # 插件系统
│   └── extensions/      # 扩展 (zed)
├── infra/               # SST 基础设施
├── github/             # GitHub Actions
├── script/             # 发布/构建脚本
└── sdks/vscode/        # VS Code 插件
```

## 核心特性

### 1. 双内置 Agent 模式

通过 `Tab` 键切换：
- **build**：默认模式，全功能开发智能体
- **plan**：只读模式，用于代码分析和探索，执行文件编辑前会请求确认

另有 **general** 子智能体用于复杂搜索和多步骤任务（通过 `@general` 调用）。

### 2. Provider-Agnostic

不绑定任何模型供应商，支持：
- Anthropic (Claude)
- OpenAI (GPT)
- Google (Gemini)
- AWS Bedrock
- Azure OpenAI
- Cohere
- Groq
- Mistral
- Perplexity
- Cerebras
- DeepInfra
- 本地模型（通过兼容接口）

### 3. 开箱即用的 LSP 支持

内置 Language Server Protocol 支持，无需额外配置即可获得：
- 语义高亮
- 代码跳转
- 自动补全

### 4. TUI 优先设计

由 neovim 用户和 terminal.shop 创建者打造，注重终端体验。提供：
- 终端 UI 界面
- 桌面应用（Tauri/Electron）
- 客户端/服务器架构（可远程控制）

### 5. MCP 协议支持

内置 Model Context Protocol 支持，可扩展工具和资源。

## 安装方式

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# npm
npm i -g opencode-ai@latest

# Homebrew (推荐)
brew install anomalyco/tap/opencode

# scoop (Windows)
scoop install opencode

# mise
mise use -g opencode
```

## 与 Claude Code 的区别

| 特性 | OpenCode | Claude Code |
|------|----------|-------------|
| **开源** | 100% 开源 | 闭源 |
| **模型支持** | 多 provider | 主要 Anthropic |
| **LSP** | 开箱即用 | 需配置 |
| **架构** | C/S 可扩展 | 单体 |
| **UI** | TUI 优先 | CLI |

## 项目规模

- **Stars**: 127K+ (GitHub Top 10 AI 项目)
- **包数量**: 30+ packages (monorepo)
- **协议**: MIT License
- **包管理器**: Bun (workspace monorepo)

## 学习价值

1. **多模型 SDK 设计**：如何设计一个统一的 AI 模型调用抽象层
2. **Agent 架构**：双 agent 模式、general 子智能体的设计
3. **Monorepo 工程化**：Bun workspace + Turbo 的复杂项目管理
4. **TUI 开发**：终端应用的交互设计
5. **Provider-agnostic 架构**：不绑定特定服务的插件化设计

## 相关项目

| 项目 | Stars | 描述 |
|------|-------|------|
| [Claude Code](https://github.com/anthropics/claude-code) | — | Anthropic 官方编码智能体 |
| [Aider](https://github.com/paul-gauthier/aider) | 13K | CLI 编码助手 |
| [Continue](https://github.com/continuedev/continue) | 11K | VS Code/JetBrains 编码助手 |
| [Cursor](https://cursor.com) | — | AI 代码编辑器 |

## 参考链接

- [GitHub](https://github.com/anomalyco/opencode)
- [官网](https://opencode.ai)
- [文档](https://docs.opencode.ai)
- [下载桌面版](https://opencode.ai/download)

---

*Generated: 2026-03-22*
