---
id: bytedance/deer-flow
title: DeerFlow 2.0 Analysis
source_type: github
upstream_url: "https://github.com/bytedance/deer-flow"
generated_by: github-researcher
created_at: "2026-03-27T10:00:00Z"
updated_at: "2026-03-27T10:00:00Z"
tags: [ai-agent, super-agent, langgraph, langchain, bytedance, sandbox, subagents, mcp, python, nextjs]
language: zh
---
# DeerFlow 2.0

> 字节跳动开源的 Super Agent Harness，支持子 Agent、记忆、沙箱执行和可扩展技能

[![GitHub stars](https://img.shields.io/github/stars/bytedance/deer-flow)](https://github.com/bytedance/deer-flow)
[![License](https://img.shields.io/github/license/bytedance/deer-flow)](https://github.com/bytedance/deer-flow)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://github.com/bytedance/deer-flow)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)](https://github.com/bytedance/deer-flow)

## 概述

DeerFlow（**D**eep **E**xploration and **E**fficient **R**esearch **Flow**）是字节跳动于 2026 年 2 月 27 日开源的 Super Agent Harness。该项目在发布后 24 小时内即登顶 GitHub Trending 排行榜，目前已获得超过 49,000+ Star，成为 2026 年初最受关注的 AI Agent 开源项目之一。

DeerFlow 2.0 是完全重写的版本，与 v1.0 版本没有任何代码共享。它基于 LangGraph 和 LangChain 构建，提供了 AI Agent 完成复杂任务所需的全部基础设施：文件系统、记忆系统、技能库、沙箱隔离执行环境，以及子 Agent 规划和生成能力。

**核心定位**：不同于普通的聊天机器人或代码生成工具，DeerFlow 是一个**可扩展的 Agent 运行平台**，能够让 AI Agent 在隔离的沙箱环境中真正执行多步骤复杂任务。

## 技术栈

| 类别 | 技术 |
|------|------|
| **后端语言** | Python 3.12+ |
| **前端语言** | TypeScript / Next.js 16 |
| **UI 框架** | React 19, Radix UI, Tailwind CSS 4 |
| **Agent 框架** | LangGraph, LangChain |
| **Web 框架** | FastAPI (Gateway), LangGraph Server |
| **数据库** | LangGraph Checkpointing (状态持久化) |
| **沙箱** | Docker, Kubernetes (生产环境) |
| **构建工具** | uv (Python), pnpm (Node.js), nginx |
| **部署** | Docker Compose, Kubernetes |

### 核心依赖

**后端 (pyproject.toml)**:
- `langgraph-sdk>=0.1.51` — 多 Agent 编排核心
- `langchain-core>=1.1.15` — LLM 交互
- `fastapi>=0.115.0` — Gateway API
- `uvicorn[standard]>=0.34.0` — ASGI 服务器
- `python-telegram-bot>=21.0` — Telegram 集成
- `slack-sdk>=3.33.0` — Slack 集成
- `lark-oapi>=1.4.0` — 飞书/Lark 集成

**前端 (package.json)**:
- `next@^16.1.7` — React SSR 框架
- `react@^19.0.0` — UI 库
- `@langchain/langgraph-sdk@^1.5.3` — 与后端 LangGraph 通信
- `@radix-ui/*` — 无样式 UI 组件库
- `tailwindcss@^4.0.15` — 原子化 CSS
- `ai@^6.0.33` — 流式响应处理
- `@xyflow/react@^12.10.0` — Agent 可视化流程图

## 项目结构

```
bytedance/deer-flow/
├── backend/                          # Python Agent 运行时
│   ├── app/
│   │   ├── channels/                 # IM 渠道集成 (Telegram, Slack, Feishu)
│   │   └── gateway/                 # FastAPI Gateway (REST API)
│   │       ├── models.py            # /api/models - 模型配置
│   │       ├── skills.py            # /api/skills - 技能管理
│   │       ├── uploads.py           # /api/threads/{id}/uploads - 文件上传
│   │       ├── artifacts.py         # /api/threads/{id}/artifacts - 产物服务
│   │       └── mcp.py               # /api/mcp - MCP 服务器配置
│   ├── docs/                        # 后端架构文档
│   │   ├── ARCHITECTURE.md          # 核心架构图
│   │   ├── CONFIGURATION.md         # 配置指南
│   │   ├── MCP_SERVER.md            # MCP 集成
│   │   └── ...
│   ├── packages/harness/             # 核心 Harness 包 (workspace)
│   │   ├── src/agents/             # Agent 定义
│   │   │   ├── lead_agent/         # 主 Agent
│   │   │   └── subagent/           # 子 Agent
│   │   ├── src/models/             # 模型工厂 (支持 OpenAI, Anthropic, DeepSeek 等)
│   │   ├── src/tools/              # 内置工具集
│   │   ├── src/skills/             # 技能加载系统
│   │   ├── src/sandbox/            # 沙箱抽象层
│   │   │   ├── local.py            # 本地执行 (开发用)
│   │   │   └── community/          # Docker/K8s 隔离执行
│   │   └── src/mcp/                # MCP 客户端管理
│   └── tests/                       # 70+ 单元测试
├── frontend/                         # Next.js React 应用
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   ├── components/             # React 组件
│   │   ├── core/                   # 核心业务逻辑
│   │   └── hooks/                  # React Hooks
│   └── package.json
├── skills/public/                   # 内置技能库 (17+)
│   ├── bootstrap/                   # 引导技能
│   ├── deep-research/               # 深度研究
│   ├── report-generation/           # 报告生成
│   ├── slide-creation/             # PPT 创建
│   ├── image-generation/            # 图片生成
│   ├── video-generation/           # 视频生成
│   ├── data-analysis/              # 数据分析
│   ├── frontend-design/            # 前端设计
│   ├── github-deep-research/       # GitHub 深度研究
│   ├── claude-to-deerflow/        # Claude Code 集成
│   └── ...                         # 更多技能
├── docker/                          # Docker 部署配置
│   ├── docker-compose.yaml         # 生产部署
│   ├── docker-compose-dev.yaml     # 开发部署
│   ├── nginx/                      # Nginx 反向代理配置
│   └── provisioner/                # K8s 沙箱调配器
├── scripts/                         # 运维脚本
├── config.example.yaml             # 配置示例
└── extensions_config.example.json  # MCP 扩展配置示例
```

## 核心特性

### 1. 子 Agent 编排 (Sub-Agents)

DeerFlow 的主 Agent 可以动态生成子 Agent，每个子 Agent 拥有独立的上下文、工具集和终止条件。子 Agent 之间支持并行执行，完成后主 Agent 汇总所有结果。

**使用场景**：
- 一个研究任务可以分叉为十几个子 Agent，同时探索不同方向
- 最终汇聚成一份完整报告、网站或 PPT

```
主 Agent (Lead Agent)
├── 子 Agent 1 (并行) → 研究方向 A
├── 子 Agent 2 (并行) → 研究方向 B
├── 子 Agent 3 (并行) → 研究方向 C
└── ... → 结果汇总
```

### 2. 沙箱隔离执行 (Sandbox)

DeerFlow 为每个任务提供独立的隔离执行环境：

| 模式 | 说明 | 用途 |
|------|------|------|
| Local | 直接在宿主机执行 | 开发调试 |
| Docker | 容器隔离 | 单机生产 |
| Kubernetes | K8s Pod 隔离 | 大规模/企业级 |

**沙箱文件系统布局**：
```
/mnt/user-data/
├── uploads/     # 用户上传文件
├── workspace/   # Agent 工作目录
└── outputs/     # 最终产物
```

### 3. 技能系统 (Skills)

Skills 是 DeerFlow 的核心扩展机制。每个技能是一个 Markdown 文件，定义了工作流、最佳实践和参考资源。

**内置技能**：
- `deep-research` — 深度研究
- `report-generation` — 报告生成
- `slide-creation` — PPT 创建
- `image-generation` — 图片生成
- `video-generation` — 视频生成
- `data-analysis` — 数据分析
- `frontend-design` — 前端设计
- `github-deep-research` — GitHub 项目分析

**技能加载策略**：按需渐进式加载，只在任务需要时才加载，保持上下文精简。

### 4. MCP 服务器集成

支持任何 Model Context Protocol (MCP) 服务器，可通过 `extensions_config.json` 配置：

```json
{
  "mcpServers": {
    "github": {
      "enabled": true,
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    },
    "filesystem": {},
    "postgres": {}
  }
}
```

支持传输方式：stdio、SSE、HTTP/SSE

### 5. 即时通讯渠道集成 (IM Channels)

DeerFlow 支持通过 IM 应用直接交互：

| 渠道 | 传输方式 | 难度 |
|------|----------|------|
| Telegram | Bot API (long-polling) | 简单 |
| Slack | Socket Mode | 中等 |
| 飞书/Lark | WebSocket | 中等 |

### 6. 长期记忆 (Long-Term Memory)

大多数 Agent 在对话结束后就遗忘一切。DeerFlow 跨会话持久化记忆：
- 用户画像和偏好
- 累积知识
- 本地存储，用户可控

### 7. 上下文工程 (Context Engineering)

- **子 Agent 隔离上下文**：每个子 Agent 只能看到自己的上下文，避免干扰
- **摘要压缩**：长会话中主动摘要已完成子任务，释放上下文窗口
- **图片处理**：支持视觉模型的多图片处理中间件

## 架构设计

### 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│ Client (Browser) │
└─────────────────────────────────┬────────────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│ Nginx (Port 2026) │
│ 统一反向代理入口 │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ /api/langgraph/* → LangGraph Server (2024) │
│ │ /api/* → Gateway API (8001) │
│ │ /* → Frontend (3000) │
│ └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ LangGraph Server    │ │ Gateway API         │ │ Frontend            │
│ (Port 2024)         │ │ (Port 8001)         │ │ (Port 3000)         │
│                     │ │                     │ │                     │
│ - Agent Runtime     │ │ - Models API        │ │ - Next.js App       │
│ - Thread Mgmt       │ │ - MCP Config        │ │ - React UI          │
│ - SSE Streaming     │ │ - Skills Mgmt       │ │ - Chat Interface    │
│ - Checkpointing     │ │ - File Uploads      │ │                     │
│                     │ │ - Artifacts         │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### Agent 中间件链

每个请求经过一系列中间件处理：

```
请求 → ThreadDataMiddleware → UploadsMiddleware → SandboxMiddleware 
     → SummarizationMiddleware → TitleMiddleware → TodoListMiddleware 
     → ViewImageMiddleware → ClarificationMiddleware → Agent Core
```

### 模型工厂

支持任意 OpenAI 兼容的 LLM：

```yaml
models:
  - name: gpt-4
    display_name: GPT-4
    use: langchain_openai:ChatOpenAI
    model: gpt-4
    api_key: $OPENAI_API_KEY

  - name: claude-sonnet-4.6
    display_name: Claude Sonnet 4.6 (Claude Code OAuth)
    use: deerflow.models.claude_provider:ClaudeChatModel
    model: claude-sonnet-4-6
```

**推荐模型**：
- Doubao-Seed-2.0-Code (字节跳动)
- DeepSeek v3.2
- Kimi 2.5

## 快速开始

### Docker 部署（推荐）

```bash
git clone https://github.com/bytedance/deer-flow.git
cd deer-flow

# 生成配置
make config

# 编辑 config.yaml 配置模型
vim config.yaml

# 拉取沙箱镜像
make docker-init

# 启动服务
make docker-start

# 访问 http://localhost:2026
```

### 本地开发

```bash
# 检查依赖 (Node.js 22+, pnpm, uv, nginx)
make check

# 安装依赖
make install

# 启动开发服务
make dev

# 访问 http://localhost:2026
```

### 配置模型

编辑 `config.yaml`：

```yaml
models:
  - name: gpt-4
    display_name: GPT-4
    use: langchain_openai:ChatOpenAI
    model: gpt-4
    api_key: $OPENAI_API_KEY
```

设置环境变量：

```bash
# .env
TAVILY_API_KEY=your-tavily-api-key
OPENAI_API_KEY=your-openai-api-key
INFOQUEST_API_KEY=your-infoquest-api-key
```

## Python 嵌入式客户端

DeerFlow 可以作为 Python 库直接使用：

```python
from deerflow.client import DeerFlowClient

client = DeerFlowClient()

# 聊天
response = client.chat("Analyze this paper for me", thread_id="my-thread")

# 流式响应
for event in client.stream("hello"):
    if event.type == "messages-tuple" and event.data.get("type") == "ai":
        print(event.data["content"])

# 列出可用模型
models = client.list_models()

# 管理技能
skills = client.list_skills()
client.update_skill("web-search", enabled=True)
```

## 与其他框架的对比

| 特性 | DeerFlow 2.0 | LangChain | CrewAI | AutoGen |
|------|--------------|-----------|--------|---------|
| **沙箱执行** | ✅ 内置 | ❌ | ❌ | ❌ |
| **子 Agent 并行** | ✅ | ✅ (LangGraph) | ✅ | ✅ |
| **技能系统** | ✅ 内置 | ❌ | ❌ | ❌ |
| **记忆系统** | ✅ 内置 | ⚠️ | ⚠️ | ⚠️ |
| **IM 集成** | ✅ (Telegram/Slack/飞书) | ❌ | ❌ | ❌ |
| **MCP 支持** | ✅ | ⚠️ | ❌ | ❌ |
| **内置技能库** | ✅ 17+ | ❌ | ❌ | ❌ |

**DeerFlow 的差异化优势**：
1. **开箱即用的沙箱** — 不只是 LLM 调用，是真正可执行的 Agent
2. **内置技能生态** — 无需从零构建 Prompt
3. **企业级部署** — 支持 Docker、Kubernetes、本地开发多种模式
4. **字节跳动背书** — TikTok 母公司的工程实力

## 学习价值

- **多 Agent 编排**：LangGraph 状态机 + 子 Agent 并行执行模式
- **沙箱隔离**：Docker/Kubernetes 容器化 Agent 执行环境
- **技能驱动开发**：Markdown 驱动的技能定义系统
- **MCP 协议集成**：标准化的工具扩展协议
- **中间件架构**：请求处理链的模块化设计
- **生产级部署**：Docker Compose + nginx 反向代理架构

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [LangGraph](https://github.com/langchain-ai/langgraph) | 多 Agent 编排框架，DeerFlow 的核心依赖 | 高 |
| [CrewAI](https://github.com/crewAI/crewAI) | AI Agent 编排框架 | 中 |
| [AutoGen](https://github.com/microsoft/autogen) | Microsoft 的多 Agent 框架 | 中 |
| [Mastra](https://github.com/mastra-ai/mastra) | TypeScript AI 代理框架 | 中 |
| [InfoQuest](https://www.bytedance.com) | 字节跳动智能搜索爬取工具集 | 高 (集成) |

## 安全注意事项

⚠️ **重要**：DeerFlow 默认部署在本地可信环境（仅通过 127.0.0.1 访问）。

**安全风险**：
- 未授权调用：Agent 功能可能被恶意发现并批量调用
- 合规风险：若被非法调用进行网络攻击可能产生法律责任

**安全建议**：
- IP 白名单：使用 `iptables` 或硬件防火墙
- 认证网关：配置 nginx 反向代理 + 强认证
- 网络隔离：将 Agent 放在独立 VLAN
- 保持更新：关注 DeerFlow 安全更新

## 参考资料

- [GitHub 仓库](https://github.com/bytedance/deer-flow)
- [官方文档](https://github.com/bytedance/deer-flow/blob/main/README.md)
- [架构文档](./backend/docs/ARCHITECTURE.md)
- [官方入门指南](./Install.md)
- [贡献指南](./CONTRIBUTING.md)

---

*Generated: 2026-03-27*
