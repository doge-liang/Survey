---
id: ruizguille/rag-from-scratch
title: Inception RAG Analysis
source_type: github
upstream_url: "https://github.com/ruizguille/rag-from-scratch"
generated_by: github-researcher
created_at: "2026-03-18T10:35:00Z"
updated_at: "2026-03-18T10:35:00Z"
tags: [rag, python, llama3, groq, tutorial, embeddings]
language: zh
---
# Retrieval Augmented Generation from Scratch: Inception RAG

> 使用 Python、Llama 3、Groq 和 Nomic 嵌入从零构建的简单检索增强生成 (RAG) 系统。

[![GitHub stars](https://img.shields.io/github/stars/ruizguille/rag-from-scratch)](https://github.com/ruizguille/rag-from-scratch)
[![License](https://img.shields.io/github/license/ruizguille/rag-from-scratch)](https://github.com/ruizguille/rag-from-scratch)

## 概述

**Inception RAG** 是一个简单但完整的检索增强生成 (RAG) 系统，从零使用 Python 和开源工具构建。该项目使用 Llama 3 作为语言模型（由 Groq 提供支持）和 Nomic 嵌入。它包含了 Christopher Nolan 的《盗梦空间》电影剧本作为源文档（位于 `data/docs` 文件夹中），用户也可以添加自己的文档。

该项目是一个极佳的 RAG 入门学习资源，代码简洁易懂，适合想要深入理解 RAG 工作原理的开发者。

## 技术栈

| 类别     | 技术                          |
| -------- | ----------------------------- |
| 语言     | Python                        |
| 运行时   | Python 3.11+                 |
| 包管理   | Poetry                        |
| LLM      | Llama 3 (Groq)               |
| 嵌入     | Nomic embeddings              |
| 向量存储 | 自定义简单向量存储            |
| 依赖     | tiktoken, nltk, numpy        |

## 项目结构

```
ruizguille/rag-from-scratch/
├── app/                           # 核心代码
│   ├── config.py                  # 配置设置
│   ├── loader.py                  # 文档加载与处理
│   ├── splitter.py                # 文本分块
│   ├── vector_store.py            # 简单向量存储
│   └── rag.py                     # RAG 核心功能
│
├── data/
│   └── docs/                      # 源文档 (Inception 剧本)
│
├── .env_example                   # 环境变量示例
├── pyproject.toml                 # Poetry 配置
└── README.md
```

## 核心特性

### 1. 从零实现 RAG 组件
不依赖 LangChain、LlamaIndex 等框架，直接使用 Python 和 NumPy 实现：
- **文档加载**：PDF 文档加载与处理
- **文本分块**：基于句子和 Token 的分块策略
- **向量存储**：内存向量存储实现
- **相似度搜索**：余弦相似度计算

### 2. 集成 Groq 和 Llama 3
使用 Groq 平台的高速推理能力，配合 Llama 3 模型提供流畅的问答体验。

### 3. Nomic 嵌入
使用开源的 Nomic 嵌入模型，将文本转换为向量表示。

### 4. 交互式问答
提供交互式问答循环，可以直接与 RAG 系统对话。

### 5. 详细博客讲解
配套博客文章详细解释代码和 RAG 概念，适合学习参考。

## RAG 实现说明

### 整体流程

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  文档加载    │ -> │  文本分块    │ -> │  嵌入生成    │
└──────────────┘    └──────────────┘    └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  回答生成    │ <- │  上下文增强   │ <- │  向量检索    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 核心模块

1. **loader.py**: 加载 PDF 文档，进行分块、嵌入并存储到向量存储
2. **splitter.py**: 实现基于句子和 Token 的文本分块
3. **vector_store.py**: 简单的内存向量存储，支持相似度搜索
4. **rag.py**: RAG 核心逻辑，交互式问答循环

## 快速开始

### 前置要求

- Python 3.11+
- Poetry (Python 包管理器)
- Groq API Key

### 安装步骤

1. 使用 Poetry 安装依赖：

```bash
poetry install
```

2. 创建 `.env` 文件并设置环境变量：

```bash
cp .env_example .env
# 编辑 .env，设置 GROQ_API_KEY
```

3. 加载源文档并处理：

```bash
poetry run load-docs
```

4. 运行交互式问答：

```bash
poetry run rag
```

## 学习价值

通过本项目可以学习到：

- **RAG 基础概念**：检索增强生成的工作原理
- **文本嵌入**：如何使用 Nomic 生成文本向量
- **向量搜索**：余弦相似度计算和最近邻搜索
- **文本分块**：基于句子和 Token 的分块策略
- **提示工程**：如何构建有效的问答提示
- **Python 实战**：纯 Python 实现机器学习组件

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [pguso/rag-from-scratch](https://github.com/pguso/rag-from-scratch) | JavaScript 版 RAG 实现，更全面 | High |
| [ruizguille/tech-trends-chatbot](https://github.com/ruizguille/tech-trends-chatbot) | FastAPI + Redis + GPT-4o RAG 聊天机器人 | Medium |
| [LangChain](https://github.com/langchain-ai/langchain) | 主流 RAG 框架 | Low |
| [LlamaIndex](https://github.com/run-llama/llama_index) | 数据增强 LLM 框架 | Low |

## 参考资料

- [GitHub Repository](https://github.com/ruizguille/rag-from-scratch)
- [博客文章 (英文)](https://codeawake.com/blog/rag-from-scratch)
- [CodeAwake](https://codeawake.com/)

---

*Generated: 2026-03-18*
