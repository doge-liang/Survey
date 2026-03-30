---
id: jingyaogong/minimind
title: MiniMind - 从零训练超小型 LLM 分析
source_type: github
upstream_url: "https://github.com/jingyaogong/minimind"
generated_by: github-researcher
created_at: "2026-03-18T10:05:00Z"
updated_at: "2026-03-18T10:05:00Z"
tags: [llm, training, from-scratch, mini, pytorch, chinese]
language: zh
---
# MiniMind - 从零训练超小型 LLM

> 仅用 3 块钱成本 + 2 小时训练 26M 超小参数 GPT

[![GitHub stars](https://img.shields.io/github/stars/jingyaogong/minimind)](https://github.com/jingyaogong/minimind)
[![License](https://img.shields.io/github/license/jingyaogong/minimind)](https://github.com/jingyaogong/minimind)

## 概述

MiniMind 是一个旨在从零开始训练超小型大语言模型的开源项目。该项目的核心理念是"大道至简"——让每个人都能以极低的成本（仅需约 3 元人民币）和时间（约 2 小时），在普通个人 GPU 上训练自己的语言模型。

项目特点：
- **极小参数规模**：最小版本仅 26M 参数，是 GPT-3 的 1/7000
- **完整训练流程**：涵盖预训练、SFT、LoRA、DPO、PPO/GRPO 强化学习、模型蒸馏
- **纯 PyTorch 实现**：所有核心算法代码均从零使用 PyTorch 原生重构，不依赖第三方抽象接口
- **中文友好**：提供中文数据集和完整教程

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 语言     | Python              |
| 框架     | PyTorch             |
| 构建工具 | pip                 |
| 分布式   | torchrun, DeepSpeed |
| 可视化   | wandb, SwanLab      |

## 项目结构

```
jingyaogong/minimind/
├── model/                  # 模型架构代码
│   └── model_minimind.py   # MiniMind 配置和模型定义
├── trainer/                # 训练代码
│   ├── train_pretrain.py  # 预训练
│   ├── train_full_sft.py   # 监督微调
│   ├── train_lora.py      # LoRA 微调
│   ├── train_dpo.py       # DPO 对齐
│   └── train_rlhf.py      # PPO/GRPO 强化学习
├── dataset/               # 数据集目录
├── scripts/              # 辅助脚本
│   └── web_demo.py       # Streamlit Web UI
├── eval_llm.py           # 模型评估
└── requirements.txt
```

## 核心特性

1. **极简模型规模**：
   - MiniMind2-Small: 26M 参数，0.5GB 显存
   - MiniMind2-MoE: 145M 参数，1.0GB 显存
   - MiniMind2: 104M 参数，1.0GB 显存

2. **完整训练流程**：
   - 预训练（Pretrain）：学习基础知识
   - 监督微调（SFT）：学习对话格式
   - LoRA 高效微调
   - DPO 直接偏好优化
   - PPO/GRPO/SPO 强化学习训练

3. **高效推理优化**：
   - 兼容 llama.cpp、vllm、ollama 等推理框架
   - 支持 DeepSpeed 加速
   - 支持 DDP 分布式训练

4. **数据集完整**：
   - 自定义 Tokenizer（6400 词表）
   - 预训练数据集（1.6GB）
   - SFT 对话数据集
   - DPO 偏好数据集
   - R1 推理数据集

5. **多模态扩展**：
   - 提供 MiniMind-V 视觉多模态版本

## 架构设计

MiniMind 采用与 Llama3.1 类似的 Transformer Decoder-Only 架构：

- **归一化**：采用 RMSNorm 替代 LayerNorm
- **激活函数**：使用 SwiGLU 替代 ReLU
- **位置编码**：使用旋转位置嵌入（RoPE），支持长文本外推
- **MoE 版本**：基于 DeepSeek-V2 的混合专家模块

### 模型配置

| 模型 | 参数 | 层数 | 隐藏维度 | 头数 |
|------|------|------|----------|------|
| MiniMind2-Small | 26M | 8 | 512 | 8 |
| MiniMind2-MoE | 145M | 8 | 640 | 8 |
| MiniMind2 | 104M | 16 | 768 | 8 |

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/jingyaogong/minimind.git
cd minimind

# 安装依赖
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple

# 下载预训练模型（可选）
git clone https://huggingface.co/jingyaogong/MiniMind2

# 预训练
cd trainer
torchrun --nproc_per_node 1 train_pretrain.py

# 监督微调
torchrun --nproc_per_node 1 train_full_sft.py

# 测试模型
cd ..
python eval_llm.py --load_from ./MiniMind2

# 启动 Web UI
cd scripts
streamlit run web_demo.py
```

### 训练成本估算（单卡 3090）

| 模型 | 预训练 | SFT | 总成本 |
|------|--------|-----|--------|
| MiniMind2-Small | 1.1h ≈ 1.5¥ | 1h ≈ 1.3¥ | ≈ 3¥ |
| MiniMind2 | 3.9h ≈ 5¥ | 3.3h ≈ 4.3¥ | ≈ 10¥ |

## 学习价值

- **理解 LLM 训练全流程**：从数据处理到预训练、微调、强化学习的完整流程
- **掌握高效训练技巧**：MoE、LoRA、蒸馏等技术
- **低成本实践**：仅需 3 元即可体验模型训练
- **深入理解架构**：通过阅读源码理解 Transformer 细节
- **强化学习入门**：学习 PPO、GRPO 等 RLHF 技术

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) | 配套书籍，PyTorch 实现 GPT | High |
| [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | 最简单的 GPT 训练仓库 | High |
| [karpathy/llama2.c](https://github.com/karpathy/llama2.c) | 纯 C 实现 Llama 2 推理 | Medium |
| [rasbt/reasoning-from-scratch](https://github.com/rasbt/reasoning-from-scratch) | 推理模型从零实现 | Medium |

## 参考资料

- [Hugging Face 模型](https://huggingface.co/collections/jingyaogong/minimind-66caf8d999f5c7fa64f399e5)
- [ModelScope 在线体验](https://www.modelscope.cn/studios/gongjy/MiniMind)
- [视频介绍](https://www.bilibili.com/video/BV12dHPeqE72/)

---

*Generated: 2026-03-18*
