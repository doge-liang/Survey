# Llama2.c - 单文件纯 C 实现 Llama 2 推理

> 仅用一个约 700 行的 C 文件实现 Llama 2 模型的推理

[![GitHub stars](https://img.shields.io/github/stars/karpathy/llama2.c)](https://github.com/karpathy/llama2.c)
[![License](https://img.shields.io/github/license/karpathy/llama2.c)](https://github.com/karpathy/llama2.c)

## 概述

Llama2.c 是 Andrej Karpathy 创建的一个教育性项目，旨在使用纯 C 语言在一个文件中实现 Llama 2 架构的推理功能。该项目强调极简主义和代码可读性，是学习 LLM 架构和推理引擎实现的绝佳资源。

项目核心理念：
- **极简实现**：仅用约 700 行 C 代码实现完整推理
- **零依赖**：纯 C 实现，无需任何外部库
- **可移植性**：可在各种平台编译运行
- **教育价值**：代码清晰易懂，适合学习

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 语言     | C, Python          |
| 框架     | PyTorch（训练用）   |
| 构建工具 | GCC, Clang, Make   |
| 优化     | OpenMP             |

## 项目结构

```
karpathy/llama2.c/
├── run.c                   # 核心推理引擎（约 700 行）
├── runq.c                  # int8 量化推理版本
├── model.py                # PyTorch 模型定义（训练用）
├── train.py                # 训练脚本
├── export.py               # 模型转换脚本
├── tokenizer.py            # 分词器
├── tinystories.py          # 数据集下载和处理
├── sample.py               # PyTorch 推理对比
├── Makefile               # 编译配置
├── test.c                 # C 测试
└── test_all.py            # Python 测试
```

## 核心特性

1. **纯 C 推理引擎**：
   - 约 700 行代码实现完整 Llama 2 推理
   - 支持 float32 和 int8 量化推理
   - 支持多线程 OpenMP 加速

2. **模型训练支持**：
   - 提供 PyTorch 训练代码
   - 支持自定义数据集训练
   - 可训练超小模型（260K ~ 110M 参数）

3. **多种模型规模**：

   | 模型 | 参数 | 验证损失 | 下载 |
   |------|------|----------|------|
   | 260K | 260K | 1.297 | stories260K |
   | 15M | 15M | 1.072 | stories15M.bin |
   | 42M | 42M | 0.847 | stories42M.bin |
   | 110M | 110M | 0.760 | stories110M.bin |

4. **量化支持**：
   - 支持 int8 量化（Q8_0）
   - 3 倍推理加速
   - 4 倍模型体积减小

5. **多平台支持**：
   - Linux
   - macOS
   - Windows（MSVC, MinGW）
   - WebAssembly (WASM)

6. **丰富社区移植**：
   - Rust、Go、JavaScript、Zig 等多语言移植
   - Android、iOS 移植
   - 各种平台特定优化

## 架构设计

### Llama 2 vs GPT-2 架构差异

- **位置编码**：RoPE 旋转位置编码（替代 GPT 的绝对位置编码）
- **归一化**：RMSNorm（替代 LayerNorm）
- **激活函数**：SwiGLU（替代 ReLU）
- **线性层**：无偏置（bias=False）
- **多头注意力**：支持 MultiQuery 注意力

### 推理优化

- **量化**：int8 量化减少内存和加速
- **OpenMP**：多线程并行计算
- **编译优化**：-O3、-Ofast、-march=native

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/karpathy/llama2.c.git
cd llama2.c

# 下载小模型（15M 参数）
wget https://huggingface.co/karpathy/tinyllamas/resolve/main/stories15M.bin

# 编译并运行
make run
./run stories15M.bin

# 运行更大模型（42M 参数）
wget https://huggingface.co/karpathy/tinyllamas/resolve/main/stories42M.bin
./run stories42M.bin

# 使用 OpenMP 加速（多线程）
make runomp
OMP_NUM_THREADS=4 ./run stories42M.bin
```

### 训练自己的模型

```bash
# 下载数据集
python tinystories.py download
python tinystories.py pretokenize

# 训练模型
python train.py

# 或者使用自定义分词器
python tinystories.py train_vocab --vocab_size=4096
python train.py --vocab_source=custom --vocab_size=4096
```

### 推理 Meta Llama 2 模型

```bash
# 转换模型格式
python export.py llama2_7b.bin --meta-llama path/to/llama/model/7B

# 运行推理
./run llama2_7b.bin
```

## 性能基准

| 模型 | 硬件 | 速度 |
|------|------|------|
| stories15M | M1 MacBook Air | ~110 tokens/s |
| stories42M | M1 MacBook Air | ~50 tokens/s |
| llama2_7b (fp32) | Linux 96 线程 | ~4 tokens/s |
| llama2_7b (int8) | Linux 64 线程 | ~14 tokens/s |

## 学习价值

- **理解 LLM 架构**：通过阅读简洁的 C 代码深入理解 Llama 2 架构
- **掌握推理引擎**：学习如何实现高效的 LLM 推理引擎
- **量化技术**：理解 int8 量化原理和实现
- **编译器优化**：学习如何利用编译器优化提升性能
- **多平台移植**：了解如何将 C 代码移植到不同平台

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | 最简单的 GPT 训练/推理仓库 | High |
| [ggerganov/llama.cpp](https://github.com/ggerganov/llama.cpp) | 高效 Llama 推理库 | Medium |
| [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) | PyTorch 从零实现 GPT | Medium |
| [karpathy/llm.c](https://github.com/karpathy/llm.c) | 纯 C/CUDA 实现 GPT-2 训练 | High |

## 参考资料

- [Hugging Face 模型](https://huggingface.co/karpathy/tinyllamas)
- [TinyStories 数据集](https://huggingface.co/datasets/roneneldan/TinyStories)
- [Discord 社区](https://discord.gg/3zy8kqD9Cp)

---

*Generated: 2026-03-18*
