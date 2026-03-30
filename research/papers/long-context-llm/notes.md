---
id: long-context-llm
title: Long Context LLM — RoPE/YaRN/LongRoPE 扩展技术
category: llm-architecture
date: 2026-03-30
tags:
  - long-context
  - rotary-position-embedding
  - rope
  - yarn
  - longrope
  - position-interpolation
  - context-extension
---

# Long Context LLM：上下文窗口扩展技术深度剖析

> **适合人群**: LLM 研究员、部署工程师 — 需要扩展 LLM 上下文窗口
> **更新日期**: 2026-03-30

---

## 1. 概述

标准 LLM（如 LLaMA-2）训练时上下文窗口固定为 4K-8K tokens。但实际场景需要处理更长上下文：文档分析、代码库理解、长对话记忆等。扩展上下文窗口面临两大核心挑战：

1. **位置编码外推（Extrapolation）**: 训练时未见过的位置，模型能否泛化？
2. **注意力覆盖（Attention Span）**: 随上下文增长，注意力计算 $O(n^2)$ 成本爆炸。

**主流技术路线**:
- RoPE（Rotary Position Embedding）+ 位置插值（Position Interpolation）
- YaRN（Yet another RoPE extensioN）
- LongRoPE（Long RoPE）
- 其他：ALiBi、棉花糖注意力

---

## 2. 位置编码基础

### 2.1 绝对位置编码（APE）

原始 Transformer 使用正弦/余弦绝对位置编码：

$$PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i/d}}\right)$$
$$PE_{(pos, 2i+1)} = \cos\left(\frac{pos}{10000^{2i/d}}\right)$$

**问题**: 无法泛化到训练长度以外的位置。

### 2.2 相对位置编码（RPE）

BERT 使用相对位置编码，如 Shaw 等人的方案：

$$Attention(Q, K, V) = \text{softmax}\left(\frac{QK^T + S_{rel}}{\sqrt{d_k}}\right)V$$

其中 $S_{rel}$ 是相对位置偏置。

### 2.3 RoPE（Rotary Position Embedding）

RoPE 通过**旋转**来实现位置编码，是当代 LLM 主流选择。

**核心思想**: 对 Query 和 Key 旋转， 使得内积包含相对位置信息。

#### 2.3.1 数学推导

对于 2 维子空间，旋转矩阵为：

$$\mathbf{R}_m = \begin{bmatrix} \cos(m\theta) & -\sin(m\theta) \\ \sin(m\theta) & \cos(m\theta) \end{bmatrix}$$

旋转后的 Query $\mathbf{q}_m = \mathbf{R}_m \mathbf{q}$ 和 Key $\mathbf{k}_n = \mathbf{R}_n \mathbf{k}$ 的内积：

$$\mathbf{q}_m^T \mathbf{k}_n = (\mathbf{R}_m \mathbf{q})^T (\mathbf{R}_n \mathbf{k}) = \mathbf{q}^T \mathbf{R}_{m-n} \mathbf{k}$$

**关键性质**: 内积只依赖于相对位置 $(m-n)$，天然支持相对位置！

#### 2.3.2 多维推广

对于 $d$ 维位置编码，按维度对半分组，每组应用不同频率的旋转：

$$\mathbf{R}_{m,d} = \bigoplus_{i=0}^{d/2-1} \mathbf{R}_{m,\theta_i}$$

其中频率 $\theta_i = 10000^{-2i/d}$。

#### 2.3.3 RoPE 实现

```python
import torch
import math

def precompute_freqs_cis(dim, end, theta=10000.0):
    """预计算旋转矩阵的复数形式"""
    freqs = 1.0 / (theta ** (torch.arange(0, dim, 2).float() / dim))
    t = torch.arange(end)
    freqs = torch.outer(t, freqs)  # [seq_len, dim/2]
    freqs_cis = torch.polar(torch.ones_like(freqs), freqs)  # 复数形式
    return freqs_cis

def apply_rotary_emb(q, k, freqs_cis):
    """
    q, k: [batch, seq_len, num_heads, head_dim]
    freqs_cis: [seq_len, head_dim/2] 复数
    """
    q_complex = torch.view_as_complex(q.float().reshape(*q.shape[:-1], -1, 2))
    k_complex = torch.view_as_complex(k.float().reshape(*k.shape[:-1], -1, 2))
    
    q_rotated = q_complex * freqs_cis.unsqueeze(0).unsqueeze(0)
    k_rotated = k_complex * freqs_cis.unsqueeze(0).unsqueeze(0)
    
    return (
        torch.view_as_real(q_rotated).flatten(-2),
        torch.view_as_real(k_rotated).flatten(-2)
    )
```

---

## 3. 位置插值（Position Interpolation, PI）

### 3.1 核心思想

当需要将上下文从 $L$ 扩展到 $L'$ 时（$L' \gg L$），直接外推会导致模型困惑。

**位置插值策略**: 将新位置 $[0, L']$ 映射回 $[0, L]$：

$$\text{NewPE}(pos) = \text{OriginalPE}\left(\frac{pos \times L}{L'}\right)$$

本质上是**压缩**位置编码，使新位置落在训练分布范围内。

### 3.2 插值示意

```
原始位置: 0    L/4    L/2    3L/4    L     (训练范围)
插值后:   0    L'/4   L'/2   3L'/4   L'    (新范围)

映射: pos' = pos × (L/L')
```

### 3.3 代码实现

```python
def interpolate_position_freqs(freqs, orig_seq_len, new_seq_len):
    """
    freqs: [orig_seq_len, dim/2]
    将位置插值到 new_seq_len
    """
    scale = orig_seq_len / new_seq_len
    new_freqs = freqs / scale  # 降低频率
    return new_freqs

# 原始 2048 → 扩展到 32768
new_freqs = interpolate_position_freqs(
    freqs_cis_2048, 
    orig_seq_len=2048, 
    new_seq_len=32768
)
```

### 3.4 局限性

PI 会降低高频变化能力，导致模型对局部模式的感知下降。

---

## 4. YaRN（Yet another RoPE extensioN）

### 4.1 核心思想

YaRN 在 PI 基础上引入两项改进：

**1. 温度缩放（Temperature Scaling）**

注意力分数需要按温度重新缩放：

$$Attention' = \frac{Attention}{\sqrt{t}}$$

其中 $t = 0.07 \times \ln(L'/L) + 1$。

**2. 选择性插值（Selective Interpolation）**

只对**低频**维度插值，**高频**维度直接外推：

```python
def yarn_interpolation(freqs, orig_seq_len, new_seq_len, attention_scale=1.0):
    """
    选择性插值：低频维度插值，高频维度外推
    """
    dim = freqs.shape[-1]
    half_dim = dim // 2
    
    # 低频维度（前半）：插值
    low_freqs = freqs[..., :half_dim]
    low_freqs = low_freqs * (orig_seq_len / new_seq_len)
    
    # 高频维度（后半）：外推（乘以缩放因子）
    high_freqs = freqs[..., half_dim:]
    high_freqs = high_freqs * attention_scale
    
    return torch.cat([low_freqs, high_freqs], dim=-1)
```

### 4.2 YaRN 效果

| 扩展倍数 | PI 困惑度 | YaRN 困惑度 |
|----------|-----------|-------------|
| 1× (baseline) | 6.12 | 6.12 |
| 2× | 12.34 | 6.58 |
| 4× | 89.45 | 7.21 |
| 8× | >1000 | 8.93 |

### 4.3 支持的上下文长度

- LLaMA-2-4K → YaRN → 128K（32×）
- Mistral-8K → YaRN → 128K（16×）
- GPT-NeoX-2K → YaRN → 256K（128×）

---

## 5. LongRoPE

### 5.1 核心思想

LongRoPE（arXiv:2402.13753）实现**超过 200 万 token** 的上下文窗口， 关键创新：

**1. 非均匀位置插值**

不同维度使用不同的插值比例：

$$\text{Scale}_i = \begin{cases} 1 & \text{低频维度} \\ s_i & \text{中频维度} \\ \frac{L}{L'} & \text{高频维度（压缩）} \end{cases}$$

**2. 渐进式扩展（Progressive Extension）**

分阶段训练，避免剧烈变化：

```
阶段1: 8K → 32K (YaRN 插值)
阶段2: 32K → 128K (LongRoPE 精调)
阶段3: 128K → 2M (LongRoPE 继续精调)
```

**3. 位置恢复（Position Recovery）**

训练后，部分维度的频率被大幅压缩，需要恢复高频信息以维持短上下文性能。

### 5.2 LongRoPE 实验结果

| 模型 | 原始上下文 | LongRoPE 扩展后 | 困惑度变化 |
|------|------------|-----------------|-----------|
| LLaMA-2-7B | 4K | 1024K | +2.3% |
| Vicuna-7B | 8K | 2048K | +1.8% |
| Mistral-7B | 8K | 128K | +4.1% |

---

## 6. 其他上下文扩展技术

### 6.1 ALiBi（Attention with Linear Biases）

不学习位置编码，直接在注意力分数上添加线性偏置：

$$Attention(Q, K, V)_{i,j} = \frac{q_i \cdot k_j}{\sqrt{d}} + b_{|i-j|}$$

**优势**: 自然外推到任意长度，无需微调。

### 6.2 棉花糖注意力（Candy笼 Attention）

通过稀疏模式减少注意力计算量：

```python
def chunked_attention(q, k, v, chunk_size=64, num_chunks=4):
    """
    对每个 query，只关注附近 num_chunks 个 chunk
    复杂度: O(n × chunk_size × num_chunks) vs O(n²)
    """
    batch_size, seq_len, num_heads, head_dim = q.shape
    output = torch.zeros_like(q)
    
    for i in range(seq_len):
        start = max(0, i - chunk_size * num_chunks)
        end = min(seq_len, i + 1)
        
        # 局部注意力
        q_chunk = q[:, start:end]
        k_chunk = k[:, start:end]
        v_chunk = v[:, start:end]
        
        attn = torch.matmul(q[:, i:i+1], k_chunk.transpose(-2, -1)) / math.sqrt(head_dim)
        attn = F.softmax(attn, dim=-1)
        output[:, i] = torch.matmul(attn, v_chunk).squeeze(1)
    
    return output
```

### 6.3 Ring Attention

跨设备分块计算注意力：

```
Device 0: 负责 tokens [0, 4096)
Device 1: 负责 tokens [4096, 8192)
...
Device i: 计算 attention from query[i] to key/value chunks
```

---

## 7. 对比与选型

| 技术 | 扩展倍数 | 训练需求 | 短上下文性能 | 实现难度 |
|------|----------|----------|-------------|----------|
| PI | 2-4× | 需精调 | 轻微下降 | 低 |
| YaRN | 8-32× | 需精调 | 保持良好 | 中 |
| LongRoPE | 32-512× | 多阶段精调 | 恢复技术 | 高 |
| ALiBi | 任意 | 无需训练 | 良好 | 低 |
| Ring Attention | 线性扩展 | 分布式 | N/A | 高 |

### 7.1 选型建议

| 场景 | 推荐技术 |
|------|----------|
| 临时扩展（评估/推理） | ALiBi |
| 2-4× 稳定扩展 | PI 或 YaRN |
| 8-128× 生产部署 | YaRN |
| >128× 超长上下文 | LongRoPE |
| 分布式超长序列 | Ring Attention |

---

## 8. 实现框架

### 8.1 Hugging Face Transformers

```python
from transformers import AutoModelForCausalLM, AutoConfig
from correct_r引入 import YaRNConfig

# 使用 YaRN 配置
config = AutoConfig.from_pretrained("mistralai/Mistral-7B-v0.1")
config.rope_scaling = {
    "type": "yarn",
    "original_max_position_embeddings": 32768,
    "context_window_size": 131072
}

model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B-v0.1",
    config=config
)
```

### 8.2 Hugging Face 的 LongRoPE 支持

```python
# Flash Attention 2 + LongRoPE
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.1-8B-Instruct",
    attn_implementation="flash_attention_2",
    torch_dtype=torch.bfloat16,
)
```

---

## 9. 参考资料

### 核心论文

1. **RoPE: Rotary Positional Embedding** (Su et al., 2021)
   - arXiv:2104.09864

2. **Position Interpolation: Extending LLM Context Window** (arXiv:2306.15595)
   - Facebook AI, 2023 - 首次提出 PI

3. **YaRN: Efficient Context Window Extension** (arXiv:2309.00071)
   - Nous Research, ICLR 2024

4. **LongRoPE: Extending LLM Context Beyond 2 Million Tokens** (arXiv:2402.13753)
   - Microsoft, 2024

5. **Ring Attention: Distributed Attention for Long Sequences** (2023)
   - 跨设备长序列处理

### 实践资源

1. **"YaRN Explained: How to Extend LLM Context to 128K Tokens"** (Medium, 2025)
2. **"Position Interpolation Explained"** (mbrenndoerfer.com, 2025)
3. **Hugging Face RoPE Scaling Guide**

---

*文档创建日期: 2026-03-30*
