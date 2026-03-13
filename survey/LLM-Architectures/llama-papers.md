# LLaMA 相关文献

LLaMA 是 Meta AI 发布的开源权重大语言模型系列。核心公开论文脉络通常按 `LLaMA -> Llama 2 -> Llama 3 / 3.1` 理解；其中 Llama 3 没有与前两代完全对称的单篇初版论文，社区通常引用 2024 年的技术报告 `The Llama 3 Herd of Models` 作为代表性文献。

## 核心论文

### LLaMA (2023)
- 标题: LLaMA: Open and Efficient Foundation Language Models
- 作者: Hugo Touvron et al. (Meta AI)
- arXiv: `2302.13971`
- 链接: <https://arxiv.org/abs/2302.13971>
- 关键贡献:
  - 发布 7B / 13B / 33B / 65B 参数的基础模型系列。
  - 证明较小模型在更多公开 token 上训练，能够在多个基准上超过更大但数据效率较低的模型；其中 13B 在多数测试上超过 GPT-3 175B。
  - 明确强调仅使用公开可获得数据训练，为后续开源权重大模型路线提供范式。

### Llama 2 (2023)
- 标题: Llama 2: Open Foundation and Fine-Tuned Chat Models
- 作者: Hugo Touvron et al. (Meta AI)
- arXiv: `2307.09288`
- 链接: <https://arxiv.org/abs/2307.09288>
- 关键贡献:
  - 发布 7B / 13B / 70B 预训练模型，以及面向对话的 `Llama 2-Chat`。
  - 系统公开 SFT、RLHF 和安全对齐流程，推动开源 Chat 模型成为闭源助手的可替代方案。
  - 采用相对宽松的商业许可，使 LLaMA 系列真正进入产业落地阶段。

### Llama 3 / 3.1 技术报告 (2024)
- 标题: The Llama 3 Herd of Models
- 作者: Aaron Grattafiori et al. (Meta AI)
- arXiv: `2407.21783`
- 链接: <https://arxiv.org/abs/2407.21783>
- 关键贡献:
  - 给出 Llama 3 系列的系统性技术报告，覆盖 8B / 70B / 405B 模型及其预训练、后训练与安全组件。
  - 强调多语言、代码、推理、工具使用和 128K 上下文能力，显示其质量已接近当时领先闭源模型。
  - 讨论 Llama Guard 3 与组合式多模态扩展，体现 LLaMA 家族从纯文本模型向平台化模型体系演进。
- 备注: 若检索 "Llama 3 paper"，通常应优先引用这篇技术报告。

## 衍生模型

- Alpaca (Stanford, 2023): 基于 LLaMA 的 instruction tuning 代表作，展示低成本指令微调的可行性。
- Vicuna (LMSYS, 2023): 基于 LLaMA 的聊天微调模型，推动早期开源对话模型生态爆发。
- Koala (Berkeley, 2023): 面向学术研究的对话模型变体，强调低成本复现 ChatGPT 类能力。
- 其他常见分支: Guanaco、OpenBuddy、Chinese-LLaMA、Code Llama 等，说明 LLaMA 已成为开源微调生态底座。

## 技术特点

- 架构路线: Decoder-only Transformer。
- 归一化: `RMSNorm`。
- 位置编码: `RoPE` (Rotary Position Embedding)。
- 前馈层: `SwiGLU` 激活函数。
- 数据策略: 早期论文强调仅使用公开可获得数据；后续版本继续强化数据清洗、规模扩展和后训练。
- 对齐路线: 从基础模型逐步演进到 `SFT + RLHF + safety tuning + tool use`。
- 效率取向: 持续强调参数效率、训练 token 规模和推理可部署性之间的平衡。

## 相关阅读建议

1. 先读 `2302.13971`，理解 LLaMA 系列的基本设计哲学: 小模型 + 更多数据 + 高效训练。
2. 再读 `2307.09288`，关注开源 Chat 模型、RLHF 和商业许可带来的生态变化。
3. 最后读 `2407.21783`，理解 Llama 3 在数据、后训练、长上下文与工具使用方面的系统升级。

## 参考检索词

- `LLaMA 2302.13971`
- `Llama 2 2307.09288`
- `The Llama 3 Herd of Models 2407.21783`
- `Alpaca Vicuna Koala LLaMA fine-tuning`
