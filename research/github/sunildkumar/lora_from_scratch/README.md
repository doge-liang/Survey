# LoRA from Scratch

> Implements Low-Rank Adaptation(LoRA) Finetuning from scratch.

[![GitHub stars](https://img.shields.io/github/stars/sunildkumar/lora_from_scratch)](https://github.com/sunildkumar/lora_from_scratch)
[![License](https://img.shields.io/github/license/sunildkumar/lora_from_scratch)](https://github.com/sunildkumar/lora_from_scratch)

## 概述

本项目是一个用于学习和理解低秩自适应（Low-Rank Adaptation, LoRA）微调技术的教育性项目。作者基于原始的 LoRA 论文，从零开始使用 PyTorch 和 PyTorch Lightning 实现了一个简化的 LoRA 微调流程，并将其应用于 MNIST 数据集上的简单神经网络模型。实验表明，在仅使用传统微调方法 7.7% 可训练参数的情况下，该模型能够达到 97.9% 的基线性能，充分展示了 LoRA 的参数高效性。

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 语言     | Python              |
| 框架     | PyTorch, PyTorch Lightning |
| 运行环境 | Jupyter Notebook    |

## 项目结构

```text
sunildkumar/lora_from_scratch/
├── LICENSE                              # MIT 许可证
├── README.md                            # 项目说明文档，包含实验结果和核心代码片段
├── lora_on_mnist.ipynb                  # 核心 Jupyter Notebook，包含模型定义、LoRA 实现和训练过程
├── parameters_vs_accuracy.png           # 实验结果图表：参数量与准确率的关系
└── rel_parameters_vs_rel_accuracy.png   # 实验结果图表：相对参数量与相对准确率的关系
```

## 核心特性

1. **从零实现 LoRA 层**：不依赖于 PEFT 等第三方库，手动在 PyTorch 模型中注入低秩矩阵（A 和 B），帮助学习者直观理解 LoRA 的底层数学原理。
2. **参数高效微调演示**：通过冻结预训练模型的原始权重，仅训练注入的低秩矩阵，显著减少了需要更新的参数数量。
3. **直观的实验对比**：提供了不同 LoRA 秩（Rank = 1, 2, 4, 8, 16, 32, 64）下的参数量与测试准确率对比，直观展示了秩大小对模型性能的影响。

## 微调技术说明

在本项目中，LoRA 的核心思想被应用于标准的全连接层（`nn.Linear`）。具体实现步骤如下：

1. **定义低秩矩阵**：对于每个需要微调的线性层，定义两个可训练的参数矩阵 `lora_A` 和 `lora_B`。其中 `lora_A` 的形状为 `(输入维度, rank)`，`lora_B` 的形状为 `(rank, 输出维度)`。
2. **初始化策略**：`lora_A` 使用 Kaiming 均匀分布初始化，而 `lora_B` 初始化为全零。这样可以确保在训练开始时，LoRA 旁路的输出为零，不会破坏原始预训练模型的输出。
3. **冻结原始权重**：遍历模型的所有参数，将不包含 `lora` 关键字的参数的 `requires_grad` 设置为 `False`。
4. **前向传播结合**：在计算时，将原始层的输出与 LoRA 旁路的输出相加：`h = layer(x) + x @ (lora_A @ lora_B) * lora_alpha`。

## 快速开始

1. 克隆仓库：
   ```bash
   git clone https://github.com/sunildkumar/lora_from_scratch.git
   cd lora_from_scratch
   ```
2. 安装依赖：
   确保你的环境中已安装 `torch`, `lightning`, `torchvision` 和 `jupyter`。
   ```bash
   pip install torch lightning torchvision jupyter
   ```
3. 运行 Notebook：
   ```bash
   jupyter notebook lora_on_mnist.ipynb
   ```
   在 Notebook 中逐步执行代码块，观察 LoRA 模型的构建和训练过程。

## 学习价值

- **深入理解 LoRA 机制**：通过阅读和运行不到 100 行的核心代码，学习者可以彻底弄懂 LoRA 是如何通过低秩分解来近似权重更新的。
- **PyTorch 参数管理**：学习如何在 PyTorch 中手动注册 `nn.Parameter`、自定义初始化逻辑以及冻结特定层的梯度。
- **实验设计参考**：项目展示了如何设计消融实验（测试不同的 Rank 值）并可视化结果，是进行深度学习实验的良好范例。

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [AIdventures/flora](https://github.com/AIdventures/flora) | 另一个简化版的 LoRA 微调实现，适合初学者。 | High |
| [rasbt/dora-from-scratch](https://github.com/rasbt/dora-from-scratch) | 知名作者 Sebastian Raschka 实现的 LoRA 和 DoRA 从零构建教程。 | High |
| [huggingface/peft](https://github.com/huggingface/peft) | 工业级的参数高效微调库，包含了 LoRA 的生产级实现。 | Medium |

## 参考资料

- [GitHub Repository](https://github.com/sunildkumar/lora_from_scratch)
- [LoRA: Low-Rank Adaptation of Large Language Models (Paper)](https://arxiv.org/abs/2106.09685)

---
*Generated: 2026-03-18*
