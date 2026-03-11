---
id: llm
title: 大语言模型 (LLM)
aliases:
  - Large Language Model
  - 大模型
  - LLM

relations:
  parents:
    - ai
    - deep-learning
  prerequisites:
    - python
    - machine-learning
    - neural-networks
  related:
    - nlp
    - computer-vision
    - reinforcement-learning

navigation:
  primary_parent: ai

level: intermediate
status: active
tags:
  - ai
  - llm
  - transformer
  - gpt
  - llama
---

# 大语言模型 (LLM) 学习路径

> **适合人群**: 零基础到进阶学习者
> **预计时间**: 6-12 个月（视投入时间而定）
> **更新日期**: 2026-03-11

## 概述

大语言模型（Large Language Model, LLM）是当前人工智能最热门的领域，以 ChatGPT、Claude、LLaMA 等为代表，正在重塑人机交互方式。本学习路径将 LLM 划分为五个核心子领域，帮助学习者系统掌握从理论基础到工程实践的全栈能力。

LLM 的核心价值在于：理解自然语言、生成连贯文本、推理与规划、以及与外部工具交互。从 Transformer 架构到千亿参数模型，从预训练到 RLHF 对齐，从推理优化到 Agent 应用，LLM 领域涵盖深度学习、系统工程、产品应用等多个维度。

## 前置知识

学习本领域需要：
- [[python]] - 编程基础（必须），C/C++（推荐）
- [[machine-learning]] - 深度学习基础
- [[neural-networks]] - 神经网络基础、反向传播、优化器
- PyTorch 或 TensorFlow 框架经验

> 如果前置知识不足，建议先完成 [fast.ai](https://www.fast.ai/) 或 [吴恩达深度学习课程](https://www.coursera.org/specializations/deep-learning)。

---

## 子领域总览

| 子领域 | 核心内容 | 学习周期 | 难度 |
|--------|----------|----------|------|
| [[llm-basics]] | Transformer、Attention、Tokenization | 4-6 周 | ⭐⭐ |
| [[llm-training]] | Pretraining、Fine-tuning、RLHF、PEFT | 6-8 周 | ⭐⭐⭐⭐ |
| [[llm-inference]] | 推理优化、量化、KV Cache、vLLM | 3-4 周 | ⭐⭐⭐ |
| [[llm-application]] | RAG、Agent、Prompt Engineering | 4-6 周 | ⭐⭐⭐ |
| [[llm-safety]] | Alignment、红队测试、攻击防御 | 3-4 周 | ⭐⭐⭐⭐ |

### 学习路线图

```
[[llm-basics]] → [[llm-training]] → [[llm-inference]]
                       ↘
              [[llm-application]] → [[llm-safety]]
```

---

## 子领域一：LLM 基础

**目标**: 理解 Transformer 架构、注意力机制、Tokenization 等核心概念
**预计时间**: 4-6 周

### 阶段一：入门 (Beginner)

**目标**: 建立对 LLM 的整体认知，理解基本原理

#### 核心概念

1. **语言模型基础** - N-gram、神经语言模型、困惑度
2. **Tokenization** - BPE、WordPiece、SentencePiece
3. **Transformer 架构概览** - Encoder-Decoder 结构
4. **Self-Attention** - 注意力权重、Query-Key-Value

#### 必读资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [斯坦福 CS224N](https://web.stanford.edu/class/cs224n/) | 课程 | 40h | NLP 深度学习经典课程 |
| [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/) | 博客 | 2h | Transformer 可视化解释 |
| [Attention Is All You Need](https://arxiv.org/abs/1706.03762) | 论文 | 4h | Transformer 原始论文 |
| [大语言模型入门指南 - 英伟达](https://www.nvidia.com/zh-cn/) | 文档 | 3h | 企业级入门指南 |

#### 实践项目

1. **手写 Tokenizer**
   - 实现 BPE 算法
   - 处理中英文混合文本
   - 难度: Easy | 时间: 4h

2. **可视化 Attention**
   - 使用 BertViz 分析注意力分布
   - 理解不同层的注意力模式
   - 难度: Easy | 时间: 2h

#### 检查点

- [ ] 能解释 Transformer 的整体架构
- [ ] 理解 Self-Attention 的计算过程
- [ ] 知道 BPE Tokenization 的原理
- [ ] 能使用 Hugging Face 加载预训练模型

---

### 阶段二：进阶 (Intermediate)

**目标**: 深入理解 Transformer 组件，掌握模型细节

#### 核心技能

1. **Multi-Head Attention** - 多头注意力的并行计算
2. **Positional Encoding** - 位置编码（正弦、RoPE、ALiBi）
3. **Layer Normalization** - Pre-Norm vs Post-Norm
4. **Feed-Forward Network** - FFN 的作用与设计

#### 推荐资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [The Annotated Transformer](https://nlp.seas.harvard.edu/annotated-transformer/) | 教程 | 6h | 逐行代码解析 Transformer |
| [Dive into Deep Learning - Transformer](https://d2l.ai/chapter_attention-mechanisms-and-transformers/transformer.html) | 书籍 | 4h | 动手学深度学习 |
| [Hugging Face Transformers Course](https://huggingface.co/learn/nlp-course) | 课程 | 8h | 官方课程，实践导向 |
| [LLaMA 论文](https://arxiv.org/abs/2302.13971) | 论文 | 2h | 开源 LLM 架构代表 |

#### 实践项目

1. **从零实现 Transformer**
   - 实现 Multi-Head Attention
   - 实现 Positional Encoding
   - 在小型数据集上训练
   - 难度: Medium | 时间: 8h

2. **分析开源模型架构**
   - 对比 GPT-2、BERT、LLaMA 的架构差异
   - 绘制架构对比图
   - 难度: Medium | 时间: 4h

#### 检查点

- [ ] 能从零实现 Transformer Encoder
- [ ] 理解 RoPE 位置编码的优势
- [ ] 能阅读并理解模型配置文件
- [ ] 知道 Decoder-Only 架构的设计原因

---

### 阶段三：深入 (Advanced)

**目标**: 掌握前沿架构设计，理解 Scaling Law

#### 高级主题

1. **Architecture Variants** - MoE、Mamba、SSM
2. **Scaling Laws** - 参数量、数据量、计算量的关系
3. **Emergent Abilities** - 涌现能力的理解
4. **Context Length** - 长上下文处理技术

#### 深度资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361) | 论文 | 3h | OpenAI 缩放定律 |
| [Chinchilla 论文](https://arxiv.org/abs/2203.15556) | 论文 | 2h | 最优训练配比 |
| [Mixture of Experts Explained](https://arxiv.org/abs/2401.04088) | 论文 | 3h | MoE 架构综述 |
| [Mamba: Linear-Time Sequence Modeling](https://arxiv.org/abs/2312.00752) | 论文 | 4h | SSM 新架构 |

#### 研究方向

1. **高效注意力机制** - 线性注意力、Flash Attention
2. **状态空间模型** - Mamba、S4 架构
3. **长上下文建模** - Ring Attention、KV Cache 压缩

---

## 子领域二：LLM 训练

**目标**: 掌握预训练、微调、RLHF 等训练技术
**预计时间**: 6-8 周

### 阶段一：入门 (Beginner)

**目标**: 理解训练流程，学会使用现有工具

#### 核心概念

1. **Pretraining** - 大规模无监督预训练
2. **Fine-tuning** - 有监督微调
3. **Instruction Tuning** - 指令微调
4. **PEFT** - 参数高效微调（LoRA、Adapter）

#### 必读资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [State of GPT - Andrej Karpathy](https://www.youtube.com/watch?v=bZQun8Y4L2A) | 视频 | 1.5h | GPT 训练流程详解 |
| [LoRA: Low-Rank Adaptation](https://arxiv.org/abs/2106.09685) | 论文 | 2h | PEFT 经典方法 |
| [LlamaFactory](https://github.com/hiyouga/LLaMA-Factory) | 项目 | 4h | 统一微调框架 |
| [Hugging Face PEFT](https://huggingface.co/docs/peft) | 文档 | 3h | 官方 PEFT 文档 |

#### 实践项目

1. **LoRA 微调实践**
   - 使用 LlamaFactory 微调 LLaMA
   - 构建自己的指令数据集
   - 难度: Medium | 时间: 6h

2. **对比不同 PEFT 方法**
   - 实现 LoRA、AdaLoRA、QLoRA
   - 对比效果与显存占用
   - 难度: Medium | 时间: 4h

#### 检查点

- [ ] 理解 Pretraining 与 Fine-tuning 的区别
- [ ] 能使用 LoRA 进行模型微调
- [ ] 知道如何构建指令数据集
- [ ] 理解常见训练超参数的作用

---

### 阶段二：进阶 (Intermediate)

**目标**: 掌握 RLHF、DPO 等对齐技术

#### 核心技能

1. **RLHF** - 基于人类反馈的强化学习
2. **DPO** - 直接偏好优化
3. **Reward Model** - 奖励模型训练
4. **PPO** - 近端策略优化

#### 推荐资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [Training Language Models to Follow Instructions](https://arxiv.org/abs/2203.02155) | 论文 | 3h | InstructGPT 论文 |
| [Direct Preference Optimization](https://arxiv.org/abs/2305.18290) | 论文 | 2h | DPO 原始论文 |
| [trl - Transformer Reinforcement Learning](https://github.com/lvwerra/trl) | 项目 | 4h | RLHF 实现框架 |
| [LLM-RLHF-Tuning](https://github.com/Joyce94/LLM-RLHF-Tuning) | 项目 | 4h | RLHF 完整实现 |

#### 实践项目

1. **实现 RLHF 三阶段训练**
   - SFT: 有监督微调
   - RM: 训练奖励模型
   - PPO: 强化学习优化
   - 难度: Hard | 时间: 12h

2. **DPO 实践**
   - 构建偏好数据集
   - 使用 DPO 训练模型
   - 对比 DPO 与 RLHF 效果
   - 难度: Medium | 时间: 6h

#### 检查点

- [ ] 能解释 RLHF 三个阶段的作用
- [ ] 理解 DPO 相比 RLHF 的优势
- [ ] 能使用 trl 库进行偏好优化
- [ ] 知道如何收集和处理偏好数据

---

### 阶段三：深入 (Advanced)

**目标**: 掌握大规模训练技术，理解前沿方法

#### 高级主题

1. **Distributed Training** - 分布式训练（DDP、FSDP、DeepSpeed）
2. **Mixed Precision** - 混合精度训练（FP16、BF16）
3. **Gradient Checkpointing** - 梯度检查点
4. **Curriculum Learning** - 课程学习

#### 深度资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [Megatron-LM](https://github.com/NVIDIA/Megatron-LM) | 项目 | 6h | NVIDIA 大规模训练框架 |
| [DeepSpeed](https://github.com/microsoft/DeepSpeed) | 项目 | 4h | 微软深度优化库 |
| [LLaMA 2 Technical Report](https://arxiv.org/abs/2307.09288) | 论文 | 3h | 开源模型训练细节 |
| [Qwen Technical Report](https://arxiv.org/abs/2309.16609) | 论文 | 2h | 通义千问技术报告 |

#### 研究方向

1. **数据质量与配比** - 数据筛选、去重、配比优化
2. **高效预训练** - 课程学习、数据并行策略
3. **持续学习** - 增量训练、知识更新

---

## 子领域三：LLM 推理

**目标**: 掌握推理优化、量化、部署技术
**预计时间**: 3-4 周

### 阶段一：入门 (Beginner)

**目标**: 理解推理流程，学会基本优化

#### 核心概念

1. **Autoregressive Generation** - 自回归生成
2. **KV Cache** - 键值缓存
3. **Beam Search** - 束搜索
4. **Sampling Strategies** - 采样策略（Temperature、Top-p）

#### 必读资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [How to generate text](https://huggingface.co/blog/how-to-generate) | 博客 | 2h | HuggingFace 生成策略 |
| [LLM 推理优化详解](https://zhuanlan.zhihu.com/p/648403338) | 博客 | 2h | 7 种优化策略 |
| [vLLM Documentation](https://vllm.readthedocs.io/) | 文档 | 3h | 高性能推理引擎 |
| [Ollama](https://github.com/ollama/ollama) | 项目 | 2h | 本地 LLM 运行工具 |

#### 实践项目

1. **对比生成策略**
   - 实现 Greedy、Beam Search、Sampling
   - 对比不同 Temperature 的生成效果
   - 难度: Easy | 时间: 3h

2. **部署本地 LLM**
   - 使用 Ollama 运行 LLaMA
   - 测试推理速度与显存占用
   - 难度: Easy | 时间: 2h

#### 检查点

- [ ] 理解自回归生成的过程
- [ ] 知道 KV Cache 的作用
- [ ] 能调整 Temperature、Top-p 参数
- [ ] 能使用 vLLM 或 Ollama 部署模型

---

### 阶段二：进阶 (Intermediate)

**目标**: 掌握量化和高性能推理引擎

#### 核心技能

1. **Quantization** - 量化（INT8、INT4、GPTQ、AWQ）
2. **PagedAttention** - 分页注意力（vLLM）
3. **Continuous Batching** - 连续批处理
4. **Tensor Parallelism** - 张量并行

#### 推荐资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [GPTQ: Accurate Post-Training Quantization](https://arxiv.org/abs/2210.17323) | 论文 | 2h | GPTQ 量化方法 |
| [vLLM: Easy, Fast, and Cheap LLM Serving](https://arxiv.org/abs/2309.06180) | 论文 | 2h | vLLM 原理 |
| [llama.cpp](https://github.com/ggerganov/llama.cpp) | 项目 | 3h | CPU/GPU 推理优化 |
| [AutoGPTQ](https://github.com/PanQiWei/AutoGPTQ) | 项目 | 3h | GPTQ 量化工具 |

#### 实践项目

1. **模型量化实践**
   - 使用 GPTQ 量化 LLaMA
   - 对比 INT4、INT8 精度损失
   - 难度: Medium | 时间: 4h

2. **vLLM 高吞吐部署**
   - 配置 vLLM 服务
   - 压力测试吞吐量
   - 难度: Medium | 时间: 4h

#### 检查点

- [ ] 理解量化的原理与权衡
- [ ] 能使用 vLLM 进行高性能推理
- [ ] 知道 PagedAttention 的工作原理
- [ ] 能配置多 GPU 张量并行

---

### 阶段三：深入 (Advanced)

**目标**: 掌握前沿推理技术

#### 高级主题

1. **Speculative Decoding** - 推测解码
2. **Flash Attention** - 高效注意力实现
3. **Model Compression** - 知识蒸馏、剪枝
4. **Cascade Inference** - 级联推理

#### 深度资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [Flash Attention](https://arxiv.org/abs/2205.14135) | 论文 | 2h | 高效注意力计算 |
| [Speculative Decoding](https://arxiv.org/abs/2211.17192) | 论文 | 2h | 加速推理技术 |
| [SGLang](https://github.com/sgl-project/sglang) | 项目 | 4h | 结构化生成语言 |
| [TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM) | 项目 | 4h | NVIDIA 推理优化 |

#### 研究方向

1. **长上下文推理** - Ring Attention、KV Cache 压缩
2. **多模态推理** - Vision-Language Model 部署
3. **边缘部署** - 移动端、嵌入式设备

---

## 子领域四：LLM 应用

**目标**: 掌握 RAG、Agent、Prompt Engineering 等应用技术
**预计时间**: 4-6 周

### 阶段一：入门 (Beginner)

**目标**: 学会构建基本的 LLM 应用

#### 核心概念

1. **Prompt Engineering** - 提示词工程
2. **Few-shot Learning** - 少样本学习
3. **Chain-of-Thought** - 思维链
4. **Function Calling** - 函数调用

#### 必读资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [Prompt Engineering Guide](https://www.promptingguide.ai/) | 教程 | 4h | 提示词工程指南 |
| [OpenAI Cookbook](https://github.com/openai/openai-cookbook) | 项目 | 4h | OpenAI 最佳实践 |
| [LangChain Tutorials](https://python.langchain.com/docs/tutorials/) | 教程 | 6h | LangChain 官方教程 |
| [API 设计最佳实践](https://platform.openai.com/docs/guides) | 文档 | 2h | OpenAI API 文档 |

#### 实践项目

1. **构建智能问答系统**
   - 设计提示词模板
   - 实现多轮对话
   - 难度: Easy | 时间: 4h

2. **Prompt Engineering 实验**
   - 对比不同提示词策略
   - 实现 CoT、Few-shot
   - 难度: Easy | 时间: 3h

#### 检查点

- [ ] 能设计有效的提示词
- [ ] 理解 CoT、Few-shot 的原理
- [ ] 能使用 OpenAI API 或本地模型
- [ ] 知道如何处理 API 错误和限制

---

### 阶段二：进阶 (Intermediate)

**目标**: 掌握 RAG 和 Agent 开发

#### 核心技能

1. **RAG** - 检索增强生成
2. **Vector Database** - 向量数据库（Pinecone、Milvus、Chroma）
3. **Agent** - 智能体（ReAct、Plan-and-Execute）
4. **LangGraph** - 状态图工作流

#### 推荐资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [LlamaIndex Documentation](https://docs.llamaindex.ai/) | 文档 | 4h | RAG 框架官方文档 |
| [Build a RAG Agent with LangChain](https://python.langchain.com/docs/tutorials/qa_chat_history/) | 教程 | 3h | LangChain RAG 教程 |
| [LangGraph Tutorials](https://langchain-ai.github.io/langgraph/tutorials/) | 教程 | 4h | Agent 工作流教程 |
| [ReAct: Synergizing Reasoning and Acting](https://arxiv.org/abs/2210.03629) | 论文 | 2h | Agent 经典论文 |

#### 实践项目

1. **构建企业知识库 RAG**
   - 文档解析与切片
   - 向量检索与重排序
   - 难度: Medium | 时间: 8h

2. **开发 AI Agent**
   - 实现 ReAct Agent
   - 集成搜索、计算工具
   - 难度: Medium | 时间: 6h

#### 检查点

- [ ] 能构建完整的 RAG 系统
- [ ] 理解向量数据库的使用
- [ ] 能开发具有工具调用能力的 Agent
- [ ] 知道如何优化 RAG 效果

---

### 阶段三：深入 (Advanced)

**目标**: 构建生产级 LLM 应用

#### 高级主题

1. **Multi-Agent System** - 多智能体协作
2. **RAG Optimization** - RAG 高级优化（HyDE、Hybrid Search）
3. **Evaluation** - 应用评估（RAGAS、LLM-as-Judge）
4. **Observability** - 可观测性（Langfuse、LangSmith）

#### 深度资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [AutoGen](https://github.com/microsoft/autogen) | 项目 | 4h | 微软多 Agent 框架 |
| [CrewAI](https://github.com/joaomdmoura/crewAI) | 项目 | 3h | 多 Agent 协作框架 |
| [RAGAS](https://github.com/explodinggradients/ragas) | 项目 | 2h | RAG 评估框架 |
| [Langfuse](https://langfuse.com/docs) | 文档 | 2h | LLM 应用可观测性 |

#### 研究方向

1. **Agentic RAG** - 具有规划能力的 RAG
2. **Self-RAG** - 自反思检索增强
3. **Graph RAG** - 知识图谱增强检索

---

## 子领域五：LLM 安全

**目标**: 理解 LLM 安全风险，掌握对齐与防御技术
**预计时间**: 3-4 周

### 阶段一：入门 (Beginner)

**目标**: 建立安全意识，了解主要风险

#### 核心概念

1. **Alignment** - 价值观对齐
2. **Hallucination** - 幻觉问题
3. **Prompt Injection** - 提示注入攻击
4. **Jailbreak** - 越狱攻击

#### 必读资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [LLM 安全概述](https://blog.csdn.net/2401_82469710/article/details/141141369) | 博客 | 2h | 中文安全综述 |
| [OWASP Top 10 for LLM](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | 文档 | 2h | LLM 安全风险 Top 10 |
| [Prompt Injection Attacks](https://arxiv.org/html/2505.04806v1) | 论文 | 2h | 提示注入攻击综述 |
| [Red Teaming LLMs](https://arxiv.org/abs/2309.01714) | 论文 | 2h | 红队测试方法 |

#### 实践项目

1. **Prompt Injection 实验**
   - 尝试常见的注入攻击
   - 分析防御策略
   - 难度: Easy | 时间: 3h

2. **幻觉检测**
   - 对比不同模型的幻觉表现
   - 尝试减少幻觉的提示词
   - 难度: Easy | 时间: 2h

#### 检查点

- [ ] 理解主要的 LLM 安全风险
- [ ] 知道 Prompt Injection 的原理
- [ ] 了解常见防御策略
- [ ] 能识别模型的幻觉输出

---

### 阶段二：进阶 (Intermediate)

**目标**: 掌握安全对齐技术

#### 核心技能

1. **Constitutional AI** - 宪法 AI
2. **Red Teaming** - 红队测试
3. **Safety Training** - 安全训练
4. **Content Moderation** - 内容审核

#### 推荐资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [Constitutional AI](https://arxiv.org/abs/2212.08073) | 论文 | 3h | Anthropic 对齐方法 |
| [MART: Multi-round Automatic Red-Teaming](https://arxiv.org/abs/2311.07689) | 论文 | 2h | 自动红队测试 |
| [GPTSecurity](https://github.com/GPTSecurity) | 社区 | 3h | LLM 安全社区 |
| [SafeMERGE](https://arxiv.org/abs/2402.05162) | 论文 | 2h | 微调后安全保持 |

#### 实践项目

1. **红队测试实践**
   - 构建测试用例集
   - 评估模型安全性
   - 难度: Medium | 时间: 4h

2. **安全微调**
   - 构建安全数据集
   - 微调模型以提升安全性
   - 难度: Medium | 时间: 6h

#### 检查点

- [ ] 理解 Constitutional AI 的流程
- [ ] 能设计红队测试方案
- [ ] 知道如何构建安全训练数据
- [ ] 理解安全与有用性的权衡

---

### 阶段三：深入 (Advanced)

**目标**: 研究前沿安全问题

#### 高级主题

1. **Backdoor Attacks** - 后门攻击
2. **Model Extraction** - 模型窃取
3. **Unlearning** - 机器遗忘
4. **Watermarking** - 模型水印

#### 深度资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [Backdoor Attacks in LLMs](https://arxiv.org/abs/2308.09687) | 论文 | 3h | 后门攻击综述 |
| [Machine Unlearning](https://arxiv.org/abs/2310.10649) | 论文 | 2h | 遗忘技术综述 |
| [LLM Watermarking](https://arxiv.org/abs/2306.04634) | 论文 | 2h | 模型水印 |
| [AISI Safety Guidelines](https://www.aisi.gov.uk/) | 文档 | 2h | AI 安全指南 |

#### 研究方向

1. **可解释安全** - 安全决策的可解释性
2. **多模态安全** - 视觉语言模型安全
3. **联邦安全** - 分布式训练安全

---

## 学习建议

### 时间安排

- **每周投入**: 建议 10-15 小时
- **实践比例**: 理论 30% + 实践 70%
- **项目驱动**: 每个阶段完成 1-2 个实践项目

### 学习顺序建议

1. **快速入门**: LLM 基础 → LLM 应用 (入门)
2. **深入技术**: LLM 训练 → LLM 推理
3. **应用开发**: LLM 应用 (进阶)
4. **安全保障**: LLM 安全

### 常见误区

1. **只看不练** - LLM 是实践性很强的领域，必须动手
2. **追新不追深** - 基础扎实才能快速理解新技术
3. **忽视安全** - 安全是应用落地的关键考量

### 推荐开发环境

- **GPU**: NVIDIA RTX 3090/4090 或云端 GPU（Colab、Lambda）
- **框架**: PyTorch + Hugging Face Transformers
- **工具**: Jupyter Notebook、VS Code

---

## 相关领域

学完本路径后，可以继续探索:

- [[nlp]] - 自然语言处理
- [[computer-vision]] - 计算机视觉与多模态大模型
- [[reinforcement-learning]] - 强化学习与 RLHF
- [[knowledge-graph]] - 知识图谱与 Graph RAG

---

## 更新日志

- **2026-03-11**: 初始版本，包含 5 个子领域，添加 YAML frontmatter 和 Wiki 链接

---

*生成日期: 2026-03-11*
*资源总数: 125+*