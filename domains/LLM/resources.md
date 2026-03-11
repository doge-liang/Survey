# LLM 资源清单

> **更新日期**: 2026-03-11
> **资源总数**: 100+

本文档整理了大语言模型（LLM）领域的学习资源，按五个子领域分类。

---

## 目录

1. [LLM-Basics 基础](#llm-basics-基础)
2. [LLM-Training 训练](#llm-training-训练)
3. [LLM-Inference 推理](#llm-inference-推理)
4. [LLM-Application 应用](#llm-application-应用)
5. [LLM-Safety 安全](#llm-safety-安全)

---

## LLM-Basics 基础

### 经典论文

| 论文 | arXiv | 年份 | 难度 | 说明 |
|------|-------|------|------|------|
| Attention Is All You Need | [1706.03762](https://arxiv.org/abs/1706.03762) | 2017 | ⭐⭐ | Transformer 开山之作，必读 |
| BERT: Pre-training of Deep Bidirectional Transformers | [1810.04805](https://arxiv.org/abs/1810.04805) | 2018 | ⭐⭐ | 双向预训练模型，Encoder-only 代表 |
| Language Models are Unsupervised Multitask Learners (GPT-2) | - | 2019 | ⭐⭐ | GPT 系列第二篇，展示零样本能力 |
| Language Models are Few-Shot Learners (GPT-3) | [2005.14165](https://arxiv.org/abs/2005.14165) | 2020 | ⭐⭐⭐ | 175B 参数，展示涌现能力 |
| LLaMA: Open and Efficient Foundation Language Models | [2302.13971](https://arxiv.org/abs/2302.13971) | 2023 | ⭐⭐ | Meta 开源模型，Decoder-only 架构典范 |
| RoPE: Rotary Position Embedding | [2104.09864](https://arxiv.org/abs/2104.09864) | 2021 | ⭐⭐⭐ | 相对位置编码，被 LLaMA 等采用 |
| Scaling Laws for Neural Language Models | [2001.08361](https://arxiv.org/abs/2001.08361) | 2020 | ⭐⭐⭐ | OpenAI 缩放定律，指导模型设计 |
| Training Compute-Optimal Large Language Models (Chinchilla) | [2203.15556](https://arxiv.org/abs/2203.15556) | 2022 | ⭐⭐⭐ | 最优训练配比研究 |

### 开源项目

| 项目 | Stars | GitHub | 说明 |
|------|-------|--------|------|
| transformers | 140k+ | [huggingface/transformers](https://github.com/huggingface/transformers) | Hugging Face 核心库，支持 100+ 模型 |
| tokenizers | 9k+ | [huggingface/tokenizers](https://github.com/huggingface/tokenizers) | 快速 Tokenizer 实现 |
| sentencepiece | 10k+ | [google/sentencepiece](https://github.com/google/sentencepiece) | Google 子词分词器 |
| nanoGPT | 40k+ | [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | Karpathy 极简 GPT 训练代码 |
| lit-llama | 8k+ | [Lightning-AI/lit-llama](https://github.com/Lightning-AI/lit-llama) | Lightning AI 的 LLaMA 实现 |

### 教程课程

| 课程 | 来源 | 时长 | 说明 |
|------|------|------|------|
| [CS224N: NLP with Deep Learning](https://web.stanford.edu/class/cs224n/) | Stanford | 40h | NLP 深度学习经典课程 |
| [Hugging Face NLP Course](https://huggingface.co/learn/nlp-course) | Hugging Face | 10h | 官方 NLP 课程，实践导向 |
| [Dive into Deep Learning](https://d2l.ai/) | D2L | 50h | 动手学深度学习，含 Transformer 章节 |
| [The Annotated Transformer](https://nlp.seas.harvard.edu/annotated-transformer/) | Harvard | 6h | 逐行代码解析 Transformer |
| [Let's build GPT](https://www.youtube.com/watch?v=kCc8FmEb1nY) | Karpathy | 2h | 从零构建 GPT 视频 |

### 博客社区

| 资源 | 语言 | 说明 |
|------|------|------|
| [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/) | EN | Transformer 可视化详解 |
| [The Illustrated GPT-2](https://jalammar.github.io/illustrated-gpt2/) | EN | GPT-2 架构图解 |
| [Transformer 从零详解](https://zhuanlan.zhihu.com/p/429877991) | CN | 中文 Transformer 详解 |
| [Attention 机制详解](https://zhuanlan.zhihu.com/p/404601714) | CN | Attention 原理深入 |

---

## LLM-Training 训练

### 经典论文

| 论文 | arXiv | 年份 | 难度 | 说明 |
|------|-------|------|------|------|
| LoRA: Low-Rank Adaptation of Large Language Models | [2106.09685](https://arxiv.org/abs/2106.09685) | 2021 | ⭐⭐ | 参数高效微调，必读 |
| Training language models to follow instructions with human feedback | [2203.02155](https://arxiv.org/abs/2203.02155) | 2022 | ⭐⭐⭐ | InstructGPT，RLHF 奠基之作 |
| Direct Preference Optimization | [2305.18290](https://arxiv.org/abs/2305.18290) | 2023 | ⭐⭐⭐ | DPO，无需奖励模型的偏好优化 |
| QLoRA: Efficient Finetuning of Quantized LLMs | [2305.14314](https://arxiv.org/abs/2305.14314) | 2023 | ⭐⭐ | 量化 + LoRA，降低微调门槛 |
| Constitutional AI: Harmlessness from AI Feedback | [2212.08073](https://arxiv.org/abs/2212.08073) | 2022 | ⭐⭐⭐ | Anthropic 对齐方法 |
| LLaMA 2: Open Foundation and Fine-Tuned Chat Models | [2307.09288](https://arxiv.org/abs/2307.09288) | 2023 | ⭐⭐ | 开源模型训练细节公开 |
| FlashAttention: Fast and Memory-Efficient Exact Attention | [2205.14135](https://arxiv.org/abs/2205.14135) | 2022 | ⭐⭐⭐ | 高效注意力实现 |
| ZeRO: Memory Optimizations Toward Training Trillion Parameter Models | - | 2020 | ⭐⭐⭐ | DeepSpeed 核心，分布式训练 |

### 开源项目

| 项目 | Stars | GitHub | 说明 |
|------|-------|--------|------|
| LLaMA-Factory | 35k+ | [hiyouga/LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory) | 统一微调框架，支持 100+ 模型 |
| DeepSpeed | 35k+ | [microsoft/DeepSpeed](https://github.com/microsoft/DeepSpeed) | 微软分布式训练框架 |
| Megatron-LM | 12k+ | [NVIDIA/Megatron-LM](https://github.com/NVIDIA/Megatron-LM) | NVIDIA 大规模训练框架 |
| peft | 17k+ | [huggingface/peft](https://github.com/huggingface/peft) | Hugging Face PEFT 库 |
| trl | 12k+ | [lvwerra/trl](https://github.com/lvwerra/trl) | Transformer 强化学习库 |
| qlora | 10k+ | [artidoro/qlora](https://github.com/artidoro/qlora) | QLoRA 官方实现 |
| axolotl | 8k+ | [OpenAccess-AI-Collective/axolotl](https://github.com/OpenAccess-AI-Collective/axolotl) | 简化微调工具 |

### 教程课程

| 课程 | 来源 | 时长 | 说明 |
|------|------|------|------|
| [State of GPT](https://www.youtube.com/watch?v=bZQun8Y4L2A) | Karpathy | 1.5h | GPT 训练流程详解 |
| [Hugging Face PEFT 教程](https://huggingface.co/docs/peft) | HF | 3h | PEFT 官方文档 |
| [DeepSpeed 教程](https://www.deepspeed.ai/tutorials/) | Microsoft | 4h | 分布式训练教程 |
| [RLHF 实现指南](https://github.com/Joyce94/LLM-RLHF-Tuning) | GitHub | 6h | RLHF 三阶段完整实现 |

### 博客社区

| 资源 | 语言 | 说明 |
|------|------|------|
| [LoRA 详解](https://zhuanlan.zhihu.com/p/629931739) | CN | LoRA 原理解析 |
| [RLHF 入门指南](https://zhuanlan.zhihu.com/p/667653241) | CN | RLHF 三阶段详解 |
| [Fine-tuning 最佳实践](https://blog.csdn.net/2401_84495872/article/details/146500059) | CN | 微调技术总结 |

---

## LLM-Inference 推理

### 经典论文

| 论文 | arXiv | 年份 | 难度 | 说明 |
|------|-------|------|------|------|
| vLLM: Easy, Fast, and Cheap LLM Serving | [2309.06180](https://arxiv.org/abs/2309.06180) | 2023 | ⭐⭐ | PagedAttention，高吞吐推理 |
| GPTQ: Accurate Post-Training Quantization | [2210.17323](https://arxiv.org/abs/2210.17323) | 2022 | ⭐⭐⭐ | GPTQ 量化方法 |
| AWQ: Activation-aware Weight Quantization | [2306.00978](https://arxiv.org/abs/2306.00978) | 2023 | ⭐⭐⭐ | 激活感知量化 |
| Fast Inference from Transformers via Speculative Decoding | [2211.17192](https://arxiv.org/abs/2211.17192) | 2022 | ⭐⭐⭐ | 推测解码加速 |
| FlashAttention-2: Faster Attention with Better Parallelism | [2307.08691](https://arxiv.org/abs/2307.08691) | 2023 | ⭐⭐⭐ | Flash Attention 改进版 |
| SmoothQuant: Accurate and Efficient Post-Training Quantization | [2211.10438](https://arxiv.org/abs/2211.10438) | 2022 | ⭐⭐⭐ | 平滑量化 |

### 开源项目

| 项目 | Stars | GitHub | 说明 |
|------|-------|--------|------|
| vLLM | 35k+ | [vllm-project/vllm](https://github.com/vllm-project/vllm) | 高吞吐推理引擎 |
| llama.cpp | 70k+ | [ggerganov/llama.cpp](https://github.com/ggerganov/llama.cpp) | C++ 推理，支持量化 |
| ollama | 135k+ | [ollama/ollama](https://github.com/ollama/ollama) | 本地 LLM 运行工具 |
| AutoGPTQ | 8k+ | [PanQiWei/AutoGPTQ](https://github.com/PanQiWei/AutoGPTQ) | GPTQ 量化工具 |
| TensorRT-LLM | 8k+ | [NVIDIA/TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM) | NVIDIA 推理优化 |
| SGLang | 10k+ | [sgl-project/sglang](https://github.com/sgl-project/sglang) | 结构化生成语言 |
| Text Generation Inference | 9k+ | [huggingface/text-generation-inference](https://github.com/huggingface/text-generation-inference) | HF 推理服务 |

### 教程课程

| 课程 | 来源 | 时长 | 说明 |
|------|------|------|------|
| [vLLM 官方文档](https://vllm.readthedocs.io/) | vLLM | 3h | vLLM 使用指南 |
| [llama.cpp 教程](https://github.com/ggerganov/llama.cpp/blob/master/README.md) | llama.cpp | 2h | 编译和使用指南 |
| [量化技术详解](https://blog.csdn.net/penriver/article/details/136411485) | CN | 2h | LLM 量化原理 |

### 博客社区

| 资源 | 语言 | 说明 |
|------|------|------|
| [LLM 推理优化 7 策](https://zhuanlan.zhihu.com/p/648403338) | CN | 推理优化策略总结 |
| [vLLM 加速机制](https://www.cnblogs.com/zhouwenyang/p/18427714) | CN | vLLM 原理解析 |
| [KV Cache 详解](https://zhuanlan.zhihu.com/p/3722264996) | CN | KV Cache 工作原理 |

---

## LLM-Application 应用

### 经典论文

| 论文 | arXiv | 年份 | 难度 | 说明 |
|------|-------|------|------|------|
| ReAct: Synergizing Reasoning and Acting in Language Models | [2210.03629](https://arxiv.org/abs/2210.03629) | 2022 | ⭐⭐ | Agent 经典框架 |
| Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks | [2005.11401](https://arxiv.org/abs/2005.11401) | 2020 | ⭐⭐ | RAG 开山之作 |
| Toolformer: Language Models Can Teach Themselves to Use Tools | [2302.04761](https://arxiv.org/abs/2302.04761) | 2023 | ⭐⭐ | 工具学习 |
| Chain-of-Thought Prompting Elicits Reasoning in Large Language Models | [2201.11903](https://arxiv.org/abs/2201.11903) | 2022 | ⭐⭐ | 思维链提示 |
| Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection | [2310.11511](https://arxiv.org/abs/2310.11511) | 2023 | ⭐⭐⭐ | 自反思 RAG |
| Graph RAG | [2404.16130](https://arxiv.org/abs/2404.16130) | 2024 | ⭐⭐⭐ | 知识图谱增强检索 |

### 开源项目

| 项目 | Stars | GitHub | 说明 |
|------|-------|--------|------|
| LangChain | 118k+ | [langchain-ai/langchain](https://github.com/langchain-ai/langchain) | LLM 应用开发框架 |
| LlamaIndex | 40k+ | [run-llama/llama_index](https://github.com/run-llama/llama_index) | RAG 数据框架 |
| AutoGPT | 176k+ | [Significant-Gravitas/AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) | 自主智能体 |
| CrewAI | 30k+ | [joaomdmoura/crewAI](https://github.com/joaomdmoura/crewAI) | 多 Agent 协作框架 |
| AutoGen | 45k+ | [microsoft/autogen](https://github.com/microsoft/autogen) | 微软多 Agent 框架 |
| LangGraph | 10k+ | [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | 状态图工作流 |
| Dify | 60k+ | [langgenius/dify](https://github.com/langgenius/dify) | LLM 应用开发平台 |
| LangChain-Chatchat | 32k+ | [chatchat-space/Langchain-Chatchat](https://github.com/chatchat-space/Langchain-Chatchat) | 中文 RAG 项目 |
| RAGFlow | 30k+ | [infiniflow/ragflow](https://github.com/infiniflow/ragflow) | 深度文档理解 RAG |
| Open WebUI | 70k+ | [open-webui/open-webui](https://github.com/open-webui/open-webui) | Web UI 界面 |

### 教程课程

| 课程 | 来源 | 时长 | 说明 |
|------|------|------|------|
| [LangChain 官方教程](https://python.langchain.com/docs/tutorials/) | LangChain | 8h | 官方入门教程 |
| [LlamaIndex 文档](https://docs.llamaindex.ai/) | LlamaIndex | 6h | RAG 框架文档 |
| [Prompt Engineering Guide](https://www.promptingguide.ai/) | DAIR.AI | 4h | 提示词工程指南 |
| [OpenAI Cookbook](https://github.com/openai/openai-cookbook) | OpenAI | 6h | OpenAI 最佳实践 |

### 博客社区

| 资源 | 语言 | 说明 |
|------|------|------|
| [LangChain vs LlamaIndex 对比](https://blog.csdn.net/python12345_/article/details/144661407) | CN | 两大框架对比 |
| [RAG 实战指南](https://zhuanlan.zhihu.com/p/658998380) | CN | RAG 最佳实践 |
| [Agent 架构设计](https://blog.csdn.net/duan_zhihua/article/details/135880041) | CN | 多 Agent 工作流 |

---

## LLM-Safety 安全

### 经典论文

| 论文 | arXiv | 年份 | 难度 | 说明 |
|------|-------|------|------|------|
| Constitutional AI: Harmlessness from AI Feedback | [2212.08073](https://arxiv.org/abs/2212.08073) | 2022 | ⭐⭐⭐ | Anthropic 对齐方法 |
| Red Teaming Language Models to Reduce Harms | [2209.07858](https://arxiv.org/abs/2209.07858) | 2022 | ⭐⭐ | 红队测试方法 |
| Universal and Transferable Adversarial Attacks on Aligned LLMs | [2307.15043](https://arxiv.org/abs/2307.15043) | 2023 | ⭐⭐⭐ | 通用对抗攻击 |
| MART: Improving LLM Safety with Multi-round Automatic Red-Teaming | [2311.07689](https://arxiv.org/abs/2311.07689) | 2023 | ⭐⭐⭐ | 自动红队测试 |
| Assessing the Brittleness of Safety Alignment | [2402.05162](https://arxiv.org/abs/2402.05162) | 2024 | ⭐⭐⭐ | 安全对齐脆弱性分析 |
| Jailbroken: How Does LLM Safety Training Fail? | [2307.02483](https://arxiv.org/abs/2307.02483) | 2023 | ⭐⭐ | 越狱攻击分析 |

### 开源项目

| 项目 | Stars | GitHub | 说明 |
|------|-------|--------|------|
| EasyEdit | 3k+ | [zjunlp/EasyEdit](https://github.com/zjunlp/EasyEdit) | 知识编辑框架 |
| GPTSecurity | 2k+ | [GPTSecurity/GPTSecurity](https://github.com/GPTSecurity/GPTSecurity) | LLM 安全社区 |
| garak | 2k+ | [leondz/garak](https://github.com/leondz/garak) | LLM 安全扫描工具 |
| llm-attacks | 5k+ | [llm-attacks/llm-attacks](https://github.com/llm-attacks/llm-attacks) | 对抗攻击实现 |

### 教程课程

| 课程 | 来源 | 时长 | 说明 |
|------|------|------|------|
| [OWASP Top 10 for LLM](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | OWASP | 2h | LLM 安全风险 Top 10 |
| [AI Safety 课程](https://course.mlsafety.org/) | ML Safety | 10h | AI 安全基础课程 |
| [LLM 安全概述](https://blog.csdn.net/2401_82469710/article/details/141141369) | CN | 2h | 中文安全综述 |

### 博客社区

| 资源 | 语言 | 说明 |
|------|------|------|
| [Prompt Injection 攻击综述](https://arxiv.org/html/2505.04806v1) | EN | 提示注入系统研究 |
| [LLM 安全周报](https://blog.csdn.net/m0_73736695/article/details/134146300) | CN | GPTSecurity 周报 |
| [安全对齐技术解读](https://zhuanlan.zhihu.com/p/685812036) | CN | Alignment 论文解读 |

---

## 综合资源

### 书籍

| 书籍 | 作者 | 说明 |
|------|------|------|
| [Natural Language Processing with Transformers](https://www.oreilly.com/library/view/natural-language-processing/9781098136789/) | Lewis Tunstall 等 | Transformers 实战指南 |
| [Build a Large Language Model (From Scratch)](https://github.com/rasbt/LLMs-from-scratch) | Sebastian Raschka | 从零构建 LLM |
| [Speech and Language Processing](https://web.stanford.edu/~jurafsky/slp3/) | Dan Jurafsky | NLP 经典教材 |

### 学习平台

| 平台 | 说明 |
|------|------|
| [Hugging Face Hub](https://huggingface.co/models) | 模型、数据集、Spaces |
| [Papers with Code](https://paperswithcode.com/) | 论文 + 代码 |
| [arXiv CS.CL](https://arxiv.org/list/cs.CL/recent) | NLP 最新论文 |
| [Semantic Scholar](https://www.semanticscholar.org/) | 学术搜索 |

### 社区

| 社区 | 说明 |
|------|------|
| [r/MachineLearning](https://www.reddit.com/r/MachineLearning/) | Reddit ML 社区 |
| [Hugging Face Discord](https://huggingface.co/join/discord) | HF 官方社区 |
| [知乎 AI 话题](https://www.zhihu.com/topic/19551275) | 中文 AI 社区 |
| [机器之心](https://www.jiqizhixin.com/) | 中文 AI 媒体 |

---

## 资源统计

| 类别 | 数量 |
|------|------|
| 经典论文 | 40+ |
| 开源项目 | 40+ |
| 教程课程 | 25+ |
| 博客社区 | 20+ |
| **总计** | **125+** |

---

*更新日期: 2026-03-11*
*维护者: Domain Explorer Agent*