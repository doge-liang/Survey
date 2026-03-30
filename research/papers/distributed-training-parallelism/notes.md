# 分布式训练并行策略

## 概述

| 缩写 | 全称 | 中文 | 核心思想 |
|------|------|------|----------|
| **DP** | Data Parallelism | 数据并行 | 每 GPU 完整模型，处理不同 batch |
| **DDP** | Distributed Data Parallel | 分布式数据并行 | DP 的高效实现，环形通信 |
| **FSDP** | Fully Sharded Data Parallel | 完全分片数据并行 | 模型参数也分片，显存极致优化 |
| **TP** | Tensor Parallelism | 张量并行 | 模型层内拆分到多 GPU |
| **SP** | Sequence Parallelism | 序列并行 | sequence 维度拆分 |
| **PP** | Pipeline Parallelism | 流水线并行 | 模型层间拆分到多 GPU |

---

## 1. Data Parallelism (DP)

```
GPU 0: [模型副本] + batch[0..n/4]
GPU 1: [模型副本] + batch[n/4..n/2]
GPU 2: [模型副本] + batch[n/2..3n/4]
GPU 3: [模型副本] + batch[3n/4..n]
```

**原理**:
- 每个 GPU 有**完整模型副本**
- 处理不同的数据分片（mini-batch）
- Forward 独立进行
- Backward 后通过 **All-Reduce** 同步梯度
- 每个 GPU 用相同梯度更新参数 → 模型最终一致

**问题**: 每 GPU 都要存完整模型 + 完整优化器状态，显存浪费

---

## 2. DDP vs FSDP

### DDP (DistributedDataParallel)

- 改进的 DP：梯度通信与计算重叠
- 使用 **Ring-AllReduce** 替代中心化的参数服务器
- 每 GPU 仍然存储：完整模型 + 完整优化器状态

### FSDP (FullyShardedDataParallel)

ZeRO 优化的极致版本，参数/梯度/优化器状态**全部 分片**:

| Stage | 分片内容 | 显存节省 |
|-------|----------|----------|
| ZeRO-1 | 优化器状态分片 | ~4x |
| ZeRO-2 | + 梯度分片 | ~8x |
| ZeRO-3 | + 模型参数分片 | ~N x (N=GPU数) |

---

## 3. Tensor Parallelism (TP)

将**单层**参数矩阵拆分到多 GPU，而非整个模型。

### MLP 层拆分

```
MLP: Y = GeLU(XA) · B

Column Parallel (A 拆分):
A = [A1 | A2]
X 输入相同 (All-Gather)
Y1 = GeLU(X · A1)
Y2 = GeLU(X · A2)
→ 需要 All-to-All 通信

Row Parallel (B 拆分):
B = [B1; B2]
Y1 = GeLU(XA) · B1  (GPU 0)
Y2 = GeLU(XA) · B2  (GPU 1)
→ 需要 All-Reduce 聚合
```

### Attention 层拆分

```
Q = X · W_Q = [Q1 | Q2]   (Column Parallel)
K = X · W_K = [K1 | K2]
V = X · W_V = [V1 | V2]

Score = Q · K^T → 需要 All-to-All 聚合
Output = Score · V → Row Parallel
```

### 通信模式

| 通信类型 | 场景 | 说明 |
|----------|------|------|
| All-to-All | Column→Row 切换 | 张量重塑/激活传递 |
| All-Reduce | Row Parallel 后 | 结果聚合 |

---

## 4. Sequence Parallelism (SP)

针对序列长度维度的并行，配合 TP 使用。

```
Sequence: [tok0, tok1, tok2, tok3, tok4, tok5, tok6, tok7]
           ├──── GPU 0 ────┤├──── GPU 1 ────┤

Attention score 在 sequence 维度拆分
```

---

## 5. Pipeline Parallelism (PP)

将**不同层**放到不同 GPU。

```
GPU 0: Layer[0..7]   → Forward B1
GPU 1: Layer[8..15]  → Forward B2, Backward B1
GPU 2: Layer[16..23] → Forward B3, Backward B2
GPU 3: Layer[24..31] → Forward B4, Backward B3
```

### 流水线气泡 (Bubble) 问题

**朴素 PP** 有大量空闲等待，1F1B 调度减少气泡。

---

## 并行策略组合: 3D 并行

```
total_gpus = TP × PP × DP

Example: 64 GPU
TP = 8, PP = 4, DP = 2
8 × 4 × 2 = 64 ✓
```

| 策略 | 解决的问题 | 引入的通信 |
|------|-----------|-----------|
| DP | 吞吐量 | All-Reduce (梯度) |
| TP | 单卡放不下大层 | All-to-All (激活) |
| PP | 单卡放不下多层 | P2P (激活/梯度) |
| FSDP | 显存不够 | All-Reduce (参数分片) |

---

*创建日期: 2026-03-30*
