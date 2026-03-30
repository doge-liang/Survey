---
id: sst/opencode
title: "OpenCode: 开源 AI 编程助手"
source_type: github
upstream_url: "https://github.com/anomalyco/opencode"
generated_by: github-researcher
created_at: "2026-03-18T03:00:00Z"
updated_at: "2026-03-18T03:00:00Z"
tags: [agent, coding-assistant, ai-ide, tui]
language: zh
---
# OpenCode

> 开源 AI 编程助手

[![GitHub stars](https://img.shields.io/github/stars/anomalyco/opencode)](https://github.com/anomalyco/opencode)
[![License](https://img.shields.io/github/license/anomalyco/opencode)](https://github.com/anomalyco/opencode)

## 概述

OpenCode 是一个 100% 开源的 AI 编程助手，旨在为开发者提供强大的代码生成和编辑能力。项目最初位于 `sst/opencode`，现已迁移至 `anomalyco/opencode`。作为 Terminal 和 AI IDE 领域的创新者，OpenCode 由 Neovim 用户和 terminal.shop 创建者共同开发，专注于打造终极终端体验。

OpenCode 与 Claude Code 能力相似，但具有以下独特优势：完全开源、不依赖特定模型提供商、内置 LSP 支持、客户端/服务器架构（支持远程控制）。

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript (55%), MDX (41%), Rust (1%) |
| 框架 | React, Node.js |
| 构建工具 | pnpm, turbo |
| 平台 | Terminal (TUI), Desktop (Electron), Web |
| 许可 | MIT |

## 项目结构

```
anomalyco/opencode/
├── packages/
│   ├── console/              # 终端应用
│   │   └── app/             # TUI 界面
│   ├── web/                  # Web 界面
│   └── ...                  # 其他包
├── packages/console/         # 终端 UI 核心
├── packages/server/          # 后端服务
├── docs/                     # 文档
└── README.md                # 项目说明
```

## 核心特性

1. **双 Agent 模式**:
   - **build**: 默认模式，具备完整开发权限
   - **plan**: 只读模式，用于代码分析和探索，默认拒绝文件编辑，执行 bash 命令前需确认

2. **多平台支持**:
   - 终端应用 (TUI)
   - 桌面应用 (Electron)
   - Web 界面

3. **多安装方式**:
   - 一键安装脚本 (YOLO 模式)
   - npm/pnpm/yarn 全局安装
   - Homebrew (macOS/Linux)
   - Scoop/Choco (Windows)
   - Pacman (Arch Linux)
   - Nix

4. **Provider 灵活性**:
   - 支持任意模型提供商
   - 推荐通过 OpenCode Zen 使用，也支持 Claude、OpenAI、Google 或本地模型
   - 完全 Provider 无关

5. **客户端/服务器架构**:
   - 支持远程控制，可在手机上运行助手，终端 UI 作为客户端

## 架构设计

OpenCode 采用现代 monorepo 架构设计：

```
┌─────────────────────────────────────┐
│           CLI / TUI                  │
├─────────────────────────────────────┤
│           Server (API)               │
├─────────────────────────────────────┤
│      Agent / LLM Integration        │
├─────────────────────────────────────┤
│     Provider Abstraction            │
└─────────────────────────────────────┘
```

**核心设计**：
- Provider 抽象层支持任意 LLM 提供商
- 内置 LSP 支持提供智能代码补全
- 支持 Claude Code 等主流 AI 编程工具的主要功能

## 快速开始

### 安装

```bash
# YOLO 模式
curl -fsSL https://opencode.ai/install | bash

# npm
npm i -g opencode-ai@latest

# Homebrew (推荐)
brew install anomalyco/tap/opencode

# Windows
scoop install opencode
```

### 使用

```bash
# 启动交互式会话
opencode

# 编辑文件
opencode edit main.py

# 分析代码
opencode analyze src/
```

### Tab 键切换 Agent

- `Tab` 键在 build 和 plan agent 之间切换

## 学习价值

- 学习 AI 编程助手的架构设计
- 掌握终端 UI (TUI) 开发技术
- 理解 LLM Provider 抽象层设计
- 了解现代 monorepo 项目管理

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [anthropic/claude-code](https://github.com/anthropic/claude-code) | Claude Code AI 编程助手 | High |
| [github/copilot](https://github.com/github/copilot) | GitHub Copilot | High |
| [ Zed Industries/zed](https://github.com/zed-industries/zed) | AI 代码编辑器 | Medium |

## 参考资料

- [GitHub Repository](https://github.com/anomalyco/opencode)
- [官网](https://opencode.ai/)
- [文档](https://opencode.ai/docs)
- [Discord 社区](https://opencode.ai/discord)

---

**注意**: 此项目原位于 `sst/opencode`，现已迁移至 `anomalyco/opencode`。

*Generated: 2026-03-18*
