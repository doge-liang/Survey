---
id:
title: "Reasoning Theater: Disentangling Model Beliefs from Chain-of-Thought"
source_type: arxiv
upstream_url:
generated_by:
created_at:
updated_at:
authors: [Siddharth Boppana, Annabel Ma, Max Loeffler, Raphael Sarfati, Eric Bigelow, Atticus Geiger, Owen Lewis, Jack Merullo]
year: 2026
---
# Reasoning Theater: Disentangling Model Beliefs from Chain-of-Thought

> **Quick Reference**
> - Authors: Boppana, Ma, Loeffler, Sarfati, Bigelow, Geiger, Lewis, Merullo
> - arXiv: https://arxiv.org/abs/2603.05488v1
> - Date: 2026/03

## Summary

这篇论文揭示了一个重要现象：**推理模型的 Chain-of-Thought (CoT) 可能是"表演性"的**。作者提出"performative CoT"概念，指模型在内部已经对最终答案形成高置信度，但仍继续生成看似在思考的文本，却不把内部承诺显式表达出来。

核心发现：简单任务上模型"早就知道答案"，后续 CoT 多为表演；困难任务上 CoT 与内部信念更同步，接近真实推理。Activation probing 可检测这种不一致，并用于 early exit 节省高达 80% 的 tokens。

## Problem & Motivation

### 核心问题

- **CoT 是否真实反映推理过程？** 推理模型生成 CoT 时，外显文本推理与内部真实信念是否一致？
- **模型是否在"表演"推理？** 模型是否在内部已确定答案的情况下，继续生成看起来像在逐步思考的文本？

### 判据定义

论文的判断标准不是 "CoT 长不长"，而是：

> 在某个推理前缀上，若模型内部最终答案已可被解码（或强制提前作答已可恢复），但文本监控器仍看不出模型已做出决定，则后续 CoT 具有 performative 性质。

### 重要区分

Performative CoT ≠ 所有 reasoning model 的统一特征。它与**任务难度**强相关：困难任务上常出现更"真实"的推理。

## Methodology

### 三种检测方法

#### 1. Activation Probing

**目标**：从模型内部激活判断 CoT 的哪个时刻，模型已经"知道"最终答案。

**实现**：
- 采集每层、每个 token 的 residual stream activation
- 训练 **attention pooling probe** 预测最终答案选项 (A-D)
- 与普通线性 probe 不同：必须沿序列聚合信息，单个 token 激活不足以稳定编码答案

**关键优势**：
- 能读取文本没说出来的内部信息
- 可追踪随推理进程演化的答案分布与置信度

#### 2. Early Forced Answering

**目标**：检验推理未结束时，模型是否已能给出最终答案。

**实现**：
- 截断 CoT 在中间位置
- 强制注入"现在直接回答"提示
- 读取 A-D 选项 token 的 logits，得到答案概率分布

**与 Probe 的区别**：允许模型利用所有层内部状态和额外前向步来"汇总"信息，是黑箱但更强的测量。

#### 3. CoT Monitor

**目标**：只根据已生成的 CoT 文本，判断模型是否已透露最终答案。

**实现**：
- 使用 Gemini-2.5-Flash 作为 monitor
- 两个用途：
  1. 最终答案监控：判断模型最可能选哪个答案
  2. Inflection points 识别：标注 backtracking、realization ("aha")、reconsideration

**设计原则**：monitor 被要求"不要自己解题"，只能根据文本线索推断。

**局限性**：reasoning model 不是"合作型说话者"，monitor 天然滞后于内部信念状态。

### 实验设置

| 项目 | 内容 |
|------|------|
| 模型 | DeepSeek-R1 671B, GPT-OSS 120B |
| 数据集 | MMLU-Redux 2.0 (5280题, 知识召回), GPQA-Diamond (198题, 困难多跳) |
| 分析范围 | ` thoughts ` 区间内的 reasoning trace |

## Key Findings

### 1. 简单任务 vs 困难任务

**MMLU（简单/知识召回）**：
- Probe 和 forced answering 在推理**很早阶段**就能高准确率预测最终答案
- CoT monitor 要**晚很多**才能看出模型已决定
- 结论：模型"早就知道答案"，后续 CoT 很多是在表演推理

**GPQA-Diamond（困难/多跳推理）**：
- 三种方法都从接近随机开始，随推理逐渐提升
- 答案信息在推理过程中逐步形成
- 结论：CoT 更接近真实推理

### 2. Performativity Rate 量化

使用 probe/forced answer 与 CoT monitor 的"准确率随推理步数增长斜率差"量化 performativity：

| 模型 | MMLU Probe vs Monitor | MMLU Forced vs Monitor | GPQA Probe vs Monitor | GPQA Forced vs Monitor |
|------|----------------------|------------------------|----------------------|------------------------|
| DeepSeek-R1 | 0.417 | 0.505 | 0.012 | 0.010 |
| GPT-OSS | 0.435 | 0.334 | 0.227 | 0.185 |

**解读**：值越接近 0，说明新增 token 对内部信念与文本表达带来的提升更同步，更像 genuine reasoning。

### 3. Inflection Points 的意义

**关键发现**：backtracking、realization、reconsideration 这类转折点主要出现在内部不确定或信念发生较大变化的响应中。

**DeepSeek-R1 在 MMLU**：
- 高置信响应（从头到尾 >=90%）：inflection 率 0.020/step
- 非高置信响应：inflection 率 0.045/step（约 2 倍）

**解释**："等等""我意识到""重新考虑"这类行为通常不是表演出来的，更可能对应真实的不确定性解决过程。

### 4. Belief Shifts 与推理真实性

- 大的 belief shifts 与 inflection points 高度相关于"真实推理"而非 performative CoT
- 但关系不是严格、稳定、局部同步的
- 不同模型、数据集、窗口大小、阈值都会影响趋势

**结论**：belief shifts 与推理真实性有关，但不能把某个文本转折点机械等同于内部信念更新。

## Early Exit 效果

### DeepSeek-R1

Probe 校准性较好，置信度与实际准确率接近理想校准线。

| 数据集 | 探针置信阈值 | 性能保留 | Token 节省 |
|--------|------------|---------|-----------|
| MMLU | 95% | 97% | ~80% |
| GPQA-Diamond | 80% | 97% | ~30-40% |

### GPT-OSS

趋势与 DeepSeek-R1 相同，GPQA-Diamond 上 probe 迁移后更偏 overconfident。

## Implications

### 对推理模型评估的启示

1. **CoT 不能直接当作忠实解释**
   - 仅凭 CoT 文本评估模型是否真的在思考是不可靠的
   - 简单任务上，模型可能早已在内部确定答案

2. **纯文本 monitor 可能系统性滞后**
   - 推理模型不是"合作型说话者"
   - 用 CoT 审计"模型为何这么回答"可能会误判

3. **CoT faithfulness 是"任务-模型交互"产物**
   - 不是某个模型的固定属性
   - 困难任务上 CoT 更接近可信证据

### 对效率优化的启示

- Activation probing 是提高推理效率的实用途径
- 当内部置信足够高时可提前停止生成
- 显著降低 token 成本，同时保持准确率

### 方法论建议

将白箱 activation probing 与黑箱 CoT monitoring 结合：
- Probing 能读出文本没说出来的内部信息
- Monitoring 仍有价值，但不能假设模型会合作地把内部信念都写出来

## Personal Notes

### 核心洞察

这篇论文最重要的贡献是**区分了"推理文本"和"推理过程"**。在 LLM 领域，我们往往假设 CoT 忠实反映了模型的思考过程，但这篇论文证明了这是一个危险的假设。

### 对 DeepSeek-R1 的特殊意义

DeepSeek-R1 作为开源推理模型的代表，其表现与 GPT-OSS 类似，说明 performative CoT 是推理模型的普遍现象，而非特定模型的缺陷。这也解释了为什么某些"思考过程很长的"模型在简单任务上反而效率低下。

### 实践应用价值

Early exit 的结果令人振奋：在 MMLU 上节省 80% tokens，在 GPQA-Diamond 上节省 30%。这对于：
- API 成本控制
- 推理延迟优化
- 能耗降低

都有直接应用价值。关键在于建立可靠的置信度估计机制。

### 开放问题

1. **如何区分"必要的推理"和"表演性推理"？** 论文提供了统计层面的区分方法，但单个响应层面仍难以判断。
2. **用户感知如何？** 用户可能更信任"思考过程长"的回答，即使部分是表演性的。
3. **训练策略如何改进？** 能否通过训练让模型更早显式表达内部信念？

### 相关工作方向

- CoT faithfulness 研究
- Activation probing 在其他场景的应用
- Adaptive computation for LLMs
- Reasoning model 的可解释性

---
*Generated: 2026-03-13*
*Source: arXiv:2603.05488v1*