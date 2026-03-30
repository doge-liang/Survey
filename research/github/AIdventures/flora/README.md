---
id: AIdventures/flora
title: "FLoRA: Fine-tuning LLMs with LoRA"
source_type: github
upstream_url: "https://github.com/AIdventures/flora"
generated_by: github-researcher
created_at: "2026-03-18T08:00:00Z"
updated_at: "2026-03-18T08:00:00Z"
tags: [lora, fine-tuning, pytorch, peft, mnli]
language: zh
---
# AIdventures/flora

> Fine-tuning LLMs with LoRA

[![GitHub stars](https://img.shields.io/github/stars/AIdventures/flora)](https://github.com/AIdventures/flora)
[![License](https://img.shields.io/github/license/AIdventures/flora)](https://github.com/AIdventures/flora)

## 概述

FLoRA (Fine-tuning LLMs with LoRA) 是一个旨在通过低秩自适应（LoRA）技术微调大型语言模型（LLMs）的开源项目。LoRA 是一种简单而有效的微调方法，它通过低秩分解显著降低了微调过程中的计算成本和内存需求。该项目提供了一个易于使用的实现方案，并以 GLUE 基准测试中的 MNLI（Multi-Genre Natural Language Inference）子任务为例，展示了如何对 LLM 进行微调和评估。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 语言 | Python, Jupyter Notebook |
| 深度学习框架 | PyTorch |
| 模型与微调 | Hugging Face Transformers, PEFT (LoRA), BitsAndBytes (Quantization) |
| 数据处理 | Datasets (Hugging Face), Pandas |
| 实验追踪 | Weights & Biases (wandb) |
| 可视化 | Seaborn, Matplotlib |

## 项目结构

```text
AIdventures/flora/
├── utils/               # 核心工具函数
│   ├── args.py          # 参数解析器
│   ├── completions.py   # 文本生成与后处理
│   ├── data.py          # 数据预处理与后处理
│   └── evaluation.py    # 评估函数
├── notebooks/           # Jupyter 实验笔记本
│   ├── eda.ipynb        # 探索性数据分析 (EDA)
│   ├── baseline.ipynb   # 微调前基线模型评估
│   ├── training.ipynb   # 使用 LoRA 微调模型
│   └── evaluation.ipynb # 评估训练后的模型
├── assets/              # 静态资源（如插图）
└── requirements.txt     # 项目依赖清单
```

## 核心特性

1. **端到端微调流程**：项目涵盖了从数据预处理、模型加载与量化、LoRA 微调到最终评估的完整生命周期。
2. **高效的参数微调 (PEFT)**：集成了 Hugging Face 的 `peft` 库，使用 LoRA 技术仅更新极少量的模型参数，大幅降低显存占用。
3. **4-bit 量化支持**：结合 `bitsandbytes` 库，支持以 4-bit (NF4) 精度加载基础模型（如 `microsoft/phi-2`），进一步降低硬件门槛。
4. **针对 MNLI 任务的定制化处理**：提供了专门的 Prompt 模板和输出后处理逻辑，将生成式 LLM 适配到自然语言推理分类任务中。

## 微调技术说明

该项目展示了如何将生成式大语言模型（如 `microsoft/phi-2`）应用于分类任务（MNLI）。

- **数据预处理**：使用特定的 Prompt 模板将前提（Premise）和假设（Hypothesis）拼接，并要求模型输出 0（蕴含）、1（中立）或 2（矛盾）。
- **模型准备**：
  - 使用 `BitsAndBytesConfig` 以 4-bit 精度加载预训练模型。
  - 使用 `LoraConfig` 配置 LoRA 参数（如 `r=8`, `lora_alpha=16`, `target_modules=["q_proj", "v_proj"]`），并将其应用于因果语言模型（Causal LM）。
- **训练策略**：由于目标是“预测下一个 Token”，训练时将包含答案的完整句子作为 `input_ids` 和 `labels` 输入，模型通过自回归方式学习输出正确的标签。
- **后处理与评估**：由于 LLM 倾向于输出冗长的文本（如 "the label is 0"），项目实现了一个后处理步骤，通过正则表达式提取输出中的第一个整数作为最终预测结果。

## 快速开始

1. **克隆仓库并安装依赖**：
   ```bash
   git clone https://github.com/AIdventures/flora.git
   cd flora
   pip install -r requirements.txt
   ```

2. **运行实验**：
   项目主要通过 Jupyter Notebook 运行。建议按以下顺序执行：
   - `notebooks/eda.ipynb`：了解 MNLI 数据集。
   - `notebooks/baseline.ipynb`：测试未微调模型的基线性能。
   - `notebooks/training.ipynb`：执行 LoRA 微调（需配置 GPU 环境）。
   - `notebooks/evaluation.ipynb`：评估微调后的模型性能。

## 学习价值

- **LLM 微调入门**：非常适合初学者学习如何使用 Hugging Face 生态（Transformers, PEFT, Datasets）对 LLM 进行微调。
- **生成式模型做分类**：展示了如何通过 Prompt Engineering 和输出后处理，让 Causal LM 完成传统的 NLP 分类任务。
- **资源受限下的训练**：学习如何结合 QLoRA（Quantization + LoRA）技术，在消费级显卡上微调数十亿参数的大模型。

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [huggingface/peft](https://github.com/huggingface/peft) | Hugging Face 官方的参数高效微调库，本项目依赖的核心库。 | High |
| [artidoro/qlora](https://github.com/artidoro/qlora) | QLoRA 的官方实现，展示了如何在量化模型上进行高效微调。 | High |
| [tloen/alpaca-lora](https://github.com/tloen/alpaca-lora) | 使用 LoRA 在消费级硬件上复现 Stanford Alpaca 的经典项目。 | Medium |

## 参考资料

- [GitHub Repository](https://github.com/AIdventures/flora)
- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)
- [AIdventure Blog: LoRA](https://aidventure.es/blog/lora/)

---

*Generated: 2026-03-18*
