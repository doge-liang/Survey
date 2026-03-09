# GitHub 项目分析

本目录用于存放待分析的 GitHub 开源项目源码。

## 目录结构

```
github/
├── README.md           # 本文件
├── opencode/           # sst/opencode - 开源 AI 编程助手
├── oh-my-opencode/     # code-yeongyu/oh-my-opencode - OpenCode 多代理编排框架
├── openclaw/           # openclaw/openclaw - 开源自主 AI 代理
├── minimind/           # jingyaogong/minimind - 从零训练小型 LLM
└── minivllm/           # Wenyueh/MinivLLM - 简化版 vLLM 实现
```

## 已克隆项目

| 项目 | 仓库 | 描述 |
|------|------|------|
| OpenCode | [sst/opencode](https://github.com/sst/opencode) | 开源 AI 编程助手，支持多种 AI 模型 |
| Oh My OpenCode | [code-yeongyu/oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) | OpenCode 多代理编排框架 |
| OpenClaw | [openclaw/openclaw](https://github.com/openclaw/openclaw) | 开源自主 AI 代理 |
| MiniMind | [jingyaogong/minimind](https://github.com/jingyaogong/minimind) | 从零训练超小型 LLM/VLM |
| MiniVLLM | [Wenyueh/MinivLLM](https://github.com/Wenyueh/MinivLLM) | 简化版 vLLM 推理引擎实现 |

## 分析工作流

1. 克隆目标仓库到本目录
2. 在对应项目目录下创建分析文档：
   - `README.md` - 项目概述
   - `analysis.md` - 详细分析
   - `notes.md` - 个人笔记

## 注意事项

- 克隆的源码目录已添加到 `.gitignore`，不会提交到主仓库
- 仅提交分析文档和本 README
