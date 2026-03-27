# Mamba / SSM 相关文献

Mamba 是近两年最受关注的非注意力序列建模路线之一。它并不是凭空出现的新架构，而是沿着 `HiPPO -> S4 -> H3 / S5 -> Mamba -> Mamba-2` 这条状态空间模型（State Space Models, SSM）脉络逐步演进而来；其核心价值在于把长序列建模从标准全注意力的二次复杂度，推进到更接近线性复杂度的实现路径。

## 核心论文

### Mamba (2023)
- 标题: Mamba: Linear-Time Sequence Modeling with Selective State Spaces
- 作者: Albert Gu, Tri Dao
- arXiv: `2312.00752`
- 链接: <https://arxiv.org/abs/2312.00752>
- 关键贡献:
  - 提出 `Selective SSM`，让状态空间参数随输入变化，补上早期 SSM 在内容感知（content-based reasoning）上的短板。
  - 设计硬件感知的并行 recurrent 算法，在失去卷积形式后仍保持高吞吐实现。
  - 在语言、音频、基因组等任务上展示通用序列建模能力；论文摘要报告推理吞吐可达 Transformer 的 `5x`，并保持随序列长度线性扩展。

### S4 (2021)
- 标题: Efficiently Modeling Long Sequences with Structured State Spaces
- 作者: Albert Gu, Karan Goel, Christopher Re
- arXiv: `2111.00396`
- 链接: <https://arxiv.org/abs/2111.00396>
- 关键贡献:
  - 提出 `Structured State Space Sequence Model (S4)`，为现代 SSM 路线建立可训练、可扩展的基础层。
  - 通过对状态矩阵加入低秩修正并稳定对角化，把计算归约到 Cauchy kernel，显著降低长序列建模成本。
  - 在 Long Range Arena 上达到当时 SoTA，并解决长度 16K 的 `Path-X`；摘要同时强调生成速度可比 Transformer 快 `60x`。

### Hungry Hungry Hippos / H3 (2022)
- 标题: Hungry Hungry Hippos: Towards Language Modeling with State Space Models
- 作者: Daniel Y. Fu, Tri Dao, Khaled K. Saab, Armin W. Thomas, Atri Rudra, Christopher Re
- arXiv: `2212.14052`
- 链接: <https://arxiv.org/abs/2212.14052>
- 关键贡献:
  - 明确指出早期 SSM 在语言建模中的两类关键缺陷: `召回更早 token` 与 `跨 token 比较`。
  - 提出 `H3` 层与 `FlashConv`，分别面向表达能力和硬件效率改进。
  - 证明混合式 `H3 + attention` 路线在 OpenWebText、Pile、SuperGLUE 上具备竞争力，是 Mamba 之前最重要的语言建模过渡工作之一。

## 相关 SSM 论文

### HiPPO (2020)
- 标题: HiPPO: Recurrent Memory with Optimal Polynomial Projections
- 作者: Albert Gu, Tri Dao, Stefano Ermon, Atri Rudra, Christopher Re
- arXiv: `2008.07669`
- 链接: <https://arxiv.org/abs/2008.07669>
- 关键贡献:
  - 给出在线压缩历史信息的多项式投影框架，是后续 S4/Mamba 状态更新矩阵设计的重要理论起点。
  - 说明如何用递归记忆机制稳定表示长时序历史，而不强依赖固定时间尺度先验。

### S5 (2022)
- 标题: Simplified State Space Layers for Sequence Modeling
- 作者: Jimmy T.H. Smith, Andrew Warrington, Scott W. Linderman
- arXiv: `2208.04933`
- 链接: <https://arxiv.org/abs/2208.04933>
- 关键贡献:
  - 在 S4 基础上提出更简化的 `S5` 层，把多个 SISO SSM 整合为单个 MIMO SSM。
  - 更容易利用高效 parallel scan，实现与 S4 相当的效率和强竞争力的长序列表现。
  - 说明 SSM 设计可以继续沿着“更简洁、更硬件友好”的方向演进。

### Mamba-2 / SSD (2024)
- 标题: Transformers are SSMs: Generalized Models and Efficient Algorithms Through Structured State Space Duality
- 作者: Tri Dao, Albert Gu
- arXiv: `2405.21060`
- 链接: <https://arxiv.org/abs/2405.21060>
- 关键贡献:
  - 提出 `Structured State Space Duality (SSD)`，从理论上把 Transformer 与 SSM 放进统一框架。
  - 给出 `Mamba-2`，论文摘要报告其核心层相较 Mamba 可实现 `2-8x` 加速，同时保持对 Transformer 的竞争力。
  - 这篇论文很重要，因为它把 “Mamba 是 Transformer 的替代路线” 推进为 “Transformer 与 SSM 可以统一理解”。

## 技术特点

- 线性或接近线性的序列扩展能力: Mamba 摘要直接强调 `linear scaling in sequence length`。[source: https://arxiv.org/abs/2312.00752]
- 选择性状态空间: 让状态更新依赖当前输入，提升离散 token 场景下的内容选择能力。[source: https://arxiv.org/abs/2312.00752]
- 硬件感知算法: H3 的 `FlashConv` 与 Mamba 的并行 recurrent 算法都在解决 “理论复杂度低但硬件不友好” 的现实瓶颈。[source: https://arxiv.org/abs/2212.14052] [source: https://arxiv.org/abs/2312.00752]
- 长序列建模能力: S4 在 LRA/Path-X 上的结果、Mamba 在百万长度序列上的扩展性，都说明 SSM 路线的核心优势是长上下文效率。[source: https://arxiv.org/abs/2111.00396] [source: https://arxiv.org/abs/2312.00752]

## Mamba vs Transformer

对比基线论文: `Attention Is All You Need` (`1706.03762`) 与 `Mamba` (`2312.00752`)。

| 维度 | Mamba | Transformer |
|------|--------|-------------|
| 核心机制 | 选择性状态空间模型（Selective SSM），通过递归状态更新建模序列 | 全局自注意力（Self-Attention），直接建模 token 两两交互 |
| 时间复杂度 | 论文主张对序列长度线性扩展，更适合超长上下文。[source: https://arxiv.org/abs/2312.00752] | 标准全注意力通常按 `O(n^2)` 理解，长序列时代价高。[source: https://arxiv.org/abs/1706.03762] |
| 推理速度 | Mamba 摘要报告推理吞吐可达 Transformer 的 `5x`。[source: https://arxiv.org/abs/2312.00752] | 短上下文下实现成熟、生态最强，但上下文变长时 KV cache 与注意力计算成本上升明显。[source: https://arxiv.org/abs/1706.03762] |
| 长序列能力 | 优势明显，目标就是把建模能力延伸到 10K、100K 乃至百万级长度。[source: https://arxiv.org/abs/2111.00396] [source: https://arxiv.org/abs/2312.00752] | 表达能力强、内容寻址直接，但标准实现的显存与计算增长更快，长上下文通常依赖额外工程优化。 |
| 内容选择能力 | 相比早期 SSM 明显增强，但本质上仍通过状态压缩建模，不是显式全局匹配。 | 显式比较任意位置 token，内容检索和对齐更直接，是其长期主导 NLP 的重要原因。 |
| 适用场景 | 长文档、流式输入、音频、基因组、超长上下文语言建模、对吞吐敏感的推理服务 | 通用大模型预训练、需要强 in-context learning 和成熟工具链的主流 NLP/多模态场景 |
| 当前工程成熟度 | 快速上升，Mamba / Mamba-2 已成为重要替代路线，但生态仍不如 Transformer 完整 | 最成熟，几乎所有主流基础模型、训练框架、推理栈都以 Transformer 为中心 |

### 简短结论
- 如果关注 `超长上下文 + 吞吐 + 线性扩展`，Mamba/SSM 路线值得优先跟进。
- 如果关注 `生态成熟度 + 通用性 + 显式内容检索能力`，Transformer 仍然是当前默认主流。
- 更现实的判断是: Mamba 不是简单替代 Transformer，而是在长序列和系统效率维度形成强竞争，并推动两类架构逐步融合；`Mamba-2 / SSD` 就是这种融合趋势的代表。

## 相关阅读建议

1. 先读 `2008.07669`，理解 HiPPO 如何把“长期记忆”写成可解析的递归投影问题。
2. 再读 `2111.00396`，理解 S4 如何把理论上的 SSM 做成真正可训练、可扩展的深度学习层。
3. 接着读 `2212.14052`，看 SSM 为什么在语言建模中落后于 attention，以及 H3/FlashConv 如何补足缺口。
4. 然后读 `2312.00752`，抓住 Mamba 的核心创新: `Selective SSM + hardware-aware parallelism`。
5. 最后读 `2405.21060`，理解为什么今天讨论 Mamba，已经不能只把它看成 Transformer 的对立面。

## 参考检索词

- `Mamba 2312.00752 selective state spaces`
- `S4 2111.00396 structured state spaces`
- `Hungry Hungry Hippos 2212.14052 H3 FlashConv`
- `HiPPO 2008.07669 recurrent memory`
- `Mamba-2 2405.21060 structured state space duality`
