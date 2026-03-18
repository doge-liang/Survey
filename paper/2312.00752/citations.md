# Citation Analysis: Mamba: Linear-Time Sequence Modeling with Selective State Spaces

> Paper ID: arXiv:2312.00752
> DOI: 10.48550/arXiv.2312.00752
> Semantic Scholar ID: unavailable during retrieval (API rate-limited)
> Citation Count: 6,050+ (search-backed snapshot, 2026-03-13)

## Citation Overview

这篇论文在发布后极短时间内成为 sequence modeling / efficient long-context modeling 方向的核心引用之一。以 2023 年底 arXiv 首发、2024 年 COLM 发表的时间线来看，2026 年已达到 6,000+ 引用，说明它不仅是一个单点改进，而是开启了大量后续 Mamba 变体、混合架构与 SSM 综述工作的起点。

### Citation Velocity

- 2023: arXiv 发布，当年开始快速扩散
- 2024: 随 COLM 发表与开源实现传播，进入主流 LLM / efficient architecture 讨论
- 2025: 出现大量 Mamba family、MoE-Mamba、multimodal Mamba、ND Mamba 等扩展工作
- 2026: Semantic Scholar 搜索摘要显示累计引用数已超过 6,050

**Citation Trend**: 高速增长，且仍处于上升阶段

## Influential Forward Citations

由于 Semantic Scholar Graph API 在本次抓取时返回 HTTP 429，以下前向引用基于搜索结果聚合，适合作为高影响后续工作的阅读入口。

### High-visibility follow-up papers

1. **MambaMixer: Efficient Selective State Space Models with Dual Token and Channel Selection** (2025)
   - 搜索摘要显示约 48 citations
   - 代表选择机制向 token / channel 双维扩展

2. **MesaNet: Sequence Modeling by Locally Optimal Test-Time Training** (2025)
   - 搜索摘要显示约 22 citations
   - 说明 Mamba 已影响更广义的 sequence modeling 设计空间

3. **MoE-Mamba: Efficient Selective State Space Models with Mixture of Experts** (2024)
   - 将 Mamba 与 MoE 结合，探索可扩展性与参数效率

4. **BlackMamba: Mixture of Experts for State-Space Models** (2024)
   - 代表 Mamba 与 expert routing 融合的另一条路线

5. **DenseMamba: State Space Models with Dense Hidden Connection for Efficient Large Language Models** (2024)
   - 聚焦将 Mamba 改造为更强的大语言模型骨干

6. **Mamba-ND: Selective State Space Modeling for Multi-Dimensional Data** (2024)
   - 将 Mamba 从 1D 序列推广到多维结构数据

7. **Mamba-Shedder: Post-Transformer Compression for Efficient Selective Structured State Space Models** (2025)
   - 展示 Mamba 已进入模型压缩与高效部署讨论

8. **Griffin: Mixing Gated Linear Recurrences with Local Attention for Efficient Language Models** (2024)
   - 虽非纯 Mamba 变体，但属于同一类“attention alternatives / hybrids”重要后续工作

9. **Repeat After Me: Transformers are Better than State Space Models at Copying** (2024)
   - 属于对 Mamba/SSM 能力边界的批判性研究

10. **State Space Models as Foundation Models: A Control Theoretic Overview** (2025)
    - 说明 Mamba 已推动整个 SSM 方向进入系统化总结阶段

## Backward References (Key Prior Work)

论文全文共包含 **116** 条参考文献。以下是最重要的基础工作：

### Structured SSM lineage

1. **Efficiently Modeling Long Sequences with Structured State Spaces** (Gu, Goel, Re, 2022)
   - S4 的核心论文
   - 是 Mamba 最直接的理论和建模前身

2. **Combining Recurrent, Convolutional, and Continuous-time Models with the Linear State Space Layer** (Gu et al., 2021)
   - 定义 state space layer 的统一框架
   - 帮助理解 recurrence 与 convolution 双视角

3. **HIPPO: Recurrent Memory with Optimal Polynomial Projections** (Gu et al., 2020)
   - 提供长期记忆压缩与初始化的理论来源

4. **On the Parameterization and Initialization of Diagonal State Space Models** (Gu et al., 2022)
   - 对角 SSM 参数化，对 Mamba 实用实现很关键

5. **Simplified State Space Layers for Sequence Modeling** (Smith, Warrington, Linderman, 2023)
   - S5 是 Mamba 之前最接近的 SSM 变体之一

### Architecture and comparison baselines

6. **Hungry Hungry Hippos: Towards Language Modeling with State Space Models** (Dao et al., 2023)
   - Mamba 架构层面的直接前身之一

7. **Hyena Hierarchy: Towards Larger Convolutional Language Models** (Poli et al., 2023)
   - 长序列建模的重要非注意力基线

8. **Attention Is All You Need** (Vaswani et al., 2017)
   - Mamba 要匹配或超越的核心对照架构

9. **Neural Machine Translation by Jointly Learning to Align and Translate** (Bahdanau et al., 2015)
   - 内容感知路由的经典 attention 起点

10. **Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention** (Katharopoulos et al., 2020)
    - 连接 attention、recurrence 与线性时间建模的重要桥梁工作

## Citation Context Analysis

### 常见被引动机

1. **Architecture proposal**
   - 把 Mamba 作为新的 backbone 候选，替代或补充 Transformer

2. **Efficiency reference**
   - 作为线性时间、长上下文、无 KV cache 推理的代表模型引用

3. **SSM family lineage**
   - 在 S4/S5/Hyena/RetNet/RWKV 等工作脉络中，作为 selective SSM 的代表节点

4. **Ablation / critique baseline**
   - 一些工作用它来讨论 SSM 的能力上限，尤其是复制、检索、in-context learning 等能力边界

## Related Papers

### High Priority

1. **[ACCESSIBLE] Efficiently Modeling Long Sequences with Structured State Spaces (S4)**
   - 为什么相关: Mamba 的直接理论起点
   - 类型: foundational prior work

2. **[ACCESSIBLE] Simplified State Space Layers for Sequence Modeling (S5)**
   - 为什么相关: selective SSM 之前的重要 SSM 简化路线
   - 类型: foundational prior work

3. **[ACCESSIBLE] Hungry Hungry Hippos: Towards Language Modeling with State Space Models**
   - 为什么相关: Mamba block 设计的重要前身
   - 类型: architecture predecessor

4. **[ACCESSIBLE] Mamba-2: Transformers are SSMs / state space duality line**
   - 为什么相关: 最重要的后续迭代，扩展 Mamba 的算法与架构
   - 类型: direct successor

5. **[ACCESSIBLE] Griffin: Mixing Gated Linear Recurrences with Local Attention for Efficient Language Models**
   - 为什么相关: attention-free / hybrid backbone 的关键对照工作
   - 类型: efficient LM alternative

### Medium Priority

1. **[ACCESSIBLE] MoE-Mamba: Efficient Selective State Space Models with Mixture of Experts**
   - 为什么相关: 研究 Mamba 的可扩展性与稀疏专家结合

2. **[ACCESSIBLE] BlackMamba: Mixture of Experts for State-Space Models**
   - 为什么相关: 另一条 MoE + Mamba 路线

3. **[ACCESSIBLE] Mamba-ND: Selective State Space Modeling for Multi-Dimensional Data**
   - 为什么相关: 将 Mamba 推广到多维数据结构

4. **[ACCESSIBLE] Repeat After Me: Transformers are Better than State Space Models at Copying** (2024)
   - 为什么相关: 批判性地分析 Mamba/SSM 的能力边界

5. **[ACCESSIBLE] From S4 to Mamba: A Comprehensive Survey on Structured State Space Models**
   - 为什么相关: 系统梳理整个 SSM 演进路线

## Summary

**Field Impact**: 高

**Why it matters**:

1. 它把 SSM 从“长序列高效但语言不够强”推进到“可能替代 Transformer backbone”的级别
2. 它催生了一个完整的 Mamba / selective SSM 研究分支
3. 它同时影响了理论、架构、系统实现和长上下文应用四个层面

---
*Analysis Date: 2026-03-13*
*Data Source: arXiv API, arXiv full text, OpenReview, Google Search fallback*
