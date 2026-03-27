# RWKV 相关文献

RWKV（Receptance Weighted Key Value）通常被理解为一条试图融合 `Transformer` 与 `RNN` 优点的架构路线：训练阶段保留类似 Transformer 的并行性，推理阶段退化为 RNN 式状态更新，因此更强调线性复杂度与紧凑状态表示。公开文献脉络可以大致按 `RWKV / RWKV-4 -> Eagle / RWKV-5 -> Finch / RWKV-6` 理解。

## 核心论文

### RWKV / RWKV-4 (2023)
- 标题: RWKV: Reinventing RNNs for the Transformer Era
- 作者: Bo Peng et al.
- arXiv: `2305.13048`
- 链接: <https://arxiv.org/abs/2305.13048>
- 关键贡献:
  - 提出 RWKV 架构，用线性 attention / recurrence 形式连接 Transformer 与 RNN。
  - 训练时可以并行计算，推理时只需维护紧凑 recurrent state，论文强调推理阶段计算与显存复杂度为常数级单步开销。
  - 将 dense RNN 扩展到 14B 参数规模，并报告其性能可与同量级 Transformer 接近。

### Eagle / RWKV-5 + Finch / RWKV-6 (2024)
- 标题: Eagle and Finch: RWKV with Matrix-Valued States and Dynamic Recurrence
- 作者: Bo Peng et al.
- arXiv: `2404.05892`
- 链接: <https://arxiv.org/abs/2404.05892>
- 关键贡献:
  - 将 Eagle 明确为 `RWKV-5`、Finch 明确为 `RWKV-6`，是 RWKV-4 之后最核心的体系化技术报告。
  - 引入 multi-headed matrix-valued states 与 dynamic recurrence，增强状态表达能力，同时保持 RNN 式高效推理。
  - 配套 1.12T token 多语言语料与新 tokenizer，报告 Eagle（0.46B-7.5B）和 Finch（1.6B / 3.1B）在多项基准上具备竞争力。

## RWKV-4 / RWKV-5 / RWKV-6 相关技术报告

### RWKV-4 World 模型卡 / 技术说明
- 来源: BlinkDL `rwkv-4-world` model card
- 链接: <https://huggingface.co/BlinkDL/rwkv-4-world>
- 关键信息:
  - `RWKV-4 World` 是早期多语言公开版本，训练数据覆盖 100+ 语言。
  - 数据配比强调英语、多语言与代码混合，说明 RWKV 很早就走向通用 LLM 路线，而非只做英文实验。

### RWKV-5 World 模型卡 / 技术说明
- 来源: BlinkDL `rwkv-5-world` model card
- 链接: <https://huggingface.co/BlinkDL/rwkv-5-world>
- 关键信息:
  - 给出 `World v1 = 0.59T tokens`、`World v2 = 1.12T tokens` 的公开训练规模信息。
  - 说明 RWKV-5 在 Eagle 论文之外，也通过模型发布说明了其多语言与代码数据路线。

### RWKV-6 Finch 发布说明
- 来源: RWKV Open Source Development Blog, `RWKV v6 Finch 14B is here!`
- 链接: <https://blog.rwkv.com/p/rwkv-v6-finch-14b-is-here>
- 关键信息:
  - 明确 Finch 是 `v6`，相对 Eagle / v5 在 token shift 与 time-mixing 中引入更强的数据依赖能力。
  - 说明 Finch 7B / 14B 是在 Eagle 7B 基础上的延续训练与扩展，代表 RWKV-6 的工程化放大版本。

## 相关变体

### GoldFinch (2024)
- 标题: GoldFinch: High Performance RWKV/Transformer Hybrid with Linear Pre-Fill and Extreme KV-Cache Compression
- 作者: Daniel Goldstein et al.
- arXiv: `2407.12077`
- 链接: <https://arxiv.org/abs/2407.12077>
- 关键贡献:
  - 在增强版 Finch（RWKV-6）之上叠加 Transformer，形成混合式 RWKV/Transformer 架构。
  - 强调 linear pre-fill 与极端 KV-Cache 压缩，报告缓存体积相对传统 Transformer 可缩小数百到数千倍。
  - 说明 RWKV 路线不仅是“替代 Transformer”，也可以作为混合架构底座。

### RWKV 综述论文 (2024/2025)
- 标题: A Survey of RWKV
- 作者: Zhiyuan Li et al.
- arXiv: `2412.14847`
- 链接: <https://arxiv.org/abs/2412.14847>
- 价值:
  - 不是原始创新论文，但适合快速梳理 RWKV 在语言、视觉等方向的扩展。
  - 对比 Transformer 的长序列效率、计算成本与开放问题时很有参考价值。

## 技术特点

- 训练: 可并行，核心目标是保留 Transformer 式批量训练优势。
- 推理: RNN 模式，按 token 递推状态，整体更接近线性复杂度。
- 状态表示: 不走标准 KV Cache 路线，而是维护紧凑 recurrent state；RWKV-5/6 进一步把状态做成更强的矩阵值 / 动态形式。
- 长序列: 相比标准 self-attention，RWKV 更强调长上下文下的计算与显存可扩展性。
- 位置机制: 通常被视为不依赖标准 absolute positional embedding 的路线，但实际长程记忆效果仍强依赖状态设计与训练数据。
- 架构定位: 可视为 linear attention 家族中的一条“可并行训练 + 可递推推理”路线。

## 技术对比: RWKV vs Transformer vs RNN

| 维度 | RWKV | Transformer | 传统 RNN |
|------|------|-------------|----------|
| 训练效率 | 高。训练可并行，通常优于传统 RNN；同时避免标准 attention 的部分长序列成本 | 高。并行性最好，但 self-attention 在长序列上有二次复杂度压力 | 低。时间步串行，难以充分利用大规模并行硬件 |
| 推理效率 | 高。按 token 递推状态，显存与计算更接近线性 / 常数单步开销 | 中。需维护 KV Cache，序列越长缓存越大 | 高。天然递推，单步状态更新便宜 |
| 长序列能力 | 较强。理论扩展性好，尤其适合关注长上下文成本的场景 | 强但昂贵。表达能力强，长序列常需靠 FlashAttention、压缩缓存、稀疏注意力等补丁 | 一般。理论上线性，但长期依赖学习困难 |
| 状态管理 | 紧凑 recurrent state；RWKV-5/6 强化为 matrix-valued / dynamic state | 显式 KV Cache，容易并行但缓存膨胀明显 | 单一 hidden state / cell state，最轻量但容量有限 |
| 架构优势 | 兼顾训练并行性与推理效率，是 RWKV 最核心卖点 | 生态最成熟，泛化与工具链最强 | 结构简单，在线推理自然 |
| 主要短板 | 生态、实现与主流验证仍弱于 Transformer；状态表达能力仍在持续演进 | 长序列成本高，部署时缓存压力大 | 难以扩展到大模型主流质量水平 |

## 结论

- 若你只读两篇，优先读 `2305.13048` 与 `2404.05892`，这两篇基本覆盖了 `RWKV-4 -> RWKV-5/6` 的主线。
- 若你关心工程部署，再补 `2407.12077`，它展示了 RWKV 与 Transformer 混合后的 KV-Cache / pre-fill 优势。
- 若你要做综述或开题，`2412.14847` 很适合作为二手文献入口。

## 参考检索词

- `RWKV 2305.13048`
- `Eagle Finch RWKV 2404.05892`
- `GoldFinch 2407.12077`
- `RWKV-4 World`
- `RWKV-5 World`
- `RWKV v6 Finch 14B`
