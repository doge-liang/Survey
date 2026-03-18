# Very Simple Vector Database

> 教育用极简向量数据库实现 - 从零理解向量搜索核心概念

[![GitHub stars](https://img.shields.io/github/stars/adiekaye/very-simple-vector-database)](https://github.com/adiekaye/very-simple-vector-database)
[![License](https://img.shields.io/github/license/adiekaye/very-simple-vector-database)](https://github.com/adiekaye/very-simple-vector-database)

## 概述

**Very Simple Vector Database** 是一个面向教育的极简向量数据库实现，由 Adie Kay 创建。该项目作为博客文章 "Vector Databases Demystified Part 2" 的配套代码，旨在帮助初学者理解向量数据库的核心概念。

这个简单的示例并非为大规模或生产环境设计，而是专注于阐明向量数据库的基本原理：
- 如何存储向量
- 如何计算向量相似度
- 如何进行相似性搜索

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 语言     | Python 3.x         |
| 依赖     | NumPy              |
| 构建工具 | pip                |
| 测试     | 无                 |

## 项目结构

```
adiekaye/very-simple-vector-database/
├── .gitignore              # Git 配置
├── LICENSE                 # MIT 许可证
├── README.md               # 项目文档
├── main.py                 # 核心实现代码
└── requirements.txt         # 依赖声明
```

## 核心特性

### 1. 向量插入 (Insert)
```python
vector_db.insert("vector_1", np.array([0.1, 0.2, 0.3]))
```
支持将任意维度的 NumPy 数组作为向量存储，使用键值对方式管理。

### 2. 相似性搜索 (Search)
```python
similar_vectors = vector_db.search(query_vector, k=2)
```
使用 **余弦相似度 (Cosine Similarity)** 计算查询向量与所有存储向量的相似度，返回 Top-K 最相似的结果。

### 3. 向量检索 (Retrieve)
```python
retrieved_vector = vector_db.retrieve("vector_1")
```
根据键名直接检索对应向量。

## 向量搜索算法说明

### 余弦相似度 (Cosine Similarity)

该项目使用 **余弦相似度** 作为向量相似性的度量标准：

$$\text{cosine\_similarity}(v_1, v_2) = \frac{v_1 \cdot v_2}{\|v_1\| \times \|v_2\|}$$

**实现原理：**
1. 计算两个向量的点积 (dot product)
2. 计算两个向量的 L2 范数 (Euclidean norm)
3. 用点积除以两个范数的乘积

**余弦相似度的优势：**
- 值的范围为 [-1, 1]
- 1 表示完全相同方向
- 0 表示正交（无相关性）
- -1 表示完全相反

### 暴力搜索 (Brute Force Search)

该实现采用最简单的 **暴力搜索** 策略：
- 遍历所有存储的向量
- 计算每个向量与查询向量的相似度
- 排序并返回 Top-K 结果

**时间复杂度：** O(n)，其中 n 为向量数量

**局限性：**
- 不适合大规模数据集
- 随着向量数量增加，搜索延迟线性增长
- 无索引优化

## 快速开始

### 环境准备

```bash
# 1. 克隆仓库
git clone https://github.com/adiekaye/very-simple-vector-database.git
cd very-simple-vector-database

# 2. 创建虚拟环境
python -m venv venv

# 3. 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 4. 安装依赖
pip install -r requirements.txt
```

### 运行示例

```bash
python main.py
```

**输出示例：**
```
Similar vectors: [('vector_1', 0.998870...), ('vector_2', 0.998870...)]
Retrieved vector: [0.1 0.2 0.3]
```

## 学习价值

### 适合人群
- **初学者**：首次接触向量数据库
- **教育者**：教授向量搜索基础概念
- **开发者**：快速理解向量数据库核心原理

### 可学到的知识

1. **向量表示**：理解高维向量如何表示数据
2. **相似度度量**：掌握余弦相似度计算方法
3. **基础 CRUD**：向量插入、搜索、检索操作
4. **算法复杂度**：理解暴力搜索的优缺点
5. **NumPy 应用**：学习使用 NumPy 进行向量运算

### 进阶路径

学习完此项目后，可以进一步探索：
- 添加向量更新和删除功能
- 实现其他相似度度量（欧氏距离、点积）
- 引入索引结构（如 KD-Tree）优化搜索
- 学习生产级向量数据库（Pinecone、Milvus、Qdrant）

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [Aveygo/SimpleVD](https://github.com/aveygo/simplevd) | Python 实现的简单向量数据库，性能优化版 | High |
| [asset-ai/simple-vector-db](https://github.com/asset-ai/simple-vector-db) | 带 RESTful API 的轻量级向量数据库 | Medium |
| [karopath/llamaindex](https://github.com/run-llama/llamaindex) | 完整向量索引框架 | Low |

## 参考资料

- [GitHub Repository](https://github.com/adiekaye/very-simple-vector-database)
- [Vector Databases Demystified Part 1](https://www.linkedin.com/pulse/vector-databases-demystified-part-1-world-adie-kaye)
- [Vector Databases Demystified Part 2](https://www.linkedin.com/pulse/vector-databases-demystified-part-2-building-your-own-adie-kaye)
- [Vector Databases Demystified Part 3](https://www.linkedin.com/pulse/vector-databases-demystified-part-3-build-colour-matching-adie-kaye)

---

*Generated: 2026-03-18*
