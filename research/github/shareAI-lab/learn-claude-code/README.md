# Learn Claude Code — Harness Engineering for Real Agents

> 构建一个 nano Claude Code 风格的 Agent Harness，从 0 到 1

[![GitHub stars](https://img.shields.io/github/stars/shareAI-lab/learn-claude-code)](https://github.com/shareAI-lab/learn-claude-code)
[![License](https://img.shields.io/github/license/shareAI-lab/learn-claude-code)](https://github.com/shareAI-lab/learn-claude-code)

## 概述

**Learn Claude Code** 是一个开创性的开源项目，其核心观点是：**模型本身就是 Agent，代码只是 Harness（工具系统）**。该项目通过 12 个渐进式会话（s01-s12），从零构建一个类 Claude Code 的 Agent Harness，揭示了 Claude Code 以及所有 AI Agent 的本质架构。

项目拥有 40,000+ stars，是当前最具影响力的 AI Agent 教学项目之一。

## 核心哲学：模型即 Agent，代码即 Harness

```
THE AGENT PATTERN
=================
User --> messages[] --> LLM --> response
|
stop_reason == "tool_use"?
/                \
yes              no
|                |
execute tools    return text
append results
loop back ------> messages[]
```

### Agent 是什么

Agent 是一个**神经网络**——Transformer、RNN 或任何通过训练学习在环境中感知、推理和行动的学习函数。这个定义从 AI 领域诞生之初就没有改变过：

- **2013** — DeepMind DQN 玩 Atari：单一神经网络，仅接收原始像素和游戏分数，学习在 7 个 Atari 2600 游戏中超越所有先前算法
- **2019** — OpenAI Five 征服 Dota 2：5 个神经网络，通过 10 个月内 45,000 年的自我对弈，击败了世界冠军
- **2019** — DeepMind AlphaStar 掌握 StarCraft II：击败职业选手 10-1，最终达到 Grandmaster 水平（前 0.15%）
- **2024-2025** — LLM Agents 重塑软件工程：Claude、GPT、Gemini 作为编码 Agent 部署

### Agent 不是什么

"Agent" 这个词被很多**提示管道**工具劫持了：
- 拖拽式工作流构建器
- No-code "AI Agent" 平台
- 提示链编排库

这些只是把 LLM API 调用用 if-else 分支和节点图连接起来，**不是真正的 Agent**。

### Harness 工程师的职责

| 职责 | 描述 |
|------|------|
| **实现工具** | 给 Agent 双手：文件读写、shell 执行、API 调用、浏览器控制、数据库查询 |
| **管理知识** | 给 Agent 领域专业知识：产品文档、架构决策记录、风格指南 |
| **管理上下文** | 给 Agent 干净的内存：子 Agent 隔离、上下文压缩、任务系统 |
| **控制权限** | 给 Agent 边界：沙箱文件访问、破坏性操作审批、信任边界 |
| **收集数据** | 每个 Agent 执行的动作序列都是训练信号，可用于改进 Agent |

## 技术栈

| 类别 | 技术 |
|------|------|
| **核心语言** | Python（参考实现）+ TypeScript（Web 平台）|
| **框架** | Next.js（交互式学习平台）|
| **构建工具** | npm, pip |
| **依赖** | anthropic（Anthropic API 客户端）|
| **文档** | 多语言（English/中文/日本語）|

## 项目结构

```
learn-claude-code/
|
|-- agents/                    # Python 参考实现
|   |-- s01_agent_loop.py      # Session 01: Agent 循环
|   |-- s02_tool_use.py        # Session 02: 工具使用
|   |-- s03_todo_write.py      # Session 03: TodoWrite 规划
|   |-- s04_subagent.py        # Session 04: 子 Agent
|   |-- s05_skill_loading.py   # Session 05: Skill 加载
|   |-- s06_context_compact.py # Session 06: 上下文压缩
|   |-- s07_task_system.py     # Session 07: 任务系统
|   |-- s08_background_tasks.py# Session 08: 后台任务
|   |-- s09_agent_teams.py     # Session 09: Agent 团队
|   |-- s10_team_protocols.py   # Session 10: 团队协议
|   |-- s11_autonomous_agents.py# Session 11: 自主 Agent
|   |-- s12_worktree_task_isolation.py # Session 12: 工作树隔离
|   |-- s_full.py              # 完整 capstone（所有机制组合）
|
|-- docs/{en,zh,ja}/          # 三语种心智模型文档
|   |-- s01-the-agent-loop.md
|   |-- s02-tool-use.md
|   |-- ... (s01-s12 完整文档)
|
|-- web/                       # Next.js 交互式学习平台
|   |-- src/                   # React 组件
|   |-- public/                 # 静态资源
|   |-- package.json            # npm 依赖
|
|-- skills/                    # Skill 文件（s05 使用）
|
|-- requirements.txt           # Python 依赖
|-- .env.example               # 环境变量示例
```

## 12 个渐进式会话

### Phase 1: THE LOOP（循环）

| Session | 主题 | 座右铭 |
|---------|------|--------|
| **s01** | Agent Loop | "One loop & Bash is all you need" — 一个工具 + 一个循环 = 一个 Agent |
| **s02** | Tool Use | "Adding a tool means adding one handler" — 循环不变，新工具注册到调度映射表 |

### Phase 2: PLANNING & KNOWLEDGE（规划与知识）

| Session | 主题 | 座右铭 |
|---------|------|--------|
| **s03** | TodoWrite | "An agent without a plan drifts" — 先列步骤再执行，完成率翻倍 |
| **s04** | Subagents | "Break big tasks down; each subtask gets a clean context" — 子 Agent 使用独立的 messages[] |
| **s05** | Skills | "Load knowledge when you need it, not upfront" — 通过 tool_result 注入，而非系统提示词 |
| **s06** | Context Compact | "Context will fill up; you need a way to make room" — 三层压缩策略实现无限会话 |

### Phase 3: PERSISTENCE（持久化）

| Session | 主题 | 座右铭 |
|---------|------|--------|
| **s07** | Tasks | "Break big goals into small tasks, order them, persist to disk" — 基于文件的 CRUD + 依赖图 |
| **s08** | Background Tasks | "Run slow operations in the background; the agent keeps thinking" — 守护线程运行命令，完成时注入通知 |

### Phase 4: TEAMS（团队协作）

| Session | 主题 | 座右铭 |
|---------|------|--------|
| **s09** | Agent Teams | "When the task is too big for one, delegate to teammates" — 持久化队友 + 异步邮箱 |
| **s10** | Team Protocols | "Teammates need shared communication rules" — 一个请求-响应模式驱动所有协商 |
| **s11** | Autonomous Agents | "Teammates scan the board and claim tasks themselves" — 无需领导分配，每个 Agent 自主认领任务 |
| **s12** | Worktree + Task Isolation | "Each works in its own directory, no interference" — 任务管理目标，工作树管理目录，ID 绑定 |

## 核心模式

```python
def agent_loop(messages):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS,
        )
        messages.append({"role": "assistant", "content": response.content})
        
        if response.stop_reason != "tool_use":
            return
        
        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = TOOL_HANDLERS[block.name](**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

每个会话都在这个循环上叠加一层 Harness 机制——**循环属于 Agent，机制属于 Harness**。

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/shareAI-lab/learn-claude-code
cd learn-claude-code

# 安装 Python 依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY

# 从第一个会话开始
python agents/s01_agent_loop.py

# 完整 capstone（所有机制组合）
python agents/s_full.py

# 启动交互式 Web 平台
cd web && npm install && npm run dev
# 访问 http://localhost:3000
```

## 学习路径

```
Phase 1: THE LOOP              Phase 2: PLANNING & KNOWLEDGE
====================             =============================
s01 The Agent Loop [1]          s03 TodoWrite [5]
  + stop_reason                  TodoManager + nag reminder
  |                              |
  +-> s02 Tool Use [4]          s04 Subagents [5]
     dispatch map:                fresh messages[] per child
     name->handler               |
                               s05 Skills [5]
                               SKILL.md via tool_result
                               |
                               s06 Context Compact [5]
                               3-layer compression

Phase 3: PERSISTENCE            Phase 4: TEAMS
====================             ====================
s07 Tasks [8]                   s09 Agent Teams [9]
  file-based CRUD + deps graph   teammates + JSONL mailboxes
  |                              |
  s08 Background Tasks [6]      s10 Team Protocols [12]
  daemon threads + notify queue  shutdown + plan approval FSM
  |                              |
  s11 Autonomous Agents [14]    s12 Worktree Isolation [16]
  idle cycle + auto-claim        task coord + isolated exec lanes
```

## 架构设计亮点

### 1. **工具注册模式**
```python
TOOL_HANDLERS = {
    "bash": handle_bash,
    "read": handle_read,
    "write": handle_write,
    # 新工具只需添加到调度映射表
}
```

### 2. **子 Agent 隔离**
每个子 Agent 拥有独立的 `messages[]`，主对话保持干净，避免噪声泄漏。

### 3. **三层压缩策略**
- 第一层：摘要压缩
- 第二层：选择性保留
- 第三层：历史修剪

### 4. **基于文件的 Task 图**
```
tasks/
  task_001.json  # {"id": "001", "status": "done", "deps": []}
  task_002.json  # {"id": "002", "status": "pending", "deps": ["001"]}
```

### 5. **JSONL 邮箱协议**
用于 Agent 团队间的异步通信。

## 学习价值

- ✅ **理解 Agent 本质**：模型即 Agent，代码即 Harness
- ✅ **掌握 Harness 工程**：工具、知识、上下文、权限的核心设计模式
- ✅ **12 个渐进式里程碑**：从简单循环到多 Agent 团队协作
- ✅ **多语言文档**：English、中文、日本語
- ✅ **交互式 Web 平台**：可视化、步骤图、源码查看器
- ✅ **生产级 SDK 支持**：学完后可使用 Kode Agent CLI / SDK 快速落地

## 衍生项目

| 项目 | 描述 | Stars |
|------|------|-------|
| [Kode Agent CLI](https://github.com/shareAI-lab/Kode-cli) | 开源编码 Agent CLI，Skill & LSP 支持 | — |
| [Kode Agent SDK](https://github.com/shareAI-lab/Kode-agent-sdk) | 嵌入式 Agent SDK，无 per-user 进程开销 | — |
| [claw0](https://github.com/shareAI-lab/claw0) | 永远在线的 AI 助手（心跳 + 定时 + IM） | — |

## 相关项目

| 项目 | 描述 | Stars |
|------|------|-------|
| [luongnv89/claude-howto](https://github.com/luongnv89/claude-howto) | 可视化示例驱动的 Claude Code 指南 | 1,131 |
| [LukeRenton/explore-claude-code](https://github.com/LukeRenton/explore-claude-code) | 交互式 IDE 风格文档 | 195 |
| [ykdojo/claude-code-tips](https://github.com/ykdojo/claude-code-tips) | 45 个 Claude Code 技巧 | 1,600+ |
| [carlvellotti/claude-code-everyone-course](https://github.com/carlvellotti/claude-code-everyone-course) | 用 Claude Code 学习 Claude Code | 429 |
| [delbaoliveira/learn-claude-code](https://github.com/delbaoliveira/learn-claude-code) | 基础教程（巴西开发者） | 164 |
| [i5ting/learn-claude-code-js](https://github.com/i5ting/learn-claude-code-js) | 中文 JS 版本 | 74 |
| [Chris-debug-0225/learn-claude-code-java](https://github.com/Chris-debug-0225/learn-claude-code-java) | Java 实现版本 | 41 |

## 为什么选择 Claude Code 作为教学主题

> "Because Claude Code is the most elegant and fully-realized agent harness we have seen."

Claude Code 的架构极其简洁：
```
Claude Code = one agent loop
  + tools (bash, read, write, edit, glob, grep, browser...)
  + on-demand skill loading
  + context compression
  + subagent spawning
  + task system with dependency graph
  + team coordination with async mailboxes
  + worktree isolation for parallel execution
  + permission governance
```

这就是全部。**每个组件都是一个 Harness 机制**——为 Agent 构建的世界。最佳 Agent 产品来自于理解"工程工作是 Harness，不是智能"的工程师。

## 愿景：让宇宙充满真正的 Agent

这个项目不仅仅是关于编码 Agent。任何需要感知、推理和行动的复杂多步判断领域，都是 Agent 可以运作的地方：

```
Estate management agent = model + property sensors + maintenance tools + tenant comms
Agricultural agent = model + soil/weather data + irrigation controls + crop knowledge
Hotel operations agent = model + booking system + guest channels + facility APIs
Medical research agent = model + literature search + lab instruments + protocol docs
Manufacturing agent = model + production line sensors + quality controls + logistics
Education agent = model + curriculum knowledge + student progress + assessment tools
```

循环总是不变的。工具在变，知识在变，权限在变。**Agent——模型——是通用的。**

> **Bash is all you need. Real agents are all the universe needs.**

---

*Generated: 2026-03-27*
