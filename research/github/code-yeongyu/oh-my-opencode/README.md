# Oh My OpenCode (Oh-My-OpenAgent)

> 最佳的多代理编排框架 - 赋能 AI 智能体开发

[![GitHub stars](https://img.shields.io/github/stars/code-yeongyu/oh-my-openagent)](https://github.com/code-yeongyu/oh-my-openagent)
[![License](https://img.shields.io/github/license/code-yeongyu/oh-my-openagent)](https://github.com/code-yeongyu/oh-my-openagent)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178c6)](https://www.typescriptlang.org/)

## 概述

Oh My OpenCode (现称 Oh My OpenAgent，简称 omo) 是一个强大的多代理编排框架，由 Sisyphus Labs 开发。该项目旨在构建能够像团队一样工作的 AI 智能体，支持多种大语言模型的编排和协作。

该项目因其创新性获得了极高关注，GitHub 星标数超过 40,000。项目的核心理念是"不锁定任何模型"——支持 Claude、Kimi、GLM 用于编排，GPT 用于推理，Minimax 用于速度，Gemini 用于创意。

## 技术栈

| 类别 | 技术 |
|------|------|
| 编程语言 | TypeScript (94.1%), HTML (5.4%), Python (0.4%) |
| 运行时 | Node.js |
| 核心框架 | 自研多代理编排框架 |
| AI 提供商 | Anthropic Claude, OpenAI GPT, Google Gemini, MiniMax, Kimi |
| 许可证 | NOASSERTION |

## 项目结构

```
oh-my-opencode/
├── src/                      # 核心源代码
├── packages/                 # 子包/模块
├── docs/                    # 文档
├── scripts/                 # 构建脚本
├── tests/                   # 测试
├── skill/                   # 技能系统
├── agent/                   # 智能体实现
├── provider/                # AI 提供商集成
└── 配置文件                 # tsconfig, package.json 等
```

## 核心特性

### 1. 多模型编排

- 支持 Claude、Kimi、GLM、GPT、Gemini、MiniMax 等多种模型
- 模型热切换：根据任务自动选择最合适的模型
- 模型协作：不同模型处理不同任务阶段

### 2. 多代理系统

- 智能体编排与协作框架
- 任务分解与分配
- 代理间通信与状态共享

### 3. 技能系统 (Skills)

- 可扩展的技能架构
- 内置丰富工具和能力
- 自定义技能开发支持

### 4. 开发者体验

- TypeScript 完整类型支持
- 丰富的 API 和文档
- 活跃的社区支持

### 5. 企业级特性

- 生产级稳定性
- 可扩展架构
- 安全性和隐私保护

## 架构设计

Oh My OpenCode 采用模块化架构设计，主要包括：

1. **Provider 层**：集成多种 AI 模型提供商
2. **Agent 层**：智能体核心逻辑实现
3. **Skill 层**：可扩展的能力系统
4. **Orchestration 层**：多代理协作编排

```
┌─────────────────────────────────────────────────────────────┐
│                  Oh My OpenCode 架构                          │
├─────────────────────────────────────────────────────────────┤
│  • Provider: Claude / GPT / Gemini / Kimi / MiniMax         │
│  • Agent: 任务分解 / 执行 / 状态管理                          │
│  • Skill: 工具能力 / API 集成                                │
│  • Orchestration: 多代理协作 / 消息路由                       │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/code-yeongyu/oh-my-openagent.git
cd oh-my-openagent

# 安装依赖
npm install

# 构建项目
npm run build
```

### 配置

项目支持多种 AI 提供商配置，需在配置文件中设置相应的 API 密钥。

### 运行示例

```bash
# 启动开发服务器
npm run dev

# 运行示例任务
npm run start
```

## 学习价值

### 适合人群

- **AI 应用开发者**：学习多模型协作和智能体编排
- **框架开发者**：理解大型 TypeScript 项目的架构设计
- **研究人员**：探索 AI 智能体的最新实现

### 可学习的内容

1. **多模型集成**：如何优雅地集成多种 LLM 提供商
2. **智能体设计**：任务分解、执行和状态管理
3. **TypeScript 最佳实践**：大型项目的代码组织
4. **编排模式**：多代理协作的架构设计

### 项目特色

- 40,000+ GitHub Stars 的明星项目
- 160+ 贡献者的活跃社区
- 151 次发布，持续迭代
- 最新的 AI 智能体技术

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [anthropic/claude-code](https://github.com/anthropic/claude-code) | Claude Code CLI | 高 |
| [OpenAI/chatgpt-retrieval-plugin](https://github.com/OpenAI/chatgpt-retrieval-plugin) | ChatGPT 插件 | 中 |
| [LangChain](https://github.com/langchain-ai/langchain) | LLM 应用框架 | 中 |

## 参考资料

- [GitHub 仓库](https://github.com/code-yeongyu/oh-my-openagent)
- [官网](https://ohmyopenagent.com/)
- [Discord 社区](https://discord.gg/)

---

*Generated: 2026-03-18*
