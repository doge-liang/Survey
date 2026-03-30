---
id: megatron-lm
title: Megatron-LM 张量并行与部署实践
category: distributed-training
tags:
  - megatron-lm
  - tensor-parallelism
  - distributed-training
  - nvidia
  - llm
created: 2026-03-30
updated: 2026-03-30
source: https://github.com/NVIDIA/Megatron-LM
---

# Megatron-LM 张量并行与部署实践

> **来源**: GitHub - NVIDIA/Megatron-LM
> **更新时间**: 2026-03-30

## 概述

Megatron-LM 是 NVIDIA 开发的大规模 Transformer 模型训练框架，专门用于分布式训练超大规模语言模型。

| 特性 | 说明 |
|------|------|
| **开发方** | NVIDIA Deep Learning |
| **开源** | GitHub: NVIDIA/Megatron-LM |
| **用途** | 多 GPU/多节点分布式训练 LLM |
| **核心优化** | 张量并行、流水线并行、序列并行 |

---

## 张量并行原理

### 核心思想

**张量并行 (Tensor Parallelism, TP)** 将 Transformer 模型的权重矩阵按列或行切分到多个 GPU，使得每个 GPU 只持有完整权重的一部分。

### 单层 Transformer 前向传播

```
标准 Transformer 前向传播:
Input → LayerNorm → Attention → Residual → MLP → Output

Attention 计算: Y = softmax(X · Q · K^T) · V

其中 Q = X · W_q, K = X · W_k, V = X · W_v, O = Y · W_o
```

**张量并行切分方式**:

```
        W_q (hidden × hidden)
            ↓
    ┌───────┬───────┐
    ↓       ↓       ↓
  GPU 0   GPU 1   GPU 2   ← 每 GPU 持有 W_q 的 1/3 列
    ↓       ↓       ↓
  Q_0     Q_1     Q_2    ← 各自计算部分 Query
    ↓       ↓       ↓
 ALL-GATHER (聚合 Q)      ← 需要通信
```

### 关键操作

#### 1. Column Parallel Linear (列切分)

```python
# 权重 W 按列切分: W = [W_0, W_1, W_2]
# 输入 X 保持完整
# 输出 Y_i = X · W_i

# Forward: 每 GPU 计算部分结果
Y_0 = X @ W_0  # GPU 0
Y_1 = X @ W_1  # GPU 1
Y_2 = X @ W_2  # GPU 2

# 需要 All-Reduce 或 All-Gather 聚合
```

#### 2. Row Parallel Linear (行切分)

```python
# 权重 W 按行切分: W = [W_0; W_1; W_2]
# 输入 X 也被切分
# 输出 Y = X_0 · W_0 + X_1 · W_1 + X_2 · W_2

# Forward: 每 GPU 计算部分
Y_0 = X_0 @ W_0  # GPU 0
Y_1 = X_1 @ W_1  # GPU 1

# 需要 All-Reduce 汇总
Y = Y_0 + Y_1
```

#### 3. Attention 中的 All-to-All 通信

```python
# 每个 Head 分到不同 GPU
# Q, K, V 分片后，计算注意力时需要交换 K, V
# 每个 GPU 需要获取所有 GPU 的 K, V 进行 Attention 计算

# Forward 时: 发送本地 K, V 到所有 GPU，接收远程 K, V
# 通信模式: All-to-All
```

### 通信复杂度

| 操作 | 通信量 | 通信模式 |
|------|--------|----------|
| Column Parallel (Forward) | O(B×S×H/TP) | All-Gather |
| Row Parallel (Forward) | O(B×S×H) | All-Reduce |
| Attention All-to-All | O(B×S×H) | All-to-All |

其中 B=batch, S=sequence, H=hidden, TP=并行数

### 显存占用

```
单 GPU 显存 ≈ 参数量 × 2 (forward + backward) / TP

以 175B 模型为例:
- 原始 FP16 权重: 350 GB
- 张量并行 TP=8 时，每 GPU 约 44 GB 权重
- 加上 activations 和优化器状态，实际 ~80GB/GPU
```

---

## 部署实践

### 环境准备

```bash
# 1. NVIDIA 驱动 + CUDA 12+
nvidia-smi

# 2. 容器环境 (推荐)
docker pull nvcr.io/nvidia/pytorch:23.09-py3

# 3. 依赖
pip install torch transformerengine

# 4. NCCL 通信库 (多节点需要)
# 通常在 NGC 容器中已预装
```

### 单节点多 GPU 训练

```bash
# 8 GPU 张量并行
torchrun --nproc_per_node=8 pretrain_gpt.py \
    --num-layers 12 \
    --hidden-size 768 \
    --num-attention-heads 12 \
    --seq-length 1024 \
    --micro-batch-size 4 \
    --global-batch-size 64 \
    --lr 0.00015 \
    --min-lr 0.00001 \
    --max-lr 0.00015 \
    --lr-decay-style cosine \
    --tensor-model-parallel-size 8 \
    --pipeline-model-parallel-size 1 \
    --data-path data/my_gpt_data \
    --vocab-file data/gpt2-vocab.json \
    --merge-file data/gpt2-merges.txt \
    --fp16
```

### 多节点分布式训练

```bash
# 节点 0 (master)
torchrun --nproc_per_node=8 \
    --nnodes=2 \
    --node_rank=0 \
    --master_addr=10.0.0.1 \
    --master_port=29500 \
    pretrain_gpt.py \
    --tensor-model-parallel-size 8 \
    --pipeline-model-parallel-size 2 \
    --num-layers 12 \
    --hidden-size 768 \
    # ... 其他参数

# 节点 1 (其他节点)
torchrun --nproc_per_node=8 \
    --nnodes=2 \
    --node_rank=1 \
    --master_addr=10.0.0.1 \
    --master_port=29500 \
    pretrain_gpt.py \
    --tensor-model-parallel-size 8 \
    --pipeline-model-parallel-size 2 \
    # ...
```

### 混合并行配置

```bash
# 假设 16 GPU，4 节点 × 4 GPU

# 张量并行 4: 每节点内
# 流水线并行 4: 跨节点
# 数据并行 1: (16 / 4 / 4 = 1)

torchrun --nproc_per_node=4 pretrain_gpt.py \
    --tensor-model-parallel-size 4 \
    --pipeline-model-parallel-size 4 \
    --num-layers 96 \
    --hidden-size 12288 \
    --num-attention-heads 96 \
    --seq-length 4096 \
    --micro-batch-size 1 \
    --global-batch-size 128 \
    --data-path data/
```

### 实用技巧

#### 1. 通信带宽优化

```bash
# 使用 NVLink (单机内 GPU 互联)
# 确保 NCCL 使用 NVLS (NCCL Sharp)
export NCCL_UCX_TCP_MODE=disabled
export NCCL_NET_GDR_LEVEL=PHB

# 多节点间用 InfiniBand
export NCCL_NET=IB
```

#### 2. 显存优化

```bash
# 启用 TransformerEngine 的 FP8 量化
--use-flash-attn \
--transformer-engine \

# 启用 activation checkpointing (以时间换空间)
--checkpoint-activations
```

#### 3. 数据准备

```bash
# Megatron-LM 使用 mmap 格式二进制数据
# 需要预先将文本转为 .idx + .bin 格式

python tools/preprocess_data.py \
    --input data/raw_text.txt \
    --output-prefix data/my_gpt \
    --vocab-size 50257 \
    --append-eod \
    --tokenizer-type GPT2BPETokenizer
```

### 常见问题排查

```bash
# 1. NCCL 通信超时
export NCCL_TIMEOUT=1800

# 2. 显存不足 - 减小 micro-batch 或增加 TP
--tensor-model-parallel-size 16  # 如果有 16 GPU

# 3. 性能瓶颈诊断
# 使用 PyTorch Profiler
python -m torch.distributed.run --nproc_per_node=8 \
    profiler_test.py
```

### 监控训练

```bash
# TensorBoard
tensorboard --logdir logs/

# 训练进度日志
# Megatron 会自动打印:
# iteration     100/10000 | elapsed time (ms) | ...
# lr: 0.000150 | total loss: 2.45
```

---

## 并行方式对比

| 并行方式 | 切分维度 | 通信量 | 适用场景 |
|----------|----------|--------|----------|
| **张量并行 (TP)** | 模型权重 | 高 (All-Gather/All-to-All) | 单节点多 GPU |
| **流水线并行 (PP)** | 模型层 | 低 (P2P) | 多节点 |
| **数据并行 (DP)** | 数据批次 | 低 (AllReduce) | 扩展batch size |
| **序列并行 (SP)** | Sequence 维度 | 中等 | 超长序列 |

**现代大模型训练组合**:
```
TP=8 × PP=4 × DP=数据并行
= 32 GPU 集群训练万亿参数模型
```

---

## 与 DeepSpeed 对比

| 对比项 | Megatron-LM | DeepSpeed |
|--------|-------------|-----------|
| 主攻 | 超大规模单模型训练 | 训练 + 推理优化 |
| 并行方式 | 以张量并行见长 | ZeRO 显存优化 |
| 生态 | NVIDIA自家 | 微软 |
| 适用规模 | 100B+ 参数 | 7B-400B 参数 |

---

## 参考资源

- **GitHub**: https://github.com/NVIDIA/Megatron-LM
- **官方文档**: https://docs.nvidia.com/megatron-lm/
- **论文**: Megatron-LM (NVIDIA, 2019)
