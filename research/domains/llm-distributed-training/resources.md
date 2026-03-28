# LLM 分布式训练资源清单

> 详细资源列表，按类型和级别分类

## 入门资源 (Beginner)

### 官方文档

1. **[PyTorch DistributedDataParallel 官方教程](https://pytorch.org/tutorials/intermediate/ddp_tutorial.html)**
   - URL: https://pytorch.org/tutorials/intermediate/ddp_tutorial.html
   - 语言: English
   - 说明: PyTorch DDP 官方入门教程，详细讲解分布式数据并行
   - 更新: 2024

2. **[PyTorch FSDP 入门教程](https://docs.pytorch.org/tutorials/intermediate/FSDP1_tutorial.html)**
   - URL: https://docs.pytorch.org/tutorials/intermediate/FSDP1_tutorial.html
   - 语言: English
   - 说明: FSDP 入门教程，概念清晰
   - 更新: 2024

3. **[ColossalAI 分布式训练概念](https://colossalai.org/docs/concepts/distributed_training/)**
   - URL: https://colossalai.org/docs/concepts/distributed_training/
   - 语言: English
   - 说明: 分布式系统基础概念讲解
   - 更新: 2025

### 教程

1. **[LambdaLabs 分布式训练指南](https://github.com/LambdaLabsML/distributed-training-guide)**
   - URL: https://github.com/LambdaLabsML/distributed-training-guide
   - 平台: GitHub
   - 时长: 4h
   - 说明: 598 stars，实践导向的分布式训练代码指南
   - Stars: 598

2. **[DeepSpeed Getting Started](https://www.deepspeed.ai/tutorials/large-models-w-deepspeed/)**
   - URL: https://www.deepspeed.ai/tutorials/large-models-w-deepspeed/
   - 平台: DeepSpeed 官网
   - 时长: 3h
   - 说明: DeepSpeed 官方入门教程
   - 更新: 2026

3. **[Multi-Node LLM Training on DigitalOcean](https://www.digitalocean.com/community/tutorials/multi-node-llm-training-at-scale)**
   - URL: https://www.digitalocean.com/community/tutorials/multi-node-llm-training-at-scale
   - 平台: DigitalOcean
   - 时长: 2h
   - 说明: 多节点训练实战指南
   - 更新: 2025

## 进阶资源 (Intermediate)

### 实践项目

1. **[NVIDIA/Megatron-LM](https://github.com/nvidia/megatron-lm)**
   - GitHub: https://github.com/nvidia/megatron-lm
   - Stars: 15,825
   - 说明: NVIDIA 开源的大模型训练框架，支持张量并行、流水线并行、序列并行
   - 语言: Python

2. **[Microsoft/DeepSpeed](https://github.com/microsoft/deepspeed)**
   - GitHub: https://github.com/microsoft/deepspeed
   - Stars: 32,000+
   - 说明: Microsoft 开源的深度学习优化库，ZeRO 优化器发明者
   - 语言: Python/C++

3. **[Colossal-AI](https://github.com/hpcaitech/ColossalAI)**
   - GitHub: https://github.com/hpcaitech/ColossalAI
   - Stars: 40,000+
   - 说明: HPC-AI 开源的统一分布式训练框架
   - 语言: Python

### 博客文章

1. **[An illustrated deep-dive into Megatron-style tensor parallelism](https://danielvegamyhre.github.io/ml/performance/2025/03/30/illustrated-megatron.html)**
   - URL: https://danielvegamyhre.github.io/ml/performance/2025/03/30/illustrated-megatron.html
   - 作者: Daniel Vega
   - 说明: Megatron 张量并行图解教程
   - 更新: 2025

2. **[DDP vs FSDP vs DeepSpeed: Choosing the Right Multi-GPU Training Strategy](https://mljourney.com/ddp-vs-fsdp-vs-deepspeed-zero-choosing-the-right-multi-gpu-training-strategy/)**
   - URL: https://mljourney.com/ddp-vs-fsdp-vs-deepspeed-zero-choosing-the-right-multi-gpu-training-strategy/
   - 作者: ML Journey
   - 说明: 三种分布式策略对比分析
   - 更新: 2026

3. **[Fine-Tuning LLMs with DeepSpeed - Step-by-Step Guide](https://medium.com/@yxinli92/fine-tuning-large-language-models-with-deepspeed-a-step-by-step-guide-2fa6ce27f68a)**
   - URL: https://medium.com/@yxinli92/fine-tuning-large-language-models-with-deepspeed-a-step-by-step-guide-2fa6ce27f68a
   - 作者: Irina (Xinli) Yu
   - 说明: DeepSpeed 微调实战指南
   - 更新: 2024

### 视频课程

1. **[EfficientML.ai 分布式训练 Part 1 (MIT 6.5940)](https://www.youtube.com/watch?v=LcOM-nZdqxw)**
   - URL: https://www.youtube.com/watch?v=LcOM-nZdqxw
   - 平台: YouTube
   - 费用: Free
   - 说明: MIT 课程，分布式训练基础
   - 更新: 2024

## 高级资源 (Advanced)

### 学术论文

1. **[Megatron-LM: Training Multi-billion Parameter Language Models Using Model Parallelism](https://arxiv.org/abs/1909.08053)**
   - 来源: arXiv
   - 年份: 2019
   - 引用: 3000+
   - 说明: Megatron 原始论文，张量并行开创性工作

2. **[ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://arxiv.org/abs/1910.02054)**
   - 来源: arXiv
   - 年份: 2019
   - 引用: 2000+
   - 说明: ZeRO 原始论文，分布式训练内存优化里程碑

3. **[Communication-Efficient Large-Scale Distributed Deep Learning: A Comprehensive Survey](https://arxiv.org/abs/2404.06114)**
   - 来源: arXiv
   - 年份: 2024
   - 说明: 2024 年最新综述，覆盖分布式训练全貌

4. **[Efficient Training of Large Language Models on Distributed Infrastructures: A Survey](https://arxiv.org/abs/2407.20018)**
   - 来源: arXiv
   - 年份: 2024
   - 说明: LLM 训练基础设施综述

5. **[Beyond A Single AI Cluster: A Survey of Decentralized LLM Training](https://arxiv.org/html/2503.11023v2)**
   - 来源: arXiv
   - 年份: 2025
   - 说明: 去中心化 LLM 训练综述

### 开源项目

1. **[awesome-distributed-ml](https://github.com/Shenggan/awesome-distributed-ml)**
   - GitHub: https://github.com/Shenggan/awesome-distributed-ml
   - Stars: 266
   - 说明: 分布式 ML 资源合集

2. **[awesome-distributed-LLM](https://github.com/solidlabnetwork/awesome-distributed-LLM)**
   - GitHub: https://github.com/solidlabnetwork/awesome-distributed-LLM
   - Stars: 11
   - 说明: 分布式 LLM 论文和仓库列表

3. **[Awesome-LLM-Training-System](https://github.com/InternLM/Awesome-LLM-Training-System)**
   - GitHub: https://github.com/InternLM/Awesome-LLM-Training-System
   - Stars: 1000+
   - 说明: InternLM 出品的 LLM 训练系统资源列表

## 官方框架文档

### DeepSpeed

- [官方教程列表](https://www.deepspeed.ai/tutorials/) - 48 个教程
- [ZeRO 教程](https://www.deepspeed.ai/tutorials/zero/) - ZeRO-1/2/3 详解
- [ZeRO++ 教程](https://www.deepspeed.ai/tutorials/zeropp/) - 通信优化
- [ZeRO-Offload 教程](https://www.deepspeed.ai/tutorials/zero-offload/) - CPU offload

### Megatron-LM

- [GitHub 仓库](https://github.com/nvidia/megatron-lm) - 15.8k stars
- [Hugging Face 集成](https://huggingface.co/docs/accelerate/en/usage_guides/megatron_lm)
- [Megatron Bridge](https://docs.nvidia.com/nemo/megatron-bridge/latest/)

### Colossal-AI

- [官方文档](https://colossalai.org/docs/) - 完整文档
- [Booster API](https://colossalai.org/docs/basics/booster_api) - 统一训练接口
- [序列并行](https://colossalai.org/docs/features/sequence_parallelism) - 序列并行实现

### PyTorch FSDP

- [FSDP 高级教程](https://pytorch.org/tutorials/intermediate/FSDP_advanced_tutorial.html)
- [PyTorch 官方博客: Maximizing training throughput using FSDP](https://pytorch.org/blog/maximizing-training)
- [Google Cloud FSDP 教程](https://cloud.google.com/ai-hypercomputer/docs/tutorials/fsdp-llama4)

## 社区

### 论坛

- [PyTorch 论坛](https://discuss.pytorch.org/) - PyTorch 官方论坛
- [NVIDIA 开发者论坛](https://forums.developer.nvidia.com/) - GPU 训练讨论

### GitHub Issues

- [DeepSpeed Issues](https://github.com/microsoft/DeepSpeed/issues)
- [Megatron-LM Discussions](https://github.com/NVIDIA/Megatron-LM/discussions)
- [Colossal-AI Issues](https://github.com/hpcaitech/ColossalAI/issues)

### 社交媒体

- Reddit: r/MachineLearning, r/LocalLLaMA
- Twitter/X: #DistributedTraining, #LLMTraining

---

*最后更新: 2026-03-28*
*资源数量: 25+*
