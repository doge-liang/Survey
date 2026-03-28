# Agent Harness 知识图谱

## 核心概念层次

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    Agent System                         │
                    │                                                         │
                    │   ┌───────────────────┐      ┌──────────────────────┐  │
                    │   │       Model       │  +   │       Harness        │  │
                    │   │   (Intelligence) │      │   (Reliability)     │  │
                    │   └───────────────────┘      └──────────────────────┘  │
                    └─────────────────────────────────────────────────────────┘
                                       │
                                       ▼
          ┌────────────────────────────────────────────────────────────────┐
          │                    Harness Engineering                          │
          │                                                                │
          │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
          │  │   Context    │  │     Tool     │  │    Verification  │    │
          │  │ Engineering  │  │ Orchestration│  │      Loops       │    │
          │  └──────────────┘  └──────────────┘  └──────────────────┘    │
          │                                                                │
          │  ┌──────────────────┐    ┌──────────────────────────────┐    │
          │  │      Cost        │    │        Observability &        │    │
          │  │     Envelope     │    │         Evaluation           │    │
          │  └──────────────────┘    └──────────────────────────────┘    │
          └────────────────────────────────────────────────────────────────┘
```

## 概念关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT HARNESS ECOSYSTEM                           │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────┐
                              │ Agent Harness │
                              │   (Core)     │
                              └───────┬───────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
  ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
  │    Theory     │         │   Practice    │         │   Evaluation  │
  └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
          │                         │                           │
          ▼                         ▼                           ▼
  • Agent = Model+Harness    • Context Eng      • Benchmarking
  • Harness Engineering      • Tool Orchestration  • Observability
  • 5 Core Components       • Verification Loops  • Evaluation Pipeline
  • Architecture Patterns    • Cost Envelope       • Metrics

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                           KEY INSIGHT                                   │
  │                                                                         │
  │   Model improvement → 10-15% output quality shift                      │
  │   Harness design    → Whether system works at all                      │
  │                                                                         │
  │   "The harness is the 80% factor"                                     │
  └─────────────────────────────────────────────────────────────────────────┘
```

## 技术栈关系

```
                    ┌─────────────────┐
                    │  Application    │
                    │    Layer       │
                    │ (Agent System) │
                    └────────┬────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           HARNESS LAYER                                   │
│                                                                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │     Context     │  │      Tool      │  │       Verification      │   │
│  │   Engineering   │  │  Orchestration │  │         Loops           │   │
│  │                 │  │                │  │                         │   │
│  │ • Dynamic fetch │  │ • Input valid. │  │ • Schema-based check   │   │
│  │ • Memory mgmt   │  │ • Output parse │  │ • Semantic check      │   │
│  │ • Token budget  │  │ • Error handle │  │ • Self-verification   │   │
│  │ • Compaction    │  │ • Timeout mgmt │  │ • Retry logic        │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐    │
│  │      Cost Envelope      │  │        Observability & Eval         │    │
│  │                         │  │                                      │    │
│  │ • Per-task budget       │  │ • Execution traces                   │    │
│  │ • Token tracking        │  │ • Structured logging                 │    │
│  │ • Circuit breaker      │  │ • Performance metrics                │    │
│  │ • Abnormal detection   │  │ • Continuous evaluation              │    │
│  └─────────────────────────┘  └─────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Foundation     │
                    │    Layer       │
                    │   (LLM Model) │
                    └─────────────────┘
```

## 架构模式演进

```
Pattern 1: Single Agent + Verification
─────────────────────────────────────
         ┌──────────┐
         │  Agent   │
         └────┬─────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌───────┐         ┌───────┐
│Execute│         │Verify │
│ Tool  │         │Output │
└───┬───┘         └───┬───┘
    │                 │
    └────────┬────────┘
             ▼
      ┌──────────┐
      │  Next    │
      │  Step?   │
      └──────────┘

Pattern 2: Two-Agent Supervisor
─────────────────────────────────────
         ┌──────────┐
         │ Primary  │
         │  Agent   │
         └────┬─────┘
              │ action
              ▼
         ┌──────────┐
         │Supervisor│◄──── Review & Override
         │  Agent   │
         └────┬─────┘
              │ approve/revise
              ▼
      ┌──────────┐
      │ Continue │
      │    or    │
      │   Fail   │
      └──────────┘

Pattern 3: Multi-Agent + Shared Harness
─────────────────────────────────────
         ┌─────────────────────────┐
         │   Shared Harness      │
         │   Layer (Common       │
         │   Services)           │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    ▼                ▼                ▼
┌────────┐      ┌────────┐      ┌────────┐
│Research│      │ Code   │      │ Review │
│ Agent  │◄────►│ Agent  │◄────►│ Agent  │
└────────┘      └────────┘      └────────┘
```

## 评估方法分类

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AGENT EVALUATION TAXONOMY                           │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────┐
                        │    Agent    │
                        │  Evaluation │
                        └──────┬──────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Benchmark    │      │  Observability │      │  Continuous   │
│   Testing     │      │    Tracing     │      │  Evaluation   │
├───────────────┤      ├───────────────┤      ├───────────────┤
│ • Pass@k      │      │ • Step traces │      │ • Regression  │
│ • Success Rate│      │ • Tool calls  │      │ • A/B Testing │
│ • Task Comp.  │      │ • Context log │      │ • Canary      │
│ • Benchmark   │      │ • Cost track │      │ • Production  │
└───────────────┘      └───────────────┘      └───────────────┘

                    ┌─────────────────────┐
                    │   Key Metrics      │
                    └─────────────────────┘
                         • Task Completion Rate
                         • Cost per Task  
                         • Latency per Step
                         • Error Recovery Rate
                         • Silent Failure Rate
```

## 关键文献引用关系

```
                    ┌────────────────────┐
                    │   AutoHarness     │
                    │ (Google DeepMind) │
                    │   2026            │
                    └─────────┬──────────┘
                              │ synthesizes
                              ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       CONCEPTUAL FOUNDATION                           │
│                                                                       │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────┐   │
│  │  Harness      │    │   Context      │    │    Tool         │   │
│  │  Engineering   │───►│ Engineering    │───►│ Orchestration   │   │
│  │  (Core Idea)   │    │ (Component)    │    │ (Component)     │   │
│  └────────────────┘    └────────────────┘    └─────────────────┘   │
│           │                   │                      │               │
│           │                   └──────────┬───────────┘               │
│           ▼                          ▼                              │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────┐ │
│  │ Verification   │    │     Cost        │    │  Observability  │ │
│  │    Loops       │    │    Envelope    │    │                 │ │
│  └────────────────┘    └────────────────┘    └─────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     REAL-WORLD RESULTS       │
              │                               │
              │  • LangChain: 52.8% → 66.5% │
              │  • Vercel: 80% → 100%       │
              │  • Manus: 10x cost ↓        │
              │  • Stripe: 1000+ PRs/week   │
              └───────────────────────────────┘
```

## 技能与角色映射

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     HARNESS ENGINEERING ROLES                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Context      │     │      Tool       │     │    Verification │
│   Engineer      │     │   Orchestrator  │     │    Engineer     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ • Memory design│     │ • API design    │     │ • Test strategy │
│ • RAG pipeline │     │ • Error handling│     │ • Schema design │
│ • Token opt     │     │ • Sandbox mgmt  │     │ • Retry logic  │
│ • Compaction    │     │ • Timeout ctrl  │     │ • Self-check   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                ▼
                    ┌─────────────────────┐
                    │  Harness Architect  │
                    ├─────────────────────┤
                    │ • System design     │
                    │ • Pattern selection │
                    │ • Trade-off analysis│
                    │ • Reliability eng.  │
                    └─────────────────────┘
```

---

*生成日期: 2026-03-27*
