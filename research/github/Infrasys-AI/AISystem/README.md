# AISystem

> AI系统全栈课程——包括AI芯片、AI编译器、AI推理和训练框架等AI全栈底层技术

[![GitHub stars](https://img.shields.io/github/stars/Infrasys-AI/AISystem)](https://github.com/Infrasys-AI/AISystem)
[![License](https://img.shields.io/github/license/Infrasys-AI/AISystem)](https://github.com/Infrasys-AI/AISystem)

## 概述

**AISystem**（AI系统）是由 ZOMI 开源的AI系统全栈课程，旨在系统地讲解人工智能、深度学习的系统设计。课程内容涵盖从AI芯片到AI框架的全栈技术，适合本科生高年级、硕博研究生以及AI系统从业者学习。

项目以视频课程为主（托管于B站和YouTube），配套PPT、文字教程和代码实践。课程最大的特色是**系统性**——不仅讲原理，更从计算机系统架构的角度深入剖析AI技术的底层实现。

**最新动态**：大模型相关内容已迁移至 [AIFoundation](https://github.com/chenzomi12/AIFoundation/) 仓库，本仓库专注于AI系统基础设施。

## 技术栈

| 类别     | 技术                |
| -------- | ------------------- |
| 语言     | Jupyter Notebook (39%), SWIG (36%), Python (12%), C++ (7%) |
| 内容格式 | Jupyter Notebook + Markdown + PPT |
| 视频平台 | B站、YouTube        |
| 文档站点 | GitHub Pages        |
| 许可证   | Apache-2.0          |

## 项目结构

```
Infrasys-AI/AISystem/
├── 01Hardware/           # AI芯片与体系架构
│   ├── 01Basic/          # AI芯片基础
│   ├── 02GPU/            # GPU架构详解
│   ├── 03NPU/            # 国内外AI处理器
│   └── 04Future/         # AI芯片发展展望
├── 02Framework/          # AI框架核心技术
│   ├── 01Basic/          # AI框架基础
│   ├── 02AutoDiff/       # 自动微分
│   ├── 03Graph/          # 计算图
│   └── 04Dist/           # 分布式训练
├── 03Compiler/           # AI编译原理
│   ├── 01Traditional/    # 传统编译器(LLVM)
│   ├── 02AICompiler/     # AI编译器架构
│   ├── 03Frontend/       # 前端优化
│   └── 04Backend/        # 后端优化
├── 04Inference/          # AI推理系统与引擎
│   ├── 01Basic/          # 推理系统概述
│   ├── 02Light/          # 轻量网络(MobileNet等)
│   ├── 03Compress/       # 模型压缩(量化/蒸馏/剪枝)
│   └── 04Kernel/         # Kernel层优化
├── 05Foundation/         # AI系统概述
│   └── 01Introduction/   # 全栈概述
└── slides/               # PPT源文件
```

## 核心特性

1. **系统性全栈覆盖**
   - 从AI芯片硬件到AI框架软件的完整技术栈
   - 五大核心模块：概述、芯片、编译器、推理、框架

2. **理论与实践结合**
   - 每个主题配有视频讲解（B站/YouTube）
   - Jupyter Notebook代码实践
   - 完整PPT课件开源

3. **前沿技术深度剖析**
   - NVIDIA GPU Tensor Core、NVLink深度解析
   - 国内外AI处理器对比（寒武纪、燧原、谷歌TPU等）
   - PyTorch 2.0编译技术栈

4. **多模态学习资源**
   - 视频课程：详细讲解原理和实现
   - 文字教程：系统化的知识梳理
   - PPT课件：可直接用于分享和教学
   - 代码实践：动手理解底层机制

5. **活跃的社区贡献**
   - 90+贡献者参与
   - 294个PR已合并
   - 持续更新中（最新2025年12月）

## 架构设计

课程采用**分层递进式架构**：

```
┌─────────────────────────────────────────┐
│  05 Foundation: AI系统全栈概述            │
├─────────────────────────────────────────┤
│  01 Hardware: AI芯片与体系架构            │
│  ├── 计算体系 → 芯片基础 → GPU/NPU       │
├─────────────────────────────────────────┤
│  03 Compiler: AI编译原理                  │
│  ├── LLVM → AI编译器 → 前后端优化        │
├─────────────────────────────────────────┤
│  04 Inference: AI推理系统                 │
│  ├── 推理引擎 → 模型压缩 → Kernel优化    │
├─────────────────────────────────────────┤
│  02 Framework: AI框架核心技术             │
│  ├── 自动微分 → 计算图 → 分布式训练      │
└─────────────────────────────────────────┘
```

**设计理念**：
- **自底向上**：从硬件芯片开始，逐步向上到框架层
- **问题驱动**：每个模块都围绕实际工程问题展开
- **前沿导向**：紧跟AI系统领域的最新发展

## 快速开始

### 方式一：在线学习

访问文档站点：https://infrasys-ai.github.io/aisystem-docs/

### 方式二：视频课程

- B站搜索：「ZOMI」或「AI系统」
- YouTube搜索：「AISystem ZOMI」

### 方式三：本地阅读

```bash
# 克隆仓库（注意：仓库较大约10GB）
git clone https://github.com/Infrasys-AI/AISystem.git
cd AISystem

# 使用Jupyter Notebook查看代码示例
jupyter notebook
```

### 学习路径建议

**初学者路径**（12周）：
1. 第1-2周：AI系统概述（建立全局视野）
2. 第3-5周：AI芯片基础（理解硬件瓶颈）
3. 第6-8周：AI编译原理（掌握优化手段）
4. 第9-10周：AI推理系统（部署实践）
5. 第11-12周：AI框架核心（深入机制）

**进阶学习路径**（6周）：
1. 直接深入感兴趣的模块
2. 配合论文阅读（每章有推荐论文）
3. 动手实现课程中的代码示例

## 学习价值

1. **填补知识盲区**
   - 大多数AI课程只讲算法，本课程深入系统底层
   - 理解"算法如何高效运行在硬件上"

2. **面试/求职利器**
   - 系统知识是AI Infra岗位的核心考察点
   - 涵盖了大厂面试常见知识点（CUDA、编译优化、分布式训练等）

3. **科研方向指引**
   - 了解AI系统领域的前沿研究方向
   - 为选择研究课题提供系统性参考

4. **工程能力提升**
   - 学习如何设计高性能AI系统
   - 掌握性能分析和优化方法论

5. **中英文双语资源**
   - 视频讲解以中文为主
   - PPT和代码注释包含英文
   - 适合国内外学习者

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [Infrasys-AI/AIInfra](https://github.com/Infrasys-AI/AIInfra) | 大模型基础设施课程（姊妹项目） | 高 |
| [chenzomi12/AIFoundation](https://github.com/chenzomi12/AIFoundation) | 大模型相关内容归档 | 高 |
| [dlsys-course/dlsys-course](https://github.com/dlsys-course/dlsys-course) | 深度学习系统课程（英文） | 中 |
| [tinyml/TinyML](https://github.com/tinyml/TinyML) | 端侧AI/ TinyML | 中 |
| [microsoft/DeepSpeed](https://github.com/microsoft/DeepSpeed) | 微软深度学习优化库 | 低 |
| [NVIDIA/cuda-samples](https://github.com/NVIDIA/cuda-samples) | CUDA编程示例 | 低 |

## 参考资料

- [GitHub Repository](https://github.com/Infrasys-AI/AISystem)
- [官方文档](https://infrasys-ai.github.io/aisystem-docs/)
- [B站主页](https://space.bilibili.com/)
- [YouTube频道](https://www.youtube.com/)

---

*Generated: 2026-03-18*
