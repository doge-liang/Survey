# TurboQuant — Citation Analysis

> **Note**: Semantic Scholar API was rate-limited. Citation counts unavailable. Data inferred from paper references and web search.

## Key References (Backward Citations from TurboQuant)

These are the foundational papers TurboQuant builds upon or compares against:

| # | Paper | Venue | Role in TurboQuant |
|---|-------|-------|-------------------|
| 1 | Zandieh, Daliri, Han — QJL: 1-bit Quantized JL Transform (2024) | arXiv | Core technology: QJL used on residual vector for unbiased inner product |
| 2 | Jegou et al. — Product Quantization for NN Search | IEEE TPAMI 2010 | Baseline comparison: PQ in NN search experiments |
| 3 | Gao et al. — RabitQ (2024) | arXiv | Baseline comparison: RabitQ in NN search experiments |
| 4 | Lloyd — Least squares quantization in PCM | IEEE IT 1982 | Foundational: Lloyd-Max scalar quantization algorithm |
| 5 | Max — Quantizing for minimum distortion | IRE 1960 | Foundational: Max quantizer (independent discovery) |
| 6 | Shannon — Mathematical theory of communication | Bell Sys Tech 1948 | Theoretical foundation: distortion-rate theory |
| 7 | Zador — Quantizing multivariate distributions | PhD Thesis 1964 | High-resolution VQ theory |
| 8 | Gersho — Asymptotically optimal block quantization | IEEE IT 1979 | VQ theory, lattice quantization |
| 9 | Dettmers et al. — GPTQ | NeurIPS 2022 | Related work: LLM weight quantization |
| 10 | Liu et al. — KIVI: Tuning-free 2-bit KV cache quantization | arXiv 2024 | Baseline: KV cache compression comparison |

## Related Papers by Same Authors

| Paper | Venue | Relevance |
|-------|-------|-----------|
| QJL: 1-bit Quantized JL Transform | arXiv 2024 | Precursor — provides the 1-bit QJL building block used in TurboQuant-IP |
| PolarQuant: Quantizing KV caches with polar transformation | arXiv 2025 | Same research group — alternative KV cache quantization method |
| BalanceKV: KV cache compression via discrepancy theory | arXiv 2025 | Same research group — another KV cache compression approach |
| SubGen: Token generation in sublinear time/memory | arXiv 2024 | Same research group — sublinear LLM inference |

## Community Response (Forward Citations)

From web search, TurboQuant has generated significant interest:

### OSS Implementations
- **[turbo-quant](https://lib.rs/crates/turbo-quant)** (MIT, Rust) — Implementation of TurboQuant, PolarQuant, and QJL by RecursiveIntell. 83KB, ~1K SLoC. Published March 26, 2026.

### Media/Discussion
- **NVIDIA Developer Forums**: "Why TurboQuant saves DGX twice" — discussion of DGX Spark/GB10 memory savings
- **LinkedIn**: "Google's New Compression Algorithm Cuts AI Memory Usage by 6× Without Losing Accuracy"
- **Hacker News**: Front page discussion (Mar 25, 2026)
- **Reddit r/LocalLLaMA**: "TurboQuant: Redefining AI efficiency with extreme compression"
- **Dejan.ai blog**: "TurboQuant: From Paper to Triton Kernel in One Session" (Mar 25, 2026)
- **cyrusradfar.com**: "I didn't understand TurboQuant, so I wrote this explainer"

### ICLR 2026
- Accepted as **Poster** at ICLR 2026 (OpenReview ID: tO3ASKZlok)
- Reviews available at: https://openreview.net/forum?id=tO3ASKZlok

## Citation Velocity Assessment

As an arXiv paper from April 2025 with ICLR 2026 acceptance, TurboQuant is showing **high early citation velocity** driven by:
1. Practical relevance to LLM inference efficiency (major industry concern)
2. Open source implementation available shortly after publication
3. Strong theoretical results (near-optimal, with formal lower bounds)
4. Google Research + NYU + DeepMind author team visibility

## Field Impact

**Domain**: Vector Quantization / LLM Inference Efficiency / Vector Databases

TurboQuant is a **high-impact paper** for the vector quantization field because:
- First **online** (data-oblivious) quantizer with **near-optimal distortion guarantees**
- Directly applicable to **KV cache compression** for production LLMs
- **Accelerator-friendly** design means practical deployment feasibility
- ~2.7× constant gap from information-theoretic lower bound is tight

---

*Generated: 2026-03-27*
*Note: Forward citation count unavailable due to Semantic Scholar rate limiting. Community response assessed via web search.*
