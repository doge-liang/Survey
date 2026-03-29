---
title: "LLM Agent 架构深度研究：十大核心问题"
category: agent-architecture
level: advanced
tags: [llm, agent, react, planning, cot, tot, memory, rag, function-calling, tool-selection]
date: 2026-03-30
---

# LLM Agent 架构深度研究：十大核心问题

> **研究目标**：深入剖析大模型 Agent 架构中的十大核心技术问题，涵盖推理规划、记忆系统、工具集成等核心模块。
> **目标受众**：LLM Agent 研究者与工业实践者
> **文档数量**：10篇独立研究文档

---

## 文档索引

### 第一部分：推理与规划机制 (Q1–Q4)

| 编号 | 主题 | 核心内容 | 文档 |
|------|------|----------|------|
| **Q1** | ReAct vs Planning 范式对比 | ReAct、Plan-Then-Act、ReAct+轻规划、Tree/Graph Planning 四种范式的机制、局限与适用场景 | [q1-react-vs-planning/index.md](q1-react-vs-planning/index.md) |
| **Q2** | CoT vs Planning 本质区别 | 思维链"仅写出推理过程"与规划"生成可执行任务表"的本质差异 | [q2-cot-vs-planning/index.md](q2-cot-vs-planning/index.md) |
| **Q3** | 多步工具调用容错规划 | 失败重试、回滚、重规划策略；ReWOO等框架的解耦设计 | [q3-robust-planning/index.md](q3-robust-planning/index.md) |
| **Q4** | ToT/LATS 框架机制 | 蒙特卡洛树搜索与LLM自我评估在推理路径探索中的应用 | [q4-tot-lats/index.md](q4-tot-lats/index.md) |

### 第二部分：记忆与上下文管理 (Q5–Q7)

| 编号 | 主题 | 核心内容 | 文档 |
|------|------|----------|------|
| **Q5** | 推理断层解决方案 | 提示工程、记忆机制、架构设计等多维度缓解推理偏离 | [q5-reasoning-drift/index.md](q5-reasoning-drift/index.md) |
| **Q6** | 长期记忆系统设计 | 向量数据库、图数据库、记忆合并、遗忘机制、混合检索 | [q6-long-term-memory/index.md](q6-long-term-memory/index.md) |
| **Q7** | 长上下文优化策略 | 滑动窗口、总结压缩、选择性检索、RECOMP等方案对比 | [q7-long-context/index.md](q7-long-context/index.md) |

### 第三部分：工具集成与选择 (Q8–Q10)

| 编号 | 主题 | 核心内容 | 文档 |
|------|------|----------|------|
| **Q8** | 混合检索必要性 | 工业级RAG为何需要向量+关键词混合检索；BM25与致密检索的互补性 | [q8-hybrid-search/index.md](q8-hybrid-search/index.md) |
| **Q9** | Function Calling Schema优化 | 通过description字段设计、负向约束提升工具调用准确率 | [q9-function-calling/index.md](q9-function-calling/index.md) |
| **Q10** | 高效工具选择策略 | 分层过滤、检索预选、成本感知选择等大规模工具集方案 | [q10-tool-selection/index.md](q10-tool-selection/index.md) |

---

## 文档关联图

```
                    Q1: ReAct vs Planning
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      Q2: CoT vs      Q3: 容错规划      Q4: ToT/LATS
      Planning            │                   │
           │              ▼                   │
           └─────────► Q5: 推理断层 ◄─────────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
      Q6: 长期记忆      Q7: 长上下文      Q8: 混合检索
           │                │                │
           └────────────────┴────────────────┘
                            │
                            ▼
                     Q9: Function Calling
                            │
                            ▼
                     Q10: 工具选择
```

---

## 核心参考文献

### 推理与规划
- **ReAct**: Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models", ICLR 2023
- **ToT**: Yao et al., "Tree of Thoughts: Deliberate Problem Solving with Large Language Models", NeurIPS 2023
- **LATS**: Zhou et al., "Large Language Models as Optimizers", ICLR 2024
- **Reflexion**: Shinn et al., "Reflexion: Language Agents with Verbal Reinforcement Learning", 2023
- **ReWOO**: Wu et al., "ReWOO: Decoupling Reasoning from Observations", 2023

### 记忆系统
- **MemGPT**: Packer et al., "MemGPT: Towards LLMs as Operating Systems", 2023
- **RECOMP**: Xu et al., "RECOMP: Improving Retrieval-Augmented LMs with Compression", 2023
- **HippoRAG**: Kim et al., "HippoRAG: Long-Term Memory for AI Agents", 2024

### 工具集成
- **Function Calling**: OpenAI Function Calling Documentation, 2023
- **ToolBench**: Qin et al., "ToolBench: Improving LLMs Use of Tools", 2023

---

## 研究方法论

本文档集采用以下研究方法：

1. **文献调研**：系统性梳理arXiv顶会论文（ReAct、ToT、MemGPT等）
2. **实现分析**：深入研究开源实现（LangChain、AutoGPT、MemGPT等）
3. **实践验证**：提供可运行的代码示例与伪代码
4. **双受众覆盖**：理论深度与工程实践并重

---

*最后更新：2026-03-30*
*文档总数：10篇（9篇已完成，Q2进行中）*
