---
id: automl
title: AutoML
aliases:
  - Automated Machine Learning
  - AutoML
relations:
  parents:
    - machine-learning
  prerequisites:
    - machine-learning
    - python
  related:
    - neural-architecture-search
    - hyperparameter-tuning
    - automated-feature-engineering
navigation:
  primary_parent: machine-learning
level: intermediate
status: active
tags:
  - automated-ml
  - model-selection
  - hyperparameter-optimization
  - neural-architecture-search
---

# AutoML 学习路径

> **适合人群**: Intermediate ML practitioners
> **预计时间**: 40-60 hours total
> **更新日期**: 2026-03-28

## 概述

AutoML (Automated Machine Learning) 是指自动化机器学习工作流程的技术，旨在减少人工干预，使非专家也能构建高质量的机器学习模型。AutoML 涵盖**模型选择**、**超参数优化** (HPO)、**神经架构搜索** (NAS)、**自动特征工程**等核心方向。主流开源框架包括 [AutoGluon](https://github.com/autogluon/autogluon)、[auto-sklearn](https://github.com/automl/auto-sklearn)、[FLAML](https://github.com/microsoft/FLAML) 等。

## 前置知识

学习本领域需要：
- [[machine-learning]] - 机器学习基础概念
- [[python]] - Python 编程能力

---

## 阶段一：入门基础 (Beginner)

**目标**: 理解 AutoML 核心概念，能够使用主流框架进行自动化模型训练
**预计时间**: 15-20 hours

### 核心概念

1. **AutoML 定义与动机** - 为什么需要自动化机器学习
2. **自动化模型选择** - 从候选模型池中自动选择最佳模型
3. **超参数优化 (HPO)** - 自动化调参策略 (Grid/Random/Bayesian)
4. **AutoML 框架分类** - 开源框架 vs 云服务

### 必读资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [MachineLearningMastery - Introduction to AutoML](https://machinelearningmastery.com/introduction-to-automl-automating-machine-learning-workflows/) | 教程 | 2h | 清晰的 AutoML 入门介绍 |
| [Google for Developers - AutoML Getting Started](https://developers.google.com/machine-learning/crash-course/automl/getting-started) | 文档 | 1.5h | Google 官方 AutoML 入门指南 |
| [AutoGluon Quick Start](https://auto.gluon.ai/stable/tutorials/quick_start.html) | 文档 | 2h | 3行代码实现 AutoML |
| [awesome-automl-papers](https://github.com/hibayesian/awesome-automl-papers) | 资源列表 | 持续 | 经典论文精选列表 |

### 实践项目

1. **使用 AutoGluon 构建分类模型**: 使用 Kaggle Titanic 数据集，体验 3 行代码完成完整 AutoML 流程
   - 难度: Easy
   - 预计时间: 2-3 hours

2. **使用 auto-sklearn 进行模型选择**: 比较自动选择与手动选择的效果
   - 难度: Easy
   - 预计时间: 2 hours

### 检查点

完成本阶段后，你应该能够:
- [ ] 解释 AutoML 的核心目标和技术层次
- [ ] 说出至少 3 种超参数优化策略
- [ ] 使用 AutoGluon 完成一个完整的分类任务
- [ ] 理解模型选择与超参数优化的区别

---

## 阶段二：进阶实践 (Intermediate)

**目标**: 深入理解 HPO 和 NAS 技术原理，能够定制 AutoML 流程
**预计时间**: 20-25 hours

### 核心技能

1. **超参数优化进阶** - Bayesian Optimization, Multi-fidelity HPO (Hyperband, BOHB)
2. **神经架构搜索 (NAS)** - Search Space, Search Strategy, Evaluation Strategy
3. **AutoML 系统架构** - Meta-Learning, Pipeline Search, Ensemble Selection
4. **企业级 AutoML** - 云平台 AutoML (Azure, GCP, AWS)

### 推荐资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [A Survey on AutoML (arXiv)](https://arxiv.org/abs/1810.13306) | 论文 | 3h | AutoML 领域奠基性综述 |
| [FLAML: A Fast Library for AutoML](https://github.com/microsoft/FLAML) | 工具 | 4h | 微软开源的高效 AutoML 库 |
| [AutoGluon Advanced Usage](https://auto.gluon.ai/stable/tutorials/tabular_prediction/tabular-individual.html) | 文档 | 3h | 深入了解 AutoGluon 内部机制 |
| [Automated ML: past, present, future (Springer 2024)](https://link.springer.com/article/10.1007/s10462-024-10726-1) | 论文 | 2h | AutoML 发展历程与前沿展望 |

### 实践项目

1. **实现 Bayesian Optimization 调参器**: 从零实现 BO 框架，深入理解其工作原理
   - 难度: Medium
   - 预计时间: 6-8 hours

2. **使用 FLAML 进行高效 HPO**: 对比 FLAML 与传统方法的效率差异
   - 难度: Medium
   - 预计时间: 4 hours

3. **探索 AutoGluon 堆叠集成**: 理解 AutoGluon 的 ensemble 策略
   - 难度: Medium
   - 预计时间: 3 hours

### 检查点

完成本阶段后，你应该能够:
- [ ] 解释 Bayesian Optimization 的核心思想和流程
- [ ] 描述 NAS 的三大组件 (Search Space, Strategy, Evaluation)
- [ ] 对比 Multi-fidelity HPO 方法的优缺点
- [ ] 使用 FLAML 实现高效超参数搜索
- [ ] 理解 AutoML 系统中的 Meta-Learning 机制

---

## 阶段三：深入精通 (Advanced)

**目标**: 掌握 AutoML 前沿研究方向，能够参与框架开发或学术研究
**预计时间**: 15-20 hours

### 高级主题

1. **神经架构搜索 (NAS) 深度研究** - DARTS, ENAS, Once-for-All, ProxylessNAS
2. **全自动机器学习管道** - AutoML Beyond HPO, Full Pipeline Optimization
3. **高效 AutoML** - Early Stopping, Multi-fidelity, Transferability
4. **AutoML 理论分析** - No Free Lunch, HPO 理论基础
5. **AutoML for Deep Learning** - 自动网络设计、自动激活函数、自动学习率

### 深度资源

| 资源 | 类型 | 时间 | 说明 |
|------|------|------|------|
| [AutoML 2025 Conference Tutorials](https://2025.automl.cc/tutorials/) | 教程 | 6h | 前沿 AutoML 研究教程 |
| [Best Practices for NAS Research (AutoML.org)](https://www.automl.org/best-practices-for-scientific-research-on-neural-architecture-search/) | 指南 | 2h | NAS 研究最佳实践 |
| [Deep Learning Tuning Playbook](https://developers.google.com/machine-learning/guides/deep-learning-tuning-playbook) | 指南 | 3h | Google 深度学习调参手册 |
| [A literature review on automated machine learning (Springer 2025)](https://link.springer.com/article/10.1007/s10462-025-11397-2) | 论文 | 3h | 最新 AutoML 文献综述 |
| [automl/amltk](https://github.com/automl/amltk) | 框架 | 持续 | 可扩展的 AutoML 框架 |

### 研究方向

1. **Efficient NAS** - 如何降低 NAS 的计算成本
2. **Transferable NAS** - 如何在不同任务间迁移 NAS 发现的架构
3. **AutoML 系统** - 如何构建生产级 AutoML 系统
4. **AutoML Theory** - AutoML 的理论基础与limits

---

## 学习建议

### 时间安排

- 每日建议: 2-3 hours
- 每周建议: 10-15 hours
- 总周期: 4-6 周

### 常见误区

1. **AutoML 替代人工** - 实际上 AutoML 是增强人工，而非完全替代，需要领域知识指导
2. **忽视数据预处理** - AutoML 虽能处理很多问题，但高质量数据仍是关键
3. **过度依赖云服务** - 理解底层原理才能更好地使用 AutoML

### 社区资源

- [AutoML.org](https://www.automl.org/) - AutoML 研究社区
- [AutoML Reddit](https://reddit.com/r/automl) - 社区讨论
- [FLAML Discord](https://discord.gg/Cppx2vSPVP) - FLAML 官方社区

---

## 相关领域

学完本路径后，可以继续探索:

- [[neural-architecture-search]] - 神经架构搜索，深入研究网络结构自动设计
- [[hyperparameter-tuning]] - 超参数优化，更专注调参技术
- [[automated-feature-engineering]] - 自动特征工程，数据准备自动化

---

*生成日期: 2026-03-28*
*资源数量: 18
