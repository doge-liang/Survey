---
id:
title: Attention Residuals
source_type: arxiv
upstream_url:
generated_by:
created_at:
updated_at:
authors: [Kimi Team, Guangyu Chen, Yu Zhang, Jianlin Su, Weixin Xu, Siyuan Pan, Yaoyu Wang, Yucheng Wang, Guanduo Chen, Bohong Yin, Yutian Chen, Junjie Yan, Ming Wei, Y. Zhang, Fanqing Meng, Chao Hong, Xiaotong Xie, Shaowei Liu, Enzhe Lu, Yunpeng Tai, Yanru Chen, Xin Men, Haiqing Guo, Y. Charles, Haoyu Lu, Lin Sui, Jinguo Zhu, Zaida Zhou, Weiran He, Weixiao Huang, Xinran Xu, Yuzhi Wang, Guokun Lai, Yulun Du, Yuxin Wu, Zhilin Yang, Xinyu Zhou]
year: 2026
---
# Attention Residuals

> **Quick Reference**
> - Authors: Kimi Team (36 authors, lead: Guangyu Chen, Zhilin Yang)
> - Year: 2026 (March 16)
> - arXiv: [2603.15031](https://arxiv.org/abs/2603.15031)
> - GitHub: [MoonshotAI/Attention-Residuals](https://github.com/MoonshotAI/Attention-Residuals)
> - DOI: 10.48550/arXiv.2603.15031
> - Subject: cs.CL (Computation and Language)

## Summary

Kimi 提出了一种全新的**注意力残差 (Attention Residuals, AttnRes)** 机制,重新设计了 Transformer 架构中深度方向的信息聚合方式。该方法用**可学习的注意力权重**替代传统的固定单位权重残差连接,让每一层能够动态选择从哪些早期层获取信息。AttnRes 在 1.25x 更少算力下达到基线同等性能,48B 模型在 GPQA-Diamond 上提升 7.5 分。

## Problem & Motivation

### 传统残差连接的问题

现代 LLM 都使用 **PreNorm** (Pre-Layer Normalization) + 残差连接:

```
h_l = h_{l-1} + f_{l-1}(h_{l-1})
```

这种"均匀加权"的累积方式存在两个核心问题:

1. **信息稀释 (Information Dilution)**: 随着层数加深,所有历史层的表示被简单叠加,每层的贡献被逐渐稀释
2. **隐藏状态无界增长 (Uncontrolled Hidden-State Growth)**: 深层网络的输出幅度无法控制,梯度分布不均匀

论文原文指出:"Unlike sequence mixing and expert routing, which now employ learnable input-dependent weighting, this depth-wise aggregation remains governed by fixed unit weights."

### 核心洞察

深度方向的聚合方式长期被忽视——注意力机制在序列方向(Sequence Mixing)已经有 input-dependent weighting,但深度方向(Depth-wise)仍然是固定的单位权重。

## Methodology

### Full AttnRes: 注意力替代残差

核心公式:

```
h_l = Σ_{i=0}^{l-1} α_{i→l} · v_i
```

其中:
- `v_i` 是第 i 层的输出
- `α_{i→l}` 是通过单个伪查询 `w_l ∈ R^d` 计算的注意力权重
- 每层有一个可学习的 `w_l`,决定如何聚合历史层

关键创新: **Content-dependent depth-wise selection** — 每层可以动态选择关注哪些历史层,而不是被动接受所有历史输出的等权和。

### Block AttnRes: 实用的块级近似

Full AttnRes 的问题: 训练大规模模型时,需要 O(Ld) 的内存来存储所有历史层输出。

解决方案: **Block AttnRes**
- 将 L 层分成 N 个块 (约 8 个块)
- 块内使用标准残差累积
- 块间使用注意力聚合

这将内存复杂度从 O(Ld) 降低到 O(Nd),其中 N << L。

### 实现细节

Block AttnRes 的 PyTorch 伪代码:

```python
def block_attn_res(blocks, partial_block, proj, norm):
    V = torch.stack(blocks + [partial_block])  # [N+1, B, T, D]
    K = norm(V)
    logits = torch.einsum('d, n b t d -> n b t', proj.weight.squeeze(), K)
    h = torch.einsum('n b t, n b t d -> b t d', logits.softmax(0), V)
    return h
```

结合:
- **Cache-based pipeline communication**: 减少块间通信开销
- **Two-phase computation strategy**: 实用的部署方案

## Results

### Scaling Law

AttnRes 在所有模型规模上都一致地优于基线。Block AttnRes 用**1.25x 更少算力**达到基线同等的损失。

### Downstream Performance (Kimi Linear 48B / 3B activated, 1.4T tokens)

| Category | Benchmark | Baseline | AttnRes | Improvement |
|----------|-----------|----------|---------|-------------|
| **General** | MMLU | 73.5 | **74.6** | +1.1 |
| | **GPQA-Diamond** | 36.9 | **44.4** | **+7.5** |
| | BBH | 76.3 | **78.0** | +1.7 |
| | TriviaQA | 69.9 | **71.8** | +1.9 |
| **Math & Code** | Math | 53.5 | **57.1** | +3.6 |
| | HumanEval | 59.1 | **62.2** | +3.1 |
| | MBPP | 72.0 | **73.9** | +1.9 |
| **Chinese** | CMMLU | 82.0 | **82.9** | +0.9 |
| | C-Eval | 79.6 | **82.5** | +2.9 |

最大提升: **GPQA-Diamond +7.5** (多步推理任务),HumanEval +3.1 (代码生成)。

### Training Dynamics

AttnRes 有效缓解了 PreNorm 稀释问题:
- 输出幅度在各层间保持有界
- 梯度分布更均匀

## Limitations

1. **内存开销**: 即使是 Block AttnRes,仍有约 O(Nd) 的额外内存开销
2. **通信开销**: Pipeline 并行训练时,块间注意力需要额外通信
3. **实现复杂度**: 相比简单残差连接,AttnRes 需要额外的投影层和归一化

## Future Directions

1. 探索更细粒度的层选择机制
2. 将 AttnRes 与其他高效注意力机制(如 Sparse Attention)结合
3. 在更多模型架构上验证 AttnRes 的有效性

## Key Takeaways

1. **重新审视基础组件**: 残差连接作为 Transformer 的核心组件,长期未被重新设计
2. **注意力机制的跨维度应用**: 将序列注意力的思路应用到深度方向
3. **工程实用性**: Block AttnRes 证明了理论创新可以转化为实际可用的方案
4. **1.25x 效率提升**: 用同样算力训练出更好的模型,或用更少算力达到同等效果

## Related Work

- **Kimi Linear** (arXiv 2025): 混合线性注意力架构,AttnRes 已集成其中
- **MoBA** (Moonshot, 2025): 块级稀疏注意力,同团队的 长上下文 工作
- **DeepSeek MoE** (2025): 专家路由的 input-dependent weighting

## References

- [12] Residual connections (He et al., 2016)
- [60] PreNorm (Graham et al., 2019)
- [69] Kimi Linear (Kimi Team, 2025)

---

*Generated: 2026-03-19*
*Source: arXiv 2603.15031*
