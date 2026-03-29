---
id: q1-react-vs-planning
title: "Q1: ReAct vs Planning 范式对比"
category: agent-reasoning
level: advanced
tags: [react, planning, tot, lats, agent]
related-questions: [q2, q3, q4]
date: 2026-03-30
---

# Q1: ReAct vs Planning 范式对比

## 1. 概述

在大语言模型（LLM）Agent 系统设计中，**推理模式（Reasoning Pattern）** 是决定 Agent 能力上限的核心要素。不同的推理模式直接决定了 Agent 如何分解任务、执行动作、处理错误以及利用外部反馈。

本文深入对比四种主流 LLM Agent 推理范式：

| 范式 | 代表工作 | 核心思想 |
|------|----------|----------|
| **ReAct** | Yao et al., ICLR 2023 | 同步思考 + 行动交织 |
| **Plan-Then-Act** | LangChain Agents | 先规划后执行 |
| **ReAct + 轻规划** | ReWOO 等 | 分离推理与观察 |
| **Tree/Graph Planning** | ToT, LATS 等 | 树搜索 + 自我评估 |

理解这些范式的本质差异对于正确选型至关重要。

---

## 2. ReAct 框架深度剖析

### 2.1 核心机制

**ReAct** (Reasoning and Acting) 由 Yao et al. 在 [arXiv:2210.03629](https://arxiv.org/abs/2210.03629) 提出，发表于 ICLR 2023。其核心创新在于将**推理链（Reasoning Trace）**与**动作执行（Action）**交错进行，形成 `Thought → Action → Observation` 的循环。

```
┌─────────────────────────────────────────────────────────┐
│                     ReAct Loop                           │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐       │
│  │  Thought  │───▶│  Action  │───▶│ Observation  │       │
│  └──────────┘    └──────────┘    └──────┬───────┘       │
│       ▲                                    │              │
│       └────────────────────────────────────┘              │
│                    (iterate)                              │
└─────────────────────────────────────────────────────────┘
```

**典型 Prompt 模板**：

```
You have access to the following tools:

{tools}

Use the following format:

Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Question: {input}
Thought: {agent_scratchpad}
```

**核心优势**：
- 推理过程透明可追溯
- 动作与观察结果直接影响后续推理
- 在 HotpotQA、Fever 等知识密集型任务上优于 CoT
- 在 ALFWorld、WebShop 等交互式任务上比 IM/RL 方法高 34%/10%

### 2.2 局限性分析

ReAct 虽然开创了 Agent 推理的先河，但存在以下**系统性局限**：

#### 2.2.1 线性执行，中错误累积

ReAct 本质上是**链式线性执行**，每个 Thought 只能基于前一个 Action 的 Observation，无法跳步或回溯。

```
问题示例：
Task: 调研3篇RAG+RL论文并总结

ReAct 执行轨迹（错误累积）：
Step 1: Thought "我需要搜索RAG+RL相关论文" 
        Action: search(query="RAG reinforcement learning")
        Observation: 返回10篇论文标题
Step 2: Thought "让我获取第一篇的摘要"
        Action: fetch_paper(id=paper_1)
        Observation: 返回摘要（但可能与搜索关键词不完全匹配）
Step 3: Thought "现在获取第二篇..."
        Action: fetch_paper(id=paper_2)
        Observation: 返回摘要
Step 4: Thought "第三篇..."
        Action: fetch_paper(id=paper_3)
        Observation: 返回摘要
Step 5: 总结时发现：paper_2 实际上是 RAG+LM 而非 RAG+RL
         但已无法回退，只能基于已有信息硬着头皮总结
```

**问题**：如果 Step 2 选错了论文，后续步骤都是在错误基础上叠加。

#### 2.2.2 缺乏全局视角

ReAct 的 Thought 只能看到**最近一次的 Observation**，无法：
- 看到完整的执行历史来评估当前状态
- 判断已完成的步骤是否满足任务目标
- 在执行过程中调整整体策略

#### 2.2.3 探索能力有限

对于需要**多路径探索**或**前瞻决策**的任务，ReAct 表现不佳：

- 无法同时尝试多种方案并比较效果
- 无法在关键决策点进行 lookahead
- 初始决策错误会延续到整个执行过程

> "Language models are increasingly being deployed for general problem solving... but are still confined to token-level, left-to-right decision-making processes during inference." — ToT 论文

#### 2.2.4 错误传播（Error Propagation）

由于是线性链式结构，一旦某一步骤产生错误（工具调用失败、返回错误信息），后续所有推理都建立在错误基础上，且没有机制检测和纠正这种错误。

---

## 3. 四种范式详细对比

### 3.1 ReAct（同步思考 + 行动）

**代表论文**：[ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) — Yao et al., ICLR 2023

**执行模式**：

```python
def react_agent(task: str, tools: list[Tool]) -> str:
    """
    ReAct: 同步思考+行动，每次迭代只做一个动作
    """
    history = []
    max_iterations = 10
    
    for i in range(max_iterations):
        # 1. 基于历史生成 Thought
        context = build_context(task, history)
        thought = llm.think(context, prompt="thought")
        
        if is_final_answer(thought):
            return extract_answer(thought)
        
        # 2. 基于 Thought 选择 Action
        action = llm.think(context + thought, prompt="action")
        tool_name, tool_input = parse_action(action)
        
        # 3. 执行 Action 获取 Observation
        observation = execute_tool(tools, tool_name, tool_input)
        
        # 4. 更新历史
        history.append({
            "thought": thought,
            "action": action,
            "observation": observation
        })
    
    raise Exception("Max iterations reached")
```

**适用场景**：
- 简单单链任务（API 调用、数据库查询）
- 需要实时解释推理过程的教学/演示场景
- 响应延迟敏感的应用
- 成本受限场景

**优点**：
- 实现简单，调试容易
- 推理过程全透明
- Token 消耗相对较低

**缺点**：
- 复杂任务容易失败
- 无回溯能力
- 全局规划能力弱

---

### 3.2 Plan-Then-Act（先规划后执行）

**核心思想**：将任务分解为**规划阶段**和**执行阶段**两个独立环节，先由一个专门的 Planner 生成完整计划，再由 Executor 按序执行。

**执行模式**：

```python
def plan_then_execute(task: str, tools: list[Tool]) -> str:
    """
    Plan-Then-Act: 先规划，后执行
    """
    # Phase 1: 规划阶段
    plan = planner.create_plan(task)
    # plan = ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
    
    # Phase 2: 执行阶段
    results = []
    for step in plan:
        result = executor.execute_step(step, tools, results)
        results.append(result)
        
        # 可选：执行后检查，异常时重规划
        if not validate_step(result):
            plan = planner.replan(task, results)
    
    return synthesize_results(results)
```

**典型 Prompt 模板**：

```python
# Planner Prompt
PLANNER_PROMPT = """
You are a task planning assistant. Given a task, create a detailed plan.

Task: {input}

Create a plan with the following format:
1. First step
2. Second step
...

Plan:
"""

# Executor Prompt  
EXECUTOR_PROMPT = """
You are a task executor. Follow the plan and execute each step using available tools:

{tools}

Plan:
{plan}

Current step: {current_step}
Previous results: {previous_results}

Use the following format:
Thought: think about the current step
Action: the action to take
Action Input: the input for the action
"""
```

**适用场景**：
- 复杂多步骤任务（数据分析、报告生成）
- 步骤之间有依赖关系
- 需要在执行前确认计划合理性的场景
- 长期任务规划

**优点**：
- 全局视角：Planner 能看到完整任务
- 执行前可审查/修正计划
- 异常时支持重规划
- 复杂任务处理能力强

**缺点**：
- 规划与执行分离可能导致计划不切实际
- 执行阶段缺乏灵活性（必须按计划执行）
- 双倍 LLM 调用（Planner + Executor）
- 延迟较高

**与 ReAct 的本质区别**：

| 维度 | ReAct | Plan-Then-Act |
|------|-------|---------------|
| 推理时机 | 边想边做 | 先想后做 |
| 全局视角 | 无 | Planner 有 |
| 执行灵活性 | 高 | 低（按计划） |
| 错误恢复 | 无 | 重规划 |
| Token 消耗 | 较低 | 较高 |

---

### 3.3 ReAct + 轻规划（ReWOO 等）

**代表论文**：[ReWOO: Decoupling Reasoning from Observations](https://arxiv.org/abs/2305.18323) — Xu et al., Microsoft Research

**核心思想**：将**推理（Reasoning）**与**观察（Observation）**解耦。ReAct 中每次 Action 后必须等待 Observation 才能继续推理，而 ReWOO 允许 LLM 先规划好多个 Action，再批量执行，最后统一推理。

```
ReAct:  Thought → Action₁ → Observation₁ → Thought → Action₂ → Observation₂ → ...
ReWOO:  [Thought + Action₁ + Action₂ + Action₃] → [Observation₁ + Observation₂ + Observation₃] → Final Thought → Answer
```

**执行模式**：

```python
def rewoo_agent(task: str, tools: list[Tool]) -> str:
    """
    ReWOO: 分离推理与观察，提高效率
    """
    # Phase 1: 元推理（制定计划）
    meta_reasoning = llm.think(task, prompt="meta_reasoning")
    # 输出: "Plan: 1) search RAG+RL papers
    #              2) fetch abstracts
    #              3) analyze methodology
    #              4) synthesize findings"
    
    # 解析计划中的所有 Actions
    actions = parse_plan_actions(meta_reasoning)
    # [Action("search", "RAG reinforcement learning"),
    #  Action("fetch", "paper_id_1"),
    #  Action("fetch", "paper_id_2"), ...]
    
    # Phase 2: 批量执行（无推理）
    observations = []
    for action in actions:
        obs = execute_tool(tools, action.tool, action.input)
        observations.append(obs)
    
    # Phase 3: 基于所有观察的最终推理
    final_response = llm.think(
        task + meta_reasoning + observations,
        prompt="final_reasoning"
    )
    
    return final_response
```

**核心优势**：
- **减少 LLM 调用次数**：不需要每个 Action 后都等待 LLM 推理
- **提高并行度**：Actions 可以并行执行
- **降低延迟**：总等待时间减少

**局限性**：
- 如果某个 Action 失败或返回意外结果，无法动态调整后续 Actions
- 适用于工具调用可靠、观察结果可预测的场景

**Variant：ReAct + Plan（轻量级规划）**

LangChain 等框架也实现了"轻规划"模式，在 ReAct 循环中嵌入简单规划：

```python
def react_with_planning(task: str, tools: list[Tool]) -> str:
    """
    ReAct with lightweight planning: 在执行前简单规划，但不生成详细步骤列表
    """
    # 先给 LLM 一个全局目标提示
    context = f"Overall task: {task}\nGoal: Complete this task efficiently."
    
    history = []
    while not finished:
        # LLM 同时生成 Thought 和简短计划
        response = llm.think(context + history, prompt="think_and_plan")
        thought, next_actions = parse_thought_and_plan(response)
        
        for action in next_actions[:3]:  # 最多展望3步
            obs = execute_tool(tools, action.tool, action.input)
            history.append({"thought": thought, "action": action, "obs": obs})
    
    return extract_answer(history)
```

---

### 3.4 Tree/Graph Planning (ToT / LATS)

#### 3.4.1 Tree of Thoughts (ToT)

**代表论文**：[Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601) — Yao et al., NeurIPS 2023

**核心思想**：将 CoT 的线性链扩展为**树结构**，允许 LLM 在每个步骤生成多个候选"思考"（Thought），然后通过**自我评估**选择最优路径继续。

```
         Root
          │
    ┌─────┼─────┐
    │     │     │
   ToT1  ToT2  ToT3   ← 第一层：生成多个候选 Thought
    │     │     │
  eval   eval   eval   ← 评估：LLM 自我评估每个路径
    │     │     │
  Continue Bad   Good   ← 选择：保留有希望的路径
                     │
              ┌──────┼──────┐
              │      │      │
             ToT3a  ToT3b  ToT3c  ← 第二层：继续扩展
              │      │      │
            eval   eval   eval
              │      │      │
             ...    ...    ...    ← 递归扩展直到找到解
```

**ToT vs ReAct 的关键差异**：

| 维度 | ReAct | ToT |
|------|-------|-----|
| 推理结构 | 线性链 | 树/图 |
| 多路径探索 | ❌ | ✅ |
| 自我评估 | ❌ | ✅ |
| 回溯能力 | ❌ | ✅ |
| lookahead | ❌ | ✅ |

**实验结果**（Game of 24 任务）：
- CoT: 4% 成功率
- ToT: **74%** 成功率

#### 3.4.2 LATS (Language Agent Tree Search)

**代表论文**：[Language Agent Tree Search Unifies Reasoning, Acting and Planning](https://arxiv.org/abs/2310.04406) — Zhou et al., UIUC

**核心思想**：将 **Monte Carlo Tree Search (MCTS)** 引入 LLM Agent，结合：
- **ReAct 风格的推理**：每个节点包含 Thought-Action-Observation
- **MCTS 的树搜索**：选择（Selection）、扩展（Expansion）、模拟（Simulation）、回溯（Backpropagation）
- **自我反思（Reflection）**：用于评估节点价值

```python
def lats_agent(task: str, tools: list[Tool]) -> str:
    """
    LATS: 基于 MCTS 的通用 Agent 框架
    """
    # 初始化搜索树
    root = TreeNode(state=task, parent=None)
    
    for iteration in range(max_iterations):
        node = root
        
        # 1. Selection: 从根节点向下选择最有价值的子节点
        while not node.is_leaf():
            node = select_best_child(node)  # UCB 公式
        
        # 2. Expansion: 扩展选中的叶节点
        if not node.is_terminal():
            # 使用 ReAct 生成新子节点
            children = expand_node(node, tools)
            node.add_children(children)
            node = node.random_child()  # 随机选择一个扩展节点
        
        # 3. Simulation: 从当前节点模拟执行直到完成
        reward = simulate(node, tools)
        
        # 4. Backpropagation: 回溯更新路径上所有节点的统计信息
        while node is not None:
            node.update_stats(reward)
            node = node.parent
    
    # 返回最优子节点的解
    return best_solution(root)
```

**LATS 的关键创新**：
1. **环境反馈**：不仅依赖 LLM 自我评估，还利用外部环境提供真实奖励信号
2. **价值函数**：训练或使用 LLM 作为价值函数评估状态
3. **通用性**：统一了推理、行动和规划

**实验结果**：
- HumanEval (编程): **92.7%** pass@1 (GPT-4)
- WebShop (网页导航): 75.9 分，媲美监督学习方法

---

## 4. 范式对比总结表

| 维度 | ReAct | Plan-Then-Act | ReWOO (轻规划) | ToT | LATS |
|------|-------|---------------|---------------|-----|------|
| **执行模式** | 同步思考+行动 | 先规划后执行 | 计划-批量执行-推理 | 树搜索 | MCTS 树搜索 |
| **推理粒度** | 每步推理 | 计划阶段推理 | 元推理+最终推理 | 每节点推理 | 每节点推理 |
| **全局视角** | ❌ 无 | ✅ Planner 有 | 部分 | ✅ 多路径评估 | ✅ 完整树评估 |
| **回溯能力** | ❌ 无 | ⚠️ 重规划 | ❌ 无 | ✅ 选择性回溯 | ✅ MCTS 回溯 |
| **探索能力** | 线性探索 | 按计划执行 | 批量执行 | 多路径并行 | 自适应探索 |
| **错误恢复** | ❌ 无 | ✅ 重规划 | ❌ 无 | ✅ 切换路径 | ✅ MCTS 导向 |
| **Token 消耗** | 低 | 中-高 | 低-中 | 高 | 很高 |
| **延迟** | 低-中 | 中-高 | 低 | 高 | 很高 |
| **实现复杂度** | 低 | 中 | 低 | 中-高 | 高 |
| **适用任务** | 简单单链 | 复杂多步骤 | 工具调用密集 | 需要探索/规划 | 复杂决策 |

### 选型决策树

```
任务复杂度
    │
    ├─ 简单单步 ──────────────────▶ ReAct
    │
    ├─ 复杂多步，可按序执行 ───────▶ Plan-Then-Act
    │
    ├─ 工具调用密集，需高效 ──────▶ ReWOO
    │
    └─ 需要探索/规划/回溯 ─────────▶ ToT / LATS
            │
            ├─ 简单探索 ───────────▶ ToT
            │
            └─ 复杂决策/需要环境反馈 ▶ LATS
```

---

## 5. 场景示例：调研 RAG+RL 论文任务

**任务描述**：调研三篇 RAG+RL（检索增强生成 + 强化学习）论文并输出中文总结。

### 5.1 ReAct 处理方式

```python
# ReAct 执行轨迹
history = []

# Step 1
thought = "我需要搜索 RAG+RL 相关的最新论文"
action = search_arxiv(query="RAG reinforcement learning")
observation = returned 10 papers

# Step 2
thought = "让我获取第一篇论文的详细信息"
action = fetch_paper(id="2301.12345")
observation = Paper 2301.12345: "Adaptive RAG with RL" - 符合要求

# Step 3
thought = "获取第二篇论文"
action = fetch_paper(id="2302.67890") 
observation = Paper 2302.67890: "RL for KGQA" - 不完全符合（是知识图谱问答）

# Step 4
thought = "这篇不太相关，继续获取第三篇"
action = fetch_paper(id="2303.11111")
observation = Paper 2303.11111: "RAG with RLHF" - 符合要求

# Step 5: 总结时发现问题
# paper_2 的方法实际是 RL for KGQA，不是 RAG+RL，但已无法回退
# 只能基于两篇相关论文总结，内容不完整

final_answer = synthesize([paper_1, paper_3])
```

**问题**：中间选错论文无法纠正，最终结果不完整。

### 5.2 Plan-Then-Act 处理方式

```python
# Plan-Then-Act 执行轨迹

# Phase 1: 规划
plan = """
1. 搜索 arxiv，关键词：("RAG" OR "retrieval-augmented") AND ("reinforcement learning" OR "RL")
2. 从结果中筛选同时包含 RAG 和 RL 的论文
3. 选取 3 篇最相关的论文，获取摘要
4. 深度阅读 3 篇论文的方法部分
5. 对比分析各论文的方法、实验和贡献
6. 用中文撰写总结
"""

# Phase 2: 执行
results = []

# Step 1
search_result = search_arxiv(query='("RAG" OR "retrieval-augmented") AND ("reinforcement learning" OR "RL")')
results.append(search_result)

# Step 2: 评估筛选（可以重规划）
filtered = llm.filter_relevant(search_result, criteria="RAG + RL 同时提出")
# 如果筛选结果少于3篇，需要调整搜索策略重新搜索

# Step 3-5: 继续执行...

# Step 6: 如果某步失败，可以重规划
if len(filtered) < 3:
    plan = replan(task, completed_steps, "原搜索结果不足，扩大关键词")
```

**优势**：可以在执行过程中根据实际情况调整计划。

### 5.3 ToT 处理方式

```python
# ToT 执行轨迹

# Root: 任务
root_state = "调研 RAG+RL 论文并总结"

# 第一层：生成多个搜索策略
thoughts_level1 = [
    "搜索 RAG + RL 论文",
    "搜索 Retrieval Augmented Generation + Reinforcement Learning",
    "搜索 arXiv 上最新的 RAG 论文再用 RL 过滤"
]

# 评估：哪个搜索策略最可能找到相关论文？
evaluations = [
    ("搜索 RAG + RL 论文", 0.9),      # 直接命中
    ("搜索 Retrieval Augmented...", 0.8),  # 完整术语
    ("分步搜索+过滤", 0.6)           # 可能漏掉
]

# 选择 Top 2 继续扩展
selected = ["搜索 RAG + RL 论文", "搜索 Retrieval Augmented..."]

# 第二层：每个路径获取候选论文
# Path 1: 搜索 RAG + RL → 获取 10 篇 → 评估相关性 → 选择 Top 3
# Path 2: 搜索完整术语 → 获取 8 篇 → 评估相关性 → 选择 Top 3

# 第三层：对比评估，选择最佳论文组合
# 最终返回：最优路径的论文组合 + 总结
```

**优势**：可以并行探索多种策略，选择最优解。

### 5.4 LATS 处理方式

```python
# LATS 执行轨迹（更系统化的树搜索）

# 初始化 MCTS
root = MCTSNode(state="调研 RAG+RL 论文")

for iteration in range(50):  # 最多50次模拟
    node = root
    
    # Selection: 选择最有潜力的节点（UCB 公式）
    while not node.is_leaf():
        node = node.select_by_ucb()
    
    # Expansion: 生成候选 Actions
    if node.value < threshold:
        actions = generate_candidate_actions(node, tools)
        node.add_children(actions)
        node = random.choice(node.children)
    
    # Simulation: 模拟执行
    papers = simulate_search(node)
    quality = evaluate_papers(papers, criteria="RAG + RL")
    
    # Backpropagation: 更新路径价值
    node.backpropagate(quality)
    
    # 如果找到足够好的结果，提前终止
    if root.best_value > 0.85:
        break

# 返回最优论文组合
best_papers = root.best_child.path_to_root()
final_summary = synthesize(best_papers)
```

**优势**：自适应探索，通过 MCTS 平衡探索与利用。

---

## 6. 参考文献

1. **ReAct** — Yao et al.
   > Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). *ReAct: Synergizing Reasoning and Acting in Language Models*. ICLR 2023.
   > - arXiv: [2210.03629](https://arxiv.org/abs/2210.03629)
   > - GitHub: [ysymyth/ReAct](https://github.com/ysymyth/ReAct)

2. **Tree of Thoughts** — Yao et al.
   > Yao, S., Yu, D., Zhao, J., Shafran, I., Griffiths, T. L., Cao, Y., & Narasimhan, K. (2023). *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*. NeurIPS 2023.
   > - arXiv: [2305.10601](https://arxiv.org/abs/2305.10601)
   > - GitHub: [princeton-nlp/tree-of-thought-llm](https://github.com/princeton-nlp/tree-of-thought-llm)

3. **LATS** — Zhou et al.
   > Zhou, A., Yan, K., Shlapentokh-Rothman, M., Wang, H., & Wang, Y. (2024). *Language Agent Tree Search Unifies Reasoning, Acting and Planning in Language Models*. 
   > - arXiv: [2310.04406](https://arxiv.org/abs/2310.04406)
   > - GitHub: [lapisrocks/LanguageAgentTreeSearch](https://github.com/lapisrocks/LanguageAgentTreeSearch)

4. **Reflexion** — Shinn et al.
   > Shinn, N., Cassano, F., Berman, E., Gopinath, A., Narasimhan, K., & Yao, S. (2023). *Reflexion: Language Agents with Verbal Reinforcement Learning*. NeurIPS 2023.
   > - arXiv: [2303.11366](https://arxiv.org/abs/2303.11366)

5. **ReWOO** — Xu et al.
   > Xu, D., Liu, C., Mukherjee, S., Lei, B., & Peng, Z. (2023). *ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models*.
   > - arXiv: [2305.18323](https://arxiv.org/abs/2305.18323)
   > - GitHub: [billxbf/ReWOO](https://github.com/billxbf/ReWOO)

---

## 7. 延伸阅读

- [LangChain Agent Architectures](https://apxml.com/courses/langchain-production-llm/chapter-2-sophisticated-agents-tools/agent-architectures) — LangChain 官方课程
- [ReAct vs Plan-and-Execute: A Practical Comparison](https://dev.to/jamesli/react-vs-plan-and-execute-a-practical-comparison-of-llm-agent-patterns-4gh9) — 详细代码实现对比
- [Evolution of Agent Design: From ReAct to Plan-and-Execute](https://www.toolify.ai/ai-news/evolution-of-agent-design-from-react-to-plan-and-execute-style-agents-2035213) — Agent 设计范式演进

---

*本文档为 LLM Agent 架构调研系列 Q1，后续将对比更多 Agent 推理范式。*
