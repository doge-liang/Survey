# Mamba: Linear-Time Sequence Modeling with Selective State Spaces

> **Quick Reference**
> - Authors: Albert Gu, Tri Dao
> - Year: 2023 (arXiv), published at COLM 2024
> - arXiv: https://arxiv.org/abs/2312.00752
> - DOI: https://doi.org/10.48550/arXiv.2312.00752
> - PDF: `paper/2312.00752/paper.pdf`

## Summary

这篇论文提出了 Mamba，一种基于 selective state space model (selective SSM, 文中也记作 S6) 的线性时间序列建模架构，目标是在保留 SSM 长序列高效性的同时，补上传统 LTI SSM 无法进行内容感知推理的缺陷。核心思想是让部分 SSM 参数依赖当前输入，从而可以像注意力或门控 RNN 一样，对序列中的关键信息进行选择性保留、遗忘与传播。

与此前依赖卷积等价计算路径的 SSM 不同，Mamba 因为引入输入依赖参数而失去卷积实现路径，于是作者进一步设计了一个 hardware-aware parallel scan 算法，在 GPU 上以 recurrent 形式高效计算 selective SSM。最终，这个 selective SSM 被整合进一个没有 attention、也没有独立 MLP block 的统一架构中。论文在语言、DNA 和音频上展示了强竞争力结果，并给出 4-5x 的推理吞吐提升和对百万长度上下文的扩展能力。

## Problem & Motivation

Transformer 的强项在于内容感知的信息路由，但其计算和内存复杂度随序列长度呈二次增长，长上下文成本很高。围绕这一问题，研究界提出了许多次二次复杂度架构，例如 linear attention、gated convolution、RNN 变体与 structured SSM，但这些方法在语言这类离散、信息密集的模态上通常达不到 Transformer 的效果。

论文将原因归结为一个关键缺陷：传统 LTI SSM 的动力学在时间上固定，无法根据当前 token 的内容决定“该记住什么、该忽略什么”。这使它们在 selective copying、induction heads、边界重置等需要内容感知选择的任务上天然吃亏。Mamba 的目标就是在不放弃线性时间扩展性的前提下，把这种选择能力重新引入 SSM。

## Methodology

### 整体思路

Mamba 从 S4 一类 structured SSM 出发，将原本时间不变的参数改为输入相关，核心形式是让 `B_t`、`C_t`，尤其是 `Delta_t` 成为当前输入 `x_t` 的函数。这样模型就不再是 LTI，而是一个可以根据输入内容动态调节记忆与遗忘行为的 selective SSM。

### Key Innovations

**1. Selective SSM (S6)**

- 让 `Delta`、`B`、`C` 依赖输入，赋予模型内容感知的选择能力
- 其中 `Delta` 最关键，作用类似广义的 RNN gate
- 大 `Delta` 倾向于重置状态并关注当前输入，小 `Delta` 倾向于保留历史状态

**2. Hardware-aware selective scan**

- 输入依赖参数打破了卷积等价路径，训练不能再简单依赖全局卷积
- 作者改用 recurrent scan，并通过 kernel fusion、parallel scan、chunking 和 recomputation 降低 HBM 访问
- 目标是只在更快的 SRAM 层面 materialize expanded states，避免显存 IO 成为瓶颈

**3. Mamba block 架构**

- 将 prior SSM block 与 Transformer 中类似 MLP/gating 的作用合并为一个更统一的 block
- 整体架构没有 attention，也没有独立 MLP blocks
- 保持 block 设计简单、同质，适合作为 foundation model backbone

### 为什么 selectivity 有效

论文用三个角度解释 selective 机制的必要性：

1. **Variable spacing**: 可以跨不定长间隔记住关键 token
2. **Filtering**: 可以压缩上下文，只保留对未来预测重要的信息
3. **Boundary resetting**: 可以在拼接序列或 episode 边界主动“清空”状态，避免信息串扰

## Results

### Synthetic Tasks

**Selective Copying**

- `Mamba + S6`: 99.8% accuracy
- `H3 + S6`: 99.7%
- `S4`: 18.3%
- `Hyena`: 30.1%

这说明单纯的 LTI SSM 无法解决需要内容选择的复制任务，而 selective 机制几乎直接解决了问题。

**Induction Heads**

- Mamba 在训练长度 256 上训练后，可以泛化到 `2^20 = 1,048,576` 的测试长度
- 论文称其能“perfectly” extrapolate 到百万长度
- 其他方法大多无法超出约 2x 的外推范围

### Language Modeling

论文在 The Pile 上做了从约 125M 到 1.3B 参数的 scaling law 实验，并在 300B tokens 训练后进行 zero-shot 评测。

**关键结论**

- Mamba 是论文中第一个真正达到 Transformer 级质量的 attention-free 线性时间模型
- 在长上下文下，它能匹配强 Transformer++ recipe 的 scaling curve
- `Mamba-2.8B` 平均分 63.3，略高于 `GPT-J-6B` 的 63.0
- `Mamba-1.4B` 平均分 59.7，明显高于 `Pythia-1.4B` 的 55.2

**Zero-shot 平均分 (Table 3)**

| Model | Average |
|------|---------|
| Mamba-1.4B | 59.7 |
| Pythia-1.4B | 55.2 |
| RWKV-1.5B | 54.3 |
| Mamba-2.8B | 63.3 |
| Pythia-2.8B | 59.1 |
| RWKV-3B | 59.6 |
| GPT-J-6B | 63.0 |

作者总结为：Mamba-3B 可匹配约两倍规模 Transformer 的质量。

### DNA Modeling

- 在 HG38 数据集上，Mamba 随模型规模扩大而稳定提升
- 在约 40M 参数时，Mamba 可用约 3x-4x 更少参数匹配 Transformer++ / HyenaDNA
- 当上下文从 1K 扩展到 1M 时，Mamba 的 pretraining perplexity 持续改善，而 HyenaDNA 随长度增加反而恶化

**Great Apes DNA 分类**

- `HyenaDNA 1.4M`: 54.87%
- `Mamba 1.4M`: 71.67%
- `Mamba 7M`: 81.31%

### Audio Modeling

- 在 YouTubeMix 上，Mamba 在所有上下文长度下都优于 SaShiMi，且长上下文优势更明显
- 在 SC09 语音生成上，小模型 Mamba 已超越 prior SOTA

**SC09 (Table 4)**

- `SaShiMi 5.8M`: NLL 1.873, FID 1.99
- `Mamba 6.1M`: NLL 1.852, FID 0.94
- `Mamba 24.3M`: FID 0.67

### Efficiency

- selective scan 比标准 PyTorch scan 快 20x-40x
- 在超过 2K 上下文时，scan benchmark 超过作者已知最佳 attention 实现
- 端到端推理吞吐比同规模 Transformer 高约 4x-5x
- 不需要 KV cache，因此大 batch 推理更有优势

## Limitations

论文明确或隐含地给出以下局限：

- **规模仍偏小**: 实验主要停留在 7B 以下，尚未证明在更大 LLM 尺度仍保持优势
- **工程依赖较强**: selective SSM 的优势很大程度依赖高质量 kernel 与 scan 实现
- **连续模态不一定总受益**: 作者明确提出 “no free lunch”，selectivity 改善离散模态，但可能损伤原先 LTI SSM 在连续信号上的归纳偏置
- **下游生态未验证**: 是否能像 Transformer 一样良好支持 prompting、instruction tuning、RLHF、quantization 等，还未得到系统验证

## Future Work

论文和结果自然导向的后续方向包括：

- 在 7B+ 甚至更大规模验证 Mamba 的 scaling 行为
- 研究 selective SSM 是否具备 Transformer 式下游 affordances
- 探索对 `A` 等其他参数引入 selectivity 的变体
- 将该 backbone 扩展到视频、强化学习、多模态等更长上下文场景
- 继续改进硬件实现与训练配方，降低 selective recurrence 的工程门槛

## Personal Notes

**这篇论文的重要性**

Mamba 是 2024 年后 attention alternatives 中最有影响力的一篇工作之一。它不是单纯地提出“更快的 attention 近似”，而是从状态空间模型的角度重新定义了内容感知的线性时间序列建模路径，因此影响了后续大量 Mamba-x、SSM-x 与 hybrid Mamba-Transformer 研究。

**最值得记住的洞察**

1. SSM 不缺长程建模能力，缺的是内容选择能力
2. `Delta` 的输入依赖化，本质上把门控重新带回了 SSM
3. 真正让新架构落地的不只是数学形式，还有 IO-aware 的硬件实现

**阅读建议**

首次阅读建议顺序：

1. Abstract + Section 1：理解问题定义和主张
2. Section 3.1-3.2：理解为什么要做 selection，以及 selective SSM 的形式
3. Section 3.3：理解为什么没有这个 scan 算法就很难落地
4. Section 4.2：语言建模结果，是论文最关键的主战场
5. Section 4.3-4.4：看跨模态泛化
6. Section 5：看作者自己承认的边界与未来方向

## References

最关键的基础文献：

1. **Efficiently Modeling Long Sequences with Structured State Spaces** (Gu et al., 2022)
   - S4 的代表作
   - Mamba 直接建立在 structured SSM 路线之上

2. **Combining Recurrent, Convolutional, and Continuous-time Models with the Linear State Space Layer** (Gu et al., 2021)
   - 奠定 state space layer 的统一表述
   - 解释 recurrence / convolution 双视角

3. **HIPPO: Recurrent Memory with Optimal Polynomial Projections** (Gu et al., 2020)
   - 为 SSM 的长期记忆建模提供理论基础

4. **On the Parameterization and Initialization of Diagonal State Space Models** (Gu et al., 2022)
   - 对角 SSM 参数化与初始化的重要来源

5. **Hungry Hungry Hippos: Towards Language Modeling with State Space Models** (Dao et al., 2023)
   - Mamba 在架构层面最直接的前身之一

---
*Generated: 2026-03-13*
*Source: arXiv, OpenReview, full-text PDF analysis*
