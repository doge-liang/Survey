---
id: albertvillanova/tinyagents
title: "tinyagents: 极简 LLM + MCP Agent 实现"
source_type: github
upstream_url: "https://github.com/albertvillanova/tinyagents"
generated_by: github-researcher
created_at: "2026-03-18T08:00:00Z"
updated_at: "2026-03-18T08:00:00Z"
tags: [agent, mcp, minimal, python, tool-calling]
language: zh
---
# tinyagents: 极简 LLM + MCP Agent 实现

> 仅用50行代码实现MCP Agent，理解LLM工具调用的核心原理

[![GitHub stars](https://img.shields.io/github/stars/albertvillanova/tinyagents)](https://github.com/albertvillanova/tinyagents)
[![License](https://img.shields.io/github/license/albertvillanova/tinyagents)](https://github.com/albertvillanova/tinyagents)
[![Python](https://img.shields.io/badge/python-3.11+-blue)](https://www.python.org/)

## 概述

**tinyagents** 是一个极简主义的 LLM Agent 实现，展示了如何使用 Model Context Protocol (MCP) 构建能够调用外部工具的智能代理。整个核心实现仅约50行代码，却完整展示了 Agent 的工作流程：理解用户意图 → 选择合适工具 → 执行工具调用 → 整合结果返回。

该项目由 Hugging Face 的 Albert Villanova 开发，灵感来源于 Julien Chaumond 的 "Tiny Agents" 概念。它提供了两种 Agent 实现方式：工具调用型 Agent 和代码执行型 Agent。

## 技术栈

| 类别 | 技术 |
|------|------|
| 编程语言 | Python 3.11+ |
| LLM 模型 | Qwen2.5-Coder-32B-Instruct |
| 协议标准 | Model Context Protocol (MCP) |
| 依赖库 | transformers, mcp |
| 许可证 | Apache License 2.0 |

## 项目结构

```
tinyagents/
├── tinytoolcallingagent.py    # 工具调用型 Agent 实现 (~50行)
├── tinycodeagent.py           # 代码执行型 Agent 实现
├── pyproject.toml             # 项目配置
├── servers/
│   └── weather/               # 示例 MCP 服务器（天气查询）
│       └── weather.py
└── README.md                  # 项目说明
```

## 核心特性

### 1. TinyToolCallingAgent - 工具调用型 Agent

通用型 Agent，能够通过调用外部工具解决任务：

- **连接 MCP 服务器**: 支持 Python 或 JavaScript 编写的 MCP 服务器
- **动态工具发现**: 自动发现 MCP 服务器提供的工具
- **工具调用链**: 处理工具调用结果并继续对话
- **交互式对话**: 提供交互式聊天循环

**工作原理**：
```
用户输入 → LLM 理解意图 → 选择工具 → 调用工具 → 
获取结果 → LLM 整合回答 → 返回给用户
```

### 2. TinyCodeAgent - 代码执行型 Agent

代码型 Agent，能够生成并执行 Python 代码来解决复杂问题：

- **代码生成**: 根据任务生成可执行的 Python 代码
- **代码执行**: 在安全环境中执行生成的代码
- **结果整合**: 将代码执行结果整合到回答中

**与工具调用的区别**：
- 工具调用型：适合明确的、原子化的工具操作
- 代码执行型：适合需要组合推理、复杂计算的场景

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    tinyagents 架构                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   用户输入   │───▶│  LLM 推理   │───▶│  工具选择   │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                                │            │
│  ┌─────────────┐    ┌─────────────┐    ┌──────▼──────┐     │
│  │   返回结果   │◀───│  结果整合   │◀───│  工具执行   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  MCP 服务器层：weather.py (示例) / 任意 MCP 兼容服务器       │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 安装依赖

```bash
pip install transformers mcp
```

### 运行工具调用型 Agent

```bash
python tinytoolcallingagent.py servers/weather/weather.py
```

### 运行代码执行型 Agent

```bash
python tinycodeagent.py
```

## 使用示例

### 工具调用示例

```python
# 用户："纽约的天气怎么样？"
# Agent 思考：需要查询天气
# Agent 调用：get_weather(location="New York")
# 工具返回：{ "temperature": 22, "condition": "sunny" }
# Agent 回答："纽约今天天气晴朗，温度22度"
```

### 代码执行示例

```python
# 用户："计算前10个质数的和"
# Agent 生成代码：
def is_prime(n):
    if n < 2: return False
    for i in range(2, int(n**0.5)+1):
        if n % i == 0: return False
    return True

primes = [n for n in range(2, 30) if is_prime(n)][:10]
print(sum(primes))  # 输出: 129
```

## 学习价值

### 适合人群

- **Agent 初学者**: 理解 LLM Agent 的基本工作原理
- **MCP 学习者**: 学习 Model Context Protocol 协议
- **框架开发者**: 参考极简实现构建自己的 Agent 框架

### 核心知识点

1. **MCP 协议理解**
   - 工具注册与发现机制
   - 工具调用协议
   - 结果返回格式

2. **Agent 核心循环**
   - 感知（Perception）- 理解用户输入
   - 推理（Reasoning）- LLM 决定行动
   - 行动（Action）- 调用工具或生成代码
   - 观察（Observation）- 处理执行结果

3. **工具调用 vs 代码生成**
   - 两种不同的问题解决范式
   - 各自适用场景
   - 如何组合使用

## 与 smolagents 的关系

Hugging Face 的 smolagents 框架也采用了类似的极简理念。tinyagents 可以看作是 smolagents 的"超轻量级"前身，展示了核心概念的最小可行实现。

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [huggingface/smolagents](https://github.com/huggingface/smolagents) | Hugging Face 极简 Agent 框架 | 高 |
| [askbudi/tinyagent](https://github.com/askbudi/tinyagent) | 生产级 LLM Agent SDK | 中 |
| [alchemiststudiosDOTai/tinyAgent](https://github.com/alchemiststudiosDOTai/tinyAgent) | 模块化 Agent 框架 | 中 |

## 参考资料

- [GitHub 仓库](https://github.com/albertvillanova/tinyagents)
- [Hugging Face Blog - TinyAgents](https://huggingface.co/blog/albertvillanova/tiny-agents)
- [MCP 官方文档](https://modelcontextprotocol.io/)
- [Julien Chaumond 的 Tiny Agents 博客](https://www.linkedin.com/posts/julienchaumond_code-activity-7259259434360389632-U8RH)

---

*Generated: 2026-03-18*
