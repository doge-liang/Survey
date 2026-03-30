---
id: rag-llm-architecture
title: RAG + LLM 工业级架构 — 混合检索/12组件/96.8%准确率
category: llm-application
date: 2026-03-30
tags:
  - rag
  - retrieval-augmented-generation
  - hybrid-search
  - vector-search
  - bm25
  - reranking
  - production-rag
---

# RAG + LLM 工业级架构深度剖析

> **适合人群**: AI 工程师、后端架构师 — 构建生产级 RAG 系统
> **更新日期**: 2026-03-30

---

## 1. 概述

RAG（Retrieval-Augmented Generation，检索增强生成）通过结合外部知识库与 LLM 生成能力，解决大模型幻觉、知识过时、无法引用权威来源等问题。

**核心问题**: 
- 纯向量检索在生产环境中**不够用**
- 需要多组件协同才能达到 96%+ 准确率
- 12 个关键组件需要精心设计

---

## 2. RAG 核心架构

### 2.1 12 组件全貌

```
┌─────────────────────────────────────────────────────────────┐
│                      RAG Pipeline                             │
├─────────────────────────────────────────────────────────────┤
│  数据摄入 (Ingestion)                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  数据源   │→ │ Chunking │→ │ Embedding│→ │  向量库   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  查询处理 (Query)                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │  Query   │→ │ Rewrite │→ │  Hybrid  │                 │
│  │  Parse   │  │ /Expand │  │  Search  │                 │
│  └──────────┘  └──────────┘  └──────────┘                │
│                                        │                    │
│                                     ┌───▼────┐              │
│                                     │ Rerank │              │
│                                     └───┬────┘              │
│                                         │                    │
│  生成 (Generation)                     ↓                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐            │
│  │  Prompt  │← │  Context │← │  Synthesize  │            │
│  │ Template │  │ Building │  │   (Grounded) │            │
│  └──────────┘  └──────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 各组件职责

| # | 组件 | 职责 | 关键挑战 |
|---|------|------|----------|
| 1 | 数据源连接器 | 接入 PDF/HTML/SQL/API | 格式解析 |
| 2 | 智能分块 | 将文档切分为语义完整块 | 块大小/重叠 |
| 3 | Embedding 服务 | 生成向量表示 | 模型选择/维度 |
| 4 | 向量数据库 | 存储 + 相似度检索 | 索引优化 |
| 5 | Query 解析 | 理解用户意图 | 意图识别 |
| 6 | Query 改写 | 扩展/优化查询 | 同义词/否定 |
| 7 | 混合检索 | 稀疏 + 稠密检索融合 | 权重分配 |
| 8 | Reranker | 精排候选结果 | Cross-Encoder |
| 9 | Prompt 模板 | 组装上下文与指令 | 格式/长度 |
| 10 | LLM 生成 | 基于上下文的生成 | 幻觉控制 |
| 11 | 引用提取 | 追踪答案来源 | 精确溯源 |
| 12 | 反馈回路 | 评估 + 优化 | 持续改进 |

---

## 3. 混合检索（Hybrid Search）

### 3.1 为什么纯向量检索不够用

| 场景 | 向量检索问题 | 解决方案 |
|------|-------------|----------|
| 精确实体查询 | "Article 15 of GDPR" | 关键词精确匹配 |
| 专有名词 | 医疗/法律术语向量化质量差 | BM25 精确匹配 |
| 罕见词汇 | 训练数据稀疏，embedding 质量低 | 稀疏检索补充 |
| 用户明确意图 | 语义相似但词形不同 | 关键词召回 |
| 跨语言 | 中英混杂查询 | 混合检索 |

### 3.2 混合检索架构

```python
class HybridRetriever:
    def __init__(self, vector_store, sparse_weight=0.3, dense_weight=0.7):
        self.vector_store = vector_store
        self.sparse_weight = sparse_weight
        self.dense_weight = dense_weight
    
    def retrieve(self, query, top_k=20):
        # 1. 稠密向量检索 (Semantic)
        dense_results = self.vector_store.search(
            embedding_model.encode(query), 
            k=top_k * 2
        )
        
        # 2. 稀疏检索 (Keyword - BM25)
        sparse_results = self.bm25_index.search(query, k=top_k * 2)
        
        # 3. Reciprocal Rank Fusion (RRF)
        fused_scores = self._rrf_fusion(
            dense_results, 
            sparse_results,
            k=60  # RRF 超参数
        )
        
        return sorted(fused_scores, key=lambda x: x['score'], reverse=True)[:top_k]
    
    def _rrf_fusion(self, dense_results, sparse_results, k=60):
        """Reciprocal Rank Fusion"""
        doc_scores = {}
        
        for rank, doc in enumerate(dense_results):
            score = 1 / (k + rank + 1) * self.dense_weight
            doc_scores[doc['id']] = doc_scores.get(doc['id'], 0) + score
        
        for rank, doc in enumerate(sparse_results):
            score = 1 / (k + rank + 1) * self.sparse_weight
            doc_scores[doc['id']] = doc_scores.get(doc['id'], 0) + score
        
        return [
            {'id': doc_id, 'score': score} 
            for doc_id, score in doc_scores.items()
        ]
```

### 3.3 Reciprocal Rank Fusion (RRF)

$$RRF\_Score(d) = \sum_{i=1}^{N} \frac{1}{k + rank_i(d)}$$

其中 $rank_i(d)$ 是文档 $d$ 在第 $i$ 个检索结果列表中的排名，$k$ 是平滑因子（通常 60）。

### 3.4 业务场景：法律文档检索

**场景**: 用户查询 "根据《个人信息保护法》第二十条，数据的跨境传输有什么要求？"

**问题分析**:
1. 法律条文编号精确匹配 → 需要 BM25
2. "个人信息保护法" = "个保法" 同义词 → 需要向量语义
3. "跨境传输" 语义复杂 → 需要混合检索

**为什么纯向量不够**:
- 法律术语 embedding 可能不准确（专有名词）
- 用户精确引用条文编号 → 关键词优先
- 法律解释需严谨 → 召回+精排缺一不可

---

## 4. 智能分块（Chunking）

### 4.1 分块策略对比

| 策略 | 块大小 | 重叠 | 适用场景 |
|------|--------|------|----------|
| 固定分块 | 512 tokens | 0-20% | 通用 |
| 句子分块 | 按句子边界 | 0 | 短问答 |
| 语义分块 | 按语义段落 | 10-20% | 长文档 |
| 层次分块 | 128→512→2048 | 自定义 | 多粒度检索 |

### 4.2 代码实现

```python
class SemanticChunker:
    def __init__(self, embed_model, threshold=0.7):
        self.embed_model = embed_model
        self.threshold = threshold
    
    def chunk(self, document, min_chunk_size=100, max_chunk_size=512):
        sentences = self._split_sentences(document)
        chunks = []
        current_chunk = []
        current_size = 0
        
        for sent in sentences:
            sent_size = len(sent.split())
            
            if current_size + sent_size > max_chunk_size:
                # 保存当前 chunk
                if current_chunk:
                    chunks.append(' '.join(current_chunk))
                
                # 语义判断：是否与下一句语义相近？
                if sentences.index(sent) < len(sentences) - 1:
                    similarity = self._semantic_similarity(
                        current_chunk[-3:] if current_chunk else [],
                        [sent, sentences[sentences.index(sent)+1]]
                    )
                    
                    if similarity > self.threshold and current_size < min_chunk_size:
                        current_chunk.append(sent)
                        current_size += sent_size
                        continue
                
                current_chunk = [sent]
                current_size = sent_size
            else:
                current_chunk.append(sent)
                current_size += sent_size
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks
    
    def _semantic_similarity(self, sentences_a, sentences_b):
        emb_a = self.embed_model.encode(' '.join(sentences_a))
        emb_b = self.embed_model.encode(' '.join(sentences_b))
        return float(np.dot(emb_a, emb_b) / (np.linalg.norm(emb_a) * np.linalg.norm(emb_b)))
```

---

## 5. Reranker（精排）

### 5.1 两阶段检索

```
召回阶段 (Recall):      1000 candidates → 100 (快速，ANN)
精排阶段 (Rerank):     100 candidates → 10 (精确，Cross-Encoder)
```

### 5.2 Cross-Encoder vs Bi-Encoder

| 特性 | Bi-Encoder | Cross-Encoder |
|------|------------|---------------|
| 计算方式 | 独立编码，cosine | 联合编码，MLP |
| 速度 | 快 (~10ms) | 慢 (~100ms) |
| 精度 | 中等 | 高 |
| 适用 | 召回 | 精排 |

### 5.3 Reranker 实现

```python
from sentence_transformers import CrossEncoder

class Reranker:
    def __init__(self, model_name="cross-encoder/ms-marco-MiniLM-L-12-v2"):
        self.model = CrossEncoder(model_name)
    
    def rerank(self, query, documents, top_k=10):
        """
        documents: [{'id': 'doc1', 'text': '...'}, ...]
        """
        pairs = [(query, doc['text']) for doc in documents]
        scores = self.model.predict(pairs)
        
        # 按分数排序
        scored_docs = [
            {**doc, 'cross_score': float(score)} 
            for doc, score in zip(documents, scores)
        ]
        return sorted(scored_docs, key=lambda x: x['cross_score'], reverse=True)[:top_k]
```

---

## 6. Query 改写与扩展

### 6.1 Query Rewrite

```python
class QueryRewriter:
    def __init__(self, llm):
        self.llm = llm
    
    def rewrite(self, query):
        prompt = f"""Rewrite the following user query to be more effective for retrieval.
        
Original: {query}

Rewrite to:
1. Expand abbreviations
2. Add synonyms
3. Clarify implicit parts
4. Remove ambiguity

Output JSON: {{"rewritten": "...", "expansion_terms": ["...", "..."]}}"""
        
        response = self.llm.generate(prompt)
        return json.loads(response)
```

### 6.2 HyDE（Hypothetical Document Embeddings）

```python
class HyDERetriever:
    def generate_hypothetical_doc(self, query):
        """让 LLM 生成一个假设性答案"""
        prompt = f"""Generate a hypothetical passage that would answer this query.
Query: {query}
Hypothetical Passage:"""
        
        hypothetical_doc = self.llm.generate(prompt)
        return hypothetical_doc
    
    def retrieve(self, query):
        # 生成假设性答案
        hypo_doc = self.generate_hypothetical_doc(query)
        
        # 用假设性答案检索（可能比原始 query 更好匹配）
        return self.vector_store.search(
            self.embedder.encode(hypo_doc),
            k=10
        )
```

---

## 7. Prompt 组装与生成

### 7.1 RAG Prompt 模板

```python
RAG_TEMPLATE = """<|begin_of_text|><|system|>
You are a helpful AI assistant. Use the following context to answer the user's question.
If the context does not contain the answer, say "I don't know based on the provided context."
Do not make up information not in the context.

Context:
{context}

---</s><|user|>
Question: {question}

Answer: """

def build_prompt(question, retrieved_docs):
    context = "\n\n".join([
        f"[Source {i+1}] {doc['text']}"
        for i, doc in enumerate(retrieved_docs)
    ])
    
    return RAG_TEMPLATE.format(question=question, context=context)
```

### 7.2 上下文窗口管理

| 策略 | 实现 | 优缺点 |
|------|------|--------|
| 截断 | 简单截取前 N tokens | 丢失尾部信息 |
| 密度检索 | 高密度块优先 | 可能丢失全局性 |
| 元数据过滤 | 按标题/日期过滤 | 需要元数据 |
| 重排序 + 截断 | 按相关性重排，取 top-K | 平衡质量与长度 |

---

## 8. 引用追踪（Citation）

```python
class CitationTracker:
    def extract_citations(self, response, retrieved_docs):
        """将生成内容中的陈述与源文档关联"""
        citations = []
        
        for doc in retrieved_docs:
            # 检查文档是否被引用
            if self._is_referenced(response, doc['text'], threshold=0.7):
                citations.append({
                    'source_id': doc['id'],
                    'source_name': doc.get('title', doc['id']),
                    'relevance': doc.get('cross_score', doc.get('score', 0)),
                    'excerpt': self._extract_excerpt(doc['text'], response)
                })
        
        return citations
    
    def _is_referenced(self, response, source_text, threshold=0.7):
        """简单启发式：检查关键句是否出现在响应中"""
        source_sents = source_text.split('.')[:3]  # 前3句
        for sent in source_sents:
            if sent.strip()[:50] in response:
                return True
        return False
```

---

## 9. 评估指标

| 指标 | 定义 | 目标值 |
|------|------|--------|
| 召回率 (Recall@K) | 相关文档出现在 top-K 的比例 | >90% |
| MRR | 首个相关文档的倒数排名 | >0.8 |
| NDCG@K | 归一化折损累积收益 | >0.85 |
| 准确率 (Faithfulness) | 答案基于上下文的比例 | >95% |
| 引用准确率 | 引用的文档确实相关的比例 | >90% |

---

## 10. 生产级架构示例

```python
class ProductionRAG:
    def __init__(self):
        self.connector = DataConnector()           # 多数据源
        self.chunker = SemanticChunker()          # 智能分块
        self.embedder = EmbeddingService()         # Embedding
        self.vector_store = VectorStore()          # 向量数据库
        self.bm25_index = BM25Index()             # BM25
        self.rewriter = QueryRewriter(llm)         # Query 改写
        self.reranker = Reranker()                # 精排
        self.generator = RAGPromptBuilder()       # Prompt 构建
        self.llm = LLM()                          # 生成
    
    def query(self, user_query):
        # 1. Query 改写
        rewritten = self.rewriter.rewrite(user_query)
        
        # 2. 混合检索
        results = self.vector_store.hybrid_search(
            rewritten['rewritten'],
            sparse_weight=0.3,
            dense_weight=0.7
        )
        
        # 3. Rerank
        reranked = self.reranker.rerank(user_query, results, top_k=5)
        
        # 4. 上下文组装
        context = self._build_context(reranked)
        
        # 5. 生成
        response = self.llm.generate(
            self.generator.build_prompt(user_query, context)
        )
        
        # 6. 引用提取
        citations = self.citation_tracker.extract_citations(response, reranked)
        
        return {
            'answer': response,
            'citations': citations,
            'retrieved_docs': reranked
        }
```

---

## 11. 参考资料

### 核心论文

1. **HyDE: Hypothetical Document Embeddings** (2022)
   - 用假设答案引导检索

2. **ColBERT: Late Interaction Multi-Vector Retrieval** (SIGIR 2020)
   - 细粒度跨编码器交互

3. **BGE-M3: Multi-Embedding, Multi-Frequency, Multi-Granularity** (2024)
   - 稠密 + 稀疏 + 多语言统一

### 工业实践

1. **"RAG Architecture in Production: 12-Component System at 96.8% Accuracy"** (Nic Chin, 2026)
2. **"Building Production RAG Systems: Complete Guide for AI Engineers"** (zenvanriel.com, 2026)
3. **"RAG Architecture Patterns That Scale"** (zenvanriel.com, 2026)

### 工具生态

| 组件 | 推荐工具 |
|------|----------|
| Embedding | BGE-M3, Jina-v3, OpenAI-Embedding |
| 向量数据库 | Milvus, Qdrant, Weaviate, Pinecone |
| Reranker | BGE-Reranker, Cohere Rerank |
| LLM | GPT-4o, Claude 3.5, LLaMA-3.1 |

---

*文档创建日期: 2026-03-30*
