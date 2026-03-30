---
id: kagisearch/vectordb
title: VectorDB Analysis
source_type: github
upstream_url: "https://github.com/kagisearch/vectordb"
generated_by: github-researcher
created_at: "2026-03-18T10:40:00Z"
updated_at: "2026-03-18T10:40:00Z"
tags: [vector-database, kagi, lightweight, python, embeddings, intermediate]
language: zh
---
# VectorDB

> Kagi 出品的轻量级本地向量数据库

[![GitHub stars](https://img.shields.io/github/stars/kagisearch/vectordb)](https://github.com/kagisearch/vectordb)
[![License](https://img.shields.io/github/license/kagisearch/vectordb)](https://github.com/kagisearch/vectordb)

## 概述

**VectorDB** 是由 [Kagi Search](https://kagi.com) 团队开发的轻量级 Python 包，用于基于嵌入向量的文本存储和检索。

这是一个**完全本地化**的端到端解决方案，具有低延迟和小内存占用的特点。目前已用于 Kagi Search 内部的 AI 功能增强。

> ⚠️ 开发者澄清：这不是一个真正的数据库，而是围绕 FAISS/mrpt 等原语的封装，提供了经过大量基准测试的默认配置以最小化延迟。

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 语言     | Python 3.x         |
| 核心依赖 | NumPy, FAISS, mrpt |
| 嵌入模型 | sentence-transformers |
| 深度学习 | PyTorch (可选)     |
| 构建工具 | pip                |
| 测试     | pytest             |

## 项目结构

```
kagisearch/vectordb/
├── .github/
│   └── workflows/           # CI/CD 配置
├── images/                  # 性能对比图表
├── tests/                   # 测试代码
├── vectordb/                # 核心代码
│   ├── __init__.py
│   ├── embedding.py         # 嵌入模型管理
│   ├── memory.py            # Memory 类
│   ├── storage.py           # 持久化存储
│   ├── vector_indices.py    # 向量索引
│   └── text_chunker.py     # 文本分块
├── pyproject.toml
└── README.md
```

## 核心特性

### 1. Memory 类 - 核心接口

```python
from vectordb import Memory

# 创建内存数据库
memory = Memory()

# 保存文本和元数据
memory.save(
    ["apples are green", "oranges are orange"],
    [{"url": "https://apples.com"}, {"url": "https://oranges.com"}]
)

# 搜索
results = memory.search("green", top_n=1)
```

### 2. 自动文本分块

**滑动窗口模式（默认）：**
```python
memory = Memory(
    chunking_strategy={
        "mode": "sliding_window",
        "window_size": 240,
        "overlap": 8
    }
)
```

**段落模式：**
```python
memory = Memory(
    chunking_strategy={"mode": "paragraph"}
)
```

### 3. 多模式嵌入模型

| 模式 | 模型 | 延迟 | 质量 |
|------|------|------|------|
| `fast` | Universal Sentence Encoder 4 | 快 | 中 |
| `normal` | BAAI/bge-small-en-v1.5 | 中 | 中+ |
| `best` | BAAI/bge-base-en-v1.5 | 慢 | 高 |
| `multilingual` | USE Multilingual | 中 | 中 |

**自定义模型：**
```python
memory = Memory(embeddings="TaylorAI/bge-micro-v2")
```

### 4. 向量搜索优化

VectorDB 根据数据规模**自动选择**底层向量搜索引擎：

| 数据规模 | 引擎 | 特点 |
|----------|------|------|
| < 4000 条 | FAISS | 简单快速 |
| ≥ 4000 条 | mrpt | 大规模高效 |

### 5. 持久化存储

```python
# 自动持久化
memory = Memory(memory_file="mydata.pkl")

# 手动保存
memory.save(texts, metadata, memory_file="backup.pkl")
```

### 6. 高级搜索选项

```python
# 唯一结果（去重）
results = memory.search(query, top_n=5, unique=True)

# 批量查询
results = memory.search(
    ["query1", "query2"], 
    top_n=3, 
    batch_results="diverse"  # 或 "flatten"
)
```

## 向量搜索算法说明

### 1. 文本嵌入 (Text Embedding)

VectorDB 使用 **句子嵌入 (Sentence Embedding)** 将文本转换为高维向量：

- **BGE (BAAI/bge-*)**: 基于 BERT 的中文/英文嵌入模型
- **USE (Universal Sentence Encoder)**: Google 的多语言嵌入

### 2. 近似最近邻搜索 (ANN)

**FAISS (Facebook AI Similarity Search)**
- Facebook 开发的向量相似度搜索库
- 支持多种索引类型：Flat, IVF, PQ 等
- 适合中小规模数据（< 4000 条）

**mrpt (Massive Random Projection Trees)**
- 基于随机投影树的索引
- 适合大规模数据（≥ 4000 条）
- 高维数据效果好

### 3. 相似度度量

使用 **余弦相似度** 或 **L2 距离** 计算向量距离：
- 距离 0 = 完全匹配
- 距离越高 = 差异越大

## 快速开始

### 安装

```bash
pip install vectordb2
```

### 基本使用

```python
from vectordb import Memory

# 初始化
memory = Memory(
    embeddings="normal",  # 或 "fast", "best", "multilingual"
    chunking_strategy={"mode": "sliding_window", "window_size": 240}
)

# 保存数据
texts = [
    "Machine learning is a subset of artificial intelligence.",
    "Deep learning uses neural networks with multiple layers."
]
metadata = [{"source": "wiki"}, {"source": "tutorial"}]

memory.save(texts, metadata)

# 搜索
results = memory.search("What is machine learning?", top_n=2)

for r in results:
    print(f"Chunk: {r['chunk']}")
    print(f"Distance: {r['distance']}")
    print(f"Metadata: {r['metadata']}")
```

### 性能基准测试

**嵌入模型延迟对比（CPU）：**
- TaylorAI/bge-micro-v2: 0.67s (最快)
- universal-sentence-encoder/4: 0.019s (最快但质量较低)

**向量搜索性能：**
- 小规模：FAISS 表现最佳
- 大规模：mrpt 更高效

## 学习价值

### 适合人群
- **开发者**：需要本地向量检索能力
- **AI 工程师**：构建 RAG 应用
- **研究人员**：快速实验嵌入模型

### 可学到的知识

1. **文本嵌入**：理解句子嵌入模型原理
2. **文本分块**：长文本处理策略
3. **向量索引**：FAISS/mrpt 的使用场景
4. **模型选择**：延迟与质量的权衡
5. **性能优化**：自动选择最佳引擎

### 应用场景

- **RAG (检索增强生成)**：构建私有知识库
- **内容推荐**：基于语义相似度的推荐
- **问答系统**：语义匹配问题与答案
- **知识管理**：企业文档语义搜索

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [FAISS](https://github.com/facebookresearch/FAISS) | Facebook 向量相似度搜索库 | High |
| [Chroma](https://github.com/chroma-core/chroma) | 开源向量数据库 | High |
| [Qdrant](https://github.com/qdrant/qdrant) | 生产级向量搜索引擎 | Medium |
| [Weaviate](https://github.com/weaviate/weaviate) | 向量数据库 + GraphQL | Medium |
| [Milvus](https://github.com/milvus-io/milvus) | 开源向量数据库 | Low |

## 参考资料

- [GitHub Repository](https://github.com/kagisearch/vectordb)
- [Official Website](https://vectordb.com)
- [Kagi Search](https://kagi.com)
- [Colab Example](https://colab.research.google.com/drive/1pecKGCCru_Jvx7v0WRNrW441EBlcS5qS)
- [Hacker News 讨论](https://news.ycombinator.com/item?id=38420554)

---

*Generated: 2026-03-18*
