---
id: mrdbourke/simple-local-rag
title: Simple Local RAG Tutorial Analysis
source_type: github
upstream_url: "https://github.com/mrdbourke/simple-local-rag"
generated_by: github-researcher
created_at: "2026-03-18T10:30:00Z"
updated_at: "2026-03-18T10:30:00Z"
tags: [RAG, tutorial, local-LLM, retrieval-augmented-generation, python, jupyter-notebook, beginner-friendly]
description: 从零构建本地 RAG 流水线的初学者教程项目，使用 Python、Jupyter Notebook、sentence_transformers 和 Hugging Face LLM
language: zh
---
# Simple Local RAG Tutorial

> 从零构建本地 RAG（检索增强生成）流水线，在 NVIDIA GPU 上本地运行

[![GitHub stars](https://img.shields.io/github/stars/mrdbourke/simple-local-rag)](https://github.com/mrdbourke/simple-local-rag)
[![License](https://img.shields.io/github/license/mrdbourke/simple-local-rag)](https://github.com/mrdbourke/simple-local-rag)

## 概述

Simple Local RAG 是一个面向初学者的本地 RAG（Retrieval Augmented Generation，检索增强生成）实现教程项目。该项目通过一个完整的 Jupyter Notebook 教程，带你从零开始构建一个本地运行的 RAG 流水线，最终实现 "chat with PDF" 的功能。

项目以一本 1200 页的营养学教科书作为示例数据，构建了一个名为 **NutriChat** 的 RAG 系统，用户可以向系统提问关于营养学的问题，系统会从 PDF 教科书中检索相关内容并由 LLM 生成答案。

**核心特点：**
- 所有处理都在本地 NVIDIA GPU 上完成
- 从 PDF 摄入到"与 PDF 聊天"的全流程
- 全部使用开源工具
- 配有详细的视频教程

## 技术栈

| 类别 | 技术 |
| ---- | ---- |
| 语言 | Python 3.11 |
| 笔记本 | Jupyter Notebook |
| PDF 处理 | PyMuPDF |
| 文本嵌入 | sentence_transformers |
| LLM 推理 | transformers + Hugging Face |
| 深度学习框架 | PyTorch (CUDA) |
| NLP 处理 | spaCy |
| 模型加速 | accelerate, bitsandbytes, Flash Attention 2 |

### 依赖包

```
PyMuPDF==1.23.26
matplotlib==3.8.3
numpy==1.26.4
pandas==2.2.1
Requests==2.31.0
sentence_transformers==2.5.1
spacy
tqdm==4.66.2
transformers==4.38.2
accelerate
bitsandbytes
jupyter
```

## 项目结构

```
mrdbourke/simple-local-rag/
├── 00-simple-local-rag.ipynb    # 主教程 notebook
├── README.md                     # 项目说明文档
├── requirements.txt              # Python 依赖
├── human-nutrition-text.pdf     # 示例数据 (1200页营养学教科书)
├── images/                      # 流程图资源
│   └── simple-local-rag-workflow-flowchart.png
└── video_notebooks/             # 视频版 notebook
    └── 00-simple-local-rag-video.ipynb
```

## 核心特性

### 1. 完整的 RAG 流程实现

项目详细展示了 RAG 的三个核心步骤：
- **检索 (Retrieval)** - 根据查询从数据源中获取相关信息
- **增强 (Augmented)** - 将检索到的信息整合到 LLM 输入中
- **生成 (Generation)** - LLM 根据上下文生成回答

### 2. 本地运行保护隐私

- 不需要将数据发送到外部 API
- 所有处理在本地 NVIDIA GPU (推荐 RTX 4090，5GB+ VRAM) 上完成
- 适合处理敏感文档

### 3. 零基础友好的教程设计

- 假设用户具备 Python 编程基础和基本的深度学习知识
- 详细的代码注释，每一行都有解释
- 配套 YouTube 视频教程
- 可直接在 Google Colab 上运行

### 4. 开源工具链

- 完全使用开源模型和库
- 支持 Google Gemma 7B 等开源 LLM
- 可替换的嵌入模型和 LLM

## RAG 流程说明

```
文档 → PDF解析 → 文本分块 → 嵌入向量化 → 向量存储
                                                    ↓
用户提问 ← LLM生成回答 ← 相似度检索 ← 查询向量化 ← 用户查询
```

### 详细步骤

1. **文档加载**: 使用 PyMuPDF 解析 PDF 文档，提取文本内容
2. **文本分块**: 将长文本分割成较小的块（如每 10 句一组）
3. **嵌入向量化**: 使用 sentence_transformers 将文本块转换为向量表示
4. **向量存储**: 使用 torch.tensor 存储嵌入向量
5. **查询向量化**: 将用户问题转换为向量
6. **相似度检索**: 计算查询向量与文档向量的余弦相似度，找到最相关的文档块
7. **上下文增强**: 将检索到的相关文档块作为上下文提供给 LLM
8. **答案生成**: LLM 基于上下文生成回答

## 快速开始

### 环境要求

- Python 3.11
- NVIDIA GPU (5GB+ VRAM)
- CUDA 12.1

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/mrdbourke/simple-local-rag.git
cd simple-local-rag

# 2. 创建虚拟环境
python -m venv venv

# 3. 激活环境
# Linux/macOS:
source venv/bin/activate
# Windows:
.\venv\Scripts\activate

# 4. 安装依赖
pip install -r requirements.txt

# 5. 手动安装 PyTorch (CUDA版本)
pip3 install -U torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 6. 启动 notebook
jupyter notebook
```

### 使用 Google Colab

如果没有本地 GPU，可以直接在 Google Colab 上运行：
[在 Colab 中打开 notebook](https://colab.research.google.com/github/mrdbourke/simple-local-rag/blob/main/00-simple-local-rag.ipynb)

### 访问 LLM 模型

要使用 Gemma LLM，需要：
1. 在 [Hugging Face](https://huggingface.co/google/gemma-7b-it) 同意服务条款
2. 通过 Hugging Face CLI 授权本地机器：`huggingface-cli login`

## 关键概念

| 术语 | 说明 |
| ---- | ---- |
| **Token** | 文本的子词单元，1 token ≈ 4 个英文字符 |
| **Embedding** | 文本的数值向量表示，语义相似的文本具有相似的向量 |
| **Embedding Model** | 将文本转换为嵌入向量的模型 |
| **Similarity Search** | 在高维空间中寻找相似向量的技术 |
| **LLM** | 大型语言模型，根据输入生成文本 |
| **Context Window** | LLM 能接受的最大输入 token 数量 |
| **Prompt** | 输入给 LLM 的文本指令 |

## 学习价值

通过本项目可以学习到：

1. **RAG 原理**: 深入理解检索增强生成的工作流程
2. **文本嵌入**: 掌握如何使用 sentence_transformers 生成文本向量
3. **向量检索**: 学习相似度搜索和余弦相似度计算
4. **LLM 本地部署**: 了解如何在本地运行开源 LLM
5. **PDF 处理**: 掌握 PyMuPDF 进行文档解析
6. **GPU 加速**: 使用 CUDA 和量化技术优化推理

### 相关课程推荐

- 需要具备 1-2 门初学者机器学习/深度学习课程的基础
- 熟悉 PyTorch，可参考作者的另一门 [PyTorch 教程](https://youtu.be/Z_ikDlimN6A)

## 为什么选择本地 RAG？

| 优势 | 说明 |
| ---- | ---- |
| **隐私** | 无需将敏感数据发送到外部 API |
| **速度** | 无需等待 API 队列，硬件运行即可处理 |
| **成本** | 一次性硬件投入，无 API 调用费用 |
| **可控性** | 完全掌控模型和数据 |

## 相关项目

| 项目 | 描述 | 相似度 |
| ---- | ---- | -------- |
| [pguso/rag-from-scratch](https://github.com/pguso/rag-from-scratch) | 从零构建 RAG，详细的步骤解释，无黑盒 | High |
| [jamwithai/beginner-local-rag-system](https://github.com/jamwithai/beginner-local-rag-system) | 初学者友好的本地 RAG 系统，使用 OpenSearch | High |
| [alfredodeza/learn-retrieval-augmented-generation](https://github.com/alfredodeza/learn-retrieval-augmented-generation) | RAG 使用示例和演示 | Medium |
| [gurucharanmk/StepByStep-RAG](https://github.com/gurucharanmk/StepByStep-RAG) | 逐步构建 RAG 系统 | Medium |

## 参考资料

- [GitHub 仓库](https://github.com/mrdbourke/simple-local-rag)
- [YouTube 视频教程](https://youtu.be/qN_2fnOPY-M)
- [RAG 原始论文](https://arxiv.org/abs/2005.11401)
- [Hugging Face Gemma 模型](https://huggingface.co/google/gemma-7b-it)
- [PyTorch 官方](https://pytorch.org/)
- [营养学教科书来源](https://pressbooks.oer.hawaii.edu/humannutrition2/)

---

*Generated: 2026-03-18*
