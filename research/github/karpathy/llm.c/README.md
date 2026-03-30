---
id: karpathy/llm.c
title: LLM.c - 纯 C/CUDA 实现 GPT-2 训练分析
source_type: github
upstream_url: "https://github.com/karpathy/llm.c"
generated_by: github-researcher
created_at: "2026-03-18T10:15:00Z"
updated_at: "2026-03-18T10:15:00Z"
tags: [llm, gpt, training, c, cuda, karpathy]
language: zh
---
# LLM.c - 纯 C/CUDA 实现 GPT-2 训练

> 无需 PyTorch，使用纯 C/CUDA 从零训练 GPT-2 模型

[![GitHub stars](https://img.shields.io/github/stars/karpathy/llm.c)](https://github.com/karpathy/llm.c)
[![License](https://img.shields.io/github/license/karpathy/llm.c)](https://github.com/karpathy/llm.c)

## 概述

LLM.c 是 Andrej Karpathy 创建的一个教育性项目，旨在使用纯 C/CUDA 从零实现 GPT-2 模型的训练，无需依赖庞大的 PyTorch 库（245MB）和 Python（107MB）。该项目是目前最极简的 LLM 训练实现之一。

项目核心理念：
- **极简训练**：纯 C/CUDA 实现，无需 PyTorch
- **高性能**：比 PyTorch Nightly 快约 7%
- **教育价值**：代码简洁易懂，适合学习
- **完整实现**：支持预训练、微调、分布式训练

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 语言     | CUDA, C, Python   |
| 框架     | 纯 C/CUDA（无依赖） |
| 构建工具 | Make, GCC, Clang  |
| 分布式   | OpenMPI, NCCL     |
| 优化     | cuBLAS, cuDNN     |

## 项目结构

```
karpathy/llm.c/
├── train_gpt2.cu           # CUDA 训练主文件
├── train_gpt2.c            # CPU 参考实现（约 1000 行）
├── train_gpt2.py           # PyTorch 参考实现
├── llmc/                   # C/CUDA 工具库
│   ├── tokenizer.h         # 分词器
│   ├── dataloader.h       # 数据加载器
│   ├── cuda_common.h       # CUDA 工具
│   ├── cuda_utils.cuh      # CUDA 内核
│   └── ...
├── dev/
│   ├── data/              # 数据处理脚本
│   └── cuda/              # CUDA 内核库
├── scripts/                # 训练脚本
├── doc/                    # 文档和教程
├── Makefile
└── requirements.txt
```

## 核心特性

1. **纯 C/CUDA 实现**：
   - 无需任何深度学习框架
   - 约 1000 行 CPU 参考实现
   - 完整的 CUDA 加速版本
   - 支持混合精度训练

2. **性能优化**：
   - 比 PyTorch Nightly 快约 7%
   - 支持 cuBLAS、cuBLASLt 加速
   - 支持 cuDNN Flash Attention
   - 支持多 GPU 分布式训练

3. **分布式训练**：
   - 单机多卡（OpenMPI）
   - 多节点训练
   - 支持 NCCL 通信

4. **模型支持**：
   - GPT-2 124M（最小）
   - GPT-2 350M
   - GPT-2 774M
   - GPT-2 1.6B
   - GPT-3 小系列

5. **多平台支持**：
   - CUDA GPU
   - CPU（仅参考学习）
   - AMD GPU（非官方）
   - Metal（Mac 非官方）

## 架构设计

### 核心模块

1. **Tokenizer**：GPT-2 BPE 分词器
2. **Dataloader**：高效数据加载
3. **Model**：GPT-2 Transformer 实现
4. **Optimizer**：AdamW 优化器
5. **Scheduler**：学习率调度
6. **Logger**：训练日志

### 优化技术

- **混合精度**：FP16/BF16 训练
- **Flash Attention**：使用 cuDNN 实现
- **梯度累积**：支持大 batch 训练
- **分布式**：多卡/多节点训练

## 快速开始

### 下载预训练包

```bash
chmod u+x ./dev/download_starter_pack.sh
./dev/download_starter_pack.sh
```

### CUDA 训练（单 GPU）

```bash
make train_gpt2cu
./train_gpt2cu
```

### CPU 参考实现

```bash
make train_gpt2
OMP_NUM_THREADS=8 ./train_gpt2
```

### 多 GPU 训练

```bash
make train_gpt2cu
mpirun -np 4 ./train_gpt2cu
```

### 运行测试

```bash
# CPU 测试
make test_gpt2
./test_gpt2

# CUDA 测试
make test_gpt2cu PRECISION=FP32 && ./test_gpt2cu
```

## 性能基准

| 模型 | GPU | 批量大小 | 训练速度 |
|------|-----|----------|----------|
| GPT-2 124M | A100 | 32 | ~10K tokens/s |
| GPT-2 350M | A100 | 32 | ~5K tokens/s |
| GPT-2 1.6B | 4xA100 | 32 | ~3K tokens/s |

## 学习价值

- **深入理解 Transformer**：通过阅读简洁的 C 代码理解 GPT 架构
- **掌握 CUDA 编程**：学习如何编写高效的 GPU 内核
- **理解训练流程**：掌握数据加载、梯度计算、优化器等核心概念
- **性能优化**：学习混合精度、分布式训练等优化技术
- **框架原理**：理解深度学习框架底层实现

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | 最简单的 GPT 训练仓库 | High |
| [karpathy/llama2.c](https://github.com/karpathy/llama2.c) | 纯 C 实现 Llama 2 推理 | Medium |
| [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) | PyTorch 从零实现 | Medium |

## 参考资料

- [Discussion #481 - GPT-2 124M 复现指南](https://github.com/karpathy/llm.c/discussions/481)
- [LayerNorm 教程](doc/layernorm/layernorm.md)
- [Discord 社区](https://discord.gg/3zy8kqD9Cp)

---

*Generated: 2026-03-18*
