---
id: pguso/ai-agents-from-scratch
title: "AI Agents From Scratch: 从零构建 AI 代理"
source_type: github
upstream_url: "https://github.com/pguso/ai-agents-from-scratch"
generated_by: github-researcher
created_at: "2026-03-18T08:00:00Z"
updated_at: "2026-03-18T08:00:00Z"
tags: [agent, react, from-scratch, tutorial, javascript, local-llm]
language: zh
---
# AI Agents From Scratch: 从零构建 AI 代理

> 不使用任何框架，从零开始构建 AI Agent，真正理解函数调用、记忆系统和 ReAct 模式

[![GitHub stars](https://img.shields.io/github/stars/pguso/ai-agents-from-scratch)](https://github.com/pguso/ai-agents-from-scratch)
[![License](https://img.shields.io/github/license/pguso/ai-agents-from-scratch)](https://github.com/pguso/ai-agents-from-scratch)
[![JavaScript](https://img.shields.io/badge/javascript-ES6+-yellow)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

## 概述

**AI Agents From Scratch** 是一个教育性质的实战教程项目，旨在通过从零开始构建 AI Agent 来揭开 AI Agent 的黑盒。不同于直接使用 LangChain、LlamaIndex 等现成框架，本项目带领你一步步实现 Agent 的核心组件，让你真正理解每个设计决策背后的原理。

项目采用本地 LLM（通过 node-llama-cpp），无需依赖外部 API，确保隐私的同时降低学习成本。通过9个渐进式示例，你将掌握从基础 LLM 交互到复杂 ReAct Agent 的完整知识。

## 技术栈

| 类别 | 技术 |
|------|------|
| 编程语言 | JavaScript (ES6+) |
| 运行环境 | Node.js |
| LLM 引擎 | node-llama-cpp |
| 模型支持 | 本地 LLM (Llama, Qwen 等) |
| 开发模式 | 无框架，原生实现 |
| 许可证 | MIT |

## 项目结构

```
ai-agents-from-scratch/
├── examples/                    # 9个渐进式示例
│   ├── 01_basic/               # 基础 LLM 交互
│   ├── 02_system_prompts/      # 系统提示词
│   ├── 03_function_calling/    # 函数调用机制
│   ├── 04_memory/              # 记忆系统实现
│   ├── 05_rag/                 # RAG 基础实现
│   ├── 06_tools/               # 工具定义与调用
│   ├── 07_chains/              # 链式组合
│   ├── 08_agents/              # Agent 决策循环
│   └── 09_react-agent/         # ReAct 模式实现
├── tutorial/                   # 详细教程文档
├── lib/                        # 核心库实现
│   ├── runnable.js             # Runnable 接口
│   ├── messages.js             # 消息类型
│   ├── llm.js                  # LLM 封装
│   ├── chain.js                # 链式组合
│   ├── agent.js                # Agent 核心
│   └── graph.js                # 状态图
├── package.json
└── README.md
```

## 核心特性

### 1. 9个渐进式学习示例

项目通过9个精心设计的示例，循序渐进地构建 Agent 能力：

**Phase 1: 基础构建 (Examples 1-5)**
- **Example 1**: 基础 LLM 交互 - 理解模型调用
- **Example 2**: 系统提示词 - 控制模型行为
- **Example 3**: 函数调用 - 让模型使用工具
- **Example 4**: 记忆系统 - 持久化对话历史
- **Example 5**: RAG 基础 - 检索增强生成

**Phase 2: 框架原理 (Examples 6-9)**
- **Example 6**: 工具定义 - 结构化工具接口
- **Example 7**: 链式组合 - LangChain Runnable 模式
- **Example 8**: Agent 循环 - 决策与执行
- **Example 9**: ReAct Agent - 推理+行动模式

### 2. 从零实现 LangChain 核心概念

不使用 LangChain，但实现其核心设计模式：

- **Runnable 接口**: 可组合的异步操作单元
- **消息系统**: HumanMessage, AIMessage, SystemMessage
- **Chain 链式**: 操作的有序组合
- **Agent 决策**: 循环推理与工具调用
- **Graph 状态机**: LangGraph 的状态流转

### 3. ReAct 模式完整实现

ReAct (Reasoning + Acting) 是 Agent 的核心模式：

```
┌─────────────────────────────────────────────┐
│              ReAct 循环                     │
├─────────────────────────────────────────────┤
│  1. THOUGHT: 分析问题，决定下一步           │
│       ↓                                     │
│  2. ACTION: 调用工具或生成代码              │
│       ↓                                     │
│  3. OBSERVATION: 观察工具执行结果           │
│       ↓                                     │
│  4. 重复直到问题解决                        │
└─────────────────────────────────────────────┘
```

### 4. 本地 LLM 优先

- **隐私保护**: 所有计算在本地完成
- **成本为零**: 无需 API Key 和调用费用
- **离线运行**: 无网络依赖
- **模型灵活**: 支持 Llama、Qwen、Mistral 等

## 架构设计

### 简化版 LangChain 架构

```
┌─────────────────────────────────────────────────────────────┐
│              AI Agents From Scratch 架构                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Runnable  │───▶│   invoke()  │───▶│    Chain    │     │
│  │   Interface │    │   Method    │    │  Composing  │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                               │             │
│  ┌────────────────────────────────────────────┼──────────┐  │
│  │              Agent Loop                    │          │  │
│  │  ┌──────────┐    ┌──────────┐    ┌───────▼───────┐   │  │
│  │  │  Thought │───▶│  Action  │───▶│  Observation  │   │  │
│  │  └──────────┘    └──────────┘    └───────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  LLM Layer: node-llama-cpp wrapper                          │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 安装

```bash
git clone https://github.com/pguso/ai-agents-from-scratch.git
cd ai-agents-from-scratch
npm install
```

### 下载模型

```bash
# 下载 Llama 模型（示例）
npx node-llama-cpp download --model llama-3-8b
```

### 运行示例

```bash
# 运行基础示例
node examples/01_basic/index.js

# 运行 ReAct Agent
node examples/09_react-agent/index.js
```

## 核心概念详解

### 1. Runnable 接口

LangChain 的核心抽象，本项目从零实现：

```javascript
class Runnable {
  async invoke(input) {
    // 子类实现
  }
  
  pipe(other) {
    // 链式组合
    return new RunnableSequence(this, other);
  }
}
```

### 2. 消息系统

结构化的对话管理：

```javascript
const messages = [
  new SystemMessage("你是一个 helpful assistant"),
  new HumanMessage("你好！"),
  new AIMessage("你好！有什么可以帮助你的吗？")
];
```

### 3. 工具定义

让 LLM 能够使用外部功能：

```javascript
const tools = [{
  name: "calculator",
  description: "执行数学计算",
  parameters: {
    expression: { type: "string", description: "数学表达式" }
  },
  execute: ({ expression }) => eval(expression)
}];
```

### 4. ReAct Agent 实现

```javascript
class ReActAgent {
  async run(input) {
    const thoughts = [];
    
    while (!this.isComplete()) {
      // 1. 思考
      const thought = await this.think(input, thoughts);
      thoughts.push(thought);
      
      // 2. 行动
      if (thought.requiresAction) {
        const result = await this.act(thought.action);
        thoughts.push({ observation: result });
      }
    }
    
    return this.finalAnswer(thoughts);
  }
}
```

## 学习价值

### 适合人群

- **AI Agent 初学者**: 从零开始，不依赖黑盒框架
- **框架使用者**: 理解 LangChain 等框架的内部原理
- **系统学习者**: 通过动手实践掌握 Agent 架构

### 学习路径

1. **基础阶段** (Examples 1-5)
   - 理解 LLM 基本交互
   - 掌握提示工程基础
   - 实现记忆和 RAG

2. **进阶阶段** (Examples 6-9)
   - 理解工具调用机制
   - 实现 Runnable 和 Chain
   - 掌握 Agent 决策循环
   - 完整实现 ReAct 模式

3. **应用阶段**
   - 基于所学构建自己的 Agent
   - 理解并优化现有框架
   - 设计新的 Agent 模式

### 与直接使用 LangChain 的区别

| 方面 | 直接使用 LangChain | 本项目 |
|------|-------------------|--------|
| 学习曲线 | 陡峭，隐藏复杂性 | 渐进式，透明原理 |
| 理解深度 | 表面使用 | 深层原理 |
| 调试能力 | 受限 | 完全可控 |
| 定制能力 | 受框架限制 | 完全自由 |

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [langchain-ai/langchainjs](https://github.com/langchain-ai/langchainjs) | LangChain JavaScript 官方实现 | 高 |
| [huggingface/smolagents](https://github.com/huggingface/smolagents) | Hugging Face 极简 Agent | 中 |
| [albertvillanova/tinyagents](https://github.com/albertvillanova/tinyagents) | 50行代码 MCP Agent | 中 |

## 作者与社区

- **作者**: Patric Gutersohn (@pguso)
- **官网**: https://agentsfromscratch.com
- **博客**: [Medium - Every AI Agent Tutorial Skips the Fundamentals](https://pguso.medium.com/every-ai-agent-tutorial-skips-the-fundamentals-so-i-built-them-effe9befeb42)
- **相关项目**: 作者还维护了 rag-from-scratch 项目

## 参考资料

- [GitHub 仓库](https://github.com/pguso/ai-agents-from-scratch)
- [Interactive Tutorial](https://agentsfromscratch.com)
- [LangChain.js 官方文档](https://js.langchain.com/)
- [ReAct 论文](https://arxiv.org/abs/2210.03629)

---

*Generated: 2026-03-18*
