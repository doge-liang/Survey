# Distributed Training Strategies — 分布式训练策略完全指南

> 本文档涵盖 DP/DDP/FSDP、TP/SP/PP 并行策略、通信原语、框架对比、Gpipe 空泡率分析、1F1B 调度等核心概念。

---

## 一、并行策略概览

| 缩写 | 全称 | 并行维度 | 适用场景 |
|------|------|---------|---------|
| **DP** | Data Parallelism | Data | 小模型，单机多卡 |
| **DDP** | Distributed Data Parallel | Data | 中模型，工业级 |
| **FSDP** | Fully Sharded Data Parallel | Data + Model | 超大模型，单卡装不下 |
| **TP** | Tensor Parallelism | Tensor/权重 | 超大单层，需 NVLink |
| **PP** | Pipeline Parallelism | Layer | 深层模型 |
| **SP** | Sequence Parallelism | Sequence | 长序列 (128K+) |

---

## 二、数据并行 (DP / DDP)

### 2.1 DP vs DDP

| 特性 | DP | DDP |
|------|-----|-----|
| 通信方式 | Tree-AllReduce | Ring-AllReduce |
| 通信效率 | 瓶颈在主卡 | 通信均匀分布 |
| 加速比 | 较差 | 接近线性 |
| 故障容忍 | 差 | 好 |
| 代码 | `nn.DataParallel` | `DistributedDataParallel` |

### 2.2 Ring-AllReduce 原理

```
阶段 1: Reduce-Scatter
每个 GPU 累加相邻数据后 Ring 传递

Step 0:  GPU0=[1]  GPU1=[2]  GPU2=[3]  GPU3=[4]
                 ↓
Step 1:  GPU0=[1+4]  GPU1=[2+1]  GPU2=[3+2]  GPU3=[4+3]
                 ↓
Step 2:  GPU0=[1+4+3]  GPU1=[2+1+4]  GPU2=[3+2+1]  GPU3=[4+3+2]
                 ↓
Step 3:  GPU0=[10]  GPU1=[10]  GPU2=[10]  GPU3=[10]

阶段 2: AllGather
广播完整归约结果
```

**核心优势**：通信负载均匀分摊，无中心瓶颈。

---

## 三、ZeRO 与 FSDP

### 3.1 ZeRO 三个阶段

```
ZeRO-1 (Stage 1):
  每卡: 1/N 优化器状态 + 完整模型参数 + 完整梯度

ZeRO-2 (Stage 2):
  每卡: 1/N 优化器状态 + 1/N 梯度 + 完整模型参数

ZeRO-3 (Stage 3):
  每卡: 1/N 优化器状态 + 1/N 梯度 + 1/N 模型参数 ⚠️
```

| Stage | 显存节省 | 通信量增幅 |
|-------|---------|-----------|
| ZeRO-1 | ~4x | +12.5% |
| ZeRO-2 | ~8x | +26% |
| ZeRO-3 | ~N倍 | ~2x |

### 3.2 PyTorch FSDP 代码

```python
from torch.distributed.fsdp import (
    FullyShardedDataParallel as FSDP,
    ShardingStrategy,
    MixedPrecision,
    BackwardPrefetch,
)

model = FSDP(
    model,
    sharding_strategy=ShardingStrategy.FULL_SHARD,
    mixed_precision=MixedPrecision(
        param_dtype=torch.float16,
        reduce_dtype=torch.float16,
    ),
    backward_prefetch=BackwardPrefetch.BACKWARD_PRE,
)
```

---

## 四、张量并行 (TP)

### 4.1 Column Parallel + Row Parallel

```
Transformer Layer 中的 Linear 层切分:

Column Parallel (QKV 投影):
  W: [hidden, 3*hidden] → W0:[hidden, hidden], W1:[hidden, hidden]
  GPU0: Y0 = X × W0
  GPU1: Y1 = X × W1
  Result: Y = concat(Y0, Y1) → AllGather

Row Parallel (Output 投影):
  W: [hidden, hidden] → W0:[hidden/2, hidden], W1:[hidden/2, hidden]
  Y0 = X0 × W0, Y1 = X1 × W1
  Result: Y = Y0 + Y1 → AllReduce
```

### 4.2 TP 通信模式

| 操作 | 通信原语 | 通信量 |
|------|---------|--------|
| QKV 投影后 | AllGather | O(seq × hidden) |
| Attention 后 | AllGather | O(seq × hidden) |
| Output 投影前 | AllReduce | O(seq × hidden) |

---

## 五、流水线并行 (PP)

### 5.1 Gpipe 空泡率公式

```
Bubble Rate = 2·(p - 1) / (m + p)

当 m >> p 时，简化为:
Bubble Rate ≈ 2·(p - 1) / m

其中:
  p = pipeline stage 数量 (GPU 数)
  m = micro-batch 数量
```

**数值示例**:

| p | m | 空泡率 |
|---|-----|-------|
| 8 | 64 | ~19.4% |
| 8 | 256 | ~5.3% |
| 8 | 1024 | ~1.4% |

### 5.2 1F1B 调度 (One-Forward-One-Backward)

```
朴素调度:
  [F0][F1][F2][F3]...[F7] [B7][B6][B5][B4]...  ← 大量空泡

1F1B 调度:
  [F0][B0][F1][B1][F2][B2]...  ← Forward 和 Backward 交替，减少空闲
```

**1F1B Interval**: 一个 micro-batch 的 Forward 完成到它的 Backward 开始之间，pipeline 中能塞入的 micro-batch 数量。Interval 越大吞吐越高但显存越大。

---

## 六、序列并行 (SP)

### 6.1 Ring Attention

```
SP 切分 seq_len 到各 GPU:
  GPU 0: tokens [0, seq/4)
  GPU 1: tokens [seq/4, seq/2)
  GPU 2: tokens [seq/2, 3*seq/4)
  GPU 3: tokens [3*seq/4, seq)

Attention 计算时 K, V 通过 Ring 传递，不做 AllGather
```

### 6.2 Flash Attention + SP 组合

```
Flash Attention:
  - 分块计算，不存储完整的 N×N attention matrix
  - 显存从 O(N²) 降到 O(N)

SP + Ring Attention:
  - 每个 GPU 只处理部分 sequence
  - K, V Ring 传递，通信量均衡
  - 适合超长上下文 (131K+, 1M tokens)
```

---

## 七、通信原语

### 7.1 通信带宽对比

```
NVLink (单卡):     900 GB/s  (H100)
PCIe Gen5 x16:     128 GB/s
InfiniBand HDR:     50 GB/s
Ethernet 100GbE:   12.5 GB/s
```

### 7.2 核心通信原语

| 原语 | 通信量 | 典型用途 |
|------|--------|---------|
| **AllReduce** | O(N) | DDP 梯度同步 |
| **AllGather** | O(N × P) | TP QKV 同步 |
| **ReduceScatter** | O(N) | FSDP 梯度分片 |
| **Broadcast** | O(N) | 广播相同数据 |
| **Scatter** | O(N) | 分发不同分片 |

```
AllReduce (Ring 实现):
  - 每个 GPU 只和相邻节点通信
  - 通信量: 2 × (P-1)/P × N ≈ 2N
  - 适合 GPU 间同步

AllGather:
  - 每个 GPU 收集所有其他 GPU 的数据
  - 通信量: O(N × P)
  - TP 中用于拼接 QKV 分片
```

---

## 八、框架对比

### 8.1 框架选择

| 框架 | 开发方 | 核心优化 | 适用场景 |
|------|--------|---------|---------|
| **DeepSpeed** | Microsoft | ZeRO + Inference | 超大模型，产线部署 |
| **Megatron-LM** | NVIDIA | TP + SP | NVLink 环境，TP 优化 |
| **Fairscale** | Meta | FSDP | PyTorch 原生扩展 |
| **ColossalAI** | HPC-AI Lab | 多维并行 + 自动调度 | 自动最优策略 |
| **Alpa** | UC Berkeley | 自动并行 | 不想手动调优 |
| **PyTorch 原生** | Meta | DDP + FSDP | 够用就行 |

### 8.2 DeepSpeed vs Megatron

| 特性 | DeepSpeed | Megatron-LM |
|------|-----------|-------------|
| TP 支持 | ⚠️ 集成 | ✅ 最佳 |
| ZeRO/FSDP | ✅ 最佳 | ⚠️ 实验性 |
| CPU Offload | ✅ | ❌ |
| Inference 优化 | ✅ | ✅ |
| 上手难度 | 中 | 高 |

### 8.3 推荐组合

```
LLaMA-70B 训练:
  DeepSpeed ZeRO-3 + Megatron TP (取长补短)

Stable Diffusion 训练:
  PyTorch FSDP (原生，简单高效)

产线部署:
  DeepSpeed (生态好，易用)

研究环境:
  Megatron-LM + Alpa (最新优化 + 自动搜索)
```

---

## 九、显存估算

```python
def estimate_memory(
    model_params_b: int,        # 模型参数量 (B)
    batch_size: int,
    seq_len: int,
    hidden_size: int,
    num_heads: int,
    tp_size: int = 1,
    pp_size: int = 1,
    use_flash: bool = True,
    dtype: str = "fp16"
):
    """
    估算训练所需显存 (GB)
    """
    bytes_per_param = 2 if dtype == "fp16" else 1

    # 模型参数 + 梯度 + 优化器状态
    param_memory = model_params_b * 1e9 * bytes_per_param / 1e9

    # Activation (Flash Attention 可大幅减少)
    if use_flash:
        act_memory = batch_size * seq_len * hidden_size * 4 / tp_size
    else:
        act_memory = batch_size * seq_len * seq_len * 4 / tp_size

    total = (
        param_memory * 2 +           # params + grads
        param_memory * 4 +           # optimizer states (Adam)
        act_memory / pp_size
    ) / tp_size

    return total
```

---

## 十、Rematerialization (Checkpointing)

### 10.1 问题

```
LLaMA-70B 单是 activation 就需要 ~49 GB:
  - Attention scores: 32 heads × 2048² × 4 bytes = 512 MB/层
  - 80 层 × 512 MB = 40 GB
  - 远超单卡容量 (80GB)
```

### 10.2 解决方案

```
不保存全部 activation，Backward 时重新计算

无 Checkpointing:
  Forward 时保存所有中间 activation
  → ~49 GB activation

有 Checkpointing:
  Forward 时只保存每层输入
  Backward 时重新跑一遍 Forward
  → ~2 GB activation
  → 代价: ~20-30% 额外 Forward 时间
  → 收益: activation 显存减少 60-80%
```

### 10.3 PP + Checkpointing 联合效果

```
Gpipe (p=8) + Checkpointing:
  - Activation per GPU: 49 GB / 8 ≈ 6 GB
  - 每个 micro-batch 重计算: 1/8 层 × 49 GB = 6 GB
  - Bubble rate: ~19% (m=64)
  - 可以训练了!
```

---

## 十一、架构选择决策树

```
模型能放单卡吗?
│
├─ YES → DDP
│         └─ 加速比不够? → NVLink + DDP
│
└─ NO → 模型太大单卡放不下?
         │
         ├─ 主要用 TP (NVLink)? → Megatron-LM
         │
         ├─ 需要 CPU Offload? → DeepSpeed ZeRO-3
         │
         ├─ 超大模型 (100B+)? → DeepSpeed + Megatron
         │
         └─ 想自动最优策略? → Alpa
```

---

## 十二、VPP (Virtual Pipeline Parallelism)

### 12.1 核心思想

```
把每个物理 GPU 的层再细分成多个 virtual stage

标准 PP (Virtual = 1):
  GPU0: [L0-L19]        → 1 个厚块

VPP (Virtual = 4):
  GPU0: [L0-L4][L5-L9][L10-L14][L15-L19]  → 4 个薄块
  GPU1: [L20-L24][L25-L29][L30-L34][L35-L39]
  ...

物理 GPU 数 = p，逻辑 pipeline stage 数 = p × v
```

### 12.2 空泡率公式

```
标准 PP:
  Bubble Rate = 2(p - 1) / (m + p)

VPP:
  Bubble Rate = 2(p·v - 1) / (m + p·v)
  v = virtual stage 数量
```

| 配置 | p | v | m | 空泡率 |
|------|---|---|-----|--------|
| 标准 PP | 4 | 1 | 16 | ~36% |
| VPP | 4 | 4 | 16 | ~6.25% |
| 标准 PP | 8 | 1 | 64 | ~19% |
| VPP | 8 | 4 | 64 | ~5.5% |

### 12.3 优缺点

```
优点:
✅ 空泡率大幅降低
✅ 吞吐提升 ~15-20%

缺点:
❌ 每个 GPU 要管理 v 个 virtual stage 的 buffer
❌ 调度复杂性增加
❌ 需要更多 micro-batch (m 要跟上)
```

### 12.4 配置示例

```python
# Megatron-LM
tensor_model_parallel_size=8,           # TP = 8
pipeline_model_parallel_size=8,          # PP = 8
virtual_pipeline_model_parallel_size=4,  # VPP = 4
# 总 pipeline depth = 8 × 4 = 32 个逻辑 stage

# DeepSpeed
{
    "pipeline": {
        "enabled": True,
        "parallelism": 8,
        "virtual_pipeline_parallel_size": 4
    }
}
```

---

## 附录: 关键公式速查

| 公式 | 用途 |
|------|------|
| `Bubble Rate = 2(p-1)/(m+p)` | Gpipe 空泡率 |
| `AllReduce 通信量 = 2N` | Ring-AllReduce |
| `AllGather 通信量 = N × P` | AllGather |
| `Activation (Flash) = O(N)` | Flash Attention 显存 |
| `Activation (Naive) = O(N²)` | 朴素 Attention 显存 |
