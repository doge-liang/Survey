# RAG From Scratch

> LangChain 官方 RAG (检索增强生成) 入门教程系列，从基础到高级技术全面讲解

[![GitHub stars](https://img.shields.io/github/stars/langchain-ai/rag-from-scratch)](https://github.com/langchain-ai/rag-from-scratch)
[![License](https://img.shields.io/github/license/langchain-ai/rag-from-scratch)](https://github.com/langchain-ai/rag-from-scratch)

## 概述

RAG From Scratch 是由 LangChain 官方推出的免费视频教程系列，旨在帮助开发者从零开始理解检索增强生成（Retrieval Augmented Generation，RAG）技术。该项目包含 6 个 Jupyter Notebook，配合 14 个视频，全面介绍了 RAG 的基础知识与高级技术。

大语言模型（LLM）虽然在各种任务上表现出色，但其训练数据是固定且有限的，无法直接访问用户的私有数据或最新信息。虽然微调（Fine-tuning）可以一定程度上解决这个问题，但对于事实性召回任务并不总是最优解，且成本较高。RAG 技术的出现提供了一种强大且经济的解决方案，通过从外部数据源检索相关文档，让 LLM 生成更加准确和最新的回答。

## 技术栈

| 类别     | 技术                      |
| -------- | ------------------------- |
| 语言     | Jupyter Notebook, Python  |
| 框架     | LangChain                 |
| 向量存储 | FAISS, Chroma, Pinecone 等 |
| LLM      | OpenAI GPT, Claude 等      |
| Embedding | OpenAI Embeddings 等     |

## 项目结构

```
langchain-ai/rag-from-scratch/
├── README.md                           # 项目说明
├── rag_from_scratch_1_to_4.ipynb       # Part 1-4: 基础部分
├── rag_from_scratch_5_to_9.ipynb       # Part 5-9: 查询转换技术
├── rag_from_scratch_10_and_11.ipynb    # Part 10-11: 路由与查询结构化
├── rag_from_scratch_12_to_14.ipynb     # Part 12-14: 高级索引技术
└── rag_from_scratch_15_to_18.ipynb    # Part 15-18: 扩展内容
```

## 核心特性

### 1. 完整的 RAG 基础知识体系

从零开始讲解 RAG 的三大核心阶段：
- **索引（Indexing）**：文档加载、分块、嵌入向量创建
- **检索（Retrieval）**：基于语义相似度的文档搜索
- **生成（Generation）**：构建 prompt 并调用 LLM 生成答案

### 2. 进阶查询转换技术

涵盖多种提升检索效果的查询优化方法：
- **Multi-Query**：多角度重写查询，提升检索覆盖率
- **RAG Fusion**：融合多查询结果，使用倒数排名融合算法优化排序
- **Query Decomposition**：将复杂问题分解为子问题，逐一解答后整合
- **Step-Back Prompting**：生成更抽象的先验问题，帮助理解本质
- **HyDE**：假设文档嵌入，用 LLM 生成假设文档来改进检索

### 3. 智能路由与查询结构化

- **Query Routing**：逻辑和语义路由，将查询导向最相关的数据源
- **Query Structuring**：将自然语言转换为结构化查询（SQL、Cypher 等）

### 4. 高级索引技术

- **Multi-Representation Indexing**：文档摘要索引，平衡检索效率与完整性
- **RAPTOR**：递归聚类与摘要的树状索引结构，支持多层次检索
- **ColBERT**：令牌级上下文嵌入，实现细粒度匹配

## 架构设计

该项目的架构设计遵循循序渐进的原则，从简单到复杂逐步引入 RAG 的各个组件：

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG 架构总览                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│  │  Indexing │ -> │ Retrieval │ -> │Generation │            │
│  └──────────┘    └──────────┘    └──────────┘            │
│        │              │              │                      │
│        v              v              v                      │
│  • Document     • Similarity    • Prompt                  │
│    Loading        Search         Template                  │
│  • Splitting    • Vector DB     • LLM                    │
│  • Embedding    • Reranking     Response                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Advanced Techniques                      │  │
│  │  Query Translation | Routing | Indexing Methods     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 核心设计原则

1. **模块化**：每个技术点独立讲解，便于按需学习
2. **实践导向**：每个概念都配有可运行的代码示例
3. **循序渐进**：从基础概念到高级技术，逐步深入
4. **视频配套**：配合 YouTube 视频教程，视听结合学习效果更佳

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/langchain-ai/rag-from-scratch.git
cd rag-from-scratch
```

### 2. 安装依赖

```bash
pip install langchain openai faiss-cpu chromadb
```

### 3. 设置环境变量

```bash
export OPENAI_API_KEY="your-api-key"
```

### 4. 运行 Notebooks

使用 Jupyter 或 VS Code 打开任意 notebook 即可开始学习：

```bash
jupyter notebook rag_from_scratch_1_to_4.ipynb
```

### 推荐学习路径

| 阶段 | 视频 | 重点内容 |
|------|------|---------|
| 入门 | Part 1-4 | RAG 基础：索引、检索、生成 |
| 进阶 | Part 5-9 | 查询转换技术 |
| 高级 | Part 10-14 | 路由、索引优化 |

## 学习价值

通过本项目的学习，你将掌握以下技能：

### 核心能力

- 理解 RAG 的工作原理和适用场景
- 掌握文档索引和向量嵌入技术
- 学会构建高效的检索系统
- 了解如何优化 RAG 的各个环节

### 高级技术

- 查询重写与转换的多种策略
- 多数据源路由与智能路由
- 高级索引技术（多表示、RAPTOR、ColBERT）
- RAG 系统的评估与优化方法

### 实战应用

- 构建自己的 RAG 应用
- 为企业知识库添加智能问答功能
- 实现私有数据的 LLM 访问
- 优化生产环境中的 RAG 系统

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [pixegami/rag-tutorial-v2](https://github.com/pixegami/rag-tutorial-v2) | 改进版 LangChain RAG 教程，支持本地 LLM | High |
| [murtaza-arif/RAG-Agnostic-Guide](https://github.com/murtaza-arif/rag-agnostic-guide) | 使用开源工具构建 RAG 系统的综合指南 | High |
| [nicofretti/rag_and_roll](https://github.com/nicofretti/rag_and_roll) | 使用 LlamaIndex 构建 RAG 应用的实践教程 | Medium |
| [ibm-ecosystem-engineering/Blended-RAG](https://github.com/ibm-ecosystem-engineering/Blended-RAG) | 混合查询和语义搜索提升 RAG 准确性 | Medium |
| [axioma-ai-labs/RAG](https://github.com/axioma-ai-labs/rag) | RAG 教育和工具包 | Medium |

## 参考资料

- [GitHub Repository](https://github.com/langchain-ai/rag-from-scratch)
- [YouTube 播放列表](https://www.youtube.com/playlist?list=PLfaIDFEXuae2LXbO1_PKyVJiQ23ZztA0x)
- [LangChain 官方博客](https://blog.langchain.dev/)
- [RAG 论文集合](https://arxiv.org/abs/2404.07220)

---

*Generated: 2026-03-18*
