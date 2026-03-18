# RAG from Scratch

> 通过从零构建来解构检索增强生成 (RAG)。本地 LLM，无黑盒——真正理解嵌入、向量搜索、检索和上下文增强生成。

[![GitHub stars](https://img.shields.io/github/stars/pguso/rag-from-scratch)](https://github.com/pguso/rag-from-scratch)
[![License](https://img.shields.io/github/license/pguso/rag-from-scratch)](https://github.com/pguso/rag-from-scratch)

## 概述

**RAG from Scratch** 是一个教育性质的 GitHub 项目，旨在帮助开发者从零开始理解检索增强生成 (RAG) 的工作原理。该项目遵循与 "AI Agents from Scratch" 相同的理念：通过最小化、解释清晰的真实代码，让高级 AI 概念变得易于理解。

该项目不使用复杂的框架或云端 API，完全基于本地代码实现，让开发者能够真正理解 RAG 的每一个组件。

## 技术栈

| 类别     | 技术                              |
| -------- | --------------------------------- |
| 语言     | JavaScript (Node.js)             |
| 运行时   | Node.js 18+                      |
| 本地 LLM | node-llama-cpp                   |
| 向量存储 | InMemoryVectorStore, LanceDB, Qdrant |
| 构建工具 | npm                              |
| 测试     | GitHub Actions                   |

## 项目结构

```
pguso/rag-from-scratch/
├── src/                                    # 可复用库代码
│   ├── embeddings/                         # 嵌入模型
│   ├── vector-stores/                     # 向量存储
│   ├── loaders/                           # 文档加载器
│   ├── text-splitters/                    # 文本分块
│   ├── retrievers/                        # 检索器
│   ├── chains/                            # RAG 链
│   ├── prompts/                           # 提示词模板
│   └── utils/                             # 工具函数
│
├── examples/                               # 学习示例
│   ├── 00_how_rag_works/                 # RAG 基础概念
│   ├── 01_intro_to_llms/                 # LLM 入门
│   ├── 02_data_loading/                  # 数据加载
│   ├── 03_text_splitting_and_chunking/   # 文本分块
│   ├── 04_intro_to_embeddings/           # 嵌入入门
│   ├── 05_building_vector_store/        # 构建向量存储
│   └── 06_retrieval_strategies/         # 检索策略
│       ├── 01_basic_retrieval/           # 基本检索
│       ├── 02_query_preprocessing/       # 查询预处理
│       ├── 03_hybrid_search/             # 混合搜索
│       ├── 04_multi_query_retrieval/     # 多查询检索
│       └── 05_query_rewriting/           # 查询重写
│
├── helpers/                                # 辅助函数
├── models/                                 # 模型配置
└── images/                                 # 图片资源
```

## 核心特性

### 1. 完整的 RAG 流程教学
从最基础的概念开始，逐步深入。每个示例都包含：
- 最小化可运行代码 (`example.js`)
- 详细的代码解释 (`CODE.md`)
- 概念说明 (`CONCEPT.md`)

### 2. 本地 LLM 支持
使用 `node-llama-cpp` 实现完全本地化的 LLM 调用，无需云端 API，保护隐私且成本可控。

### 3. 多种检索策略
- **基本检索**：基于相似度的 Top-k 检索
- **查询预处理**：查询规范化与清洗
- **混合搜索**：向量搜索 + 关键词搜索 (BM25)
- **多查询检索**：查询分解 + 并行检索 + RRF 融合
- **查询重写**：启发式 + LLM 重写

### 4. 模块化架构
项目采用清晰的模块化设计，各组件可独立使用：
- 文档加载器 (PDF、文本、目录)
- 文本分块器 (字符、递归、Token)
- 向量存储 (内存、LanceDB、Qdrant)
- 检索器 (向量、重排序、混合)
- RAG 链 (检索链、对话链)

### 5. 丰富的学习路径
按照以下顺序学习，逐步建立理解：
1. RAG 工作原理 (70 行代码演示)
2. 数据加载与预处理
3. 文本分块策略
4. 嵌入生成
5. 向量存储构建
6. 基础检索
7. 查询预处理
8. 混合搜索
9. 多查询检索
10. 查询重写

## 架构设计

该项目的架构遵循以下设计原则：

### 分层架构
```
┌─────────────────────────────────────────┐
│           Examples (学习示例)             │
├─────────────────────────────────────────┤
│            Chains (RAG 链)               │
├─────────────────────────────────────────┤
│         Retrievers (检索器)              │
├─────────────────────────────────────────┤
│    Vector Stores / Embeddings / Loaders  │
└─────────────────────────────────────────┘
```

### RAG 流水线
```
用户查询 → 查询预处理 → 嵌入 → 向量检索 → 重排序 → 上下文增强 → LLM 生成
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行第一个示例

```bash
node examples/00_how_rag_works/example.js
```

### 完整 RAG 流程示例

```bash
# 进入基础检索示例
cd examples/06_retrieval_strategies/01_basic_retrieval
node showcase.js
```

## 学习价值

通过本项目可以学习到：

- **RAG 核心概念**：理解检索与生成如何协同工作
- **嵌入原理**：如何将文本转换为模型可理解的向量
- **向量搜索**：最近邻搜索的实现原理
- **检索策略**：如何提高检索精度和召回率
- **查询优化**：查询预处理、重写和扩展技术
- **本地部署**：无需依赖云端服务的数据处理方式

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [ruizguille/rag-from-scratch](https://github.com/ruizguille/rag-from-scratch) | Python 版 RAG 实现，使用 Llama 3 + Groq | High |
| [pguso/ai-agents-from-scratch](https://github.com/pguso/ai-agents-from-scratch) | AI Agents 从零实现 | High |
| [LangChain](https://github.com/langchain-ai/langchain) | 主流 RAG 框架 | Medium |
| [LlamaIndex](https://github.com/run-llama/llama_index) | 数据增强 LLM 框架 | Medium |

## 参考资料

- [GitHub Repository](https://github.com/pguso/rag-from-scratch)
- [AI Agents from Scratch](https://github.com/pguso/ai-agents-from-scratch)
- [LangChain RAG Concepts](https://docs.langchain.com/oss/python/langchain/rag)

---

*Generated: 2026-03-18*
