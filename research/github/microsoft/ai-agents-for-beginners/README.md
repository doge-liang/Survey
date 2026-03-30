---
id: microsoft/ai-agents-for-beginners
title: AI Agents for Beginners Analysis
source_type: github
upstream_url: "https://github.com/microsoft/ai-agents-for-beginners"
generated_by: github-researcher
created_at: "2026-03-18T10:30:00Z"
updated_at: "2026-03-18T10:30:00Z"
tags: [ai-agents, microsoft, tutorial, course, azure, machine-learning]
description: 微软官方 AI Agents 入门课程，12+ Lessons 带你从零开始构建 AI Agents
language: zh
---
# AI Agents for Beginners

> 微软官方推出的 AI Agents 入门课程，12+ Lessons 带你从零开始构建 AI Agents

[![GitHub stars](https://img.shields.io/github/stars/microsoft/ai-agents-for-beginners)](https://github.com/microsoft/ai-agents-for-beginners)
[![License](https://img.shields.io/github/license/microsoft/ai-agents-for-beginners)](https://github.com/microsoft/ai-agents-for-beginners)
[![GitHub forks](https://img.shields.io/github/forks/microsoft/ai-agents-for-beginners)](https://github.com/microsoft/ai-agents-for-beginners)

## 概述

AI Agents for Beginners 是微软官方推出的免费开源课程，旨在帮助开发者掌握构建 AI Agents 的核心知识与技能。该课程涵盖了从基础的 AI Agent 概念到生产级部署的完整学习路径，是目前最受欢迎的 AI Agent 入门资源之一。

该课程的主要特点包括：

- **系统性学习路径**：12+ 精心设计的课程，涵盖 AI Agent 的各个方面
- **实践导向**：每个课程都配有可运行的 Jupyter Notebooks 代码示例
- **多语言支持**：支持 50+ 种语言的翻译，惠及全球开发者
- **微软官方支持**：使用 Microsoft Agent Framework 和 Azure AI Foundry，构建企业级应用

## 技术栈

| 类别 | 技术 |
|------|------|
| 编程语言 | Python, .NET (C#) |
| 运行时 | Python 3.12+, .NET 10+ |
| Agent 框架 | Microsoft Agent Framework (MAF), Azure AI Agent Service |
| 云服务 | Azure AI Foundry, Azure AI Search, GitHub Models |
| 认证方式 | Azure CLI (无密钥认证) |
| 开发环境 | VSCode, GitHub Codespaces, Jupyter Notebooks |

### 核心依赖

```python
# requirements.txt 中的关键依赖
azure-identity          # Azure 无密钥认证
azure-ai-projects      # Azure AI 项目客户端
agent-framework        # Microsoft Agent Framework
```

## 项目结构

```
microsoft/ai-agents-for-beginners/
├── 00-course-setup/                    # 课程环境配置
│   ├── README.md                       # 环境搭建指南
│   └── images/                         # 配置截图
├── 01-intro-to-ai-agents/             # AI Agent 入门介绍
├── 02-explore-agentic-frameworks/      # Agent 框架探索
├── 03-agentic-design-patterns/         # Agent 设计模式
├── 04-tool-use/                        # 工具使用模式
├── 05-agentic-rag/                     # Agentic RAG
├── 06-building-trustworthy-agents/      # 构建可信 Agent
├── 07-planning-design/                  # 规划设计模式
├── 08-multi-agent/                     # 多 Agent 协作
├── 09-metacognition/                   # 元认知设计模式
├── 10-ai-agents-production/            # Agent 生产部署
├── 11-agentic-protocols/               # Agent 协议 (MCP, A2A)
├── 12-context-engineering/             # 上下文工程
├── 13-agent-memory/                    # Agent 内存管理
├── 14-microsoft-agent-framework/       # Microsoft Agent Framework
├── 15-browser-use/                     # 浏览器自动化 Agent
├── translations/                        # 多语言翻译 (50+ 语言)
├── code_samples/                        # 各课程代码示例
├── requirements.txt                     # Python 依赖
└── README.md                           # 课程总览
```

## 核心特性

### 1. 完整的课程体系

课程包含 14+ 已完成的课程，涵盖 AI Agent 开发的各个方面：

- **AI Agent 基础**：理解什么是 Agent，Agent 与传统 AI 的区别
- **Agent 框架**：Microsoft Agent Framework、Azure AI Agent Service
- **设计模式**：工具使用、规划、多 Agent 协作、元认知
- **RAG 集成**：Agentic RAG 实现
- **可信 Agent**：安全性、可靠性构建
- **生产部署**：监控、扩展、安全最佳实践
- **前沿协议**：MCP (Model Context Protocol)、A2A (Agent-to-Agent)

### 2. 多语言支持

该课程提供业界领先的多语言支持，通过 GitHub Actions 自动同步翻译：

**已支持语言 (50+)**：
- 亚洲：中文（简体/繁体）、日语、韩语、印地语、泰语、越南语、印尼语、马来语等
- 欧洲：英语、法语、德语、西班牙语、意大利语、葡萄牙语、俄语等
- 中东：阿拉伯语、希伯来语、波斯语等
- 其他：斯瓦希里语、尼泊尔语、缅甸语等

### 3. 实践导向的代码示例

每个课程都配备：

- **Python Notebooks**：使用 Microsoft Agent Framework 的完整示例
- **.NET 示例**：C# 实现的 Agent 代码
- **视频教程**：配套的 YouTube 视频讲解
- **额外资源**：延伸阅读链接

### 4. 企业级技术栈

- **Azure AI Foundry**：微软的统一 AI 开发平台
- **Azure AI Agent Service**：企业级 Agent 部署服务
- **GitHub Models**：免费模型访问
- **无密钥认证**：使用 Azure CLI 实现安全认证

## 学习路径

### 推荐学习顺序

```
第一阶段：入门基础
├── 00-course-setup          ← 环境配置 (必读)
├── 01-intro-to-ai-agents   ← AI Agent 概念入门
└── 02-explore-agentic-frameworks ← 框架选择

第二阶段：核心模式
├── 03-agentic-design-patterns  ← 设计原则
├── 04-tool-use                 ← 工具使用
├── 05-agentic-rag             ← RAG 集成
└── 06-building-trustworthy    ← 可信构建

第三阶段：高级特性
├── 07-planning-design        ← 规划模式
├── 08-multi-agent            ← 多 Agent
├── 09-metacognition          ← 元认知
└── 10-ai-agents-production  ← 生产部署

第四阶段：前沿主题
├── 11-agentic-protocols      ← MCP/A2A 协议
├── 12-context-engineering   ← 上下文工程
├── 13-agent-memory           ← 内存管理
└── 14-microsoft-agent-framework ← MAF 深度
```

### 各课程详情

| 课程 | 主题 | 视频 | 代码示例 |
|------|------|------|----------|
| 01 | AI Agent 入门与用例 | ✓ | Python/.NET |
| 02 | Agentic 框架探索 | ✓ | Python/.NET |
| 03 | Agentic 设计模式 | ✓ | Python/.NET |
| 04 | 工具使用模式 | ✓ | Python/.NET |
| 05 | Agentic RAG | ✓ | Python/.NET |
| 06 | 构建可信 Agent | ✓ | Python/.NET |
| 07 | 规划设计模式 | ✓ | Python/.NET |
| 08 | 多 Agent 模式 | ✓ | Python/.NET |
| 09 | 元认知模式 | ✓ | Python/.NET |
| 10 | Agent 生产部署 | ✓ | Python/.NET |
| 11 | Agent 协议 (MCP/A2A) | ✓ | Python |
| 12 | 上下文工程 | ✓ | Python |
| 13 | Agent 内存管理 | ✓ | Python (Notebook) |
| 14 | Microsoft Agent Framework | - | Python |

## 快速开始

### 1. 克隆仓库

```bash
# 推荐：浅克隆（仅获取最新代码）
git clone --depth 1 https://github.com/microsoft/ai-agents-for-beginners.git

# 或者使用 sparse clone 跳过翻译文件
git clone --filter=blob:none --sparse https://github.com/microsoft/ai-agents-for-beginners.git
cd ai-agents-for-beginners
git sparse-checkout set --no-cone '/*' '!translations' '!translated_images'
```

### 2. 环境配置

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate    # Windows

# 安装依赖
pip install -r requirements.txt
```

### 3. 配置 Azure 访问

```bash
# 登录 Azure
az login

# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件：

```env
AZURE_AI_PROJECT_ENDPOINT=https://<your-project>.services.ai.azure.com/api/projects/<your-project-id>
AZURE_AI_MODEL_DEPLOYMENT_NAME=gpt-4o
```

### 4. 创建 Azure AI Foundry 项目

1. 访问 [ai.azure.com](https://ai.azure.com)
2. 创建 Hub 和 Project
3. 部署模型（如 gpt-4o）
4. 获取项目端点和模型名称

### 5. 运行代码示例

```bash
# 打开 Jupyter Notebook
jupyter notebook 01-intro-to-ai-agents/code_samples/
```

## 学习价值

通过本课程，你将掌握以下技能：

### 核心概念理解

- AI Agent 与传统 AI 的区别
- Agentic AI 的设计原则
- 各种 Agent 设计模式（工具使用、规划、记忆、多 Agent 协作）

### 实践能力

- 使用 Microsoft Agent Framework 构建 Agent
- 集成 Azure AI 服务实现 RAG
- 实现多 Agent 协作系统
- Agent 生产部署最佳实践

### 工程实践

- 企业级安全认证（无密钥）
- 代码组织与模块化
- 调试与监控 Agent 行为
- 性能优化与扩展

### 前沿知识

- MCP (Model Context Protocol) 协议
- A2A (Agent-to-Agent) 通信
- 上下文工程最佳实践
- Agent 内存管理策略

## 相关项目

微软官方 "For Beginners" 系列课程：

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [microsoft/generative-ai-for-beginners](https://github.com/microsoft/generative-ai-for-beginners) | Generative AI 入门课程 | High |
| [microsoft/langchain-for-beginners](https://github.com/microsoft/langchain-for-beginners) | LangChain 入门 | High |
| [microsoft/mcp-for-beginners](https://github.com/microsoft/mcp-for-beginners) | MCP 协议入门 | High |
| [microsoft/AZD-for-beginners](https://github.com/microsoft/AZD-for-beginners) | Azure Developer 入门 | Medium |
| [microsoft/edgeai-for-beginners](https://github.com/microsoft/edgeai-for-beginners) | Edge AI 入门 | Medium |
| [microsoft/langchain4j-for-beginners](https://github.com/microsoft/langchain4j-for-beginners) | LangChain4j (Java) 入门 | Medium |

其他 AI Agent 学习资源：

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [LangChain AI Agents](https://python.langchain.com/docs/tutorials/agents/) | LangChain Agent 教程 | Medium |
| [AutoGen](https://microsoft.github.io/autogen/) | 微软 AutoGen 框架 | Medium |

## 参考资料

- [GitHub Repository](https://github.com/microsoft/ai-agents-for-beginners)
- [课程官网](https://microsoft.github.io/ai-agents-for-beginners/)
- [Microsoft Foundry](https://ai.azure.com)
- [Azure AI Agent Service 文档](https://learn.microsoft.com/azure/ai-services/agents/overview)
- [Microsoft Agent Framework](https://learn.microsoft.com/azure/ai-services/openai/how-to/responses)
- [Discord 社区](https://aka.ms/ai-agents/discord)

---

*Generated: 2026-03-18*
