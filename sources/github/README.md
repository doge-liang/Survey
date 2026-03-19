# GitHub 项目分析

本目录用于存放待分析的 GitHub 开源项目源码。

---

## 已克隆项目列表（共 27 个）

### 阶段一：LLM 基础（从零实现）

| 目录名 | 仓库 | 描述 | 难度 |
|--------|------|------|------|
| `nanoGPT` | [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | 最简单的 GPT 训练框架，复现 GPT-2 | ⭐⭐ |
| `llm.c` | [karpathy/llm.c](https://github.com/karpathy/llm.c) | 纯 C/CUDA 实现 GPT-2 训练 | ⭐⭐⭐ |
| `llama2.c` | [karpathy/llama2.c](https://github.com/karpathy/llama2.c) | 单文件纯 C 实现 Llama 2 推理 | ⭐⭐ |
| `LLMs-from-scratch` | [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) | 配套书籍，手把手实现 ChatGPT | ⭐⭐ |
| `Mini-LLM` | [Ashx098/Mini-LLM](https://github.com/Ashx098/Mini-LLM) | 完整 LLM 工程，含 RoPE、GQA、SwiGLU | ⭐⭐⭐ |

### 阶段二：推理引擎

| 目录名 | 仓库 | 描述 | 难度 |
|--------|------|------|------|
| `llama.cpp` | [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) | 最流行的 C++ LLM 推理引擎 | ⭐⭐⭐ |
| `tinygrad` | [tinygrad/tinygrad](https://github.com/tinygrad/tinygrad) | George Hotz 的极简深度学习框架 | ⭐⭐⭐⭐ |
| `minimind` | [jingyaogong/minimind](https://github.com/jingyaogong/minimind) | 从零训练超小型 LLM | ⭐⭐ |
| `minivllm` | [Wenyueh/MinivLLM](https://github.com/Wenyueh/MinivLLM) | 简化版 vLLM 推理引擎 | ⭐⭐⭐ |

### 阶段三：RAG（检索增强生成）

| 目录名 | 仓库 | 描述 | 难度 |
|--------|------|------|------|
| `rag-from-scratch` | [langchain-ai/rag-from-scratch](https://github.com/langchain-ai/rag-from-scratch) | LangChain 官方 RAG 教程 | ⭐⭐ |
| `pguso-rag-from-scratch` | [pguso/rag-from-scratch](https://github.com/pguso/rag-from-scratch) | 本地 LLM + 详细解释 | ⭐⭐ |
| `simple-local-rag` | [mrdbourke/simple-local-rag](https://github.com/mrdbourke/simple-local-rag) | 完全本地运行的 RAG | ⭐⭐ |
| `inception-rag` | [ruizguille/rag-from-scratch](https://github.com/ruizguille/rag-from-scratch) | 使用 Llama 3 + Groq | ⭐⭐ |

### 阶段四：AI Agent

| 目录名 | 仓库 | 描述 | 难度 |
|--------|------|------|------|
| `ai-agents-from-scratch` | [pguso/ai-agents-from-scratch](https://github.com/pguso/ai-agents-from-scratch) | 从零构建 Agent，含 ReAct 模式 | ⭐⭐ |
| `ai-agents-for-beginners` | [microsoft/ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners) | 微软官方 12 课教程 | ⭐ |
| `tinyagents` | [albertvillanova/tinyagents](https://github.com/albertvillanova/tinyagents) | 50 行代码实现 MCP Agent | ⭐⭐ |
| `tinyagent` | [askbudi/tinyagent](https://github.com/askbudi/tinyagent) | 生产级 LLM Agent SDK | ⭐⭐⭐ |
| `opencode` | [sst/opencode](https://github.com/sst/opencode) | 开源 AI 编程助手 | ⭐⭐⭐ |
| `oh-my-opencode` | [code-yeongyu/oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) | OpenCode 多代理编排 | ⭐⭐ |
| `openclaw` | [openclaw/openclaw](https://github.com/openclaw/openclaw) | 开源自主 AI 代理 | ⭐⭐⭐ |

### 阶段五：微调技术（LoRA）

| 目录名 | 仓库 | 描述 | 难度 |
|--------|------|------|------|
| `lora_from_scratch` | [sunildkumar/lora_from_scratch](https://github.com/sunildkumar/lora_from_scratch) | 从论文实现 LoRA | ⭐⭐ |
| `flora` | [AIdventures/flora](https://github.com/AIdventures/flora) | 简化版 LoRA 微调 | ⭐⭐ |
| `Fine-Tuning_With_LoRA` | [Shreyash-Gaur/Fine-Tuning_With_LoRA](https://github.com/Shreyash-Gaur/Fine-Tuning_With_LoRA) | IMDb 情感分析微调示例 | ⭐⭐ |

### 阶段六：向量数据库

| 目录名 | 仓库 | 描述 | 难度 |
|--------|------|------|------|
| `vectordb` | [kagisearch/vectordb](https://github.com/kagisearch/vectordb) | Kagi 出品，轻量级向量数据库 | ⭐⭐ |
| `tinyhnsw` | [jbarrow/tinyhnsw](https://github.com/jbarrow/tinyhnsw) | HNSW 算法最小实现 | ⭐⭐⭐ |
| `very-simple-vector-database` | [adiekaye/very-simple-vector-database](https://github.com/adiekaye/very-simple-vector-database) | 教育用极简实现 | ⭐ |

---

## 推荐学习顺序

```
1. nanoGPT / LLMs-from-scratch     → 理解 Transformer 架构
2. llama2.c                        → 理解推理原理
3. minimind                        → 完整训练流程
4. rag-from-scratch                → RAG 技术
5. ai-agents-from-scratch          → Agent 架构
6. lora_from_scratch               → 高效微调
7. tinyhnsw / vectordb             → 向量检索
```

---

## 分析工作流

1. 进入目标项目目录
2. 阅读项目 README 和文档
3. 在项目目录下创建分析文档：
   - `analysis.md` - 详细分析
   - `notes.md` - 个人笔记
4. 运行代码示例，记录心得

---

## 注意事项

- 克隆的源码目录已添加到 `.gitignore`，不会提交到主仓库
- 仅提交分析文档和本 README
- `tinyagent` 在 Windows 下有路径问题（含特殊字符）
