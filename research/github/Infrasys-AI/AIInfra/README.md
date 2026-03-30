---
id: Infrasys-AI/AIInfra
title: AIInfra Analysis — AI 基础设施开源课程
source_type: github
upstream_url: "https://github.com/Infrasys-AI/AIInfra"
generated_by: github-researcher
created_at: "2026-03-18T00:00:00Z"
updated_at: "2026-03-18T00:00:00Z"
tags: [aiinfra, aisystem, 大模型, 分布式训练, AI集群, Megatron, DeepSpeed, MoE, Transformer, 云原生, K8S, AI基础设施, 开源课程]
language: zh
---
# AIInfra — AI 基础设施

> 本项目聚焦于大模型系统的全栈软硬件协同设计，覆盖从底层 AI 集群到上层应用的全链路技术，是 AI 基础设施领域的系统性开源课程。

[![GitHub stars](https://img.shields.io/github/stars/Infrasys-AI/AIInfra)](https://github.com/Infrasys-AI/AIInfra)
[![License](https://img.shields.io/github/license/Infrasys-AI/AIInfra)](https://github.com/Infrasys-AI/AIInfra)
[![Contributors](https://img.shields.io/github/contributors/Infrasys-AI/AIInfra)](https://github.com/Infrasys-AI/AIInfra/graphs/contributors)

## 概述

**AIInfra**（AI 基础设施）是一个专注于大模型系统的系统性开源课程项目，由 ZOMI 团队维护。项目围绕大模型训练与推理的全栈技术栈展开，涵盖 AI 集群硬件、高速通信网络、云原生平台、分布式训练框架、推理优化算法、大模型架构及行业应用等多个维度。

与大模型领域的姊妹项目 **AISystem**（聚焦传统小模型时代的 AI 芯片与编译器）不同，AIInfra 重点面向大模型时代，深度展开分布式集群架构、分布式训练、大模型算法等核心技术。课程配套提供 B 站视频讲解和开源 PPT 下载，形成了"文字课程 + 视频 + 代码实践"三位一体的学习体系。

项目自 2024 年 7 月上线以来，已获得超过 **6,400 Stars** 和 **855 Forks**，吸引了 70 位贡献者参与，是 AI Infra 领域最具影响力的中文开源课程之一。

## 技术栈

| 类别       | 技术                                      |
| ---------- | ----------------------------------------- |
| 内容格式   | Jupyter Notebook (.ipynb)、Markdown (.md) |
| 演示格式   | PPT (.pptx)、PDF (.pdf)                   |
| 代码语言   | Python、少量 C++                           |
| 机器学习   | PyTorch                                   |
| 分布式训练 | DeepSpeed、Megatron-LM                    |
| 模型框架   | HuggingFace Transformers                  |
| 集群管理   | Docker、Kubernetes (K8S)                  |
| 通信库     | NCCL、HCCL、MPI                           |
| 部署平台   | 云原生架构（容器化、CI/CD）               |
| 网站托管   | GitHub Pages（课程文档站）                |

## 项目结构

```
Infrasys-AI/AIInfra/
├── 00Summary/              # 大模型系统概述
│   ├── 01ScalingLaw.md     # Scaling Law 整体解读
│   ├── 02StandardScaling.md
│   ├── 03TTScaling.md
│   ├── 04TrainingStack.md  # 大模型训练与 AI Infra 关系
│   ├── 05InferStack.md     # 大模型推理与 AI Infra 关系
│   └── 06Future.md         # AI Infra 核心逻辑与行业趋势
│
├── 01AICluster/           # AI 计算集群
│   ├── 01Roadmap/          # 计算集群发展之路
│   ├── 02L0L1Base/         # L0/L1 集群基建
│   ├── 03SuperPod/         # 万卡 AI 集群
│   └── 04Performance/      # 集群性能分析与建模实践
│
├── 02StorComm/            # 通信与存储
│   ├── 01Roadmap/         # 集群组网之路
│   ├── 02NetworkComm/     # 网络通信进阶
│   ├── 03CollectComm/     # 集合通信原理
│   ├── 04CommLibrary/     # NCCL/HCCL/MPI 通信库
│   └── 05StorforAI/       # 集群存储与 CheckPoint
│
├── 03DockCloud/           # 集群容器与云原生
│   ├── 01Roadmap/         # 容器时代
│   ├── 02DockerK8s/       # Docker 与 K8S 基础
│   ├── 03DiveintoK8s/     # 深入 K8S 核心机制
│   └── 04CloudforAI/      # AI 云平台
│
├── 04Train/               # 分布式训练
│   ├── 01ParallelBegin/   # 分布式并行基础 (DDP)
│   ├── 02ParallelAdv/     # 大模型并行进阶 (Megatron, ZeRO)
│   ├── 03TrainAcceler/    # 训练加速 (Flash Attention, FP8)
│   ├── 04PostTrainRL/     # 后训练与强化学习 (RLHF/DPO)
│   ├── 05FineTune/        # 大模型微调 (LoRA, SFT)
│   └── 06VerifValid/      # 验证评估 (OpenCompass)
│
├── 05Infer/               # 分布式推理
│   ├── 01Foundation/      # 推理基本概念
│   ├── 02InferSpeedUp/    # 推理加速
│   ├── 03SchedSpeedUp/    # 架构调度加速
│   ├── 04LongInfer/       # 长序列推理
│   ├── 05OutputSamp/       # 输出采样
│   └── 06CompDistill/      # 大模型压缩与蒸馏
│
├── 06AlgoData/            # 大模型算法与数据
│   ├── 01Basic/           # Transformer 架构详解
│   ├── 02MoE/             # MoE 混合专家模型
│   ├── 03NewArch/         # 创新架构 (SSM/RWKV)
│   ├── 04ImageTextGenerat/ # 图文生成与理解
│   ├── 05VideoGenerat/    # 视频大模型
│   ├── 06AudioGenerat/    # 语音大模型
│   └── 07DataEngineer/    # 数据工程
│
├── 07Application/         # 大模型应用
│   ├── 01AIAgent/         # AI Agent 智能体
│   ├── 02MCP/             # MCP 协议
│   ├── 03RAG/             # 检索增强生成
│   ├── 04AutoDrive/       # 自动驾驶
│   ├── 05Embodied/        # 具身智能
│   ├── 06Remmcon/         # 生成推荐
│   ├── 07Safe/            # AI 安全
│   └── 08History/         # AI 历史十年
│
├── Others/                # 杂项
│   ├── 03Glossary.md      # 术语表
│   ├── 05Criterion.md     # 评测标准
│   └── 06Instruments.md   # 工具链
│
├── static/                # 静态资源
├── README.md              # 项目主入口
├── requirements.txt        # Python 依赖
└── prompt.md              # 提示词配置
```

## 核心特性

### 1. 全栈覆盖：从芯片到应用的系统性课程体系

AIInfra 构建了完整的大模型系统知识图谱，覆盖硬件层（GPU 集群、节点架构、万卡集群）、通信层（NCCL/HCCL、InfiniBand、集合通信原语）、平台层（Docker、K8S）、训练层（分布式并行、ZeRO、Flash Attention、RLHF/DPO）、推理层（量化压缩、长序列推理、KV Cache 优化）、算法层（Transformer、MoE、多模态）以及应用层（Agent、RAG、具身智能）。这种全栈设计使学习者能够理解从底层硬件到上层应用的完整技术链路。

### 2. 理论 + 实践 + 视频三位一体的学习模式

每个技术模块都配套提供 Markdown 理论文档、PPT 课件、B 站视频讲解以及可运行的 Jupyter Notebook 代码实践。例如 Transformer 模块提供了 7 个核心机制的代码实践（Sinusoidal 编码、BPE 分词、Embedding、MHA/GQA/MLA 注意力等），MoE 模块提供了从单机单卡到分布式实现的完整代码链条。30+ 代码实践覆盖了从模型搭建、训练到评估的完整生命周期。

### 3. 紧跟前沿：大模型训练与推理的核心技术深度解析

项目对大模型领域的关键技术进行了深入剖析。在训练侧，详细解析了 Megatron-LM 的张量并行（TP）、流水线并行（PP）、序列并行（SP）原理及代码实现，DeepSpeed ZeRO 显存优化策略，Flash Attention 实现机制，以及 RLHF/DPO/GRPO 等后训练算法。在推理侧，覆盖了 KV Cache 优化、Continuous Batching、Speculative Decoding、长序列处理（Ring Attention）和大模型压缩（量化与蒸馏）等前沿技术。

### 4. 多芯片支持：NVIDIA 与华为昇腾双轨并行

课程不局限于单一硬件平台，同时覆盖 NVIDIA GPU（CUDA/NCCL）和华为昇腾 NPU（HCCL/CANN）两套生态的并行训练技术，体现了大模型基础设施在国产化替代背景下的现实需求。

### 5. 活跃的开源社区与持续迭代

项目由 70 位贡献者共同维护，持续跟踪大模型领域最新进展（如 Inference Time Scaling Law、GRPO 训练算法等），并定期更新课程内容。与 B 站 ZOMI 酱频道联动，视频与文字课程同步更新，形成了活跃的学习社区。

## 架构设计

AIInfra 采用**分层知识课程架构**，按技术层次从底向上组织内容：

```
┌──────────────────────────────────────────────┐
│  07Application  (应用层)                       │
│  Agent / RAG / 具身智能 / 自动驾驶             │
├──────────────────────────────────────────────┤
│  06AlgoData   (算法层)                        │
│  Transformer / MoE / 多模态模型                │
├──────────────────────────────────────────────┤
│  05Infer      (推理层)                        │
│  KV Cache / 量化压缩 / 长序列推理              │
├──────────────────────────────────────────────┤
│  04Train      (训练层)                        │
│  DDP / Megatron / ZeRO / Flash Attention     │
├──────────────────────────────────────────────┤
│  03DockCloud  (平台层)                        │
│  Docker / K8S / AI 云平台                     │
├──────────────────────────────────────────────┤
│  02StorComm   (通信存储层)                    │
│  NCCL/HCCL / InfiniBand / CheckPoint         │
├──────────────────────────────────────────────┤
│  01AICluster  (硬件层)                        │
│  万卡集群 / GPU 节点 / 散热 / 性能建模        │
├──────────────────────────────────────────────┤
│  00Summary     (概述层)                        │
│  Scaling Law / 训练栈 / 推理栈 / 行业趋势     │
└──────────────────────────────────────────────┘
```

核心设计理念是：**以大模型训练和推理的业务流程为主线**，将 AI 集群硬件、分布式系统、算法优化等知识点有机串联，而非孤立地讲解各个技术点。每个模块的实践代码均可独立运行，同时通过"概述层"提供全局视角，帮助学习者建立系统化的认知框架。

## 快速开始

### 方式一：在线浏览课程文档

访问课程文档站：[https://infrasys-ai.github.io/aiinfra-docs/](https://infrasys-ai.github.io/aiinfra-docs/)

### 方式二：克隆仓库（适合小量更新）

```bash
# 克隆主仓库
git clone https://github.com/Infrasys-AI/AIInfra.git
cd AIInfra
```

> ⚠️ 注意：仓库已超过 10GB（含高清图片和 PPT 源文件）。如果网络较慢，建议从 [Releases](https://github.com/Infrasys-AI/AIInfra/releases) 下载压缩包。

### 方式三：运行代码实践

```bash
# 1. 安装 Python 依赖
pip install -r requirements.txt

# 2. 启动 Jupyter Notebook
jupyter notebook

# 3. 进入感兴趣的模块，例如 Transformer 实践
# 06AlgoData/01Basic/Practice01MiniTransformer.ipynb

# 4. 或进入分布式训练实践
# 04Train/02ParallelAdv/Code02Megatron.ipynb
```

### 推荐学习路径

| 阶段   | 建议模块                                  | 预计时长 |
| ------ | ----------------------------------------- | -------- |
| 入门   | 00Summary → 01AICluster → 06AlgoData 基础 | 2-3 周   |
| 进阶   | 04Train 分布式训练 → 02StorComm 通信      | 3-4 周   |
| 实践   | 04Train 代码实践 → 05Infer 推理优化        | 2-3 周   |
| 拓展   | 07Application 应用 → 03DockCloud 云原生    | 2 周     |

## 学习价值

### 体系化理解大模型系统

AIInfra 最核心的价值在于帮助学习者建立对大模型系统的**全局认知**。大多数资料只聚焦于某一环节（如只讲分布式训练或只讲推理优化），而本课程从 Scaling Law 出发，贯穿 AI 集群 → 通信存储 → 容器平台 → 训练 → 推理 → 算法的完整链路，使学习者能够理解各个技术模块之间的依赖关系和协同原理。

### 掌握分布式训练的核心技术

通过 Megatron-LM 张量并行、流水线并行的原理讲解与代码实践，学习者可以深入理解如何将大模型从单卡扩展到千卡/万卡集群。课程还涵盖了 ZeRO 显存优化、Flash Attention、FP8 混合精度等工程上最关键训练加速技术，这些都是大模型工程实践中的核心技能。

### 深入理解 Transformer 与 MoE 架构

课程对 Transformer 架构进行了庖丁解牛式的剖析——从 Tokenizer、Embedding、Attention 变种（MHA/MQA/GQA/MLA）到长序列处理，每一个核心机制都有对应的理论讲解和代码实现。MoE 模块更是覆盖了从 GShard、Switch Transformer 到 DeepSeek MoE 的演进路径，以及从单机到分布式的完整实现。

### 前沿技术持续跟进

课程内容与工业界和学术界的最新进展保持同步，持续跟踪 Inference Time Scaling Law、GRPO、MoE 分布式训练、Long Context 等前沿方向，帮助学习者保持对领域动态的敏感度。

### 面向就业与科研的双重价值

对于 AI 系统方向的本科生、硕博研究生，AIInfra 提供了系统化的知识储备；对于 AI Infra 从业者，课程涵盖了大量工程实践内容（如 K8S 集群搭建、CheckPoint 设计、推理引擎优化），具有直接的实战参考价值。

## 相关项目

| 项目                                                         | 描述                                                         | 相似度  |
| ------------------------------------------------------------ | ------------------------------------------------------------ | -------- |
| [Infrasys-AI/AISystem](https://github.com/Infrasys-AI/AISystem) | AI 系统姊妹项目，聚焦传统小模型时代的 AI 芯片、编译器、推理引擎与 AI 框架（16.4k Stars） | 极高     |
| [ai-infra-curriculum/ai-infra-engineer-learning](https://github.com/ai-infra-curriculum/ai-infra-engineer-learning) | AI Infrastructure Engineer 学习路线，面向 2-4 年经验从业者      | 高       |
| [Hoper-J/AI-Guide-and-Demos-zh_CN](https://github.com/Hoper-J/AI-Guide-and-Demos-zh_CN) | 中文 LLM 大模型入门指南，从 API 调用到本地部署和微调（3.7k Stars） | 中       |
| [deepseek-ai/DeepSeek-V3](https://github.com/deepseek-ai/DeepSeek-V3) | DeepSeek 大模型，课程中 MoE 与分布式训练的最佳实践参考          | 中       |
| [mistralai/Megatron-LM](https://github.com/NVIDIA/Megatron-LM) | NVIDIA 大模型并行训练框架，课程中张量/流水线并行的核心参考实现  | 中       |
| [microsoft/DeepSpeed](https://github.com/microsoft/DeepSpeed) | 微软分布式训练优化库，课程中 ZeRO/RLHF 的核心参考实现          | 中       |

## 参考资料

- [GitHub 仓库](https://github.com/Infrasys-AI/AIInfra)
- [在线课程文档](https://infrasys-ai.github.io/aiinfra-docs/)
- [B 站视频课程（ZOMI 酱）](https://space.bilibili.com/517221395)
- [姊妹项目 AISystem](https://github.com/Infrasys-AI/AISystem)
- [YouTube 频道 ZOMI6222](https://www.youtube.com/@zomi6222/videos)

---

*Generated: 2026-03-18*
