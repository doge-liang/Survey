---
id: Wenyueh/MinivLLM
title: "MinivLLM: 简化版 vLLM 推理引擎"
source_type: github
upstream_url: "https://github.com/Wenyueh/MinivLLM"
generated_by: github-researcher
created_at: "2026-03-18T03:00:00Z"
updated_at: "2026-03-18T03:00:00Z"
tags: [llm, inference, vllm, paged-attention, flash-attention]
language: zh
---
# MinivLLM: 简化版 vLLM 推理引擎

> 基于 Nano-vLLM 的 vLLM 简化实现，包含自研的 Paged Attention 和 Flash Attention

[![GitHub stars](https://img.shields.io/github/stars/Wenyueh/MinivLLM)](https://github.com/Wenyueh/MinivLLM)
[![License](https://img.shields.io/github/license/Wenyueh/MinivLLM)](https://github.com/Wenyueh/MinivLLM)
[![Python](https://img.shields.io/badge/python-3.11+-3178c6)](https://www.python.org/)

## 概述

MinivLLM 是 vLLM 推理引擎的简化实现，基于 Nano-vLLM 项目。该项目包含自研的 Paged Attention（分页注意力）和 Flash Attention（闪速注意力）实现，用于学习和理解 vLLM 核心架构。

项目提供了 Prefilling 阶段和 Decoding 阶段的注意力机制基准测试，帮助开发者理解不同注意力实现方式的性能差异。

## 技术栈

| 类别 | 技术 |
|------|------|
| 编程语言 | Python 3.11 |
| 深度学习框架 | PyTorch |
| GPU 加速 | CUDA |
| 包管理 | uv |
| 依赖库 | transformers, xxhash |

## 项目结构

```
MinivLLM/
├── src/
│   └── myvllm/              # 核心 vLLM 实现
│       ├── models/           # 模型实现
│       ├── engine/           # LLM 引擎逻辑
│       │   ├── sequence.py      # 输入提示的序列定义
│       │   ├── block_manager.py # KV 缓存的块管理
│       │   ├── scheduler.py     # 基于迭代的序列调度
│       │   ├── runner.py       # prefilling 和 decoding 的实际实现
│       │   └── engine.py       # 生成 API 接口
│       ├── layers/            # 模型层组件
│       └── utils/             # 工具函数
├── main.py                   # 完整推理演示
├── benchmark_prefilling.py   # Prefilling 注意力比较
├── benchmark_decoding.py     # Decoding 注意力比较
├── setup.py                  # 包安装配置
└── pyproject.toml            # 项目配置
```

## 核心特性

### 1. Paged Attention (分页注意力)

- vLLM 核心创新，灵感来自操作系统虚拟内存分页
- 将 KV 缓存分割成非连续的内存块
- 显著减少内存碎片，提高推理效率

### 2. Flash Attention (闪速注意力)

- 在线 softmax 算法的内存高效实现
- 分块处理注意力，计算复杂度 O(N)
- 相比传统 O(N²) 大幅降低显存占用

### 3. 基准测试

项目提供了 Prefilling 和 Decoding 两个阶段的多种注意力实现对比：

**Prefilling 阶段比较：**
- PyTorch 标准实现 O(N²) 显存
- Naive Triton 实现 O(N²) 显存（受共享内存限制 ≤128 tokens）
- Flash Attention O(N) 显存

**Decoding 阶段比较：**
- Naive PyTorch：基于分页 KV 缓存的简单循环实现
- Optimized PyTorch：向量化实现，批量 gather 和 masking
- Triton Kernel：针对分页注意力解码优化的自定义 GPU 内核

### 4. 完整推理引擎

- 批量处理提示
- 温度采样生成
- 最多 256 tokens 生成
- 支持多 GPU 设置

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    MinivLLM 架构                             │
├─────────────────────────────────────────────────────────────┤
│  • Engine: 生成 API 接口                                     │
│  • Scheduler: 序列迭代调度                                  │
│  • Block Manager: KV 缓存块管理                              │
│  • Runner: Prefilling/Decoding 实现                         │
│  • Model: LLM 模型前向传播                                   │
│  • Layers: Attention, MLP 等模型层                           │
└─────────────────────────────────────────────────────────────┘
```

### 推理流程

1. **输入处理**：创建聊天提示的序列
2. **Prefilling 阶段**：处理输入提示，使用 Flash Attention
3. **Decoding 阶段**：逐 token 生成，使用 Paged Attention
4. **采样**：温度采样生成文本

## 快速开始

### 安装

```bash
# 安装 uv 包管理器
curl -LsSf https://astral.sh/uv/install.sh | sh

# 同步依赖
uv sync
```

### 运行推理演示

```bash
# 运行主推理引擎
uv run python main.py
```

这将：
- 创建一个小版本的 Qwen3（随机初始化）
- 创建 60 个聊天提示（2 个基础提示各重复 30 次）
- 通过自定义 LLM 引擎处理，使用批量处理
- 使用分页注意力和 KV 缓存管理进行高效推理
- 每个提示最多生成 256 个 tokens

### 运行基准测试

```bash
# Prefilling 阶段基准测试
uv run python benchmark_prefilling.py

# Decoding 阶段基准测试
uv run python benchmark_decoding.py
```

### 多 GPU 设置

在 main.py 中修改 world_size 为 n > 1 即可运行多 GPU 设置。

## 学习价值

### 适合人群

- **LLM 学习者**：理解推理引擎内部工作原理
- **系统工程师**：学习 GPU 优化技术
- **研究人员**：探索高效的注意力机制实现

### 可学习的内容

1. **vLLM 核心机制**：Paged Attention 原理和实现
2. **GPU 优化**：Flash Attention、Triton Kernel
3. **推理调度**：批量处理和序列调度
4. **内存管理**：KV 缓存的分页管理

### 学习路径

项目提供了 [HowToApproachvLLM.md](HowToApproachvLLM.md) 指南，包含：
- 各层实现详解
- 模型架构
- Paged Attention
- CUDA Graphs
- 调度机制

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [vLLM/vllm](https://github.com/vllm-project/vllm) | 生产级 LLM 推理引擎 | 高 |
| [Nano-vLLM](https://github.com/outlines-dev/nano-vLLM) | 简化版 vLLM | 高 |
| [FlashAI/flash-attention](https://github.com/Flash-AI/flash-attention) | Flash Attention 实现 | 高 |

## 参考资料

- [GitHub 仓库](https://github.com/Wenyueh/MinivLLM)
- [vLLM 官方仓库](https://github.com/vllm-project/vllm)
- [HowToApproachvLLM.md](HowToApproachvLLM.md) - 入门指南

---

*Generated: 2026-03-18*
