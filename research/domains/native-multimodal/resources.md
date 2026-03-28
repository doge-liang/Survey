# 原生多模态模型 资源清单

> 详细资源列表，按类型和级别分类

## 入门资源 (Beginner)

### 综述文章

1. **Understanding Multimodal LLMs**
   - URL: https://magazine.sebastianraschka.com/p/understanding-multimodal-llms
   - 作者: Sebastian Raschka, PhD
   - 语言: English
   - 说明: 详细解释两种主要架构方案，对比分析各代表模型
   - 更新: 2024-11

2. **The Paradigm Shift to Native Multimodality**
   - URL: https://uplatz.com/blog/the-paradigm-shift-to-native-multimodality-architectural-unification-in-foundation-models/
   - 作者: Uplatz Blog
   - 语言: English
   - 说明: 深度分析 Late Fusion 到 Early Fusion 的范式转变，涵盖 GPT-4o、Gemini 1.5 架构分析
   - 更新: 2025-12

3. **Multimodal LLMs Basics: How LLMs Process Text, Images, Audio & Videos**
   - URL: https://blog.bytebytego.com/p/multimodal-llms-basics-how-llms-process
   - 作者: ByteByteGo
   - 语言: English
   - 说明: 图文并茂的入门介绍，适合零基础学习者
   - 更新: 2025-12

### 视频课程

1. **LLaVA Architecture: Multimodal AI Through Visual Instruction Tuning**
   - URL: https://mbrenndoerfer.com/writing/llava-architecture-visual-instruction-tuning
   - 平台: 个人博客
   - 时长: 58 分钟
   - 说明: 详细讲解 LLaVA 架构和视觉指令调优

## 进阶资源 (Intermediate)

### 架构论文

1. **LLaVA: Large Language and Vision Assistant**
   - 来源: arXiv / Microsoft Research
   - 年份: 2023
   - 引用: 5000+
   - 说明: 经典后融合架构代表，首个开源视觉助手
   - URL: https://arxiv.org/abs/2310.03744

2. **NVLM: Open Frontier-Class Multimodal LLMs**
   - 来源: arXiv / NVIDIA
   - 年份: 2024
   - 说明: 对比三种架构方案（decoder-only vs cross-attention vs hybrid），消融实验详尽
   - URL: https://arxiv.org/abs/2409.11402

3. **Qwen2-VL: Enhancing Vision-Language Model's Perception of the World at Any Resolution**
   - 来源: arXiv / 阿里云
   - 年份: 2024
   - 说明: Naive Dynamic Resolution 机制，支持任意分辨率输入
   - URL: https://arxiv.org/abs/2409.12191

4. **Molmo and PixMo: Open Weights and Open Data for State-of-the-Art Multimodal Models**
   - 来源: arXiv / Allen Institute
   - 年份: 2024
   - 说明: 完全开源（权重+数据集+代码），训练流程透明
   - URL: https://arxiv.org/abs/2409.17146

### 技术博客

1. **LLaVA Architecture: From Frozen ViT to Fine-Tuned LLM**
   - URL: https://learnopencv.com/llava-training-a-visual-assistant/
   - 作者: Bhomik Sharma
   - 说明: 详细解析 LLaVA 训练流程

2. **LLaVA-GM: lightweight LLaVA multimodal architecture**
   - 来源: Frontiers in Computer Science
   - 年份: 2025
   - 说明: 轻量级 LLaVA 多模态架构研究
   - URL: https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2025.1626346/full

## 高级资源 (Advanced)

### 前沿论文

1. **Emu3.5: Native Multimodal Models are World Learners**
   - 来源: arXiv / BAAI
   - 年份: 2025
   - 说明: 端到端预测视觉和语言下一状态的世界模型
   - URL: https://arxiv.org/html/2510.26583v1

2. **Scaling Laws for Native Multimodal Models**
   - 来源: ICCV 2025
   - 作者: Mustafa Shukor et al. (Apple, Sorbonne)
   - 说明: 首个系统性研究原生多模态模型 scaling laws 的论文
   - URL: https://openaccess.thecvf.com/content/ICCV2025/papers/Shukor_Scaling_Laws_for_Native_Multimodal_Models_ICCV_2025_paper.pdf

3. **Janus: Decoupling Visual Encoding for Unified Multimodal Understanding and Generation**
   - 来源: arXiv / DeepSeek
   - 年份: 2024
   - 说明: 解耦视觉编码的统一多模态理解与生成架构
   - URL: https://arxiv.org/abs/2410.13848

4. **Chameleon: 34B parameter mixed-modal foundation model**
   - 来源: arXiv / Meta
   - 年份: 2024
   - 说明: 纯 token 统一方法，QK-Norm 稳定训练
   - URL: https://arxiv.org/abs/2405.09818

5. **Show-o2: Unifying Autoregression and Flow Matching**
   - 说明: 统一自回归理解和流匹配生成
   - 论文: 搜索 arXiv 2025

6. **InternVL3: Exploring Advanced Training and Test-Time Recipes for Open-Source Multimodal Models**
   - 来源: arXiv
   - 年份: 2025
   - 说明: 探索高级训练和测试时策略
   - URL: https://arxiv.org/pdf/2504.10479

### 架构分析

1. **The Llama 3 Herd of Models**
   - 来源: arXiv / Meta
   - 年份: 2024
   - 说明: LLaMA 3.2 多模态架构详解
   - URL: https://arxiv.org/abs/2407.21783

2. **MM1.5: Methods, Analysis & Insights from Multimodal LLM Fine-tuning**
   - 来源: arXiv
   - 年份: 2024
   - 说明: 数据混合和 coordinate tokens 的消融研究
   - URL: https://arxiv.org/abs/2409.20566

3. **Aria: An Open Multimodal Native Mixture-of-Experts Model**
   - 来源: arXiv
   - 年份: 2024
   - 说明: MoE 原生多模态架构
   - URL: 搜索 arXiv 2024

4. **Baichuan-Omni Technical Report**
   - 来源: arXiv
   - 年份: 2024
   - 说明: 三阶段训练流程分析
   - URL: https://arxiv.org/abs/2410.08565

### 效率优化

1. **Efficient multimodal large language models: a survey**
   - 来源: Springer Nature - Visual Intelligence
   - 年份: 2025
   - 说明: 多模态大模型效率优化综述
   - URL: https://link.springer.com/article/10.1007/s44267-025-00099-6

2. **Phi-4-Mini Technical Report**
   - 来源: arXiv / Microsoft
   - 年份: 2025
   - 说明: MoE 轻量级多模态模型
   - URL: https://arxiv.org/html/2503.01743v1

3. **Efficient GPT-4V level multimodal large language model for deployment on edge devices**
   - 来源: Nature Communications
   - 年份: 2025
   - 说明: 边缘设备部署的低功耗多模态模型
   - URL: https://www.nature.com/articles/s41467-025-61040-5

## 评估基准

### 多模态基准

| 基准 | 说明 | 链接 |
|------|------|------|
| MMMU | 大规模多学科多模态理解，大学级任务 | 搜索 arXiv |
| MMBench | 综合多任务评估管道 | 搜索 arXiv |
| GenEval | 文本到图像对齐和组合推理 | 搜索 arXiv |

### 对比分析

| 模型 | 类型 | MMMU | 关键特点 |
|------|------|------|---------|
| GPT-4o | 闭源 | ~69% | 实时音频/视频 |
| Gemini 1.5 Pro | 闭源 | ~67% | 10M token 上下文 |
| Llama 4 Maverick | 开源 | ~65% | MoE，高效 |
| Janus-Pro-7B | 开源 | N/A (79.2 MMBench) | 理解生成统一 |

## 社区

### 论坛

- Reddit: r/MachineLearning
- Reddit: r/LocalLLaMA
- Stack Overflow: [multimodal] tag

### GitHub 项目

1. **llava-vl/llava-vl.github.io**
   - GitHub: https://github.com/llava-vl
   - 说明: LLaVA 官方页面和博客

2. **MultiBench**
   - GitHub: pliang279/MultiBench
   - 说明: 多模态训练结构和基准

3. **HighMMT**
   - GitHub: pliang279/HighMMT
   - 说明: 高效多模态训练

### 社交媒体

- Twitter/X: #MultimodalAI, #VisionLanguage
- Reddit: r/ Multimodal

---

*最后更新: 2026-03-27*
*资源数量: 25+*
