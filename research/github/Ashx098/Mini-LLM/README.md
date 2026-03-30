---
id: Ashx098/Mini-LLM
title: Mini-LLM 80M 参数 LLM 从零实现
source_type: github
upstream_url: "https://github.com/Ashx098/Mini-LLM"
generated_by: github-researcher
created_at: "2026-03-18T10:00:00Z"
updated_at: "2026-03-18T10:00:00Z"
tags: [llm, rope, gqa, swiglu, training, pytorch, transformer]
language: zh
---
# Mini-LLM: 从零构建 80M 参数语言模型

> 一个生产级实现的 decoder-only transformer 语言模型，从分词器到架构到训练到推理的完整 LLM 工程。

[![GitHub stars](https://img.shields.io/github/stars/Ashx098/Mini-LLM)](https://github.com/Ashx098/Mini-LLM)
[![License](https://img.shields.io/github/license/Ashx098/Mini-LLM)](https://github.com/Ashx098/Mini-LLM)
[![Python](https://img.shields.io/badge/python-3.10+-blue)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-ee4c2c)](https://pytorch.org/)

## 概述

Mini-LLM 是一个从零开始构建的生产级 LLM 实现，展示了从原始文本到可用语言模型的完整流程。该项目从 80M 参数起步，经过工程化设计可以扩展到 1B+ 参数只需少量修改。代码简洁、面向研究，是想要从第一性原理理解和构建 LLM 的开发者的理想资源。

该模型在 NVIDIA A100 (80GB) 上训练了 10,000 步（5 小时），尽管数据集较小且训练时间较短，模型已学会了语法、句法基础和基本的世界知识。

## 技术栈

| 类别 | 技术 |
|------|------|
| 编程语言 | Python 3.10+ |
| 深度学习框架 | PyTorch 2.0+ |
| 分词器 | SentencePiece BPE (32K 词表) |
| 训练加速 | FlashAttention, torch.compile, 混合精度 (BF16/FP16) |
| 数据加载 | 内存映射 (Memory-mapped) |
| 实验追踪 | TensorBoard, Weights & Biases |

## 项目结构

```
Mini-LLM/
├── Tokenizer/               # 分词器模块
│   ├── BPE/                # BPE 分词器产物
│   ├── train_spm_bpe.py   # 训练 BPE 分词器
│   └── convert_to_hf.py   # 转换为 HuggingFace 格式
├── data/                    # 数据处理
│   ├── raw/                # 原始文本来源
│   ├── bin/                # 分词后的二进制文件
│   └── prepare_data.py    # 分词脚本
├── model/                   # 模型架构
│   ├── config.py           # 模型配置
│   ├── embedding.py       # Token 嵌入
│   ├── rmsnorm.py         # RMS 归一化
│   ├── rope.py            # 旋转位置编码 (RoPE)
│   ├── attention.py       # 多头注意力 (含 GQA)
│   ├── mlp.py             # SwiGLU 前馈网络
│   ├── transformer_block.py # 单层 Transformer
│   └── transformer.py     # 完整模型
├── train/                   # 训练基础设施
│   ├── config.yaml        # 生产训练配置
│   ├── dataloader.py     # 内存映射数据加载
│   ├── optimizer.py      # AdamW 优化器
│   ├── lr_scheduler.py   # 余弦学习率调度
│   └── train.py          # 主训练循环
├── inference/              # 文本生成
│   ├── sampling.py       # 采样策略
│   └── generate.py       # 生成引擎
└── tests/                 # 验证测试
```

## 核心特性

### 1. 现代架构组件

- **RoPE (旋转位置编码)**：相比学习位置编码，具有更好的序列外推能力
- **RMSNorm**：比 LayerNorm 更快更简单，被 LLaMA 采用
- **SwiGLU**：门控激活函数，经验上优于 GELU/ReLU
- **GQA (分组查询注意力)**：减少 KV 缓存大小，加速推理
- **FlashAttention**：通过 PyTorch SDPA 实现

### 2. 高效训练

- **内存映射数据加载**：用最小 RAM 训练 TB 级数据集
- **梯度累积**：在小 GPU 上模拟大 batch
- **混合精度 (BF16/FP16)**：2 倍训练速度，50% 内存节省
- **Torch Compile**：现代 GPU 上 20-30% 加速
- **融合 AdamW**：优化的优化器内核

### 3. 生产级推理

- **KV 缓存**：通过复用过去计算实现 100 倍加速生成
- **Top-p 采样**：核采样高质量文本生成
- **温度控制**：调整创造性/确定性
- **流式支持**：逐 token 生成

### 4. 可扩展设计

- **配置驱动**：80M → 80B 只需修改配置
- **权重绑定**：embeddings ↔ output layer 共享权重
- **模块化架构**：各组件独立可测试

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Mini-LLM 架构                              │
├─────────────────────────────────────────────────────────────┤
│  • Decoder-only Transformer (GPT 风格)                        │
│  • 16 层 × 384 隐藏维度 × 6 注意力头                          │
│  • RoPE 位置嵌入 (非学习位置)                                 │
│  • RMSNorm (比 LayerNorm 更快)                                │
│  • SwiGLU 激活 (优于 GELU)                                   │
│  • 分组查询注意力支持                                         │
│  • 权重绑定 (embeddings ↔ 输出层)                            │
└─────────────────────────────────────────────────────────────┘
```

### 关键架构参数

| 组件 | 值 |
|------|-----|
| 模型类型 | Decoder-only transformer |
| 参数量 | ~80M |
| 层数 | 16 |
| 嵌入维度 | 384 |
| 注意力头数 | 6 |
| KV 头数 | 6 |
| MLP 隐藏维度 | 1536 (SwiGLU) |
| 最大序列长度 | 2048 |
| 归一化 | RMSNorm |
| 位置编码 | RoPE |
| 分词器 | SentencePiece BPE (32K 词表) |

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/Ashx098/Mini-LLM.git
cd Mini-LLM

# 创建虚拟环境
python -m venv MiniLLM-env
source MiniLLM-env/bin/activate  # Windows: MiniLLM-env\Scripts\activate

# 安装依赖
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install transformers datasets accelerate tokenizers sentencepiece huggingface_hub tqdm numpy scipy pyyaml tensorboard einops wandb
```

### 训练模型

```bash
# 1. 准备数据（如需要）
python data/prepare_data.py

# 2. 使用测试配置训练（快速验证）
python run_train.py --config train/config_test.yaml

# 3. 使用生产配置训练
python run_train.py --config train/config.yaml
```

### 文本生成

```python
from inference.generate import Generator

# 加载训练好的模型
gen = Generator(
    checkpoint_path="out/ckpt.pt",
    tokenizer_path="Tokenizer/BPE",
    device="cuda"
)

# 生成文本
output = gen.generate(
    prompt="从前有座山",
    max_new_tokens=50,
    temperature=0.8,
    top_p=0.95
)

print(output)
```

### 在线体验

无需安装 - 可直接在 HuggingFace 测试模型：
**https://huggingface.co/Ashx098/Mini-LLM**

或在 Google Colab 运行演示 notebook：
**https://colab.research.google.com/github/Ashx098/Mini-LLM/blob/main/demo.ipynb**

## 学习价值

### 适合人群

- **学生**：理解现代 LLM 架构，无需淹没在 100B 参数代码中
- **研究人员**：清晰、可 hack 的代码库用于实验
- **工程师**：可应用于真实训练任务的生产模式
- **自学者**：每个文件都有 README 解释"为什么"，不仅是"怎么做"

### 可迁移的知识

1. **RoPE**：在此学习，可直接应用于 7B 模型
2. **生产模式**：混合精度、梯度累积、checkpointing - 真实技术
3. **现代技术栈**：Flash Attention, torch.compile, 内存映射数据加载

### 实现的论文

1. **Attention Is All You Need** - 原始 Transformer
2. **RoFormer** - 旋转位置编码
3. **RMSNorm** - 均方根归一化
4. **GLU Variants** - SwiGLU 激活
5. **LLaMA** - 架构灵感

### 与教程的对比

| 特性 | 大多数教程 | Mini-LLM |
|------|-----------|----------|
| 位置编码 | 学习位置 (无法外推) | RoPE (可扩展到更长序列) |
| 归一化 | LayerNorm | RMSNorm (更快、更稳定) |
| 激活函数 | GELU/ReLU | SwiGLU (最新技术) |
| 注意力 | 标准 MHA | 分组查询注意力 (高效) |
| 分词 | 字符级 | SentencePiece BPE (32K 词表) |
| 精度 | 仅 FP32 | BF16/FP16 混合精度 |
| 数据加载 | 全部加载到内存 | 内存映射 (支持 TB 级) |
| 推理 | 无 KV 缓存 | 完整 KV 缓存 (100x 加速) |
| 扩展 | 硬编码 | 配置驱动 (80M → 80B) |

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | 最小的 GPT 训练教程 | 高 |
| [LLaMA](https://github.com/facebookresearch/llama) | Meta 的 LLM 系列 | 高 |
| [qiuqiangkong/mini_llm](https://github.com/qiuqiangkong/mini_llm) | 最小化 LLaMA 实现 | 高 |
| [kuleshov/minillm](https://github.com/kuleshov/minillm) | 消费级 GPU 上的 LLM | 中 |

## 参考资料

- [GitHub 仓库](https://github.com/Ashx098/Mini-LLM)
- [HuggingFace 模型](https://huggingface.co/Ashx098/Mini-LLM)
- [Google Colab 演示](https://colab.research.google.com/github/Ashx098/Mini-LLM/blob/main/demo.ipynb)
- [The Illustrated Transformer](http://jalammar.github.io/illustrated-transformer/)
- [Hugging Face Transformers Course](https://huggingface.co/course)

---

*Generated: 2026-03-18*
