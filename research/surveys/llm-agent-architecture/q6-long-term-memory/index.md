---
id: q6-long-term-memory
title: "Q6: 长期记忆系统设计"
category: agent-memory
level: advanced
tags: [memory, vector-db, graph-db, memory-consolidation, agent]
related-questions: [q1, q2, q3, q4, q5]
date: 2026-03-30
---

# Q6: 长期记忆系统设计

## 1. 概述

### 1.1 为什么需要长期记忆

在大语言模型（LLM）Agent 系统中，**长期记忆（Long-Term Memory）** 是赋予 Agent 持续学习和跨会话信息保留能力的关键组件。与人类认知中的记忆系统类似，LLM Agent 需要长期记忆来：

1. **保持上下文连续性**：跨越多个会话记住用户的偏好、历史交互和已完成的任务
2. **积累知识**：将从错误中学到的教训、成功的策略、可复用的解决方案持久化
3. **实现少样本学习**：利用历史经验快速适应新任务，减少重复试错
4. **构建身份认知**：记住 Agent 自身的能力边界、已掌握的工具、过往成就

斯坦福大学 2024 年的研究《Memory for Agents》指出，缺乏长期记忆的 Agent 每次交互都从"零知识"开始，导致：
- 相同错误重复发生
- 用户体验碎片化
- 无法形成持续的智能行为

### 1.2 短期记忆 vs 长期记忆

LLM Agent 的记忆系统通常包含**两个层次**，各有其独特角色：

| 维度 | 短期记忆（Short-Term Memory） | 长期记忆（Long-Term Memory） |
|------|------------------------------|------------------------------|
| **容量** | 有限，受限于上下文窗口大小 | 近乎无限，可扩展至 PB 级 |
| **持久性** | 会话级，随会话结束丢弃 | 持久化，跨会话保留 |
| **访问速度** | O(1)，直接在上下文中的 | 需要检索，存在延迟 |
| **内容类型** | 当前任务的即时信息 | 历史经验、通用知识 |
| **类比** | 工作记忆（Working Memory） | 情景记忆+语义记忆 |
| **实现** | prompt context、变量状态 | Vector DB、Graph DB、KB |

**协同工作模式**：

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LLM Agent                                   │
│                                                                      │
│   ┌───────────────────┐         ┌─────────────────────────────────┐ │
│   │   短期记忆          │         │         长期记忆                 │ │
│   │   (Working Mem)   │◀───────▶│  ┌─────────┐ ┌─────────────┐  │ │
│   │                    │  检索/  │  │Vector DB│ │  Graph DB   │  │ │
│   │  - 当前对话历史     │  回存   │  └─────────┘ └─────────────┘  │ │
│   │  - 活跃任务状态     │         │                                 │ │
│   │  - 即时上下文       │         │  - 用户偏好    - 实体关系       │ │
│   │                    │         │  - 历史交互    - 知识图谱        │ │
│   └───────────────────┘         │  - 成功模式    - 概念关联        │ │
│                                └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**核心区别详解**：

**短期记忆**是 Agent 的"前台工作台"，存储当前任务执行过程中产生的中间结果和即时信息。当用户询问天气时，短期记忆保存：
- 当前对话的全部内容
- 已调用的 API 和返回结果
- 当前正在处理的子任务状态

**长期记忆**则是"档案室"，保存：
- 用户过去的查询偏好（"总是用中文回答"）
- Agent 学会的工具使用技巧
- 跨会话积累的事实知识

### 1.3 典型应用场景

#### 1.3.1 个人助手场景

```
用户：帮我订明天北京到上海的机票
Agent：
  1. 短期记忆：当前任务"订机票"，提取"明天"、"北京"、"上海"
  2. 长期记忆检索：
     - 找到用户偏好：首选国航、靠窗座位、预算范围 800-1500 元
     - 历史记忆：用户上次出差是 3 周前，目的地是深圳
  3. 订票时自动应用偏好设置
  4. 完成后更新长期记忆：记录本次订票信息
```

#### 1.3.2 客服机器人场景

```
场景：电商客服 Agent

长期记忆内容：
  - 用户 A：购买过某品牌手机，物流地址为"北京市朝阳区..."
  - 用户 B：上个月退货过耳机，对音质敏感
  - 用户 C：会员等级 GOLD，享受优先售后

Agent 响应逻辑：
  1. 识别用户身份
  2. 检索用户画像和历史
  3. 个性化响应：
     - 用户 A：推荐手机配件
     - 用户 B：强调耳机品质保证
     - 用户 C：提及会员专属优惠
```

#### 1.3.3 研究助手场景

```
场景：学术论文研究 Agent

长期记忆能力：
  - 记住已阅读的论文摘要、方法论、贡献点
  - 建立论文之间的引用关系和观点冲突
  - 追踪研究方向的演进历史
  - 保存用户的研究兴趣标签和关注点

应用效果：
  - 当用户询问"最近 Transformer 改进的工作"时，
    Agent 可以基于已记录的论文库进行推荐，
    而非每次都重新搜索
  - 能够发现论文之间的关联："A 和 B 都引用了 C，
    但得出了相反的结论"
```

---

## 2. 存储结构设计

长期记忆的存储结构决定了检索效率和表达能力。本章深入分析向量数据库、图数据库以及混合存储方案的优劣势和适用场景。

### 2.1 向量数据库（Vector DB）

#### 2.1.1 核心原理

向量数据库是专门用于存储和检索**高维向量嵌入（Embeddings）**的数据库系统。其核心是**近似最近邻（Approximate Nearest Neighbor, ANN）**搜索算法，能够在海量向量中快速找到与查询向量最相似的 Top-K 个结果。

```
工作流程：

1. 索引阶段（Indexing）：
   原始文本 ──▶ Embedding Model ──▶ 高维向量 ──▶ 索引结构（HNSW/IVF/PQ）
   
2. 查询阶段（Query）：
   查询文本 ──▶ Embedding Model ──▶ 查询向量 ──▶ ANN 搜索 ──▶ Top-K 结果
```

#### 2.1.2 主流算法对比

| 算法 | 核心思想 | 优势 | 劣势 | 适用场景 |
|------|---------|------|------|----------|
| **HNSW** | 分层可导航小世界图 | 高速查询 O(log N)、高召回率 | 内存占用大、索引构建慢 | 需要高速检索的在线场景 |
| **IVF** | 倒排索引+聚类 | 内存效率高、可压缩 | 召回率依赖聚类数 | 内存受限的大规模场景 |
| **PQ** | 产品量化 | 极致压缩（10-70x）、支持 GPU | 精度损失、查询慢 | 极致成本优化场景 |
| **LSH** | 局部敏感哈希 | 理论保证、适合等效检索 | 维度灾难、精度低 | 近似相等查询 |
| **SCANN** | 混合方法 | Google 生产验证、灵活权衡 | 闭源变体多 | Google Cloud 环境 |

#### 2.1.3 优势分析

**优势 1：语义相似性检索**

传统关键词匹配无法理解语义，而向量检索可以：

```
查询："如何做巧克力蛋糕"

关键词匹配结果：
  - "巧克力蛋糕配方" ✓
  - "蛋糕烘焙技巧" ✓  
  - "可可粉使用方法" ✓
  - "巧克力棒价格" ✗

向量检索额外捕获：
  - "甜点制作方法" ✓（语义相近）
  - "烘焙入门指南" ✓（场景相关）
  - "法式甜品文化" ✓（关联知识）
```

**优势 2：高效的可扩展性**

现代向量数据库支持十亿级向量规模，检索延迟仍能保持在毫秒级：

```python
# 使用 FAISS 的典型检索代码
import faiss
import numpy as np

# 创建索引（1000万向量，768维）
dimension = 768
num_vectors = 10_000_000

# 量化器配置 - 使用 PCA 降维 + IVF 索引
quantizer = faiss.IndexFlatIP(dimension)  # 内积度量（余弦相似度）
index = faiss.IndexIVFPQ(quantizer, dimension, nlist=1024, m=16, bits=8)

# 训练和添加向量
index.train(train_vectors)
index.add(np.array(vectors).astype('float32'))

# 检索：找出 Top-5 最相似的结果
query_vector = embed_model.encode("如何做巧克力蛋糕")
distances, indices = index.search(np.array([query_vector]), k=5)
```

**优势 3：成熟的生态系统**

| 产品 | 特点 | 开源 | 云服务 |
|------|------|------|--------|
| **Pinecone** | 完全托管、易用性好 | ❌ | ✅ |
| **Weaviate** | 混合检索、原生 GraphQL | ✅ | ✅ |
| **Milvus** | 国产、性能强、稳定性高 | ✅ | ✅ |
| **Qdrant** | Rust 实现、高性能、过滤强 | ✅ | ✅ |
| **Chroma** | 轻量级、开发友好 | ✅ | ❌ |
| **FAISS** | Facebook 出品、算法全面 | ✅ | ❌ |
| **PGvector** | PostgreSQL 扩展、集成简单 | ✅ | ✅ |

#### 2.1.4 劣势分析

**劣势 1：关系表达能力弱**

向量数据库擅长"找相似的"，但无法表达实体之间的复杂关系：

```python
# 向量数据库的局限示例

# 可以回答：
"找出与'苹果'相似的公司" → ["苹果公司", "梨公司", "水果公司"]

# 但无法回答：
"苹果公司的 CEO 是什么时候出生的？"  # 需要关系查询
"苹果和乔布斯是什么关系？"          # 需要图关系
"哪些公司是苹果的供应商？"          # 需要多跳关系
```

**劣势 2：精确查询能力不足**

向量检索本质是近似匹配，无法保证精确的相等性查询或范围查询：

```python
# 精确查询场景的困境

# 场景：查找 user_id = "12345" 的用户记录
# 向量数据库需要：先知道"12345"的向量表示，才能检索
# 而传统数据库：SELECT * FROM users WHERE id = "12345" 更直接

# 场景：查询价格 100-200 元的产品
# 向量检索难以精确支持数值范围过滤
# 需要额外的标量索引或混合架构
```

**劣势 3：更新代价高昂**

向量索引的更新操作通常比插入代价更高：

```
索引类型        | 插入速度 | 更新速度 | 删除速度 | 批量操作
----------------|---------|---------|---------|----------
HNSW           | 快 O(logN)| 慢（需重建）| 慢（标记删除）| 非常快
IVF            | 中 O(1+N/nlist)| 慢 | 慢 | 快
Flat（暴力索引）| 慢 O(N) | 快 | 快 | N/A
```

#### 2.1.5 适用场景

向量数据库最适合以下场景：

1. **语义搜索**：需要理解查询意图而非简单关键词匹配
2. **推荐系统**：基于内容相似性的 item-to-item 推荐
3. **去重检测**：发现语义近似但文字不同的重复内容
4. **跨模态检索**：图像-文本、音频-文本的跨模态搜索
5. **异常检测**：基于向量距离的异常模式识别

### 2.2 图数据库（Graph DB）

#### 2.2.1 核心原理

图数据库以**图（Graph）**为核心数据模型，使用**节点（Node）**表示实体，**边（Edge）**表示实体之间的关系。这种结构天然适合表达知识图谱和复杂关系网络。

```
社交网络知识图谱示例：

        ┌─────────────────────────────────────────────────────┐
        │                                                     │
        │    ┌─────────┐         ┌─────────┐                │
        │    │  Alice  │────────▶│   Bob   │                │
        │    │  (节点) │  friend  │  (节点) │                │
        │    └────┬────┘         └────┬────┘                │
        │         │                  │                       │
        │         │ works_at         │ works_at              │
        │         ▼                  ▼                       │
        │    ┌─────────┐         ┌─────────┐                │
        │    │ Google  │◀────────│ Microsoft│                │
        │    └─────────┘  competitor└─────────┘                │
        │         │                                        │
        │         │ founded_by                              │
        │         ▼                                        │
        │    ┌─────────┐                                    │
        │    │ Larry   │                                    │
        │    │ Page    │                                    │
        │    └─────────┘                                    │
        │                                                     │
        └─────────────────────────────────────────────────────┘
```

#### 2.2.2 主流图数据库对比

| 数据库 | 查询语言 | 优势 | 劣势 | 适用场景 |
|--------|---------|------|------|----------|
| **Neo4j** | Cypher | 生态最成熟、商用广泛 | 分布式支持弱、价格高 | 传统企业应用 |
| **NebulaGraph** | nGQL | 分布式原生、高性能、国产 | 生态较新 | 超大规模图处理 |
| **TuGraph** | GraphQL | 蚂蚁集团生产验证 | 生态较小 | 金融风控场景 |
| **ArangoDB** | AQL | Multi-model（图+文档） | 图查询性能一般 | 混合数据场景 |
| **TigerGraph** | GSQL | 性能强劲、MPP 架构 | 学习曲线陡峭 | 实时分析场景 |
| **Dgraph** | GraphQL± | 分布式原生、GraphQL 接口 | 文档较少 | 现代微服务架构 |

#### 2.2.3 优势分析

**优势 1：关系建模能力强**

图数据库能够清晰表达实体间的多类型关系：

```cypher
// Neo4j Cypher 示例：构建论文引用知识图谱

// 创建论文节点
CREATE (p1:Paper {title: "Attention Is All You Need", year: 2017})
CREATE (p2:Paper {title: "BERT", year: 2018})
CREATE (p3:Paper {title: "GPT-3", year: 2020})

// 创建引用关系
CREATE (p2)-[:CITES]->(p1)
CREATE (p3)-[:CITES]->(p1)
CREATE (p3)-[:CITES]->(p2)

// 查询："谁引用过 BERT？"
MATCH (paper:Paper)-[:CITES]->(bert:Paper {title: "BERT"})
RETURN paper.title

// 结果："GPT-3"
```

**优势 2：多跳关系推理**

图数据库擅长进行**多跳（Multi-hop）**关系查询，这对于知识推理至关重要：

```cypher
// 查询："Alice 的同事的老板是谁？"

MATCH (alice:Person {name: "Alice"})-[:COLLEAGUE_WITH]->(colleague)-[:REPORTS_TO]->(boss)
RETURN boss.name

// 查询："哪些论文同时被 Transformer 和 BERT 引用？"
MATCH (common:Paper)<-[:CITES]-(t:Paper {title: "Attention Is All You Need"})
MATCH (common)<-[:CITES]-(b:Paper {title: "BERT"})
RETURN common.title
```

**优势 3：路径发现与遍历**

```cypher
// 发现最短关系路径
MATCH path = shortestPath(
  (jobs:Person {name: "Steve Jobs"})-[*]-(google:Company {name: "Google"})
)
RETURN path

// 查找所有间接关系
MATCH (a:Person)-[r*1..3]-(b)  // 1到3跳的所有关系
WHERE a.name = "Alice" AND b.name = "Charlie"
RETURN a, r, b
```

#### 2.2.4 劣势分析

**劣势 1：大规模向量检索效率低**

图数据库并非为向量检索设计，在高维向量上的相似性搜索效率远低于专用向量数据库：

```
实验数据（100万向量，768维）：

| 操作 | 向量数据库 (HNSW) | 图数据库 (Neo4j) |
|------|-------------------|------------------|
| Top-10 检索 | 5ms | 230ms |
| 1000次检索/秒 | ✅ 支持 | ❌ 性能瓶颈 |
| 内存占用 | 12GB | 45GB |
```

**劣势 2：分布式扩展挑战**

虽然现代图数据库支持分布式部署，但图查询的跨节点 join 操作仍是性能瓶颈：

```cypher
// 跨集群查询的性能挑战
MATCH (a:A)-->(b:B)-->(c:C)-->(d:D)
WHERE a.region = "US" AND d.region = "EU"

// 需要在多个节点间传输中间结果
// 网络开销成为主要瓶颈
```

**劣势 3：更新和维护复杂**

图结构的更新需要维护大量的关系指针：

```
更新场景：删除一个节点

向量数据库：
  - 从向量列表中删除对应条目
  - 更新元数据索引
  - O(1) 复杂度

图数据库：
  - 删除节点
  - 删除所有相关的边（可能数千条）
  - 更新受影响节点的邻居关系
  - 潜在的一致性维护
  - O(degree) 复杂度
```

#### 2.2.5 适用场景

图数据库最适合以下场景：

1. **知识图谱**：构建实体-关系-实体的知识网络
2. **社交网络**：朋友关系、关注关系、兴趣社团
3. **推荐系统**：用户-商品-属性的复杂交互建模
4. **风控场景**：欺诈环检测、关联风险分析
5. **生物信息**：蛋白质相互作用、药物研发

### 2.3 混合存储方案

#### 2.3.1 为什么需要混合存储

单一存储方案难以同时满足所有需求，实际系统通常需要组合使用：

```
单一方案局限：

仅 Vector DB：
  - ✓ 语义相似性检索
  - ✗ 精确关系查询
  - ✗ 多跳推理

仅 Graph DB：
  - ✓ 复杂关系建模
  - ✓ 多跳查询
  - ✗ 高维语义检索
  - ✗ 大规模模糊匹配
```

**混合存储的核心思想**：让向量数据库和图数据库各司其职，通过统一的检索层实现协同。

#### 2.3.2 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Memory System                         │
│                                                                 │
│  ┌─────────────┐                                               │
│  │   User      │                                                │
│  │   Query     │                                                │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Unified Retrieval Layer                 │   │
│  │  ┌─────────────────┐    ┌─────────────────────────┐     │   │
│  │  │  Query Analysis │───▶│  Result Fusion Engine   │     │   │
│  │  └─────────────────┘    └─────────────────────────┘     │   │
│  │           │                         ▲                   │   │
│  │           ▼                         │                   │   │
│  │  ┌───────────────────────────────────────────────┐     │   │
│  │  │         Hybrid Search Orchestrator            │     │   │
│  │  └───────────────────────────────────────────────┘     │   │
│  │           │                         │                   │   │
│  │           ▼                         ▼                   │   │
│  │  ┌─────────────────┐    ┌─────────────────────────┐     │   │
│  │  │  Vector Search  │    │     Graph Traversal     │     │   │
│  │  │  (Pinecone/     │    │   (Neo4j/NebulaGraph)  │     │   │
│  │  │   Milvus)       │    │                        │     │   │
│  │  └─────────────────┘    └─────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.3.3 混合检索流程

```python
from typing import List, Dict, Any
import numpy as np

class HybridMemoryRetrieval:
    """
    混合记忆检索系统
    结合向量数据库的语义检索和图数据库的关系检索
    """
    
    def __init__(
        self,
        vector_store: VectorStore,
        graph_store: GraphStore,
        fusion_weights: Dict[str, float] = None
    ):
        self.vector_store = vector_store
        self.graph_store = graph_store
        self.fusion_weights = fusion_weights or {
            "vector": 0.6,
            "graph": 0.4
        }
    
    def retrieve(
        self,
        query: str,
        top_k: int = 10,
        filters: Dict[str, Any] = None
    ) -> List[MemoryEntry]:
        """
        混合检索主流程：
        1. 解析查询意图
        2. 并行执行向量检索和图检索
        3. 结果融合排序
        """
        # Step 1: 查询分析
        query_analysis = self._analyze_query(query)
        
        # Step 2: 并行执行两种检索
        vector_results = self._vector_search(
            query, 
            top_k * 2,  # 检索更多候选
            filters
        )
        graph_results = self._graph_search(
            query_analysis,
            top_k * 2,
            filters
        )
        
        # Step 3: 结果融合
        fused_results = self._fusion_ranking(
            vector_results,
            graph_results,
            top_k
        )
        
        return fused_results
    
    def _analyze_query(self, query: str) -> Dict[str, Any]:
        """
        分析查询，提取实体和关系意图
        """
        # 使用 LLM 或规则解析查询
        entities = self._extract_entities(query)
        intent = self._classify_intent(query)  # "语义搜索" / "关系查询" / "混合"
        
        return {
            "original_query": query,
            "entities": entities,
            "intent": intent
        }
    
    def _vector_search(
        self,
        query: str,
        limit: int,
        filters: Dict[str, Any]
    ) -> List[SearchResult]:
        """向量相似性检索"""
        # 生成查询向量
        query_vector = self.vector_store.embed(query)
        
        # 执行向量检索
        results = self.vector_store.search(
            vector=query_vector,
            top_k=limit,
            filters=filters
        )
        
        return results
    
    def _graph_search(
        self,
        query_analysis: Dict[str, Any],
        limit: int,
        filters: Dict[str, Any]
    ) -> List[SearchResult]:
        """图关系检索"""
        entities = query_analysis["entities"]
        intent = query_analysis["intent"]
        
        if intent == "semantic_only":
            # 纯语义查询不需图检索
            return []
        
        results = []
        
        # 基于实体进行图扩展检索
        for entity in entities:
            # 从实体出发进行多跳遍历
            related = self.graph_store.traverse(
                start_node=entity,
                max_hops=2,
                edge_types=filters.get("relation_types") if filters else None
            )
            results.extend(related)
        
        # 去重并限制数量
        return self._deduplicate_and_limit(results, limit)
    
    def _fusion_ranking(
        self,
        vector_results: List[SearchResult],
        graph_results: List[SearchResult],
        top_k: int
    ) -> List[MemoryEntry]:
        """
        结果融合 - 使用 Reciprocal Rank Fusion (RRF)
        
        RRF 公式：Score(d) = Σ 1/(k + rank_i(d))
        其中 k 是平滑因子（通常取 60）
        """
        k = 60  # RRF 平滑因子
        
        # 构建融合分数表
        fused_scores: Dict[str, float] = {}
        
        # 处理向量检索结果
        for rank, result in enumerate(vector_results):
            doc_id = result.entry.id
            vector_score = result.score * self.fusion_weights["vector"]
            rrf_score = 1.0 / (k + rank + 1)
            fused_scores[doc_id] = fused_scores.get(doc_id, 0) + vector_score * rrf_score
        
        # 处理图检索结果
        for rank, result in enumerate(graph_results):
            doc_id = result.entry.id
            graph_score = result.score * self.fusion_weights["graph"]
            rrf_score = 1.0 / (k + rank + 1)
            fused_scores[doc_id] = fused_scores.get(doc_id, 0) + graph_score * rrf_score
        
        # 排序取 Top-K
        sorted_ids = sorted(fused_scores.keys(), key=lambda x: fused_scores[x], reverse=True)
        
        # 构建最终结果
        all_results = {r.entry.id: r.entry for r in vector_results + graph_results}
        final_results = [all_results[doc_id] for doc_id in sorted_ids[:top_k]]
        
        return final_results
```

#### 2.3.4 混合索引设计

在混合存储架构中，需要精心设计索引结构以支持高效的混合查询：

```
┌─────────────────────────────────────────────────────────────────┐
│                    Memory Entry Schema                          │
│                                                                 │
│  {                                                              │
│    "id": "mem_001",                                             │
│    "content": "用户偏好：喜欢简洁的界面设计",                        │
│    "embedding": [0.123, -0.456, ...],  // 768维向量              │
│    "metadata": {                                                │
│      "entity_ids": ["user_001", "preference_001"],              │
│      "relations": [                                             │
│        {"type": "belongs_to", "target": "user_001"},             │
│        {"type": "has_tag", "target": "UI"}                      │
│      ],                                                          │
│      "created_at": "2024-03-01",                                │
│      "access_count": 42,                                        │
│      "importance_score": 0.85                                   │
│    }                                                             │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 存储结构选型决策树

```
长期记忆存储选型：

├── 需要语义相似性检索？
│   ├── 否 ──────────────────▶ 传统关系型数据库 + 缓存
│   │
│   └── 是
│       │
│       ├── 需要复杂关系建模？
│       │   ├── 否 ──────────▶ 向量数据库为主
│       │   │
│       │   └── 是
│       │       │
│       │       ├── 需要同时支持高速语义检索？
│       │       │   ├── 否 ───▶ 图数据库为主
│       │       │   │
│       │       │   └── 是 ───▶ 混合存储方案
│       │       │
│       │       └── 数据规模如何？
│       │           ├── < 100万 ───▶ 内存图数据库 (Neo4j)
│       │           ├── 100万-10亿 ─▶ 分布式图数据库 (NebulaGraph)
│       │           └── > 10亿 ────▶ 图数据库 + 向量引擎联合
│       │
│       └── 检索延迟要求？
│           ├── < 10ms ────▶ 内存向量索引 (HNSW)
│           ├── 10-100ms ──▶ SSD 向量索引
│           └── 可容忍 ────▶ HDD 或分布式向量检索
```

---

## 3. 更新策略

长期记忆系统并非一次性写入即可，而是需要一套完整的**更新策略**来管理记忆的演化、淘汰和质量维护。本章深入探讨记忆合并、遗忘机制、重要性评分等核心策略。

### 3.1 记忆合并（Memory Consolidation）

#### 3.1.1 为什么需要记忆合并

在持续运行过程中，Agent 会不断接收新的信息。如果没有合并机制：

1. **记忆碎片化**：相同实体/概念的多条分散记录导致冗余
2. **知识不一致**：更新后的信息与旧信息冲突，无法判断哪个是正确的
3. **检索质量下降**：碎片化的记忆难以有效召回

```
碎片化示例：

记忆库中的分散记录：
  - mem_001: "用户张三喜欢中餐"
  - mem_002: "张三的饮食偏好是西餐"
  - mem_003: "张三是美食爱好者，尤其喜欢意大利菜"
  - mem_004: "上次给张三推荐了日本料理"

问题：
  - 张三到底喜欢什么菜系？中餐？西餐？还是意大利菜？
  - 日本料理推荐是成功还是失败？
  - 更新时应该以哪个为准？
```

#### 3.1.2 合并策略分类

**策略 1：基于实体的合并（Entity-Based Consolidation）**

将关于同一实体的所有记忆聚合，形成统一的实体画像：

```python
class EntityBasedConsolidation:
    """
    基于实体的记忆合并策略
    将同一实体的多条记录合并为单一的事实集合
    """
    
    def consolidate_entity(
        self,
        entity_id: str,
        memories: List[MemoryEntry]
    ) -> ConsolidatedEntity:
        """
        合并同一实体的所有记忆
        """
        # 1. 按时间排序所有记忆
        sorted_memories = sorted(
            memories, 
            key=lambda m: m.metadata.timestamp,
            reverse=True  # 最新优先
        )
        
        # 2. 提取各类事实
        facts = self._extract_facts(sorted_memories)
        
        # 3. 冲突解决：使用最新、最置信的事实
        resolved_facts = self._resolve_conflicts(facts)
        
        # 4. 聚合为统一画像
        return ConsolidatedEntity(
            entity_id=entity_id,
            facts=resolved_facts,
            first_seen=sorted_memories[-1].metadata.timestamp,
            last_updated=sorted_memories[0].metadata.timestamp,
            source_count=len(memories),
            confidence=self._calculate_confidence(memories)
        )
    
    def _resolve_conflicts(self, facts: Dict[str, List[Fact]]) -> Dict[str, Fact]:
        """
        冲突解决策略：
        - 时效性优先：最新信息覆盖旧信息
        - 置信度加权：高置信度信息优先
        - 来源多样性：多源一致的信息更可靠
        """
        resolved = {}
        
        for key, fact_list in facts.items():
            if len(fact_list) == 1:
                resolved[key] = fact_list[0]
                continue
            
            # 多条事实存在，需要解决冲突
            # 策略：按 (时间权重 * 置信度) 排序
            scored_facts = []
            for fact in fact_list:
                time_weight = self._time_decay(fact.timestamp)
                score = fact.confidence * time_weight
                scored_facts.append((score, fact))
            
            # 选择得分最高的事实
            best_fact = max(scored_facts, key=lambda x: x[0])[1]
            resolved[key] = best_fact
        
        return resolved
```

**策略 2：基于时间窗口的合并（Temporal Consolidation）**

将时间上接近的记忆合并为"记忆快照"：

```
时间线：

│──────────│──────────│──────────│──────────│──────────│──────────│
   Week 1     Week 2     Week 3     Week 4     Week 5     Week 6
     
   [记忆碎片]                              [记忆碎片]
   [记忆碎片]  [记忆碎片]                  [记忆碎片]
   [记忆碎片]  [记忆碎片]                  [记忆碎片]
      ↓            ↓                         ↓
   合并为        合并为                    合并为
   周快照 1     周快照 2                  周快照 3
```

```python
class TemporalConsolidation:
    """
    基于时间窗口的记忆合并
    将短期内频繁访问的记忆合并为紧凑的摘要
    """
    
    def __init__(self, window_size: timedelta = timedelta(days=7)):
        self.window_size = window_size
    
    def consolidate(
        self,
        memories: List[MemoryEntry],
        current_time: datetime
    ) -> List[MemorySnapshot]:
        """
        按时间窗口合并记忆
        """
        # 按时间窗口分组
        windows = self._group_by_window(memories, current_time)
        
        snapshots = []
        for window_start, window_memories in windows.items():
            if len(window_memories) == 1:
                # 单条记忆直接保留
                snapshots.append(MemorySnapshot(
                    period_start=window_start,
                    period_end=window_start + self.window_size,
                    entries=window_memories,
                    summary=None  # 不需要摘要
                ))
            else:
                # 多条记忆合并为摘要
                snapshot = self._create_snapshot(
                    window_start,
                    window_start + self.window_size,
                    window_memories
                )
                snapshots.append(snapshot)
        
        return snapshots
    
    def _create_snapshot(
        self,
        period_start: datetime,
        period_end: datetime,
        memories: List[MemoryEntry]
    ) -> MemorySnapshot:
        """
        生成记忆快照摘要
        """
        # 使用 LLM 生成摘要
        summary_prompt = f"""
        将以下关于同一主题的记忆片段合并为一个简洁的摘要：

        记忆片段：
        {self._format_memories(memories)}

        要求：
        1. 保留关键信息和数值
        2. 消除冗余表述
        3. 标注时间范围
        4. 保留重要的细节
        """
        
        summary = llm.generate(summary_prompt)
        
        return MemorySnapshot(
            period_start=period_start,
            period_end=period_end,
            entries=[],  # 摘要模式，原始条目清空
            summary=summary,
            entry_count=len(memories),
            key_events=self._extract_key_events(memories)
        )
```

**策略 3：层次化合并（Hierarchical Consolidation）**

构建多层记忆结构，从细节到概览形成金字塔：

```
记忆层次结构：

         ┌─────────────────────────────────────┐
         │          Level 3: 元认知层            │
         │    "Agent 已掌握的工具：12种"          │
         │    "平均任务完成率：87%"              │
         └─────────────────┬───────────────────┘
                           ▲
         ┌─────────────────┴───────────────────┐
         │          Level 2: 语义摘要层         │
         │    "用户交互模式分析"                 │
         │    "技术问题解决策略库"               │
         │    "项目知识图谱"                    │
         └─────────────────┬───────────────────┘
                           ▲
         ┌─────────────────┴───────────────────┐
         │          Level 1: 事件记录层           │
         │    具体交互记录、工具调用、系统事件      │
         │    mem_001, mem_002, mem_003 ...      │
         └───────────────────────────────────────┘
```

```python
class HierarchicalConsolidation:
    """
    层次化记忆合并
    维护从细节到概览的多层记忆结构
    """
    
    CONSOLIDATION_TRIGGERS = {
        "event_record": 100,    # 100条事件记录 → 合并为语义摘要
        "semantic_summary": 10, # 10条语义摘要 → 合并为元认知
    }
    
    def __init__(self, llm: LLMInterface):
        self.llm = llm
        self.levels = {
            "event": EventMemoryStore(),
            "semantic": SemanticMemoryStore(),
            "meta": MetaMemoryStore()
        }
    
    async def add_memory(self, memory: MemoryEntry):
        """添加新记忆，自动触发层级合并"""
        # 首先添加到事件层
        await self.levels["event"].add(memory)
        
        # 检查是否需要向上合并
        await self._check_and_consolidate()
    
    async def _check_and_consolidate(self):
        """检查各层级是否需要合并"""
        # 事件层合并检查
        event_count = await self.levels["event"].count()
        if event_count >= self.CONSOLIDATION_TRIGGERS["event"]:
            await self._consolidate_events_to_semantic()
        
        # 语义层合并检查
        semantic_count = await self.levels["semantic"].count()
        if semantic_count >= self.CONSOLIDATION_TRIGGERS["semantic"]:
            await self._consolidate_semantic_to_meta()
    
    async def _consolidate_events_to_semantic(self):
        """
        将事件层合并为语义摘要
        """
        events = await self.levels["event"].get_all()
        
        # 按主题/实体分组
        grouped = self._group_by_theme(events)
        
        for theme, theme_events in grouped.items():
            # 生成语义摘要
            summary = await self._generate_semantic_summary(theme, theme_events)
            
            # 存储到语义层
            semantic_memory = MemoryEntry(
                content=summary,
                metadata=MemoryMetadata(
                    level="semantic",
                    source_events=[e.id for e in theme_events],
                    theme=theme
                )
            )
            await self.levels["semantic"].add(semantic_memory)
        
        # 清除已合并的事件记录
        await self.levels["event"].clear_oldest(len(events) // 2)
```

### 3.2 遗忘机制（Forgetting Mechanism）

#### 3.2.1 为什么需要遗忘

生物智能系统中的遗忘并非缺陷，而是**优化策略**：

1. **认知经济**：大脑容量有限，遗忘不重要信息为重要信息腾出空间
2. **适应性**：过时的信息可能误导当前决策
3. **泛化能力**：遗忘细节保留模式有助于迁移学习

对于 LLM Agent 的记忆系统：

```
遗忘的必要性：

场景：用户搬家了

需要遗忘：
  - 旧的收货地址
  - 旧的通勤路线
  - 旧地址附近的餐厅推荐

需要保留：
  - 用户的饮食偏好（可能跨城市保持）
  - 用户的健康状况（如果有影响选择的因素）
  - 与该城市相关的一般知识
```

#### 3.2.2 遗忘策略分类

**策略 1：时间衰减遗忘（Time-Based Decay）**

记忆强度随时间指数衰减：

```python
class TimeBasedForgetting:
    """
    基于时间衰减的遗忘机制
    记忆强度 = initial_strength * exp(-decay_rate * age)
    """
    
    def __init__(
        self,
        decay_rate: float = 0.01,  # 每日衰减率
        threshold: float = 0.1      # 遗忘阈值
    ):
        self.decay_rate = decay_rate
        self.threshold = threshold
    
    def calculate_strength(
        self,
        memory: MemoryEntry,
        current_time: datetime
    ) -> float:
        """
        计算当前时刻的记忆强度
        """
        age_days = (current_time - memory.metadata.created_at).days
        
        # 指数衰减
        strength = math.exp(-self.decay_rate * age_days)
        
        # 应用访问频率调整（频繁访问减缓衰减）
        if memory.metadata.access_count > 10:
            strength *= 1.2  # 强化
        
        return strength
    
    def should_forget(self, memory: MemoryEntry, current_time: datetime) -> bool:
        """
        判断记忆是否应该被遗忘
        """
        strength = self.calculate_strength(memory, current_time)
        return strength < self.threshold
```

**策略 2：重要性遗忘（Importance-Based Forgetting）**

根据记忆的重要性决定保留时长：

```python
class ImportanceBasedForgetting:
    """
    基于重要性的遗忘机制
    高重要性记忆保留更长时间
    """
    
    # 重要性等级与保留周期
    RETENTION_PERIODS = {
        "critical": timedelta(days=365 * 5),   # 关键信息：5年
        "high": timedelta(days=365),           # 高重要性：1年
        "medium": timedelta(days=90),         # 中等：90天
        "low": timedelta(days=30),            # 低重要性：30天
        "transient": timedelta(days=7),       # 临时信息：7天
    }
    
    def should_forget(self, memory: MemoryEntry, current_time: datetime) -> bool:
        """
        基于重要性和保留周期判断是否遗忘
        """
        importance = memory.metadata.importance  # 0.0 - 1.0
        
        # 将重要性映射到等级
        if importance >= 0.9:
            level = "critical"
        elif importance >= 0.7:
            level = "high"
        elif importance >= 0.5:
            level = "medium"
        elif importance >= 0.3:
            level = "low"
        else:
            level = "transient"
        
        retention_period = self.RETENTION_PERIODS[level]
        age = current_time - memory.metadata.created_at
        
        return age > retention_period
```

**策略 3：访问频率遗忘（Access-Based Forgetting）**

长期未访问的记忆被遗忘：

```python
class AccessBasedForgetting:
    """
    基于访问频率的遗忘机制
    使用 LRU（最近最少使用）变体
    """
    
    def __init__(
        self,
        max_memories: int = 10000,
        min_access_frequency: float = 0.1  # 每月至少访问一次
    ):
        self.max_memories = max_memories
        self.min_access_frequency = min_access_frequency
    
    def should_forget(
        self,
        memory: MemoryEntry,
        current_time: datetime
    ) -> bool:
        """
        基于访问频率判断是否遗忘
        """
        # 从未访问过的新记忆
        if memory.metadata.last_accessed is None:
            return False
        
        # 计算访问频率
        age_days = (current_time - memory.metadata.created_at).days
        if age_days == 0:
            return False
        
        access_frequency = memory.metadata.access_count / age_days
        
        # 低于最小访问频率
        if access_frequency < self.min_access_frequency:
            return True
        
        # 记忆数量超限时，优先删除低访问记忆
        if memory.metadata.access_count == 0:
            # 检查是否过期（例如30天未访问）
            days_since_access = (current_time - memory.metadata.last_accessed).days
            return days_since_access > 30
        
        return False
    
    def get_memories_to_forget(
        self,
        memories: List[MemoryEntry],
        current_time: datetime,
        count: int
    ) -> List[MemoryEntry]:
        """
        获取最应该被遗忘的记忆
        """
        forget_scores = []
        
        for memory in memories:
            score = self._calculate_forget_score(memory, current_time)
            forget_scores.append((score, memory))
        
        # 按遗忘分数排序（分数越高越应遗忘）
        forget_scores.sort(reverse=True)
        
        return [m for _, m in forget_scores[:count]]
    
    def _calculate_forget_score(
        self,
        memory: MemoryEntry,
        current_time: datetime
    ) -> float:
        """
        计算遗忘分数
        """
        # 综合考虑：访问频率低 + 时间久远 + 重要性低
        time_factor = (current_time - memory.metadata.last_accessed).days / 30
        importance_factor = 1 - memory.metadata.importance
        access_factor = 1 / (memory.metadata.access_count + 1)
        
        # 加权求和
        score = (
            time_factor * 0.4 +
            importance_factor * 0.3 +
            access_factor * 0.3
        )
        
        return score
```

#### 3.2.3 遗忘机制实施

```python
class ForgettingExecutor:
    """
    遗忘机制执行器
    定期运行遗忘策略，清理过期的记忆
    """
    
    def __init__(
        self,
        time_strategy: TimeBasedForgetting,
        importance_strategy: ImportanceBasedForgetting,
        access_strategy: AccessBasedForgetting,
        store: MemoryStore
    ):
        self.time_strategy = time_strategy
        self.importance_strategy = importance_strategy
        self.access_strategy = access_strategy
        self.store = store
    
    async def run_forgetting(
        self,
        current_time: datetime,
        target_count: int = 100
    ):
        """
        执行遗忘操作
        """
        # 1. 获取所有记忆
        all_memories = await self.store.get_all()
        
        # 2. 收集应被遗忘的记忆
        to_forget = set()
        
        for memory in all_memories:
            # 时间衰减
            if self.time_strategy.should_forget(memory, current_time):
                to_forget.add(memory.id)
            
            # 重要性过期
            if self.importance_strategy.should_forget(memory, current_time):
                to_forget.add(memory.id)
            
            # 访问频率低
            if self.access_strategy.should_forget(memory, current_time):
                to_forget.add(memory.id)
        
        # 3. 如果还不够，补充低优先级记忆
        if len(to_forget) < target_count:
            remaining = set(m.id for m in all_memories) - to_forget
            low_priority = [
                m for m in all_memories 
                if m.id in remaining and m.metadata.importance < 0.3
            ]
            
            # 按遗忘分数排序
            additional = self.access_strategy.get_memories_to_forget(
                low_priority, current_time, target_count - len(to_forget)
            )
            to_forget.update(m.id for m in additional)
        
        # 4. 执行删除
        for memory_id in to_forget:
            await self.store.delete(memory_id)
        
        return len(to_forget)
```

### 3.3 重要性评分（Importance Scoring）

#### 3.3.1 重要性评估维度

记忆的重要性需要从多个维度综合评估：

```python
from dataclasses import dataclass
from typing import List

@dataclass
class ImportanceFactors:
    """
    重要性评分因子
    """
    # 1. 信息独特性（Uniqueness）
    # 该信息在记忆库中的罕见程度
    uniqueness: float  # 0.0 - 1.0
    
    # 2. 时效性（Timeliness）
    # 信息对当前任务的相关性
    timeliness: float  # 0.0 - 1.0
    
    # 3. 完整性（Completeness）
    # 信息是否完整，还是碎片
    completeness: float  # 0.0 - 1.0
    
    # 4. 可操作性（Actionability）
    # 信息能否直接指导行动
    actionability: float  # 0.0 - 1.0
    
    # 5. 情感权重（Emotional Weight）
    # 是否涉及重要情感事件
    emotional_weight: float  # 0.0 - 1.0

class ImportanceScorer:
    """
    记忆重要性评分器
    """
    
    # 权重配置
    WEIGHTS = {
        "uniqueness": 0.25,
        "timeliness": 0.30,
        "completeness": 0.15,
        "actionability": 0.20,
        "emotional_weight": 0.10
    }
    
    def __init__(self, embedding_model, llm: LLMInterface):
        self.embedding_model = embedding_model
        self.llm = llm
    
    async def score(self, memory: MemoryEntry) -> float:
        """
        计算记忆的重要性分数
        """
        factors = await self._evaluate_factors(memory)
        
        # 加权求和
        total_score = sum(
            getattr(factors, factor) * self.WEIGHTS[factor]
            for factor in self.WEIGHTS.keys()
        )
        
        return min(1.0, max(0.0, total_score))
    
    async def _evaluate_factors(
        self,
        memory: MemoryEntry
    ) -> ImportanceFactors:
        """
        评估各维度因子
        """
        # 并行评估各因子
        uniqueness, timeliness, completeness, actionability, emotional = await asyncio.gather(
            self._evaluate_uniqueness(memory),
            self._evaluate_timeliness(memory),
            self._evaluate_completeness(memory),
            self._evaluate_actionability(memory),
            self._evaluate_emotional_weight(memory)
        )
        
        return ImportanceFactors(
            uniqueness=uniqueness,
            timeliness=timeliness,
            completeness=completeness,
            actionability=actionability,
            emotional_weight=emotional
        )
    
    async def _evaluate_uniqueness(self, memory: MemoryEntry) -> float:
        """
        评估信息独特性
        与其他记忆越不相似，越独特
        """
        # 获取所有记忆的向量
        all_embeddings = await self.store.get_all_embeddings()
        
        if not all_embeddings:
            return 0.5  # 默认中等
        
        # 计算与最相似记忆的距离
        memory_embedding = memory.embedding
        similarities = self._cosine_similarity(memory_embedding, all_embeddings)
        
        # 最相似记忆的相似度越低，越独特
        max_similarity = max(similarities) if similarities else 0
        
        # 转换：低相似度 = 高独特性
        uniqueness = 1 - max_similarity
        
        return uniqueness
    
    async def _evaluate_timeliness(self, memory: MemoryEntry) -> float:
        """
        评估时效性
        信息是否与当前时间相关
        """
        current_time = datetime.now()
        age_days = (current_time - memory.metadata.created_at).days
        
        # 时间衰减函数
        if age_days <= 7:
            return 1.0      # 最近7天，满分
        elif age_days <= 30:
            return 0.8      # 30天内，高
        elif age_days <= 90:
            return 0.6      # 90天内，中
        elif age_days <= 365:
            return 0.4      # 1年内，中低
        else:
            return 0.2      # 1年以上，低
        
        # 注意：有些记忆本身就是永恒的（如生日）
        # 需要根据记忆类型调整
    
    async def _evaluate_actionability(self, memory: MemoryEntry) -> float:
        """
        评估可操作性
        使用 LLM 判断该信息能否直接用于决策
        """
        prompt = f"""
        分析以下记忆，判断其对决策和行动指导的价值：

        记忆内容：{memory.content}

        评估标准：
        - 高可操作性：可直接指导下一步行动（"用户喜欢中餐"）
        - 中可操作性：提供背景但需进一步推理（"用户上周去了北京"）
        - 低可操作性：纯信息，无直接行动指导（"北京是中国的首都"）

        输出：0.0 到 1.0 的分数
        """
        
        response = await self.llm.generate(prompt)
        return float(response.strip())
```

### 3.4 定期总结 vs 增量更新

#### 3.4.1 定期总结（Periodic Summarization）

定期总结策略在固定时间窗口后对记忆进行压缩和提炼：

```python
class PeriodicSummarizer:
    """
    定期记忆总结器
    在固定周期后对积累的记忆进行压缩
    """
    
    def __init__(
        self,
        llm: LLMInterface,
        period: timedelta = timedelta(days=7),
        min_memories_to_summarize: int = 20
    ):
        self.llm = llm
        self.period = period
        self.min_memories_to_summarize = min_memories_to_summarize
    
    async def should_summarize(
        self,
        memory_count: int,
        last_summarize_time: datetime,
        current_time: datetime
    ) -> bool:
        """
        判断是否应该进行总结
        """
        # 时间条件：距离上次总结已满周期
        time_condition = (current_time - last_summarize_time) >= self.period
        
        # 数量条件：积累足够多的记忆
        count_condition = memory_count >= self.min_memories_to_summarize
        
        return time_condition and count_condition
    
    async def summarize(
        self,
        memories: List[MemoryEntry],
        context: SummarizationContext
    ) -> Summary:
        """
        生成记忆总结
        """
        # 1. 按主题/实体分组
        grouped = self._group_by_theme(memories)
        
        summaries = []
        for theme, theme_memories in grouped.items():
            # 2. 对每个主题生成摘要
            theme_summary = await self._summarize_theme(
                theme,
                theme_memories,
                context
            )
            summaries.append(theme_summary)
        
        # 3. 生成全局摘要
        global_summary = await self._generate_global_summary(
            summaries,
            context
        )
        
        return Summary(
            period_start=context.period_start,
            period_end=context.period_end,
            theme_summaries=summaries,
            global_summary=global_summary,
            memory_count=len(memories),
            key_insights=await self._extract_key_insights(summaries)
        )
    
    async def _summarize_theme(
        self,
        theme: str,
        memories: List[MemoryEntry],
        context: SummarizationContext
    ) -> ThemeSummary:
        """
        对特定主题的记忆进行摘要
        """
        prompt = f"""
        对以下关于"{theme}"的记忆进行精简摘要：

        记忆列表：
        {self._format_memories_list(memories)}

        时间范围：{context.period_start} 至 {context.period_end}

        要求：
        1. 提取关键事实和模式
        2. 识别重要变化或趋势
        3. 保留可操作的洞察
        4. 标注信息来源（如果关键）
        5. 用中文输出
        """
        
        content = await self.llm.generate(prompt)
        
        return ThemeSummary(
            theme=theme,
            summary=content,
            memory_count=len(memories),
            key_facts=self._extract_key_facts(memories),
            trends=self._identify_trends(memories)
        )
```

#### 3.4.2 增量更新（Incremental Update）

增量更新策略在新记忆到来时实时更新已有记忆结构：

```python
class IncrementalUpdater:
    """
    增量记忆更新器
    新记忆到来时实时更新已有结构
    """
    
    def __init__(
        self,
        consolidation: EntityBasedConsolidation,
        importance_scorer: ImportanceScorer
    ):
        self.consolidation = consolidation
        self.importance_scorer = importance_scorer
    
    async def update(
        self,
        new_memory: MemoryEntry,
        existing_memories: List[MemoryEntry]
    ) -> UpdateResult:
        """
        处理新记忆的增量更新
        """
        # 1. 提取新记忆中的实体
        new_entities = self._extract_entities(new_memory.content)
        
        # 2. 找到相关的已有记忆
        related_memories = self._find_related_memories(
            new_memory,
            existing_memories
        )
        
        if not related_memories:
            # 无相关记忆，直接添加
            return UpdateResult(
                action="add",
                memory=new_memory,
                affected_entities=[]
            )
        
        # 3. 评估是否需要合并
        consolidation_needed = await self._should_consolidate(
            new_memory,
            related_memories
        )
        
        if consolidation_needed:
            # 4. 执行合并
            consolidated = await self._perform_consolidation(
                new_memory,
                related_memories
            )
            return UpdateResult(
                action="consolidate",
                memory=consolidated,
                affected_entities=new_entities
            )
        else:
            # 5. 直接更新相关记忆
            await self._update_related_memories(new_memory, related_memories)
            return UpdateResult(
                action="update",
                memory=new_memory,
                affected_entities=new_entities
            )
    
    async def _should_consolidate(
        self,
        new_memory: MemoryEntry,
        related_memories: List[MemoryEntry]
    ) -> bool:
        """
        判断是否需要合并
        """
        # 条件1：相关记忆数量超过阈值
        if len(related_memories) > 10:
            return True
        
        # 条件2：新记忆与相关记忆存在冲突
        if self._has_conflict(new_memory, related_memories):
            return True
        
        # 条件3：新记忆的重要性显著高于相关记忆
        new_importance = await self.importance_scorer.score(new_memory)
        avg_related_importance = sum(
            m.metadata.importance for m in related_memories
        ) / len(related_memories)
        
        if new_importance > avg_related_importance * 1.5:
            return True
        
        return False
```

---

## 4. 检索机制

记忆系统的价值最终通过检索体现。本章深入分析检索机制的核心组件：重排序策略、混合检索、上下文窗口匹配，以及检索性能优化。

### 4.1 重排序（Reranking）策略

#### 4.1.1 为什么需要重排序

向量检索返回的结果虽然快，但存在以下局限：

```
向量检索的局限性：

1. 语义相似 ≠ 实际相关
   查询："如何减肥"
   向量检索返回："XX 减肥药的广告"（语义相关但可能无用）

2. 单一向量表示丢失细节
   "Apple 可以吃" vs "Apple 是公司" 
   使用相同向量无法区分

3. 缺乏上下文感知
   无法根据当前任务动态调整相关性
```

重排序（Reranking）在初步检索后，使用更复杂的模型对结果进行精细排序，显著提升检索质量。

#### 4.1.2 重排序模型对比

| 模型 | 类型 | 优势 | 劣势 | 适用场景 |
|------|------|------|------|----------|
| **BERT-base** | Cross-Encoder | 高精度、语义理解深 | 速度慢、计算重 | 精度优先场景 |
| ** Colbert V2** | Late Interaction | 速度快、段落级匹配 | 需要特定索引 | 高效重排 |
| **MonoT5** | T5-based | 端到端、可学习 | 需训练数据 | 有标注场景 |
| **RankGPT** | LLM-based | 强推理能力 | 速度慢、成本高 | 复杂查询 |
| **BGE** | Embedding+Classifier | 平衡效率效果 | 效果一般 | 通用场景 |

#### 4.1.3 重排序实现

```python
from typing import List, Optional
import numpy as np

class Reranker:
    """
    检索结果重排序器
    使用 Cross-Encoder 或 Late Interaction 模型
    """
    
    def __init__(
        self,
        model_type: str = "cross-encoder",
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-12-v2",
        device: str = "cuda"
    ):
        self.model_type = model_type
        
        if model_type == "cross-encoder":
            from sentence_transformers import CrossEncoder
            self.model = CrossEncoder(model_name, device=device)
        elif model_type == "colbert":
            from colbert import ColBERT
            self.model = ColBERT(model_name)
        elif model_type == "llm":
            # 使用 LLM 进行重排
            self.model = None  # LLM 不需要预加载模型
    
    async def rerank(
        self,
        query: str,
        candidates: List[MemoryEntry],
        top_k: int = 10
    ) -> List[RerankedResult]:
        """
        对候选记忆进行重排序
        
        Args:
            query: 查询文本
            candidates: 初始检索的候选记忆列表
            top_k: 返回的最终结果数量
        
        Returns:
            重排序后的结果
        """
        if not candidates:
            return []
        
        if self.model_type == "cross-encoder":
            return await self._rerank_cross_encoder(query, candidates, top_k)
        elif self.model_type == "colbert":
            return await self._rerank_colbert(query, candidates, top_k)
        elif self.model_type == "llm":
            return await self._rerank_llm(query, candidates, top_k)
    
    async def _rerank_cross_encoder(
        self,
        query: str,
        candidates: List[MemoryEntry],
        top_k: int
    ) -> List[RerankedResult]:
        """
        使用 Cross-Encoder 重排序
        将 query 和 document 配对输入，获取精确的相关性分数
        """
        # 构建 query-document 对
        pairs = [(query, candidate.content) for candidate in candidates]
        
        # 批量推理
        scores = self.model.predict(pairs)
        
        # 按分数排序
        results = []
        for candidate, score in zip(candidates, scores):
            results.append(RerankedResult(
                entry=candidate,
                original_score=candidate.metadata.retrieval_score,
                rerank_score=float(score),
                combined_score=candidate.metadata.retrieval_score * 0.3 + float(score) * 0.7
            ))
        
        results.sort(key=lambda x: x.combined_score, reverse=True)
        
        return results[:top_k]
    
    async def _rerank_llm(
        self,
        query: str,
        candidates: List[MemoryEntry],
        top_k: int
    ) -> List[RerankedResult]:
        """
        使用 LLM 进行重排序
        适用于复杂查询，需要深层语义理解
        """
        # 构建对比 prompt
        prompt = f"""
        给定查询："{query}"

        评估以下每条记忆与查询的相关性，并给出 0-10 的分数：

        候选记忆：
        {self._format_candidates(candidates)}

        评分标准：
        - 10：直接回答查询，高度相关
        - 7-9：提供重要参考信息
        - 4-6：部分相关，需要额外推理
        - 1-3：勉强相关
        - 0：完全不相关

        输出格式（JSON）：
        {{
            "rankings": [
                {{"id": "mem_001", "score": 8.5, "reason": "..."}},
                ...
            ]
        }}
        """
        
        response = await llm.generate(prompt)
        rankings = json.loads(response)["rankings"]
        
        # 构建结果
        id_to_candidate = {c.id: c for c in candidates}
        id_to_original_score = {c.id: c.metadata.retrieval_score for c in candidates}
        
        results = []
        for ranking in rankings:
            candidate = id_to_candidate[ranking["id"]]
            results.append(RerankedResult(
                entry=candidate,
                original_score=id_to_original_score[ranking["id"]],
                rerank_score=ranking["score"] / 10.0,  # 归一化到 0-1
                combined_score=ranking["score"] / 10.0,
                reason=ranking.get("reason")
            ))
        
        results.sort(key=lambda x: x.combined_score, reverse=True)
        
        return results[:top_k]
```

### 4.2 混合检索（Hybrid Search）

#### 4.2.1 混合检索的必要性

单一检索方式难以覆盖所有查询类型：

```
查询类型与检索方式匹配：

┌─────────────────────┬──────────────────┬─────────────────────┐
│       查询类型        │    最佳检索方式     │       示例           │
├─────────────────────┼──────────────────┼─────────────────────┤
│ 语义模糊查询          │    向量检索        │ "找个像 Netflix 的   │
│                     │                  │  那种感觉的 APP"     │
├─────────────────────┼──────────────────┼─────────────────────┤
│ 精确属性查询          │    关键词检索      │ "用户 ID 为 12345   │
│                     │                  │  的记录"             │
├─────────────────────┼──────────────────┼─────────────────────┤
│ 关系路径查询          │    图检索         │ "Alice 的老板的      │
│                     │                  │  同事是谁"           │
├─────────────────────┼──────────────────┼─────────────────────┤
│ 复杂组合查询          │    混合检索        │ "最近交互过的、       │
│                     │                  │  科技行业的、用户"    │
└─────────────────────┴──────────────────┴─────────────────────┘
```

#### 4.2.2 混合检索架构

```python
class HybridSearch:
    """
    混合检索系统
    融合向量检索、关键词检索和图检索
    """
    
    def __init__(
        self,
        vector_store: VectorStore,
        keyword_store: KeywordStore,
        graph_store: GraphStore,
        fusion_method: str = "rrf"  # Reciprocal Rank Fusion
    ):
        self.vector_store = vector_store
        self.keyword_store = keyword_store
        self.graph_store = graph_store
        self.fusion_method = fusion_method
    
    async def search(
        self,
        query: HybridQuery,
        top_k: int = 10
    ) -> List[SearchResult]:
        """
        执行混合检索
        
        流程：
        1. 解析查询，确定需要哪些检索方式
        2. 并行执行各检索
        3. 融合结果
        """
        # Step 1: 查询解析
        search_plan = self._plan_search(query)
        
        # Step 2: 并行执行各检索
        tasks = []
        
        if search_plan.vector_search:
            tasks.append(self._vector_search(query))
        
        if search_plan.keyword_search:
            tasks.append(self._keyword_search(query))
        
        if search_plan.graph_search:
            tasks.append(self._graph_search(query))
        
        results_per_modality = await asyncio.gather(*tasks)
        
        # Step 3: 结果融合
        fused_results = self._fuse_results(
            results_per_modality,
            top_k
        )
        
        return fused_results
    
    def _plan_search(self, query: HybridQuery) -> SearchPlan:
        """
        分析查询，制定检索策略
        """
        plan = SearchPlan()
        
        # 检查是否包含精确查询条件
        if query.exact_filters:
            plan.keyword_search = True
            plan.vector_search = False  # 有精确条件时，减少向量检索
        
        # 检查是否包含关系查询
        if query.relationship_queries:
            plan.graph_search = True
        
        # 检查是否需要语义扩展
        if query.semantic_expansion:
            plan.vector_search = True
        
        # 默认：同时启用向量和关键词
        if not any([plan.vector_search, plan.keyword_search, plan.graph_search]):
            plan.vector_search = True
            plan.keyword_search = True
        
        return plan
    
    async def _vector_search(
        self,
        query: HybridQuery
    ) -> List[SearchResult]:
        """语义向量检索"""
        # 生成查询向量
        query_vector = self.vector_store.embed(query.text)
        
        # 执行检索
        results = await self.vector_store.search(
            vector=query_vector,
            top_k=query.top_k * 2,  # 多检索一些以留出融合空间
            filters=query.filters
        )
        
        return results
    
    async def _keyword_search(
        self,
        query: HybridQuery
    ) -> List[SearchResult]:
        """关键词检索"""
        # BM25 或 TF-IDF 检索
        results = await self.keyword_store.search(
            query=query.text,
            filters=query.exact_filters,
            top_k=query.top_k * 2
        )
        
        return results
    
    async def _graph_search(
        self,
        query: HybridQuery
    ) -> List[SearchResult]:
        """图关系检索"""
        results = []
        
        for rel_query in query.relationship_queries:
            # 执行图遍历
            path_results = await self.graph_store.traverse(
                start_entity=rel_query.start_entity,
                relation_type=rel_query.relation_type,
                max_hops=rel_query.max_hops
            )
            results.extend(path_results)
        
        return results
    
    def _fuse_results(
        self,
        results_per_modality: List[List[SearchResult]],
        top_k: int
    ) -> List[SearchResult]:
        """
        多模态结果融合
        
        方法：
        1. Reciprocal Rank Fusion (RRF)
        2. Score-based fusion
        3. Learning to rank
        """
        if self.fusion_method == "rrf":
            return self._rrf_fusion(results_per_modality, top_k)
        elif self.fusion_method == "score":
            return self._score_fusion(results_per_modality, top_k)
        else:
            return self._rrf_fusion(results_per_modality, top_k)
    
    def _rrf_fusion(
        self,
        results_per_modality: List[List[SearchResult]],
        top_k: int
    ) -> List[SearchResult]:
        """
        Reciprocal Rank Fusion (RRF)
        
        RRF 公式：Score(d) = Σ 1/(k + rank_i(d))
        
        优势：
        - 无需训练
        - 对不同检索方式产生的分数有鲁棒性
        - 简单高效
        """
        k = 60  # RRF 平滑因子
        
        # 构建 doc_id -> all ranks 映射
        doc_ranks: Dict[str, List[int]] = {}
        doc_scores: Dict[str, float] = {}
        
        for modality_results in results_per_modality:
            if not modality_results:
                continue
            
            # 归一化原始分数
            max_score = max(r.score for r in modality_results)
            min_score = min(r.score for r in modality_results)
            score_range = max_score - min_score if max_score != min_score else 1
            
            for rank, result in enumerate(modality_results):
                doc_id = result.entry.id
                
                if doc_id not in doc_ranks:
                    doc_ranks[doc_id] = []
                    doc_scores[doc_id] = result.score  # 保留原始分数
                
                doc_ranks[doc_id].append(rank + 1)  # rank 从 1 开始
        
        # 计算 RRF 分数
        rrf_scores: Dict[str, float] = {}
        
        for doc_id, ranks in doc_ranks.items():
            rrf_score = sum(1.0 / (k + r) for r in ranks)
            rrf_scores[doc_id] = rrf_score
        
        # 排序
        sorted_doc_ids = sorted(
            rrf_scores.keys(),
            key=lambda x: rrf_scores[x],
            reverse=True
        )
        
        # 构建最终结果
        id_to_entry = {}
        for modality_results in results_per_modality:
            for result in modality_results:
                id_to_entry[result.entry.id] = result.entry
        
        final_results = []
        for doc_id in sorted_doc_ids[:top_k]:
            final_results.append(SearchResult(
                entry=id_to_entry[doc_id],
                score=rrf_scores[doc_id],
                source_modalities=len(doc_ranks[doc_id])
            ))
        
        return final_results
```

### 4.3 上下文窗口匹配

#### 4.3.1 问题定义

即使检索到相关记忆，也需要考虑**上下文窗口限制**：

```
上下文窗口限制：

LLM 上下文窗口：128K tokens
用于记忆的 tokens：80K
用于当前任务的 tokens：40K
可用空间：8K tokens

问题：
- 检索到 100 条相关记忆
- 总计 150K tokens
- 无法全部放入上下文

挑战：
- 选择哪些记忆？
- 如何排序？
- 如何压缩？
```

#### 4.3.2 上下文窗口匹配策略

```python
class ContextWindowMatcher:
    """
    上下文窗口匹配器
    在有限窗口内选择最相关的记忆
    """
    
    def __init__(
        self,
        max_window_tokens: int = 80000,
        reserve_tokens: int = 40000,  # 为当前任务预留
        compression_ratio: float = 0.3  # 压缩到原始的 30%
    ):
        self.max_window_tokens = max_window_tokens
        self.reserve_tokens = reserve_tokens
        self.compression_ratio = compression_ratio
        self.available_tokens = max_window_tokens - reserve_tokens
    
    def match(
        self,
        query: str,
        candidate_memories: List[MemoryEntry],
        current_context: str
    ) -> ContextWindowResult:
        """
        为查询匹配最相关的记忆子集，适配上下文窗口
        
        策略：
        1. 计算每个记忆的信息密度
        2. 按信息密度和相关性排序
        3. 贪心选择直到填满窗口
        4. 对超出的记忆进行压缩
        """
        # Step 1: 计算每个记忆的信息量
        memory_info = []
        for memory in candidate_memories:
            tokens = self._estimate_tokens(memory.content)
            density = self._calculate_density(memory, query)
            
            memory_info.append({
                "memory": memory,
                "tokens": tokens,
                "density": density,
                "info_per_token": density / tokens if tokens > 0 else 0
            })
        
        # Step 2: 按信息密度排序
        memory_info.sort(key=lambda x: x["info_per_token"], reverse=True)
        
        # Step 3: 贪心选择
        selected = []
        total_tokens = 0
        selected_ids = set()
        
        for info in memory_info:
            memory = info["memory"]
            tokens = info["tokens"]
            
            if total_tokens + tokens <= self.available_tokens:
                selected.append(memory)
                total_tokens += tokens
                selected_ids.add(memory.id)
            else:
                # 尝试压缩
                compressed = await self._compress_memory(memory)
                if total_tokens + compressed.tokens <= self.available_tokens:
                    selected.append(compressed)
                    total_tokens += compressed.tokens
                    selected_ids.add(memory.id)
        
        # Step 4: 处理未选中的记忆
        not_selected = [m for m in candidate_memories if m.id not in selected_ids]
        
        return ContextWindowResult(
            selected_memories=selected,
            discarded_memories=not_selected,
            total_tokens=total_tokens,
            compression_applied=len(not_selected) > 0
        )
    
    def _calculate_density(
        self,
        memory: MemoryEntry,
        query: str
    ) -> float:
        """
        计算记忆的信息密度
        综合考虑：
        1. 与查询的相关性
        2. 记忆本身的重要性
        3. 时效性
        4. 访问频率
        """
        # 相关性分数
        relevance = memory.metadata.retrieval_score
        
        # 重要性权重
        importance = memory.metadata.importance
        
        # 时效性因子
        age_days = (datetime.now() - memory.metadata.created_at).days
        if age_days <= 7:
            timeliness = 1.0
        elif age_days <= 30:
            timeliness = 0.8
        else:
            timeliness = 0.6
        
        # 访问频率因子
        access_factor = min(1.0, memory.metadata.access_count / 20)
        
        # 综合密度
        density = (
            relevance * 0.4 +
            importance * 0.3 +
            timeliness * 0.15 +
            access_factor * 0.15
        )
        
        return density
    
    async def _compress_memory(
        self,
        memory: MemoryEntry
    ) -> MemoryEntry:
        """
        压缩记忆内容，保留关键信息
        """
        prompt = f"""
        将以下记忆压缩到 {int(len(memory.content) * self.compression_ratio)} 字以内，
        保留关键信息和数字：

        原文：
        {memory.content}

        要求：
        1. 保留关键事实和数字
        2. 删除冗余描述
        3. 用中文输出
        """
        
        compressed_content = await llm.generate(prompt)
        
        # 更新 token 估算
        compressed_tokens = self._estimate_tokens(compressed_content)
        
        return MemoryEntry(
            id=memory.id + "_compressed",
            content=compressed_content,
            embedding=memory.embedding,  # 保持不变
            metadata=MemoryMetadata(
                **memory.metadata.__dict__,
                is_compressed=True,
                original_tokens=memory.metadata.tokens,
                compressed_tokens=compressed_tokens
            )
        )
```

### 4.4 检索性能优化

```python
class RetrievalOptimizer:
    """
    检索性能优化器
    """
    
    def __init__(
        self,
        cache_size: int = 10000,
        prefetch_threshold: int = 5
    ):
        self.cache = LRUCache(cache_size)
        self.prefetch_threshold = prefetch_threshold
    
    async def retrieve_with_cache(
        self,
        query: str,
        retrieval_fn: Callable
    ) -> List[SearchResult]:
        """
        带缓存的检索
        """
        cache_key = self._make_cache_key(query)
        
        # 缓存命中
        if cache_key in self.cache:
            self.cache_hit()
            return self.cache.get(cache_key)
        
        # 执行检索
        results = await retrieval_fn(query)
        
        # 缓存结果
        self.cache.put(cache_key, results)
        
        return results
    
    def prefetch(
        self,
        query: str,
        current_results: List[SearchResult],
        retrieval_fn: Callable
    ):
        """
        预取可能需要的记忆
        """
        if len(current_results) >= self.prefetch_threshold:
            # 基于当前结果预测下一步查询
            predicted_queries = self._predict_next_queries(
                query,
                current_results
            )
            
            # 异步预取
            for pred_query in predicted_queries:
                asyncio.create_task(self.retrieve_with_cache(
                    pred_query,
                    retrieval_fn
                ))
    
    def _predict_next_queries(
        self,
        current_query: str,
        current_results: List[SearchResult]
    ) -> List[str]:
        """
        基于当前查询和结果预测下一步查询
        """
        # 简单策略：提取结果中的实体，生成变体查询
        entities = []
        for result in current_results[:3]:
            entities.extend(extract_entities(result.entry.content))
        
        # 生成变体查询
        variations = []
        for entity in entities[:5]:
            variations.append(f"{current_query} {entity}")
        
        return variations
```

---

## 5. 完整记忆系统设计

本章整合前述章节的内容，给出一个完整的记忆系统架构设计，包括核心组件、数据流和关键接口。

### 5.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Long-Term Memory System                        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         Memory API Layer                           │ │
│  │                                                                      │ │
│  │   add_memory(content, metadata)     │     retrieve_memory(query)   │ │
│  │   update_memory(id, updates)        │     search_memory(query)     │ │
│  │   delete_memory(id)                │     get_memory_context()     │ │
│  │   consolidate_memories()            │     get_memory_stats()        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                    │
│                                    ▼                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      Memory Manager                                 │ │
│  │                                                                      │ │
│  │  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │ │
│  │  │ Memory Indexer │  │ Retrieval Engine│  │ Consolidation Engine│   │ │
│  │  │                │  │                  │  │                      │   │ │
│  │  │ - Vector Index │  │ - Query Parser   │  │ - Entity Merger     │   │ │
│  │  │ - Graph Index  │  │ - Hybrid Search  │  │ - Conflict Resolver │   │ │
│  │  │ - Keyword Index│  │ - Reranker       │  │ - Summarizer         │   │ │
│  │  │ - Metadata IDX │  │ - Context Matcher│  │ - Importance Scorer  │   │ │
│  │  └────────────────┘  └─────────────────┘  └──────────────────────┘   │ │
│  │                                                                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                    │
│                                    ▼                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                       Storage Layer                                 │ │
│  │                                                                      │ │
│  │  ┌──────────────────┐     ┌──────────────────┐     ┌────────────┐  │ │
│  │  │   Vector Store   │     │    Graph Store   │     │ SQL Store │  │ │
│  │  │                  │     │                  │     │            │  │ │
│  │  │  - Pinecone      │     │  - Neo4j         │     │ - SQLite   │  │ │
│  │  │  - Milvus        │◀───▶│  - NebulaGraph   │◀───▶│ - PG       │  │ │
│  │  │  - Weaviate      │     │  - TuGraph       │     │ - MySQL    │  │ │
│  │  │  - Qdrant        │     │                  │     │            │  │ │
│  │  └──────────────────┘     └──────────────────┘     └────────────┘  │ │
│  │                                                                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 核心组件说明

#### 5.2.1 Memory Manager

```python
class MemoryManager:
    """
    记忆系统核心管理器
    协调各组件，提供统一的记忆接口
    """
    
    def __init__(
        self,
        config: MemorySystemConfig,
        llm: LLMInterface,
        embedding_model: EmbeddingModel
    ):
        # 存储层
        self.vector_store = self._create_vector_store(config.vector_store)
        self.graph_store = self._create_graph_store(config.graph_store)
        self.sql_store = self._create_sql_store(config.sql_store)
        
        # 索引器
        self.indexer = MemoryIndexer(
            vector_store=self.vector_store,
            graph_store=self.graph_store,
            sql_store=self.sql_store,
            embedding_model=embedding_model
        )
        
        # 检索引擎
        self.retrieval_engine = RetrievalEngine(
            vector_store=self.vector_store,
            graph_store=self.graph_store,
            sql_store=self.sql_store,
            reranker=config.reranker,
            embedding_model=embedding_model
        )
        
        # 合并引擎
        self.consolidation_engine = ConsolidationEngine(
            llm=llm,
            importance_scorer=ImportanceScorer(embedding_model, llm),
            vector_store=self.vector_store
        )
        
        # 遗忘执行器
        self.forgetting_executor = ForgettingExecutor(
            time_strategy=TimeBasedForgetting(
                decay_rate=config.forgetting_decay_rate
            ),
            importance_strategy=ImportanceBasedForgetting(),
            access_strategy=AccessBasedForgetting(
                max_memories=config.max_memories
            ),
            store=self.vector_store
        )
        
        # 配置
        self.config = config
    
    async def add_memory(
        self,
        content: str,
        metadata: MemoryMetadataInput
    ) -> MemoryEntry:
        """
        添加新记忆
        """
        # 1. 生成向量嵌入
        embedding = await self.embedding_model.embed(content)
        
        # 2. 计算重要性
        temp_entry = MemoryEntry(content=content, embedding=embedding)
        importance = await self.consolidation_engine.importance_scorer.score(temp_entry)
        
        # 3. 创建记忆条目
        memory = MemoryEntry(
            id=self._generate_id(),
            content=content,
            embedding=embedding,
            metadata=MemoryMetadata(
                created_at=datetime.now(),
                importance=importance,
                access_count=0,
                **metadata
            )
        )
        
        # 4. 索引到各存储
        await self.indexer.index(memory)
        
        # 5. 触发增量更新
        await self.consolidation_engine.incremental_update(memory)
        
        # 6. 定期检查是否需要遗忘
        if random.random() < 0.1:  # 10% 概率触发遗忘检查
            asyncio.create_task(self._periodic_forgetting())
        
        return memory
    
    async def retrieve(
        self,
        query: str,
        filters: RetrievalFilters = None,
        top_k: int = 10
    ) -> List[MemoryEntry]:
        """
        检索相关记忆
        """
        # 1. 执行混合检索
        results = await self.retrieval_engine.search(
            query=query,
            filters=filters,
            top_k=top_k * 3  # 多检索一些用于重排
        )
        
        # 2. 重排序
        reranked = await self.retrieval_engine.rerank(
            query=query,
            candidates=[r.entry for r in results],
            top_k=top_k
        )
        
        # 3. 上下文窗口匹配
        context_result = self.retrieval_engine.context_matcher.match(
            query=query,
            candidate_memories=reranked,
            current_context=""
        )
        
        # 4. 更新访问统计
        for memory in context_result.selected_memories:
            await self._update_access_stats(memory.id)
        
        return context_result.selected_memories
    
    async def _periodic_forgetting(self):
        """
        定期遗忘检查
        """
        await self.forgetting_executor.run_forgetting(
            current_time=datetime.now(),
            target_count=100
        )
```

#### 5.2.2 Memory Entry 数据结构

```python
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

@dataclass
class MemoryMetadata:
    """
    记忆元数据
    """
    # 时间戳
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    last_accessed: Optional[datetime] = None
    
    # 重要性
    importance: float = 0.5  # 0.0 - 1.0
    
    # 访问统计
    access_count: int = 0
    
    # 来源信息
    source: str = "user_interaction"  # user_interaction, system_generated, external
    
    # 关联实体
    entity_ids: List[str] = field(default_factory=list)
    
    # 标签
    tags: List[str] = field(default_factory=list)
    
    # 关联记忆
    related_memory_ids: List[str] = field(default_factory=list)
    
    # 检索相关
    retrieval_score: float = 0.0
    
    # 压缩标记
    is_compressed: bool = False
    original_tokens: Optional[int] = None
    compressed_tokens: Optional[int] = None
    
    # 记忆类型
    memory_type: str = "general"  # preference, fact, interaction, knowledge

@dataclass 
class MemoryEntry:
    """
    记忆条目
    """
    id: str = field(default_factory=lambda: f"mem_{uuid.uuid4().hex[:12]}")
    content: str = ""
    embedding: List[float] = field(default_factory=list)
    metadata: MemoryMetadata = field(default_factory=MemoryMetadata)
    
    # 用于序列化
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content,
            "embedding": self.embedding,
            "metadata": {
                "created_at": self.metadata.created_at.isoformat(),
                "updated_at": self.metadata.updated_at.isoformat(),
                "last_accessed": (
                    self.metadata.last_accessed.isoformat() 
                    if self.metadata.last_accessed else None
                ),
                "importance": self.metadata.importance,
                "access_count": self.metadata.access_count,
                "source": self.metadata.source,
                "entity_ids": self.metadata.entity_ids,
                "tags": self.metadata.tags,
                "related_memory_ids": self.metadata.related_memory_ids,
                "memory_type": self.metadata.memory_type
            }
        }
```

### 5.3 数据流设计

```
数据流 1: 添加新记忆
========================

User Input
    │
    ▼
┌─────────────────┐
│   Input Parser  │
│ - 解析内容       │
│ - 提取实体       │
│ - 分类记忆类型   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Embedding Gen  │  (异步)
│ - 生成向量       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Importance Calc │
│ - 评估重要性     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Vector │ │Graph  │
│Store  │ │Store  │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Incremental     │
│ Consolidation   │
│ - 更新相关记忆   │
│ - 合并冲突      │
└─────────────────┘


数据流 2: 检索记忆
========================

Query Input
    │
    ▼
┌─────────────────┐
│   Query Parser  │
│ - 提取意图       │
│ - 识别实体       │
│ - 解析过滤条件   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Query Embed    │────▶│  Keyword Parse  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ Vector Search   │     │ Keyword Search  │
│ (Top-K * 3)     │     │ (Top-K * 3)     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
          ┌──────────────────┐
          │  Result Fusion   │
          │  (RRF 算法)      │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │    Reranker      │
          │ (Cross-Encoder)  │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Context Matcher  │
          │ - 选择 Top-K     │
          │ - 压缩超出的     │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │  Update Stats    │
          │ - 增加访问计数   │
          │ - 更新最后访问   │
          └────────┬─────────┘
                   │
                   ▼
           Final Results
```

### 5.4 关键接口定义

```python
from typing import List, Optional, Dict, Any, Callable
from dataclasses import dataclass

@dataclass
class MemorySystemConfig:
    """
    记忆系统配置
    """
    # 存储配置
    vector_store: VectorStoreConfig
    graph_store: GraphStoreConfig
    sql_store: SQLStoreConfig
    
    # 索引配置
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    
    # 遗忘配置
    forgetting_decay_rate: float = 0.01
    max_memories: int = 100000
    
    # 合并配置
    consolidation_interval_hours: int = 24
    min_memories_for_consolidation: int = 100
    
    # 检索配置
    default_top_k: int = 10
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-12-v2"
    context_window_tokens: int = 80000
    reserve_tokens: int = 40000

class MemorySystemAPI:
    """
    记忆系统 API 接口
    提供给 Agent 调用的标准接口
    """
    
    def __init__(self, manager: MemoryManager):
        self.manager = manager
    
    async def remember(
        self,
        content: str,
        memory_type: str = "general",
        importance: float = 0.5,
        tags: List[str] = None,
        related_to: List[str] = None
    ) -> str:
        """
        存储记忆
        
        Args:
            content: 记忆内容
            memory_type: 记忆类型 (preference/fact/interaction/knowledge)
            importance: 重要性 0.0-1.0
            tags: 标签列表
            related_to: 关联的记忆 ID 列表
        
        Returns:
            记忆 ID
        """
        metadata = MemoryMetadataInput(
            memory_type=memory_type,
            importance=importance,
            tags=tags or [],
            related_memory_ids=related_to or []
        )
        
        memory = await self.manager.add_memory(content, metadata)
        return memory.id
    
    async def recall(
        self,
        query: str,
        memory_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        检索记忆
        
        Args:
            query: 查询文本
            memory_type: 可选，限定记忆类型
            tags: 可选，限定标签
            limit: 返回数量
        
        Returns:
            记忆列表，每项包含 id, content, metadata, relevance
        """
        filters = RetrievalFilters(
            memory_type=memory_type,
            tags=tags
        )
        
        memories = await self.manager.retrieve(
            query=query,
            filters=filters,
            top_k=limit
        )
        
        return [
            {
                "id": m.id,
                "content": m.content,
                "metadata": m.metadata.__dict__,
                "relevance": m.metadata.retrieval_score
            }
            for m in memories
        ]
    
    async def forget(
        self,
        memory_id: str,
        reason: str = None
    ) -> bool:
        """
        删除特定记忆
        
        Args:
            memory_id: 记忆 ID
            reason: 删除原因（可选，用于审计）
        
        Returns:
            是否成功删除
        """
        # 实现删除逻辑
        pass
    
    async def get_memory_stats(self) -> Dict[str, Any]:
        """
        获取记忆统计信息
        """
        return {
            "total_memories": await self.manager.get_total_count(),
            "by_type": await self.manager.get_count_by_type(),
            "by_importance": await self.manager.get_importance_distribution(),
            "storage_size_mb": await self.manager.get_storage_size(),
            "avg_importance": await self.manager.get_avg_importance()
        }
```

---

## 6. 代码示例

### 6.1 完整的记忆系统实现

```python
"""
Long-Term Memory System for LLM Agents
完整实现示例
"""

import asyncio
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import math
import hashlib

# ============================================================
# 核心数据类型
# ============================================================

class MemoryType(Enum):
    """记忆类型枚举"""
    PREFERENCE = "preference"      # 用户偏好
    FACT = "fact"                  # 事实信息
    INTERACTION = "interaction"    # 交互记录
    KNOWLEDGE = "knowledge"        # 知识
    SYSTEM = "system"             # 系统状态

@dataclass
class Memory:
    """记忆条目"""
    id: str
    content: str
    memory_type: MemoryType
    importance: float = 0.5
    created_at: datetime = field(default_factory=datetime.now)
    last_accessed: Optional[datetime] = None
    access_count: int = 0
    embedding: List[float] = field(default_factory=list)
    entity_ids: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    
    def access(self):
        """记录访问"""
        self.last_accessed = datetime.now()
        self.access_count += 1
    
    def calculate_strength(self, current_time: datetime, decay_rate: float = 0.01) -> float:
        """计算记忆强度（用于遗忘判断）"""
        if self.last_accessed is None:
            age = (current_time - self.created_at).days
        else:
            age = (current_time - self.last_accessed).days
        
        return math.exp(-decay_rate * age)

# ============================================================
# 存储接口定义
# ============================================================

class VectorStoreInterface:
    """向量存储接口"""
    
    async def add(self, memory: Memory) -> None:
        raise NotImplementedError
    
    async def search(
        self, 
        query_vector: List[float], 
        top_k: int,
        filters: Dict = None
    ) -> List[tuple[Memory, float]]:
        raise NotImplementedError
    
    async def delete(self, memory_id: str) -> None:
        raise NotImplementedError

class GraphStoreInterface:
    """图存储接口"""
    
    async def add_node(self, memory: Memory) -> None:
        raise NotImplementedError
    
    async def add_relation(
        self, 
        from_id: str, 
        to_id: str, 
        relation_type: str
    ) -> None:
        raise NotImplementedError
    
    async def traverse(
        self, 
        start_id: str, 
        max_hops: int = 2
    ) -> List[Memory]:
        raise NotImplementedError

# ============================================================
# 简化实现（用于演示）
# ============================================================

class SimpleVectorStore(VectorStoreInterface):
    """简化向量存储（内存实现）"""
    
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.memories: Dict[str, Memory] = {}
    
    async def add(self, memory: Memory) -> None:
        self.memories[memory.id] = memory
    
    async def search(
        self, 
        query_vector: List[float], 
        top_k: int,
        filters: Dict = None
    ) -> List[tuple[Memory, float]]:
        # 简化：使用随机分数模拟向量相似度
        results = []
        for memory in self.memories.values():
            if filters:
                if filters.get("memory_type") and memory.memory_type.value != filters["memory_type"]:
                    continue
                if filters.get("tags") and not any(t in memory.tags for t in filters["tags"]):
                    continue
            
            # 模拟余弦相似度
            score = hashlib.md5(
                f"{memory.id}{query_vector[0] if query_vector else 0}".encode()
            ).hexdigest()
            score = int(score, 16) % 100 / 100.0
            results.append((memory, score))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]
    
    async def delete(self, memory_id: str) -> None:
        self.memories.pop(memory_id, None)

class SimpleGraphStore(GraphStoreInterface):
    """简化图存储（内存实现）"""
    
    def __init__(self):
        self.nodes: Dict[str, Memory] = {}
        self.relations: Dict[str, List[tuple[str, str]]] = {}  # from_id -> [(to_id, relation_type)]
    
    async def add_node(self, memory: Memory) -> None:
        self.nodes[memory.id] = memory
    
    async def add_relation(
        self, 
        from_id: str, 
        to_id: str, 
        relation_type: str
    ) -> None:
        if from_id not in self.relations:
            self.relations[from_id] = []
        self.relations[from_id].append((to_id, relation_type))
    
    async def traverse(
        self, 
        start_id: str, 
        max_hops: int = 2
    ) -> List[Memory]:
        visited = set()
        queue = [(start_id, 0)]
        results = []
        
        while queue:
            current_id, depth = queue.pop(0)
            if current_id in visited or depth > max_hops:
                continue
            
            visited.add(current_id)
            if current_id in self.nodes:
                results.append(self.nodes[current_id])
            
            for (to_id, _) in self.relations.get(current_id, []):
                if to_id not in visited:
                    queue.append((to_id, depth + 1))
        
        return results

# ============================================================
# 记忆管理器
# ============================================================

class LongTermMemoryManager:
    """
    长期记忆管理器
    
    功能：
    1. 存储和检索记忆
    2. 自动遗忘低价值记忆
    3. 记忆合并和去重
    4. 重要性评估
    """
    
    def __init__(
        self,
        vector_store: VectorStoreInterface = None,
        graph_store: GraphStoreInterface = None,
        decay_rate: float = 0.01,
        forgetting_threshold: float = 0.1,
        max_memories: int = 10000
    ):
        self.vector_store = vector_store or SimpleVectorStore()
        self.graph_store = graph_store or SimpleGraphStore()
        self.decay_rate = decay_rate
        self.forgetting_threshold = forgetting_threshold
        self.max_memories = max_memories
        self._memory_count = 0
    
    async def add_memory(
        self,
        content: str,
        memory_type: MemoryType = MemoryType.INTERACTION,
        importance: float = 0.5,
        tags: List[str] = None,
        embedding: List[float] = None
    ) -> Memory:
        """
        添加新记忆
        """
        memory = Memory(
            id=f"mem_{datetime.now().strftime('%Y%m%d%H%M%S')}_{self._memory_count}",
            content=content,
            memory_type=memory_type,
            importance=importance,
            tags=tags or [],
            embedding=embedding or [0.0] * 384
        )
        
        await self.vector_store.add(memory)
        await self.graph_store.add_node(memory)
        
        self._memory_count += 1
        
        # 检查是否需要遗忘
        await self._check_forgetting()
        
        return memory
    
    async def retrieve(
        self,
        query: str,
        query_vector: List[float] = None,
        top_k: int = 10,
        memory_type: MemoryType = None,
        tags: List[str] = None
    ) -> List[Memory]:
        """
        检索相关记忆
        """
        filters = {}
        if memory_type:
            filters["memory_type"] = memory_type.value
        if tags:
            filters["tags"] = tags
        
        results = await self.vector_store.search(
            query_vector=query_vector or [0.0] * 384,
            top_k=top_k,
            filters=filters if filters else None
        )
        
        memories = [memory for memory, _ in results]
        
        # 更新访问统计
        for memory in memories:
            memory.access()
        
        return memories
    
    async def forget_unimportant(self, current_time: datetime = None) -> int:
        """
        遗忘不重要的记忆
        返回删除的记忆数量
        """
        current_time = current_time or datetime.now()
        deleted_count = 0
        
        # 获取所有记忆进行评估
        all_memories = await self.vector_store.search(
            query_vector=[0.0] * 384,
            top_k=10000
        )
        
        for memory, _ in all_memories:
            strength = memory.calculate_strength(current_time, self.decay_rate)
            
            # 综合考虑强度和重要性
            should_forget = (
                strength < self.forgetting_threshold and
                memory.access_count < 5 and
                memory.importance < 0.3
            )
            
            if should_forget:
                await self.vector_store.delete(memory.id)
                deleted_count += 1
        
        return deleted_count
    
    async def _check_forgetting(self) -> None:
        """检查是否需要触发遗忘"""
        if self._memory_count > self.max_memories:
            await self.forget_unimportant()
    
    async def get_stats(self) -> Dict[str, Any]:
        """获取记忆统计"""
        all_memories = await self.vector_store.search(
            query_vector=[0.0] * 384,
            top_k=10000
        )
        
        memories = [m for m, _ in all_memories]
        
        type_counts = {}
        for memory in memories:
            type_counts[memory.memory_type.value] = \
                type_counts.get(memory.memory_type.value, 0) + 1
        
        return {
            "total_memories": len(memories),
            "by_type": type_counts,
            "decay_rate": self.decay_rate,
            "forgetting_threshold": self.forgetting_threshold
        }

# ============================================================
# 使用示例
# ============================================================

async def main():
    """使用示例"""
    
    # 初始化记忆管理器
    memory_manager = LongTermMemoryManager(
        decay_rate=0.02,
        forgetting_threshold=0.15,
        max_memories=1000
    )
    
    # 1. 添加各种类型的记忆
    print("=== 添加记忆 ===")
    
    await memory_manager.add_memory(
        content="用户喜欢简洁的界面设计，偏爱深色主题",
        memory_type=MemoryType.PREFERENCE,
        importance=0.8,
        tags=["UI", "design", "dark_mode"]
    )
    
    await memory_manager.add_memory(
        content="用户的工作邮箱是 john@company.com",
        memory_type=MemoryType.FACT,
        importance=0.9,
        tags=["contact", "work"]
    )
    
    await memory_manager.add_memory(
        content="用户询问过如何优化 Python 代码性能",
        memory_type=MemoryType.INTERACTION,
        importance=0.6,
        tags=["python", "optimization"]
    )
    
    await memory_manager.add_memory(
        content="Python 的 GIL 导致多线程无法真正并行",
        memory_type=MemoryType.KNOWLEDGE,
        importance=0.7,
        tags=["python", "GIL", "concurrency"]
    )
    
    # 2. 检索记忆
    print("\n=== 检索记忆 ===")
    
    results = await memory_manager.retrieve(
        query="用户界面设计偏好",
        top_k=5
    )
    
    for memory in results:
        print(f"[{memory.memory_type.value}] {memory.content[:50]}... (importance: {memory.importance})")
    
    # 3. 获取统计
    print("\n=== 记忆统计 ===")
    stats = await memory_manager.get_stats()
    print(json.dumps(stats, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 7. 参考文献

### 7.1 核心论文

1. **MemGPT: Towards LLMs as Operating Systems**
   > Packer, C., et al. (2024). MemGPT: Towards LLMs as Operating Systems. *arXiv:2312.14852*.
   > - GitHub: [MemGPT](https://github.com/MemGPT)
   > - 核心思想：引入操作系统的虚拟内存机制，让 LLM 管理"上下文窗口"内外的数据交换

2. **HippoRAG: Hippocampal Memory Retrieval for LLM Agents**
   > Hina et al. (2024). HippoRAG: Hippocampal Memory Retrieval for LLM Agents.
   > - 核心思想：模拟人类海马体的记忆索引机制，实现更符合认知科学的记忆检索

3. **ExMem: Extending Context Window with External Memory**
   > Liu et al. (2024). ExMem: Extending Context Window with External Memory.
   > - 核心思想：通过外部记忆扩展 LLM 的有效上下文窗口

4. **RAG vs. Mem: When to Use Each**
   > Gradient Notes (2024). RAG vs. Mem: When to Use Each.
   > - 实践指导：对比 RAG 和记忆系统的适用场景

### 7.2 相关开源项目

1. **MemFree** (GitHub Open Source)
   > - URL: https://github.com/MemFree
   > - 特点：开源的 Agent 记忆框架，支持多种存储后端
   > - 功能：提供完整的记忆 CRUD API，支持向量检索和图检索

2. **LangChain Memory**
   > - GitHub: https://github.com/langchain-ai/langchain
   > - 文档: https://python.langchain.com/docs/modules/memory/
   > - 特点：与 LangChain Agent 无缝集成

3. **AutoGen Memory**
   > - Microsoft AutoGen 项目的一部分
   > - 提供多 Agent 系统的共享记忆能力

### 7.3 技术文档

1. **Vector Databases for LLM Applications**
   > Weaviate Blog. Comprehensive guide on vector databases.
   > - https://weaviate.io/blog/vector-database-for-llm

2. **Knowledge Graphs for RAG**
   > Neo4j Documentation.
   > - https://neo4j.com/docs/llm-fundamentals/

3. **Memory Management in AI Agents**
   > Anyscale Blog. Technical deep-dive into memory patterns.
   > - https://www.anyscale.com/blog

### 7.4 延伸阅读

| 主题 | 资源 | 类型 |
|------|------|------|
| Agent 架构 |《Building Effective Agents》by Anthropic | 技术博客 |
| 记忆系统评估 |《Evaluating LLM Memory Systems》| 学术论文 |
| 认知架构 |《Cognitive Architectures for AI Agents》| 综述论文 |
| 实践指南 | LangChain Memory 模块文档 | 官方文档 |
| 前沿研究 | MemGPT, HippoRAG 论文 | 学术论文 |

---

## 附录 A：术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| 记忆合并 | Memory Consolidation | 将多条相关记忆整合为统一表示的过程 |
| 遗忘机制 | Forgetting Mechanism | 选择性删除不重要/过时记忆的策略 |
| 重排序 | Reranking | 对初步检索结果进行精细排序的过程 |
| 混合检索 | Hybrid Search | 融合多种检索方式（向量+关键词+图）的技术 |
| 上下文窗口匹配 | Context Window Matching | 在有限窗口内选择最相关记忆的策略 |
| 重要性评分 | Importance Scoring | 评估记忆重要程度的机制 |
| 记忆强度 | Memory Strength | 表示记忆活跃程度的指标，随时间和访问动态变化 |
| 实体链接 | Entity Linking | 将文本中的实体提及关联到知识库中对应实体的技术 |

---

## 附录 B：配置参考

```python
# 推荐配置模板

MEMORY_SYSTEM_CONFIG = {
    # 存储配置
    "vector_store": {
        "type": "qdrant",  # qdrant / milvus / pinecone / weaviate
        "dimension": 1536,  # OpenAI embedding 维度
        "hnsw": {
            "m": 16,         # HNSW 参数
            "ef_construction": 200
        }
    },
    
    "graph_store": {
        "type": "nebula",  # nebula / neo4j / tugraph
    },
    
    # 遗忘配置
    "forgetting": {
        "decay_rate": 0.01,      # 每日衰减率
        "threshold": 0.1,        # 遗忘阈值
        "min_access_count": 3,   # 最低访问次数
        "max_memories": 50000    # 最大记忆数量
    },
    
    # 检索配置
    "retrieval": {
        "default_top_k": 10,
        "reranker": "cross-encoder/ms-marco-MiniLM-L-12-v2",
        "fusion_method": "rrf",  # rrf / score
        "rrf_k": 60
    },
    
    # 合并配置
    "consolidation": {
        "interval_hours": 24,
        "min_memories": 100,
        "use_llm": True  # 是否使用 LLM 生成摘要
    }
}
```

---

*本文档为 LLM Agent 架构调研系列 Q6，聚焦长期记忆系统设计。相关问题包括 Q1（ReAct vs Planning）、Q2（工具使用）、Q3（自我反思）等，可结合阅读形成完整认知。*
