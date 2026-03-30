---
id: distributed-llm-training
title: 分布式 LLM 训练 — 张量并行/流水线并行/数据并行
category: llm-infrastructure
date: 2026-03-30
tags:
  - distributed-training
  - tensor-parallelism
  - pipeline-parallelism
  - data-parallelism
  - megatron-lm
  - deepspeed
  - zeRO
---

# 分布式 LLM 训练：Megatron-LM 与并行策略深度剖析

> **适合人群**: 机器学习工程师、研究员 — 需要训练/部署超大规模语言模型
> **更新日期**: 2026-03-30

---

## 1. 概述

训练数十亿乃至万亿参数的 LLM 需要将计算分布到数百至数千个 GPU。张量并行（Tensor Parallelism, TP）、流水线并行（Pipeline Parallelism, PP）和数据并行（Data Parallelism, DP）是三种核心并行策略，Megatron-LM 和 DeepSpeed 是两个最主流的训练框架。

**核心挑战**: 
- 显存瓶颈：130B 参数模型在 FP16 下需 ~260GB 显存，单卡无法容纳
- 通信开销：跨 GPU 数据传输成为扩展性瓶颈
- 负载均衡：确保各 GPU 利用率均衡

---

## 2. 张量并行（Tensor Parallelism, TP）

### 2.1 核心思想

Megatron-LM 的张量并行将单个 Transformer 层的权重矩阵按维度拆分到多个 GPU，使每个 GPU 只持有部分参数和激活值。

### 2.2 MLP 块并行

MLP 块计算：$Y = \text{GeLU}(XA)$，$O = YB$

**列切分（Column Parallel）**: 切分权重矩阵 $A$

```
GPU 0: Y₁ = GeLU(X · A₁)   → A ∈ ℝ^(K×N/2)
GPU 1: Y₂ = GeLU(X · A₂)
```

**关键洞察**: GeLU 是非线性函数，**不能**先分区再激活，因为：
$$\text{GeLU}(X_1 A_1) + \text{GeLU}(X_2 A_2) \neq \text{GeLU}(X_1 A_1 + X_2 A_2)$$

**行切分（Row Parallel）**: 对第二层线性层切分权重矩阵 $B$

```
GPU 0: O₁ = Y₁ · B₁   → B ∈ ℝ^(N/2×M)
GPU 1: O₂ = Y₂ · B₂
O = O₁ + O₂  (All-Reduce)
```

**通信成本**: 每 MLP 块 1 次 All-Reduce（前向）+ 1 次 All-Reduce（反向）

### 2.3 注意力层并行

按注意力头（Attention Head）数量切分：

```
Q = X · W_Q  →  W_Q 按列切分到 N 个 GPU
K = X · W_K  →  W_K 按列切分到 N 个 GPU  
V = X · W_V  →  W_V 按列切分到 N 个 GPU
```

每个 GPU 计算部分注意力头的 Attention：
$$\text{head}_i = \text{Softmax}\left(\frac{Q_i K_i^T}{\sqrt{d_k}}\right) V_i$$

最后通过 All-Reduce 聚合输出投影 $W_O$ 的结果。

### 2.4 通信模式

| 操作 | 通信原语 | 数据量 |
|------|----------|--------|
| 张量重塑（All-to-All） | All-to-All | $B \times S \times H$ |
| 梯度聚合（All-Reduce） | All-Reduce | $B \times S \times H$ |

### 2.5 伪代码实现

```python
import torch
import torch.nn as nn

class ColumnParallelLinear(nn.Module):
    def __init__(self, in_features, out_features, world_size):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.world_size = world_size
        self.out_features_per_gpu = out_features // world_size
        
        # 权重按列切分
        self.weight = nn.Parameter(
            torch.empty(self.out_features_per_gpu, self.in_features)
        )
    
    def forward(self, x):
        # x: [batch, seq_len, hidden]
        output = torch.matmul(x, self.weight.T)  # 本地计算
        # 收集所有 GPU 的输出
        outputs = [torch.zeros_like(output) for _ in range(self.world_size)]
        torch.distributed.all_gather(outputs, output)
        return torch.cat(outputs, dim=-1)

class RowParallelLinear(nn.Module):
    def __init__(self, in_features, out_features, world_size):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.world_size = world_size
        self.in_features_per_gpu = in_features // world_size
        
        # 权重按行切分
        self.weight = nn.Parameter(
            torch.empty(self.out_features, self.in_features_per_gpu)
        )
    
    def forward(self, x):
        # x 已按列分区
        local_output = torch.matmul(x, self.weight.T)
        # All-Reduce 求和
        torch.distributed.all_reduce(local_output)
        return local_output
```

---

## 3. 流水线并行（Pipeline Parallelism, PP）

### 3.1 核心思想

将模型的不同层放到不同 GPU 上。深度为 $D$ 的模型可以分到 $P$ 个 GPU，每 GPU 承载连续 $D/P$ 层。

### 3.2 问题：流水线气泡（Bubble）

朴素流水线会产生大量空闲等待周期（气泡）：

```
GPU 0: [F0][F1][F2][F3]           [B3][B2][B1][B0]
GPU 1:     [F1][F2][F3]   [B2][B1][B0]
气泡:           [  ][  ][  ]
```

**气泡比例**: 约 $(P-1)/P$，16 级流水线则浪费 93.75% 的计算资源！

### 3.3 1F1B 调度（One Forward One Backward）

每个 GPU 交替执行 1 个前向 + 1 个反向：

```
GPU 0: F0 F1 F2 F3 B3 B2 B1 B0
GPU 1:    F0 F1 F2 F3 B3 B2 B1 B0
```

气泡减少但仍存在。

### 3.4 微批次（Microbatch）调度

将大batch拆成多个micro-batch：

```
GPUs:  [-F0-][-F1-][-F2-][-F3-]
       [-B0-][-B1-][-B2-][-B3-]
       
micro_batch_0: F0 F1 F2 F3 B3 B2 B1 B0
micro_batch_1: F0 F1 F2 F3 B3 B2 B1 B0
```

通过重叠执行，气泡进一步减少。Google 的 GPipe 和 NVIDIA 的 PipeDream 采用此策略。

---

## 4. 数据并行（Data Parallelism, DP）

### 4.1 朴素 DP

每个 GPU 持有完整模型副本，接收不同数据batch：

```
GPU 0: Model → Forward → Backward → Gradient ↑
GPU 1: Model → Forward → Backward → Gradient ↑
                              ↓ All-Reduce
GPU 0: ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
GPU 1: ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

**问题**: 每个 GPU 需持有完整模型副本，130B 模型 × 8 GPUs = 大量显存浪费。

### 4.2 ZeRO（Zero Redundancy Optimizer）

DeepSpeed 的 ZeRO 通过分片optimizer state和梯度来消除冗余：

| Stage | 分片内容 | 显存节省 |
|-------|----------|----------|
| ZeRO-1 | Optimizer states 分片 | 4× |
| ZeRO-2 | + Gradient 分片 | 8× |
| ZeRO-校园 | + Parameter 分片 | N×（N=GPU数）|

**通信开销**: 额外 All-Reduce 通信，但相比张量并行通信量小得多。

### 4.3 FSDP（Fully Sharded Data Parallel）

PyTorch 原生 FSDP，等价于 ZeRO-3：

```python
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP

model = FSDP(
    transformer_model,
    sharding_strategy=ShardingStrategy.FULL_SHARD,
    device_id=torch.cuda.current_device()
)
```

---

## 5. 混合并行策略

### 5.1 3D 并行

大规模训练通常结合三种并行：

```
Total GPUs = TP × PP × DP

Example: 384 GPUs
  TP = 8 (NVLink 组内)
  PP = 4 (流水线阶段)
  DP = 384 / 32 = 12
```

Megatron-Core 配置示例：

```python
# tensor_parallel_size=8, pipeline_parallel_size=4, data_parallel_size=12
megatron_core_config = {
    "tensor_model_parallel_size": 8,
    "pipeline_model_parallel_size": 4,
    "data_parallel_size": 12,
    "num_layers": 32,
    "hidden_size": 12288,
    "num_attention_heads": 96,
}
```

### 5.2 部署实践

**单节点 8×A100（80GB）**:

```bash
torchrun --nproc_per_node=8 \
    megatron_lm/main.py \
    --tensor-model-parallel-size 8 \
    --pipeline-model-parallel-size 1 \
    --num-layers 32 \
    --hidden-size 4096 \
    --num-attention-heads 32 \
    --micro-batch-size 4 \
    --global-batch-size 32
```

**多节点（4节点 × 8 GPU）**:

```bash
torchrun --nnodes=4 --nproc_per_node=8 \
    --rdzv_id=123 --rdzv_backend=c10d \
    --rdzv_endpoint="192.168.1.1:29500" \
    megatron_lm/main.py \
    --tensor-model-parallel-size 8 \
    --pipeline-model-parallel-size 4 \
    --data-parallel-size 4 \
    --num-layers 96 \
    --hidden-size 12288
```

---

## 6. Megatron-LM vs DeepSpeed 对比

| 维度 | Megatron-LM | DeepSpeed |
|------|-------------|-----------|
| **核心优势** | 张量并行优化成熟 | ZeRO 显存优化领先 |
| **张量并行** | 原生支持 1D/2D/2.5D | 有限 |
| **流水线并行** | 支持 | 支持 |
| **ZeRO** | 集成 DeepSpeed | 原生 ZeRO-1/2/3 |
| **典型用户** | NVIDIA, LLaMA | Microsoft, BLOOM |
| **扩展效率** | TP 组内高效 | DP 层高效 |
| **通信库** | NCCL | NCCL + NVSHMEM |

### 6.1 选型建议

| 场景 | 推荐方案 |
|------|----------|
| 超大模型（>100B）+ NVLink | Megatron-LM + TP=8 |
| 中等模型 + 多节点 | DeepSpeed ZeRO-3 |
| 极致扩展性 | Megatron + DeepSpeed 混合 |

### 6.2 混合使用示例

```python
# DeepSpeed ZeRO + Megatron 张量并行
ds_config = {
    "train_batch_size": 64,
    "fp16": {"enabled": True},
    "zero_optimization": {
        "stage": 3,
        "offload_optimizer": {"device": "cpu"},
        "overlap_comm": True,
    }
}
```

---

## 7. 扩展性分析

| 并行策略 | 扩展瓶颈 | 理论效率 |
|----------|----------|----------|
| TP（纯） | All-Reduce 通信 | ~76% @ 512 GPUs |
| PP（纯） | 流水线气泡 | ~(P-1)/P 气泡损失 |
| DP（朴素） | 无（需 ZeRO） | ~100% |
| ZeRO-3 | 参数 All-Gather | ~90% @ 64 GPUs |
| 3D 混合 | 最优 | ~85% @ 1000+ GPUs |

---

## 8. 参考资料

### 核心论文

1. **Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism** (arXiv:1909.08053, 2019)
   - NVIDIA, 首提张量并行

2. **Reducing Activation Recomputation in Large Transformer Models** (2022)
   - 激活重计算优化

3. **DeepSpeed: Extreme-scale model training for everyone** (Microsoft, 2020)
   - ZeRO 详解

4. **Efficient Parallelization Layouts for Large-Scale Distributed Model Training** (COLM 2024)
   - 并行布局优化

### 官方文档

- [Megatron-Core Parallelism Guide](https://docs.nvidia.com/megatron-core/developer-guide/0.15.0/user-guide/parallelism-guide.html)
- [DeepSpeed ZeRO++](https://www.deepspeed.ai/tutorials/zeropp/)
- [DeepSpeed Megatron Tutorial](https://www.deepspeed.ai/tutorials/megatron/)

### 开源实现

- [NVIDIA/Megatron-LM](https://github.com/NVIDIA/Megatron-LM) - ⭐ 5.2k
- [deepspeedai/Megatron-DeepSpeed](https://github.com/deepspeedai/Megatron-DeepSpeed) - ⭐ 2.2k
- [Efficient Large-Scale Training Layouts](https://github.com/primeintellect-ai/large-scale-training) - ⭐ 1.3k

---

*文档创建日期: 2026-03-30*
