---
id: llm-deep-dives-2026
title: LLM 技术深度系列 — 2026年3月
date: 2026-03-30
category: llm-research
---

# LLM 技术深度系列

本系列包含 4 个深度技术文档，覆盖当代 LLM 核心技术栈。

---

## 系列总览

| # | 主题 | 路径 | 核心内容 |
|---|------|------|----------|
| 1 | **分布式 LLM 训练** | `research/papers/distributed-llm-training/` | 张量并行/流水线并行/数据并行/Megatron/DeepSpeed |
| 2 | **MoE 架构** | `research/papers/moe-architecture/` | DeepSeek-MoE/Mixtral/专家专用化/负载均衡 |
| 3 | **Long Context LLM** | `research/papers/long-context-llm/` | RoPE/YaRN/LongRoPE/位置插值 |
| 4 | **RAG + LLM 架构** | `research/papers/rag-llm-architecture/` | 混合检索/12组件/96.8%准确率 |

---

## 1. 分布式 LLM 训练

**路径**: `research/papers/distributed-llm-training/notes.md`

### 核心内容

- **张量并行**: Column Parallel / Row Parallel / All-to-All 通信
- **流水线并行**: 1F1B 调度 / 微批次 / GPipe / PipeDream
- **数据并行**: 朴素 DP / ZeRO-1/2/3 / FSDP
- **Megatron-LM**: MLP 并行 / Attention 并行 / 融合 Cross-Entropy
- **DeepSpeed**: ZeRO++ / 3D 并行混合
- **部署实践**: 单节点 / 多节点配置示例

### 关键公式

MLP 块并行：
$$Y = \text{GeLU}(XA), \quad O = YB$$
$$\text{Column Parallel: } A = [A_1, A_2], \quad Y_i = \text{GeLU}(X \cdot A_i)$$

### 参考资料

- Megatron-LM (arXiv:1909.08053)
- NVIDIA Megatron-Core 文档
- DeepSpeed ZeRO++

---

## 2. MoE 架构

**路径**: `research/papers/moe-architecture/notes.md`

### 核心内容

- **稀疏激活**: Top-K 路由 / Expert 容量
- **DeepSeek-MoE**: 细粒度专家分解 / 专家专用化
- **Mixtral 8×7B**: 8专家 / top-2 激活 / GQA
- **负载均衡**: 辅助损失函数 / 明星专家问题
- **训练挑战**: All-to-All 通信 / 训练稳定性 / 显存优化

### 关键公式

门控选择：
$$y = \sum_{i=1}^{N} G(x)_i \cdot E_i(x)$$

负载均衡损失：
$$L_{balance} = \alpha \cdot \sum_{i} f_i \cdot p_i$$

### 参考资料

- DeepSeekMoE (arXiv:2401.06066)
- Mixtral of Experts (Mistral AI, 2023)
- DeepSeek-V3 Technical Report

---

## 3. Long Context LLM

**路径**: `research/papers/long-context-llm/notes.md`

### 核心内容

- **RoPE**: 旋转位置编码 / 相对位置天然支持
- **位置插值 (PI)**: 压缩位置空间
- **YaRN**: 温度缩放 / 选择性插值
- **LongRoPE**: 2M+ token / 非均匀插值 / 渐进扩展
- **其他技术**: ALiBi / Ring Attention / 稀疏注意力

### 关键公式

RoPE 内积性质：
$$q_m^T k_n = q^T R_{m-n} k \quad \Rightarrow \text{只依赖相对位置}$$

位置插值：
$$\text{NewPE}(pos) = \text{OriginalPE}\left(\frac{pos \times L}{L'}\right)$$

### 参考资料

- RoPE (arXiv:2104.09864)
- Position Interpolation (arXiv:2306.15595)
- YaRN (arXiv:2309.00071)
- LongRoPE (arXiv:2402.13753)

---

## 4. RAG + LLM 工业级架构

**路径**: `research/papers/rag-llm-architecture/notes.md`

### 核心内容

- **12 组件全貌**: 数据摄入 → 查询处理 → 生成 → 反馈
- **混合检索**: 向量 + BM25 / Reciprocal Rank Fusion
- **智能分块**: 语义分块 / 层次分块 / 重叠策略
- **Reranker**: Bi-Encoder / Cross-Encoder / 两阶段检索
- **Query 改写**: HyDE / 同义词扩展 / 意图识别
- **评估指标**: Recall@K / MRR / NDCG / Faithfulness

### 业务场景：法律文档 RAG

**问题**: "根据《个人信息保护法》第二十条..."

**为什么混合检索必要**:
1. 条文编号精确匹配 → BM25
2. 法律术语同义词 → 向量
3. 跨境传输语义复杂 → 混合

### 参考资料

- HyDE (2022)
- BGE-M3 (2024)
- "RAG Architecture in Production: 96.8% Accuracy" (Nic Chin, 2026)

---

## 文档关联

```
分布式 LLM 训练 ──→ MoE 架构
      │                    │
      ↓                    ↓
   模型训练 ──────────→ 模型部署
                              │
                              ↓
                         Long Context
                              │
                              ↓
                         RAG + LLM
```

---

*创建日期: 2026-03-30*
