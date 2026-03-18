# Llama Models

> Meta 开源大语言模型系列工具库

[![GitHub stars](https://img.shields.io/github/stars/meta-llama/llama-models)](https://github.com/meta-llama/llama-models)
[![License](https://img.shields.io/github/license/meta-llama/llama-models)](https://github.com/meta-llama/llama-models)

## 概述

Llama Models 是 Meta 推出的开源大语言模型（LLM）工具库，旨在为开发者、研究人员和企业提供构建、实验和负责任地扩展生成式 AI 的能力。该项目作为 Llama 模型系列的官方支持仓库，提供了模型下载、推理、量化等核心功能。

Llama 模型已累计下载数亿次，拥有数千个社区项目，是全球最受欢迎的开源大语言模型之一。

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | Python |
| 框架 | PyTorch |
| 构建工具 | pip, setuptools |
| 模型格式 | safetensors, pytorch |
| 协议 | 自定义商业许可 |

## 项目结构

```
meta-llama/llama-models/
├── .github/              # GitHub 配置
├── docs/                 # 文档
├── models/               # 模型定义和卡片
│   ├── llama2/          # Llama 2 系列
│   ├── llama3/          # Llama 3 系列
│   ├── llama3_1/        # Llama 3.1 系列
│   ├── llama3_2/        # Llama 3.2 系列 (含 Vision)
│   ├── llama3_3/        # Llama 3.3 系列
│   └── llama4/          # Llama 4 系列
├── llama_models/        # 核心 Python 包
└── README.md            # 项目说明
```

## 核心特性

1. **模型下载管理**: 提供 `llama-model` CLI 工具，支持从 Meta 官方或 Hugging Face 下载模型权重
2. **多版本支持**: 完整支持从 Llama 2 到 Llama 4 的所有版本，包括 7B 到 405B 的不同参数规模
3. **推理与量化**: 支持 FP8 和 Int4 量化，可在消费级 GPU 上运行大模型
4. **多平台集成**: 支持 Hugging Face Transformers、Llama Stack 等多种推理框架

## 架构设计

该项目采用分层架构设计：

- **CLI 层**: `llama-model` 命令行工具，提供模型列表、下载、验证等功能
- **模型层**: 各个模型版本的 MODEL_CARD 和配置定义
- **推理层**: 基于 PyTorch 的推理脚本，支持分布式推理
- **量化层**: FP8/Int4 量化推理支持

Llama 4 系列模型需要至少 4 个 GPU 才能进行完整 bf16 精度推理。

## 快速开始

### 安装

```bash
pip install llama-models
```

### 下载模型

```bash
llama-model list                          # 查看可用模型
llama-model download --source meta --model-id <MODEL_ID>  # 下载模型
```

### 运行推理

```bash
pip install .[torch]

# Llama 4 需要多 GPU
NGPUS=4
CHECKPOINT_DIR=~/.llama/checkpoints/Llama-4-Scout-17B-16E-Instruct
PYTHONPATH=$(git rev-parse --show-toplevel) \
  torchrun --nproc_per_node=$NGPUS \
  -m models.llama4.scripts.chat_completion $CHECKPOINT_DIR \
  --world_size $NGPUS
```

### 量化推理

```bash
# FP8 量化 - 需要 2 个 80GB GPU
MODE=fp8_mixed NGPUS=2 ...

# Int4 量化 - 只需 1 个 80GB GPU
MODE=int4_mixed NGPUS=1 ...
```

## 学习价值

- 了解大语言模型的架构演进（从 Llama 2 到 Llama 4）
- 学习模型量化的实际应用（FP8/Int4）
- 掌握大规模模型推理的分布式技术
- 理解开源 AI 模型的分发和许可模式

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [meta-llama/llama-stack](https://github.com/meta-llama/llama-stack) | Llama 模型推理栈 | High |
| [huggingface/transformers](https://github.com/huggingface/transformers) | 大模型推理框架 | High |
| [meta-llama/llama-cookbook](https://github.com/meta-llama/llama-cookbook) | Llama 使用指南 | High |

## 参考资料

- [GitHub Repository](https://github.com/meta-llama/llama-models)
- [Meta Llama 官网](https://llama.meta.com/)
- [Hugging Face 模型](https://huggingface.co/meta-Llama)
- [Llama Stack](https://github.com/meta-llama/llama-stack)

---

*Generated: 2026-03-18*
