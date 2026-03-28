---
id: native-multimodal
title: Native Multimodal Models
aliases:
  - Native Multimodal
  - 原生多模态模型
  - NMM

relations:
  parents:
    - llm
    - computer-vision
  prerequisites:
    - llm-basics
    - transformer
  related:
    - vision-language-model
    - multimodal-rag
    - audio-ai

navigation:
  primary_parent: llm

level: intermediate
status: active
tags:
  - multimodal
  - training
  - inference
  - architecture
  - vision
  - audio
---

# 原生多模态模型（Native Multimodal Models）学习路径

> **适合人群**: 有 LLM 基础的学习者
> **预计时间**: 15-20 小时
> **更新日期**: 2026-03-27

## 概述

原生多模态模型（Native Multimodal Models）是人工智能领域的重要突破。与传统的"后融合"（Late Fusion）架构不同，原生多模态模型从训练之初就将文本、图像、音频、视频等多种模态统一在单一架构中处理，实现真正的跨模态联合建模。

**代表模型**：GPT-4o、Gemini 1.5 Pro、LLaMA 4、Chameleon、Janus-Pro、Emu3.5

**核心价值**：
- 消除模态间的信息损失
- 支持端到端的跨模态推理
- 涌现出语音语调理解、视频时序分析等 LLM 不具备的能力

---

## 前置知识

学习本领域需要：
- [[llm-basics]] - LLM 基本概念（token、embedding、attention）
- [[transformer]] - Transformer 架构原理
- 基本的深度学习知识（反向传播、优化器）

推荐但不强制：
- [[computer-vision]] - 计算机视觉基础（ViT）
- [[audio-ai]] - 音频处理基础

---

## 阶段一：基础概念（Beginner）

**目标**: 理解多模态模型的基本分类和架构差异
**预计时间**: 4-5 小时

### 核心概念

1. **模态（Modality）**
   - 文本、图像、音频、视频都是不同的模态
   - 传统方法：每种模态独立建模
   - 多模态模型：跨模态联合建模

2. **后融合（Late Fusion）vs 早期融合（Early Fusion）**
   - Late Fusion：用独立编码器分别处理，拼接给 LLM
   - Early Fusion：在输入层即混合，统一 token 空间

3. **统一 token 空间（Unified Token Space）**
   - 图像通过 ViT 编码为 patch embeddings
   - 音频通过 codec 编码为离散 tokens
   - 与文本 token 在同一嵌入空间联合处理

4. **跨模态注意力（Cross-Modal Attention）**
   - 不同模态的 token 可直接 attend 彼此
   - 全局注意力跨越模态边界

### 必读资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| Sebastian Raschka - Understanding Multimodal LLMs | 文章 | 1h | 详细对比两种架构方案 |
| The Paradigm Shift to Native Multimodality | 文章 | 1h | 深度分析 Late vs Early Fusion |
| LLaVA 论文 | 论文 | 1h | 经典后融合架构代表 |

### 检查点

完成本阶段后，你应该能够：
- [ ] 解释 Late Fusion 和 Early Fusion 的核心区别
- [ ] 描述统一 token 空间的工作原理
- [ ] 理解跨模态注意力的意义

---

## 阶段二：架构详解（Intermediate）

**目标**: 深入理解原生多模态模型的核心架构组件和训练方法
**预计时间**: 6-8 小时

### 核心技能

1. **两种主要架构方案**

   **方案 A：统一嵌入解码器架构（Unified Embedding-Decoder）**
   - 图像 patch embeddings 与文本 token 拼接后输入标准 LLM
   - 训练时只更新 projector（1-2 层 MLP），LLM 可冻结
   - 代表：LLaVA、Molmo、Qwen2-VL

   **方案 B：跨模态注意力架构（Cross-Modality Attention）**
   - 图像编码器输出通过 cross-attention 注入 LLM 中间层
   - LLM 参数可全程冻结，保留纯文本能力
   - 代表：LLaMA 3.2、NVLM-X、Aria

   **方案 C：混合架构**
   - 结合方案 A 和 B 的优势
   - 如 NVLM-H：粗粒度用 cross-attention + 细粒度用 unified embedding

2. **视觉编码器（Vision Encoder）**
   - ViT（Vision Transformer）将图像划分为 patches
   - 常用预训练模型：CLIP、SigLIP、InternViT
   - 连续 embedding vs 离散 VQ-VAE

3. **音频处理**
   - 神经音频编解码器（Encodec、SoundStream）
   - 语义 tokens（what）+ 声学 tokens（how）
   - 32 tokens/秒（downsampled to 16kHz）

4. **训练策略**

   **典型三阶段流程**：
   | 阶段 | 描述 |
   |------|------|
   | Stage 1 | 冻结 ViT 和 LLM，只训练 projector |
   | Stage 2 | 解冻 ViT 或部分 LLM，联合训练 |
   | Stage 3 | 全参数微调或 LoRA 微调 |

   **关键挑战**：
   - Modality Imbalance：文本 loss 下降快，模型忽略图像
   - Vocabulary Explosion：多模态词表大幅增加

5. **推理优化**
   - MoE（Mixture-of-Experts）架构降低推理成本
   - 长上下文支持（Gemini 1.5: 10M tokens）
   - 原生音频实现低延迟（GPT-4o: ~320ms TTFT）

### 推荐资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| NVLM 论文 | 论文 | 2h | 对比三种架构方案的消融实验 |
| Qwen2-VL 论文 | 论文 | 1h | Naive Dynamic Resolution 机制 |
| Janus-Pro 论文 | 论文 | 1.5h | 解耦视觉编码的统一架构 |
| Chameleon 论文 | 论文 | 1h | 纯 token 统一方法 |

### 检查点

完成本阶段后，你应该能够：
- [ ] 对比分析三种架构方案的优劣势
- [ ] 解释视觉编码器和投影器的工作原理
- [ ] 理解 Modality Imbalance 及常见解决方案
- [ ] 描述 MoE 架构在多模态中的应用

---

## 阶段三：深入精通（Advanced）

**目标**: 掌握最新研究方向和前沿架构
**预计时间**: 5-7 小时

### 高级主题

1. **Emu3.5 - World Model**
   - 端到端预测视觉和语言的下一状态
   - 统一生成而非 diffusion

2. **Show-o2 - 统一 AR 和 Flow Matching**
   - 语言头（AR）用于理解
   - Flow 头用于视觉生成
   - 共享 transformer backbone

3. **长上下文多模态推理**
   - iRoPE（Interleaved Rotary Position Embeddings）
   - 视频时序推理能力
   - 上下文内的少样本学习

4. **Audio Native**
   - 原生音频理解保留语调、情绪信息
   - 语音生成保留音色和韵律
   - 端到端语音对话（打断支持）

### 深度资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| Emu3.5 论文 | 论文 | 1.5h | 原生多模态世界模型 |
| Scaling Laws for NMM (ICCV 2025) | 论文 | 2h | 多模态 scaling laws |
| Llama 4 技术报告 | 论文 | 1.5h | MoE + Early Fusion 实现 |
| GPT-4o 分析 | 技术解读 | 1h | Omni 架构推理优化 |

### 研究方向

1. **System 2 Multimodality** — 多模态推理时的"思考"过程
2. **Action as Modality** — 机器人控制 token 统一接入
3. **更高效的模态融合** — 减少 vocabulary explosion 问题
4. **跨模态评估标准** — MMMU、MMBench 等新基准

---

## 核心对比总结

### 原生多模态 vs 纯 LLM

| 特征 | 纯 LLM | 原生多模态模型 |
|------|--------|---------------|
| 输入模态 | 仅文本 | 文本+图像+音频+视频 |
| 融合方式 | N/A | Early Fusion |
| 注意力范围 | 单模态 | 跨模态全局 |
| 输出模态 | 仅文本 | 灵活多模态 |
| 音频延迟 | N/A | ~320ms（GPT-4o） |
| 视频理解 | 有限 | 原生时序推理 |

### 架构方案对比

| 方案 | 代表模型 | 优势 | 劣势 |
|------|---------|------|------|
| Unified Embedding | LLaVA, Molmo | 实现简单，效果好 | 图像 token 占用上下文 |
| Cross-Attention | LLaMA 3.2, Aria | 保持 LLM 能力 | 跨模态交互受限 |
| Hybrid | NVLM-H, Janus-Pro | 综合两者优势 | 实现复杂度高 |

---

## 学习建议

### 时间安排
- 每日建议: 1-2 小时
- 每周建议: 5-10 小时

### 常见误区
1. **混淆"多模态"和"后融合"** — 两者有本质区别
2. **忽视训练策略** — 架构只是基础，训练方法同样重要
3. **只看最新模型** — 经典论文（如 LLaVA、NVLM）帮助理解基础

### 社区资源
- Reddit: r/MachineLearning, r/LocalLLaMA
- GitHub: 搜索 "multimodal LLM", "vision language model"

---

## 相关领域

学完本路径后，可以继续探索：

- [[vision-language-model]] - 视觉-语言模型的经典方法
- [[multimodal-rag]] - 多模态检索增强生成
- [[audio-ai]] - 原生音频处理与语音 AI
- [[agentic-ai]] - 多模态 agent 系统

---

*生成日期: 2026-03-27*
*基于 Sebastian Raschka、Uplatz、arXiv 等多源资料整理*
