# TinyHNSW

> HNSW 算法的最小实现 - 从零构建向量数据库

[![GitHub stars](https://img.shields.io/github/stars/jbarrow/tinyhnsw)](https://github.com/jbarrow/tinyhnsw)
[![License](https://img.shields.io/github/license/jbarrow/tinyhnsw)](https://github.com/jbarrow/tinyhnsw)

## 概述

**TinyHNSW** 是一个极简的向量数据库实现，代码仅数百行。它基于 Python 实现了 HNSW (Hierarchical Navigable Small World) 算法，依赖极少。

该项目配套一系列教程，帮助读者深入理解 HNSW 算法的工作原理，最终构建一个完整可用的向量数据库。

> ⚠️ 该项目仅用于学习目的。如需在生产环境中使用 Approximate Nearest Neighbor 库，建议使用 FAISS、hnswlib 或 uSearch 等成熟实现。

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 语言     | Python 3.x         |
| 依赖     | NumPy, NetworkX, SciPy, tqdm |
| 构建工具 | pip / Poetry       |
| 测试     | pytest             |

## 项目结构

```
jbarrow/tinyhnsw/
├── .gitignore
├── README.md
├── pyproject.toml
├── chapters/                     # 教程文档
│   ├── 0_introduction.md
│   ├── 2_hnsw_overview.md
│   ├── 3_skip_lists.md
│   ├── 4_navigable_small_worlds.md
│   ├── 5_hnsw.md
│   └── figures/                  # 可视化图表
├── tinyhnsw/                     # 核心代码
│   ├── __init__.py
│   ├── hnsw.py                   # HNSW 实现
│   ├── index.py                  # 索引基类
│   ├── knn.py                    # KNN 搜索
│   ├── filter.py                 # 过滤功能
│   ├── skip_list.py              # 跳表 (教学用)
│   ├── visualization.py          # 可视化
│   ├── teaching/                 # 教学代码
│   │   ├── skip_list.py
│   │   └── nsw.py
│   └── utils.py                  # 工具函数
├── examples/                     # 示例代码
│   ├── multimodal_retrieval/     # CLIP 多模态检索
│   └── sentence_transformers/   # 句子嵌入检索
├── tests/                        # 测试代码
└── data/                         # 数据集存储
```

## 核心特性

### 1. HNSW 索引 (HNSWIndex)

```python
from tinyhnsw import HNSWIndex
import numpy

vectors = numpy.random.randn(100, 10)

index = HNSWIndex(d=10)
index.add(vectors)

print(index.ntotal)  # => 100
```

### 2. 全量最近邻索引 (FullNNIndex)

```python
from tinyhnsw import FullNNIndex

index = FullNNIndex(128)
index.add(data)

D, I = index.search(queries, k=10)
```

### 3. 跳表 (Skip Lists)

教学用实现，帮助理解 HNSW 的底层数据结构：

```python
from tinyhnsw.skip_list import SkipList

s = SkipList([3, 2, 1, 7, 14, 9, 6])
print(s)
# 输出类似:
# 2 |   2 3     9
# 1 |   2 3 6   9 14
# 0 | 1 2 3 6 7 9 14
```

### 4. 可视化

```python
from tinyhnsw.visualization import visualize_hnsw_index

visualize_hnsw_index(index)
```

### 5. 过滤与混合搜索

```python
# 支持元数据过滤
```

### 6. 多模态检索示例

- CLIP 模型图像检索
- Sentence Transformers 文本检索

## HNSW 算法详解

### 什么是 HNSW？

**Hierarchical Navigable Small World (HNSW)** 是一种基于图的近似最近邻搜索算法，由 Malkov 和 Yashunin 于 2016 年提出。

### 核心概念

#### 1. 跳表 (Skip Lists)

HNSW 借鉴了跳表的多层结构思想：
- **多层链表**：从粗到细的层次结构
- **快速跳转**：高层节点可快速跳转到目标区域
- **O(log n) 复杂度**：搜索效率高

#### 2. 可导航小世界 (Navigable Small World, NSW)

NSW 是一种图结构，具有小世界网络的特性：
- **贪婪搜索**：从入口点开始，逐步向目标靠近
- **短路径**：任意两点间存在较短路径
- **局部连接**：相似的向量相互连接

#### 3. 分层结构

HNSW 将 NSW 扩展为多层结构：

```
Layer 2: ───●────────●─────────     (最稀疏，搜索入口)
Layer 1: ──●────●──●──────●──●     (中等密度)
Layer 0: ─●──●─●────●───●─────    (最密集，底层图)
```

**搜索过程：**
1. 从最高层开始，找到最近的入口点
2. 逐层向下贪婪搜索
3. 在底层进行精确搜索

### 关键参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| M | 每个节点的最大连接数 | 16 |
| M_max | 底层最大连接数 | 16 |
| M_max0 | 第 0 层最大连接数 | 32 |
| m_L | 层数因子 | 1/ln(16) |
| ef_construction | 构建时候选集大小 | 32 |
| ef_search | 搜索时候选集大小 | 32 |

### 性能表现

基于 SIFT10K 数据集的测试结果（Recall@1）：

| 索引类型 | Recall@1 |
|----------|-----------|
| FullNNIndex | 1.00 |
| HNSWIndex (simple) | 1.00 |
| HNSWIndex (heuristic) | 1.00 |

**性能数据：**
- 10K 向量索引构建时间：约 22 秒（M2 MacBook Air）
- 全量搜索时间：约 0.25 秒

## 快速开始

### 安装

```bash
pip install tinyhnsw
```

或使用 Poetry：

```bash
poetry install
```

### 基本使用

```python
import numpy
from tinyhnsw import HNSWIndex

# 创建索引
vectors = numpy.random.randn(1000, 128)
index = HNSWIndex(d=128)
index.add(vectors)

# 搜索
query = numpy.random.randn(128)
distances, indices = index.search(query, k=10)
print(f"Found {len(indices)} neighbors")
```

### 运行测试

```bash
poetry run pytest
```

### 下载测试数据

```bash
python tinyhnsw/utils.py
```

## 学习价值

### 适合人群
- **进阶学习者**：想深入理解 HNSW 算法原理
- **算法爱好者**：学习图索引结构
- **开发者**：构建自己的向量搜索系统

### 可学到的知识

1. **近似最近邻搜索 (ANN)**：理解为何需要近似而非精确搜索
2. **HNSW 算法**：完整理解分层导航小世界算法
3. **图索引结构**：图的构建与搜索策略
4. **跳表数据结构**：多层索引的底层实现
5. **可导航小世界**：NSW 算法的原理
6. **相似度度量**：余弦相似度、L2 距离等

### 进阶路径

完成本项目学习后，可进一步探索：
- 生产级实现：hnswlib、FAISS
- 其他 ANN 算法：IVF-PQ、HNSW 变体
- 完整向量数据库：Milvus、Qdrant、Weaviate
- 向量索引框架：Vald、Annoy

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [hnswlib](https://github.com/nmslib/hnswlib) | HNSW 的高性能 C++ 实现 | High |
| [FAISS](https://github.com/facebookresearch/FAISS) | Facebook 的向量相似度搜索库 | High |
| [0hq/tinyvector](https://github.com/0hq/tinyvector) | 基于 SQLite 和 PyTorch 的微型向量数据库 | Medium |
| [qdrant/qdrant](https://github.com/qdrant/qdrant) | 生产级向量搜索引擎 | Low |

## 参考资料

- [GitHub Repository](https://github.com/jbarrow/tinyhnsw)
- [HNSW 原始论文](https://arxiv.org/abs/1603.09320)
- [Author's Blog](https://notes.penpusher.app/Joe+Notes#%60TinyHNSW%60+Build+Your+Own+Vector+Database)

---

*Generated: 2026-03-18*
