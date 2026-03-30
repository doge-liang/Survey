---
id:
title: Hyper-Connections
source_type: arxiv
upstream_url:
generated_by:
created_at:
updated_at:
authors: [Defa Zhu, Hongzhi Huang, Zihao Huang, Yutao Zeng, Yunyao Mao, Banggu Wu, Qiyang Min, Xun Zhou]
year: 2025
---
# Hyper-Connections

> **Quick Reference**
> - Authors: Defa Zhu, Hongzhi Huang, Zihao Huang et al. (ByteDance)
> - Year: 2024 (September)
> - Conference: ICLR 2025
> - arXiv: [2409.19606](https://arxiv.org/abs/2409.19606)
> - GitHub: [lucidrains/hyper-connections](https://github.com/lucidrains/hyper-connections)
> - Subject: cs.LG

## Summary

ByteDance 提出了 **Hyper-Connections (HC)**，一种替代残差连接的简单有效方法。HC 通过引入**可学习的深度连接(depth-connections)**和**宽度连接(width-connections)**，让网络能够动态调整不同层之间特征的连接强度和层排列方式。在 1B-7B 规模的 LLM 预训练中，HC 显著超越残差连接，DHC 版本收敛速度提升 **1.8 倍**。

## Problem & Motivation

### 残差连接的两难困境

**Pre-Norm** 解决了梯度消失问题，但会导致**表征崩溃(representation collapse)**——深层特征变得高度相似。

**Post-Norm** 缓解表征崩溃，但重新引入梯度消失问题。

两者是**跷跷板**的两端，无法兼得。

### 核心问题

传统残差连接（包括 Pre-Norm 和 Post-Norm）**预定义了**层输入和输出之间连接的强度，无法自适应调整。

## Methodology

### 核心思想

将残差连接泛化为 **Hyper-Connections (HC)**，引入两类可学习连接：

1. **Depth-Connections**：输入和输出之间的权重连接（广义残差）
2. **Width-Connections**：同一层内不同隐藏向量之间的信息交换

### 扩展机制

将输入复制 n 份（扩展率 n），每份有独立的深度连接：

```
x_{l+1} = H^{res}_l x_l + H^{post,T}_l F(H^{pre}_l x_l, W_l)
```

- 将特征维度从 C 扩展到 n×C（n 为扩展率）
- 引入三个可学习矩阵：B（输出连接）、A_m（输入映射）、A_r（宽度连接）

### Dynamic HC (DHC)

动态版本根据输入动态预测连接权重：

```python
B(H) = sβ ◦ tanh(HW_β)^T + B  # 动态 β
A_m(H) = sα ◦ tanh(HW_m) + A_m  # 动态输入映射
A_r(H) = sα ◦ tanh(HW_r) + A_r  # 动态宽度连接
```

### 初始化策略

为使 HC 等价于 Pre-Norm：
- 动态参数初始化为 0
- 静态矩阵初始化为单位矩阵结构

## Results

### 收敛速度

**DHC×4** 比基线收敛 **1.8 倍**更快，且在 500B tokens 训练后保持显著优势。

### 下游任务 (OLMoE-1B-7B)

| 方法 | V2 Loss | V3 Loss | ARC-Challenge |
|------|---------|---------|--------------|
| OLMoE-1B-7B (基线) | 2.65 | 2.85 | 47.5 |
| **OLMoE-1B-7B-DHC×4** | **2.70** | **2.89** | **53.5** |

### 表征多样性分析

Pre-Norm 模型深层与浅层特征高度相似（表征崩溃），而 HC 模型各层特征多样性显著更高。

## Key Insights

1. **Pre-Norm 和 Post-Norm 都是 HC 的特例**（n=1 的不可训练版本）
2. **n > 1 是必要的**：n=1 时跷跷板效应仍然存在
3. **动态 HC 优于静态 HC**：输入依赖的权重调整效果更好
4. **计算开销可忽略**：虽然宽度扩展 n 倍，但额外参数量极小

## Limitations (by paper)

1. HC 引入了额外的超参数（扩展率 n、tanh 函数等）
2. DHC 的动态权重预测带来额外计算
3. 跷跷板效应在 n=1 时仍然存在

## Relationship with mHC

| Paper | 机构 | 核心思想 | 问题 |
|-------|------|---------|------|
| **HC** | ByteDance | 多路残差流 + 可学习连接 | **大规模训练不稳定** |
| **mHC** | DeepSeek | HC + 流形约束 | 恢复恒等映射，**6.7% 开销** |

mHC 是对 HC 的改进，解决了 HC 在大规模训练中的数值不稳定性问题。

## References

- [He et al. 2016] Deep Residual Learning (ResNet)
- [Muennighoff et al. 2024] OLMoE (baseline model)
- [Groeneveld et al. 2024] OLMo (training framework)

---

*Generated: 2026-03-19*
*Source: arXiv 2409.19606 (ICLR 2025)*
