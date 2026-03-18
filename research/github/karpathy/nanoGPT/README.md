# nanoGPT

> 最简单、最快速的中型 GPT 训练/微调代码库。

[![GitHub stars](https://img.shields.io/github/stars/karpathy/nanoGPT)](https://github.com/karpathy/nanoGPT)
[![License](https://img.shields.io/github/license/karpathy/nanoGPT)](https://github.com/karpathy/nanoGPT)

## 概述

**nanoGPT** 是 Andrej Karpathy 开发的极简 GPT 训练框架，是 minGPT 的重写版本。与 minGPT 注重教育性不同，nanoGPT 优先考虑实用性和效率。它用最简洁的代码实现了完整的 GPT-2 训练流程：

- **model.py** ~300 行：纯 PyTorch 实现的 GPT 模型
- **train.py** ~300 行：分布式训练循环
- **sample.py** ~90 行：推理采样

⚠️ **注意**：截至 2025 年 11 月，nanoGPT 已被标记为废弃（deprecated），Karpathy 推荐新项目使用其继任者 [nanochat](https://github.com/karpathy/nanochat)。

## 技术栈

| 类别     | 技术                                      |
| -------- | ----------------------------------------- |
| 语言     | Python 3.x                                |
| 深度学习 | PyTorch 2.0+ (支持 torch.compile)         |
| 预训练   | HuggingFace Transformers, TikToken        |
| 数据     | HuggingFace Datasets                      |
| 日志     | Weights & Biases (可选)                   |
| 依赖管理 | pip                                       |

## 项目结构

```
nanoGPT/
├── model.py              # GPT 模型定义 (~330 行)
├── train.py              # 训练循环 (~336 行)
├── sample.py             # 推理采样 (~89 行)
├── bench.py              # 基准测试 (~117 行)
├── configurator.py       # 配置管理 (~47 行)
├── config/               # 配置文件
│   ├── train_gpt2.py         # GPT-2 训练配置
│   ├── train_shakespeare_char.py  # 字符级训练
│   ├── finetune_shakespeare.py    # 微调配置
│   └── eval_gpt2*.py           # 评估配置
├── data/                 # 数据集
│   ├── openwebtext/          # OpenWebText 数据集
│   ├── shakespeare/          # 莎士比亚剧本
│   └── shakespeare_char/     # 字符级莎士比亚
└── assets/               # 资源图片
```

## 核心特性

### 1. 极简实现
代码极度精简，每个核心文件仅约 300 行，便于学习和修改。

### 2. GPT-2 复现
在单台 8x A100 40GB 节点上约 4 天可复现 GPT-2 (124M) 在 OpenWebText 上的训练，验证损失达到 ~2.85。

### 3. 灵活的微调支持
支持从预训练的 GPT-2 检查点（最大到 1.5B 参数）进行微调，学习莎士比亚风格的文本。

### 4. 分布式训练
支持 PyTorch Distributed Data Parallel (DDP) 多 GPU/多节点训练。

### 5. Apple Silicon 支持
通过 `--device=mps` 支持 Apple Silicon Mac 的 Metal Performance Shaders 加速。

## 快速开始

### 安装依赖

```bash
pip install torch numpy transformers datasets tiktoken wandb tqdm
```

### 训练字符级 GPT（莎士比亚）

```bash
# 准备数据
python data/shakespeare_char/prepare.py

# 训练（GPU）
python train.py config/train_shakespeare_char.py

# 采样生成
python sample.py --out_dir=out-shakespeare-char
```

### 复现 GPT-2 (124M)

```bash
# 准备 OpenWebText
python data/openwebtext/prepare.py

# 8 GPU 分布式训练
torchrun --standalone --nproc_per_node=8 train.py config/train_gpt2.py
```

### 微调预训练模型

```bash
python train.py config/finetune_shakespeare.py
```

## 架构设计

### GPT 模型 (model.py)
- **Token Embedding** + **Position Embedding**
- **Transformer Block** x N：
  - Layer Normalization
  - Causal Self-Attention (Masked Multi-Head Attention)
  - Feed-Forward Network (MLP)
  - Residual Connections
- **Layer Normalization** + **Language Modeling Head**

### 训练循环 (train.py)
- 混合精度训练 (AMP) + GradScaler
- 梯度裁剪 (Gradient Clipping)
- 学习率调度 (Warmup + Cosine Decay)
- 分布式数据并行 (DDP)
- 检查点保存与恢复

### 关键超参数
| 参数 | GPT-2 124M | Shakespeare Char |
|------|-----------|-----------------|
| n_layer | 12 | 6 |
| n_head | 12 | 6 |
| n_embd | 768 | 384 |
| block_size | 1024 | 256 |
| batch_size | 12 | 64 |
| learning_rate | 6e-4 | 1e-3 |

## 性能基准

在 OpenWebText 上的验证损失对比：

| 模型 | 参数量 | Train Loss | Val Loss |
|------|--------|-----------|----------|
| gpt2 | 124M | 3.11 | 3.12 |
| gpt2-medium | 350M | 2.85 | 2.84 |
| gpt2-large | 774M | 2.66 | 2.67 |
| gpt2-xl | 1558M | 2.56 | 2.54 |

## 学习价值

1. **Transformer 从零实现**：简洁的代码展示了 GPT 架构的核心组件
2. **分布式训练实践**：展示了 DDP 的正确使用方式
3. **训练技巧**：学习率调度、梯度裁剪、混合精度训练
4. **代码简洁性**：如何用极少的代码实现强大的功能
5. **研究到生产**：从教育代码（minGPT）到实用代码（nanoGPT）的演进

## 适用场景

- ✅ 学习 GPT/Transformer 架构
- ✅ 小规模语言模型训练实验
- ✅ 基于 GPT-2 的微调任务
- ✅ 分布式训练学习
- ❌ 大规模生产部署（建议使用 nanochat 或其他框架）

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [minGPT](https://github.com/karpathy/minGPT) | nanoGPT 的前身，更注重教育性 | High |
| [nanochat](https://github.com/karpathy/nanochat) | nanoGPT 的继任者，推荐新项目使用 | High |
| [transformers](https://github.com/huggingface/transformers) | HuggingFace 的完整 Transformers 库 | Medium |
| [llm.c](https://github.com/karpathy/llm.c) | 纯 C/CUDA 实现的大语言模型训练 | Medium |

## 参考资料

- [GitHub Repository](https://github.com/karpathy/nanoGPT)
- [Zero To Hero 系列视频](https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ) - Karpathy 的神经网络教学
- [GPT-2 Paper](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)

---

*Generated: 2026-03-18*
