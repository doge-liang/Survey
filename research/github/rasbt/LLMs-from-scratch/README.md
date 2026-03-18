# Build a Large Language Model (From Scratch)

> 配套书籍《Build a Large Language Model (From Scratch)》，手把手实现 ChatGPT 风格的 LLM

[![GitHub stars](https://img.shields.io/github/stars/rasbt/LLMs-from-scratch)](https://github.com/rasbt/LLMs-from-scratch)
[![License](https://img.shields.io/github/license/rasbt/LLMs-from-scratch)](https://github.com/rasbt/LLMs-from-scratch)

## 概述

该项目是 Sebastian Raschka 博士所著书籍《Build a Large Language Model (From Scratch)》的官方配套代码仓库。通过本书，你将从头开始逐步构建自己的 GPT 类大语言模型，深入理解 LLM 的内部工作机制。

本书的教学方法模拟了创建 ChatGPT 等大型基础模型的完整流程，不仅包含从零实现模型架构的代码，还提供了加载预训练模型权重进行微调的示例。这是一个面向教育目的的优质资源，代码设计为可在普通笔记本电脑上运行，无需专业硬件。

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 语言     | Python, Jupyter Notebook |
| 框架     | PyTorch            |
| 构建工具 | pip, conda         |
| 测试     | pytest             |
| 依赖库   | tiktoken, transformers, datasets |

## 项目结构

```
rasbt/LLMs-from-scratch/
├── ch01/                    # 第1章：理解大语言模型（理论）
├── ch02/                    # 第2章：文本数据处理
│   └── 01_main-chapter-code/
│       ├── ch02.ipynb       # 主代码
│       └── dataloader.ipynb # 数据加载器
├── ch03/                    # 第3章：注意力机制实现
├── ch04/                    # 第4章：从零实现 GPT 模型
├── ch05/                    # 第5章：预训练
├── ch06/                    # 第6章：文本分类微调
├── ch07/                    # 第7章：指令微调
├── appendix-A/              # 附录 A：PyTorch 入门
├── appendix-D/              # 附录 D：训练技巧
├── appendix-E/              # 附录 E：LoRA 高效微调
├── setup/                   # 环境配置
├── pyproject.toml
└── requirements.txt
```

## 核心特性

1. **从零实现 Transformer 架构**：不依赖任何外部 LLM 库，使用纯 PyTorch 实现注意力机制、多头注意力、GPT 模型架构。

2. **完整的训练流程**：涵盖数据预处理、tokenization、模型训练、推理生成的完整流程。

3. **多种微调范式**：
   - 文本分类微调（第6章）
   - 指令微调（第7章）
   - LoRA 高效微调（附录E）
   - DPO 对齐微调

4. **丰富的进阶内容**：
   - KV Cache 优化
   - Grouped-Query Attention (GQA)
   - Sliding Window Attention
   - Mixture-of-Experts (MoE)
   - 多种模型架构：Llama 3.2, Qwen3, Gemma 3, Olmo 3

5. **配套视频课程**：提供 17 小时以上的配套视频课程，边coding边学习。

## 架构设计

该项目采用模块化设计，按章节组织代码：

- **数据处理层**（ch02）：BPE Tokenizer、数据加载器
- **模型架构层**（ch03-ch04）：注意力机制、GPT 模型实现
- **训练层**（ch05）：预训练脚本、训练技巧
- **应用层**（ch06-ch07）：分类微调、指令微调

核心模型采用标准的 GPT 架构：
- Transformer Decoder
- 多头自注意力
- GELU 激活函数
- 位置编码（可扩展至 RoPE）

## 快速开始

```bash
# 克隆仓库
git clone --depth 1 https://github.com/rasbt/LLMs-from-scratch.git
cd LLMs-from-scratch

# 安装依赖
pip install -r requirements.txt

# 运行示例（第4章：GPT 模型）
# 使用 Jupyter Notebook 查看 ch04/01_main-chapter-code/ch04.ipynb
```

硬件要求：代码设计为可在普通笔记本电脑上运行，会自动利用 GPU 加速（如可用）。

## 学习价值

- **深入理解 LLM 原理**：通过从零实现，掌握 Transformer、GPT 的核心机制
- **掌握 PyTorch 深度学习技能**：附录 A 提供了 PyTorch 入门知识
- **实践完整训练流程**：从数据处理到模型训练、微调的完整流程
- **了解前沿技术**：学习 GQA、MoE、LoRA 等高效技术
- **为进阶打下基础**：可衔接《Reasoning From Scratch》学习推理模型

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | 最简单快速的 GPT 训练/微调仓库 | High |
| [karpathy/llama2.c](https://github.com/karpathy/llama2.c) | 单文件纯 C 实现 Llama 2 推理 | Medium |
| [jingyaogong/minimind](https://github.com/jingyaogong/minimind) | 从零训练超小型 LLM | High |
| [rasbt/reasoning-from-scratch](https://github.com/rasbt/reasoning-from-scratch) | 推理模型从零实现（续作） | High |

## 参考资料

- [书籍购买链接 (Manning)](https://amzn.to/4fqvn0D)
- [书籍官方页面](https://sebastianraschka.com/llms-from-scratch/)
- [配套视频课程](https://www.manning.com/livevideo/master-and-build-large-language-models)
- [Sebastian Raschka 博客](https://sebastianraschka.com/)

---

*Generated: 2026-03-18*
