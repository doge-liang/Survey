---
id: q2-cot-vs-planning
title: "Q2: Chain-of-Thought vs Planning 本质区别"
category: agent-reasoning
level: advanced
tags: [cot, planning, reasoning, agent, self-consistency]
related-questions: [q1, q3, q4, q5]
date: 2026-03-30
---

# Q2: Chain-of-Thought vs Planning 本质区别

## 1. 概述

在大语言模型（LLM）推理与 Agent 系统研究中，**Chain-of-Thought（CoT）** 和 **Planning（规划）** 是两种核心推理策略。尽管两者都涉及"思考过程"，但它们在**本质目标、输出形式、执行粒度、失败处理机制**等方面存在根本性差异。

理解这些差异对于正确选择 Agent 架构至关重要——CoT 擅长"推理"，Planning 擅长"执行"。将两者混淆会导致系统设计缺陷：要么推理过程无法落地执行，要么规划缺乏灵活推理支撑。

| 维度 | Chain-of-Thought (CoT) | Planning（规划） |
|------|-------------------------|------------------|
| **核心目标** | 生成自然语言推理步骤 | 生成可执行的任务分解 |
| **输出形式** | 文本推理链 | 任务图/步骤列表 |
| **执行粒度** | 粗粒度（思考单元） | 细粒度（原子动作） |
| **失败处理** | 无内置机制 | 支持重规划/回溯 |
| **灵活性** | 高（自由推理） | 低（按计划执行） |
| **代表论文** | arXiv:2201.11903 | arXiv:2305.10601 |

---

## 2. Chain-of-Thought（CoT）本质剖析

### 2.1 什么是 CoT：仅"将推理过程写出来"

**Chain-of-Thought** 由 Wei et al. 在 [arXiv:2201.11903](https://arxiv.org/abs/2201.11903) 提出，其核心思想可以概括为：

> **CoT 的本质：生成自然语言推理步骤，但不生成可执行任务**

CoT 引导 LLM 在给出最终答案之前，**显式地写出推理过程**。这些推理步骤是自然语言文本，它们解释"为什么"要这样思考，但不指定"如何"执行具体动作。

**典型 CoT Prompt 示例**：

```
问题：小明有 5 个苹果，小红给了小明 3 个苹果，小明吃掉了 2 个。小明现在有多少个苹果？

思考过程：
1. 小明最初有 5 个苹果
2. 小红又给了小明 3 个苹果，所以小明的苹果数量变为 5 + 3 = 8 个
3. 小明吃掉了 2 个苹果，所以现在有 8 - 2 = 6 个苹果

最终答案：6 个苹果
```

在这个例子中，"5 + 3 = 8"和"8 - 2 = 6"是**推理步骤**，但它们：
- 不是函数调用
- 不是 API 请求
- 不是任何形式的可执行代码
- 只是帮助人类理解模型推理过程的自然语言解释

### 2.2 CoT 的核心机制

#### 2.2.1 思维链提示（Chain-of-Thought Prompting）

CoT 有两种主要形式：

**1. Few-shot CoT**：在 Prompt 中提供多个"问题→推理过程→答案"的示例

```python
# Few-shot CoT 示例
COT_PROMPT = """
示例 1：
问题：2 * 4 + 5 = ?
思考过程：先算乘法 2 * 4 = 8，再算加法 8 + 5 = 13
答案：13

示例 2：
问题：如果每个盒子装 6 个鸡蛋，3 盒鸡蛋共有多少个？
思考过程：每个盒子 6 个鸡蛋，3 盒就是 3 * 6 = 18 个
答案：18

现在请回答：
问题：{question}
"""
```

**2. Zero-shot CoT**：使用简单触发词如"让我们一步一步思考"

```python
# Zero-shot CoT 示例
ZERO_SHOT_COT_PROMPT = """
问题：{question}

让我们一步一步地思考。
"""
```

#### 2.2.2 自洽性（Self-Consistency）

**代表论文**：[arXiv:2203.11171](https://arxiv.org/abs/2203.11171) — Wang et al., Google Brain

Self-Consistency 是对 CoT 的重要增强，其核心思想是：

> **对同一个问题生成多条不同的推理链，然后通过投票选择最一致的答案**

```python
def self_consistency(question: str, llm, n_samples: int = 20) -> str:
    """
    Self-Consistency: 生成多条推理链，投票选择最一致的答案
    """
    # 1. 生成 n 条不同的推理链
    reasoning_chains = []
    for i in range(n_samples):
        # 每次采样使用不同 temperature，产生不同推理路径
        response = llm.sample(
            prompt=f"问题：{question}\n让我们一步一步思考。",
            temperature=0.7  # 较高 temperature 促进多样性
        )
        reasoning_chains.append(response)
    
    # 2. 从每条推理链中提取最终答案
    answers = [extract_answer(chain) for chain in reasoning_chains]
    
    # 3. 投票选择最常见的答案
    answer_counts = Counter(answers)
    most_common_answer = answer_counts.most_common(1)[0][0]
    
    return most_common_answer
```

**Self-Consistency 的关键洞察**：

```
┌─────────────────────────────────────────────────────────┐
│           Self-Consistency 工作原理                      │
│                                                         │
│   问题 ──▶ [推理链 1] ──▶ 答案 A                        │
│       │                                                │
│       ├──▶ [推理链 2] ──▶ 答案 B                        │
│       │                                                │
│       ├──▶ [推理链 3] ──▶ 答案 A  ──▶ 投票 ──▶ 最终答案 A│
│       │                                                │
│       └──▶ [推理链 4] ──▶ 答案 C                        │
│                                                         │
│   答案分布：A(2), B(1), C(1) → 答案 A 获胜              │
└─────────────────────────────────────────────────────────┘
```

**实验结果**（GSM8K 数学题）：
- CoT (single chain): 46%
- Self-Consistency (n=40): **74%** 🎯

### 2.3 CoT 的局限性

#### 2.3.1 推理与执行脱节

CoT 生成的"推理步骤"是**纯文本**，不转化为任何可执行的任务：

```python
# CoT 的典型输出
cot_output = """
思考：这个问题需要搜索最新的 RAG+RL 论文。

首先，我需要搜索相关论文...
然后，我需要阅读这些论文的摘要...
接着，我需要比较不同方法的优缺点...
最后，我需要总结成中文报告...

（注意：以上全是自然语言，没有生成任何实际可执行的任务调用）
"""
```

**问题**：LLM 输出了"思考过程"，但这个过程**不会自动执行**。如果要让系统真正执行，还需要额外的 Agent 执行框架。

#### 2.3.2 缺乏任务依赖建模

CoT 的推理链是**线性文本**，没有明确的任务依赖关系：

```
CoT 输出：
1. 搜索 RAG+RL 论文
2. 阅读第一篇论文摘要
3. 阅读第二篇论文摘要
4. 阅读第三篇论文摘要
5. 总结

问题：这些步骤之间有什么依赖关系？
     如果第2步失败，第3步还能执行吗？
     步骤可以并行吗？
     
答案：CoT 无法回答——它只生成文本，不建模任务结构
```

#### 2.3.3 失败处理能力弱

```python
# CoT 无法处理执行失败
cot_example = """
思考：让我搜索 RAG+RL 论文，然后获取第一篇的摘要...

搜索成功，返回了 10 篇论文。

现在让我获取第一篇的摘要... 

（假设网络错误导致获取失败）

思考：...嗯...让我继续尝试...

（CoT 不知道如何系统性地处理这个错误）
"""
```

**CoT 没有机制**：
- 不知道某一步失败后应该重试还是换方案
- 不知道是否需要调整后续步骤
- 不知道何时应该终止执行

---

## 3. Planning 本质剖析

### 3.1 什么是 Planning：生成"可执行的任务表"

**Planning** 的核心思想与 CoT 截然不同：

> **Planning 的本质：生成明确的任务分解、依赖关系、执行顺序——形成可执行的任务图**

Planning 输出的不是"思考过程文本"，而是**可执行的任务规范**，包括：
- 任务的分解（Task Decomposition）
- 任务间的依赖关系（Dependencies）
- 任务的执行顺序（Execution Order）
- 任务的完成条件（Completion Criteria）

### 3.2 Planning 的核心机制

#### 3.2.1 任务分解（Task Decomposition）

```python
# Planning 的任务分解示例
planning_output = {
    "task": "调研三篇 RAG+RL 论文并输出中文总结",
    "subtasks": [
        {
            "id": "step_1",
            "task": "搜索 RAG+RL 相关论文",
            "tool": "search_arxiv",
            "params": {"query": "RAG reinforcement learning"},
            "depends_on": [],  # 无依赖，可最先执行
            "status": "pending"
        },
        {
            "id": "step_2",
            "task": "筛选最相关的 3 篇论文",
            "tool": "llm_filter",
            "params": {"criteria": "RAG + RL 同时提出"},
            "depends_on": ["step_1"],  # 依赖搜索结果
            "status": "pending"
        },
        {
            "id": "step_3",
            "task": "阅读论文 1 摘要",
            "tool": "fetch_paper",
            "params": {"paper_id": "${step_2.output[0]}"},
            "depends_on": ["step_2"],
            "status": "pending"
        },
        # ... step_4, step_5 类似
        {
            "id": "step_6",
            "task": "编译最终总结报告",
            "tool": "synthesize",
            "params": {"sources": ["${step_3.output}", "${step_4.output}", "${step_5.output}"]},
            "depends_on": ["step_3", "step_4", "step_5"],
            "status": "pending"
        }
    ]
}
```

#### 3.2.2 任务图结构

```
┌─────────────────────────────────────────────────────────────┐
│                    任务图（Task Graph）                       │
│                                                             │
│                    ┌─────────────┐                           │
│                    │ search_     │                           │
│                    │ rag_rl_     │                           │
│                    │ papers      │                           │
│                    └──────┬──────┘                           │
│                           │                                  │
│              ┌────────────┼────────────┐                     │
│              ▼            ▼            ▼                     │
│        ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│        │  read    │ │  read    │ │  read    │                │
│        │  paper_1 │ │  paper_2 │ │  paper_3 │                │
│        └────┬─────┘ └────┬─────┘ └────┬─────┘                │
│             │            │            │                       │
│             └────────────┼────────────┘                       │
│                          ▼                                   │
│                   ┌─────────────┐                            │
│                   │  summarize_ │                            │
│                   │    all      │                            │
│                   └─────────────┘                            │
│                                                             │
│  特点：                                                       │
│  - 有向无环图（DAG）结构                                       │
│  - 依赖关系明确，可拓扑排序                                     │
│  - 可并行执行的步骤清晰                                        │
│  - 失败影响可追踪                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.3 规划算法的实现

```python
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Task:
    id: str
    task: str  # 任务描述
    tool: Optional[str] = None  # 执行工具
    params: Dict[str, Any] = field(default_factory=dict)
    depends_on: List[str] = field(default_factory=list)  # 依赖的任务 ID
    status: TaskStatus = TaskStatus.PENDING
    result: Any = None
    error: Optional[str] = None

class TaskPlanner:
    """任务规划器：生成可执行的任务图"""
    
    def __init__(self, llm):
        self.llm = llm
    
    def create_plan(self, task: str) -> List[Task]:
        """
        将高层任务分解为可执行的任务图
        """
        # 1. 调用 LLM 生成任务分解
        plan_text = self.llm.think(
            prompt=f"""将以下任务分解为具体的执行步骤，返回 JSON 格式：
            任务：{task}
            
            要求：
            1. 每个步骤必须是可执行的具体动作
            2. 明确标注步骤间的依赖关系
            3. 指定每个步骤使用的工具
            4. 输出格式：[{{"id": "step_1", "task": "...", "tool": "...", "depends_on": []}}]
            """
        )
        
        # 2. 解析为 Task 对象列表
        tasks = self._parse_plan(plan_text)
        
        # 3. 验证依赖关系（检测循环依赖等）
        if not self._validate_dependencies(tasks):
            raise ValueError("任务依赖关系存在循环或无效引用")
        
        return tasks
    
    def _validate_dependencies(self, tasks: List[Task]) -> bool:
        """验证任务依赖图是否有效"""
        # 构建依赖图，检查是否有循环依赖
        task_ids = {t.id for t in tasks}
        for task in tasks:
            for dep_id in task.depends_on:
                if dep_id not in task_ids:
                    return False  # 依赖的任务不存在
        return True
    
    def get_execution_order(self, tasks: List[Task]) -> List[List[Task]]:
        """
        获取任务的执行顺序（拓扑排序）
        返回：批次列表，每批内的任务可以并行执行
        """
        # 计算入度
        in_degree = {t.id: len(t.depends_on) for t in tasks}
        ready = [t.id for t in tasks if in_degree[t.id] == 0]
        
        batches = []
        while ready:
            batches.append([t for t in tasks if t.id in ready])
            next_ready = []
            for batch_task in batches[-1]:
                # 减少依赖该任务的所有任务的入度
                for other_task in tasks:
                    if batch_task.id in other_task.depends_on:
                        in_degree[other_task.id] -= 1
                        if in_degree[other_task.id] == 0:
                            next_ready.append(other_task.id)
            ready = next_ready
        
        return batches
```

### 3.3 规划的执行与监控

```python
class TaskExecutor:
    """任务执行器：根据规划执行任务图"""
    
    def __init__(self, tools: Dict[str, callable]):
        self.tools = tools
    
    def execute_plan(self, tasks: List[Task], planner: TaskPlanner) -> List[Task]:
        """
        执行完整的任务图，支持失败处理和重规划
        """
        # 获取执行顺序
        batches = planner.get_execution_order(tasks)
        
        for batch in batches:
            # 批次内任务可以并行执行
            results = self._execute_batch(batch)
            
            # 处理批次执行结果
            for task, result in zip(batch, results):
                if result.success:
                    task.status = TaskStatus.COMPLETED
                    task.result = result.output
                else:
                    task.status = TaskStatus.FAILED
                    task.error = result.error
                    
                    # 失败处理策略
                    self._handle_failure(task, tasks, result.error)
        
        return tasks
    
    def _handle_failure(self, failed_task: Task, all_tasks: List[Task], error: str):
        """
        失败处理：重规划或回退
        """
        # 策略 1：重试（如果是非确定性错误）
        if is_transient_error(error):
            failed_task.status = TaskStatus.PENDING  # 重置状态
            return
        
        # 策略 2：调整后续任务（如果失败不影响关键路径）
        dependent_tasks = [t for t in all_tasks if failed_task.id in t.depends_on]
        for dep_task in dependent_tasks:
            # 检查是否可以绕过失败任务
            if self._can_skip(dep_task, failed_task):
                dep_task.depends_on.remove(failed_task.id)
        
        # 策略 3：通知用户进行人工干预
        raise ExecutionError(f"Task {failed_task.id} failed: {error}")
```

---

## 4. 核心区别对比

### 4.1 输出形式的本质差异

```
┌────────────────────────────────────────────────────────────────┐
│                     CoT vs Planning 输出对比                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  CoT 输出：                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ "我需要搜索 RAG+RL 相关论文，找到 3 篇，阅读摘要，           │  │
│  │   判断是否适合，然后总结成中文。"                            │  │
│  │                                                           │  │
│  │   （这些都是自然语言文本，不会自动执行）                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Planning 输出：                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [                                                            │  │
│  │   {"id": "step_1", "tool": "search", "params": {...}},     │  │
│  │   {"id": "step_2", "tool": "fetch", "params": {...}},      │  │
│  │   {"id": "step_3", "tool": "synthesize", "params": {...}}  │  │
│  │ ]                                                            │  │
│  │                                                           │  │
│  │   （这是结构化数据，可被任务执行器直接解析和执行）             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 执行粒度的差异

| 维度 | CoT | Planning |
|------|-----|----------|
| **思考粒度** | 粗粒度思维块 | 细粒度原子任务 |
| **示例** | "搜索论文" | `search_arxiv(query="RAG RL", max_results=10)` |
| **示例** | "阅读摘要" | `fetch_paper(paper_id="xxx", section="abstract")` |
| **可执行性** | 不可执行（需人工转译） | 可直接执行 |

### 4.3 失败处理机制

```
┌────────────────────────────────────────────────────────────────┐
│                      失败处理对比                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  CoT（无内置失败处理）：                                         │
│                                                                │
│  Step 1: 搜索论文 ──▶ 成功                                      │
│  Step 2: 获取摘要 ──▶ 网络错误 ❌                                │
│  Step 3: 总结    ──▶ ???（不知道该重试还是跳过）                   │
│                                                                │
│  结果：LLM 可能尝试"继续"执行，但效果不可预测                      │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Planning（结构化失败处理）：                                     │
│                                                                │
│  Step 1: search_rag_papers ──▶ 成功                             │
│  Step 2: fetch_paper_1 ──▶ 网络错误 ❌                          │
│                                                                │
│  失败处理流程：                                                  │
│  1. 检测 step_2 失败                                            │
│  2. 分析失败影响：step_3/4/5/6 都依赖 step_2 的输出              │
│  3. 决策：                                                       │
│     - 如果 step_2 允许重试 → 重试 (max 3次)                      │
│     - 如果 step_2 不可恢复 → 标记失败，通知用户                   │
│     - 检查是否可以跳过 step_2 继续后续步骤                        │
│                                                                │
│  结果：失败被系统性地处理，不影响整体可解释性                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.4 灵活性对比

| 维度 | CoT | Planning |
|------|-----|----------|
| **动态调整** | 高（自由推理） | 低（按计划执行） |
| **适应性** | 可根据上一步结果调整下一步 | 需重新规划 |
| **探索能力** | 受限于预定义的思维链 | 可通过重规划探索不同路径 |
| **适用场景** | 简单推理任务 | 复杂多步骤任务 |

---

## 5. 场景示例：调研 RAG+RL 论文任务

### 5.1 任务描述

**任务**：调研三篇 RAG+RL（检索增强生成 + 强化学习）论文并输出中文总结。

### 5.2 CoT 处理方式

```python
# CoT Prompt 和输出
COT_PROMPT = """
任务：调研三篇 RAG+RL 论文并输出中文总结。

请一步步思考如何完成这个任务。
"""

# CoT 的输出（自然语言推理）
COT_OUTPUT = """
思考过程：

1. 首先，我需要搜索 RAG+RL 相关的最新论文
   - 使用关键词："RAG" + "reinforcement learning" 或 "RLHF"

2. 找到论文后，我需要筛选出真正结合 RAG 和 RL 的论文
   - 不是所有带 RL 的论文都是 RAG+RL
   - 需要看摘要判断是否同时涉及检索增强和强化学习

3. 选取 3 篇最相关的论文，获取完整信息
   - 查看标题、作者、发表venue
   - 阅读摘要了解方法

4. 逐一分析每篇论文的：
   - 研究问题
   - 方法
   - 实验设置
   - 主要贡献

5. 对比分析 3 篇论文的异同

6. 用中文撰写总结，包括：
   - 每篇论文的核心要点
   - 方法对比
   - 领域发展趋势

（以上全是文本描述，不会自动执行任何搜索或获取操作）
"""
```

**CoT 的问题**：
- 所有步骤都是"建议"而非"命令"
- 没有指定使用什么工具
- 没有参数如何设置
- 失败后无法自动恢复

### 5.3 Planning 处理方式

```python
# Planning Prompt 和输出
PLANNING_PROMPT = """
任务：调研三篇 RAG+RL 论文并输出中文总结。

请将这个任务分解为具体的可执行步骤，输出 JSON 格式。
每个步骤必须包含：id, task, tool, params, depends_on。
"""

# Planning 的输出（结构化任务图）
PLANNING_OUTPUT = {
    "plan_id": "rag_rl_survey_001",
    "created_at": "2026-03-30T10:00:00Z",
    "tasks": [
        {
            "id": "step_1_search",
            "task": "搜索 RAG+RL 相关论文",
            "tool": "search_arxiv",
            "params": {
                "query": '("RAG" OR "retrieval-augmented") AND ("reinforcement learning" OR "RLHF")',
                "max_results": 20,
                "sort_by": "relevance"
            },
            "depends_on": [],
            "output_schema": {"papers": "list"}
        },
        {
            "id": "step_2_filter",
            "task": "筛选最相关的 3 篇论文",
            "tool": "llm_filter",
            "params": {
                "input": "${step_1_search.papers}",
                "criteria": "论文必须同时满足：(1) 提出 RAG 新方法 (2) 使用 RL 训练 (3) 有实验验证",
                "output_count": 3
            },
            "depends_on": ["step_1_search"],
            "output_schema": {"selected_papers": "list"}
        },
        {
            "id": "step_3_fetch_1",
            "task": "获取论文1的摘要和方法",
            "tool": "fetch_paper",
            "params": {
                "paper_id": "${step_2_filter.selected_papers[0]}",
                "sections": ["abstract", "method"]
            },
            "depends_on": ["step_2_filter"],
            "output_schema": {"title": "str", "abstract": "str", "method": "str"}
        },
        {
            "id": "step_3_fetch_2",
            "task": "获取论文2的摘要和方法",
            "tool": "fetch_paper",
            "params": {
                "paper_id": "${step_2_filter.selected_papers[1]}",
                "sections": ["abstract", "method"]
            },
            "depends_on": ["step_2_filter"],
            "output_schema": {"title": "str", "abstract": "str", "method": "str"}
        },
        {
            "id": "step_3_fetch_3",
            "task": "获取论文3的摘要和方法",
            "tool": "fetch_paper",
            "params": {
                "paper_id": "${step_2_filter.selected_papers[2]}",
                "sections": ["abstract", "method"]
            },
            "depends_on": ["step_2_filter"],
            "output_schema": {"title": "str", "abstract": "str", "method": "str"}
        },
        {
            "id": "step_4_analyze",
            "task": "深度分析 3 篇论文的方法",
            "tool": "llm_analyze",
            "params": {
                "papers": [
                    "${step_3_fetch_1}",
                    "${step_3_fetch_2}",
                    "${step_3_fetch_3}"
                ],
                "analysis_type": "method_comparison"
            },
            "depends_on": ["step_3_fetch_1", "step_3_fetch_2", "step_3_fetch_3"],
            "output_schema": {"analysis": "str"}
        },
        {
            "id": "step_5_summarize",
            "task": "生成中文总结报告",
            "tool": "synthesize",
            "params": {
                "papers": [
                    "${step_3_fetch_1}",
                    "${step_3_fetch_2}",
                    "${step_3_fetch_3}"
                ],
                "analysis": "${step_4_analyze.analysis}",
                "language": "zh",
                "format": "markdown"
            },
            "depends_on": ["step_4_analyze"],
            "output_schema": {"report": "str"}
        }
    ],
    "execution_config": {
        "max_retries": 3,
        "retry_delay_seconds": 2,
        "parallel_execution": True,  # step_3_fetch_1/2/3 可并行
        "stop_on_failure": False
    }
}
```

### 5.4 执行流程可视化

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Planning 执行流程                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  批次 1（可并行）：                                                   │
│  ┌─────────────┐                                                    │
│  │ step_1_search │ ──▶ [搜索返回 20 篇论文]                          │
│  └─────────────┘                                                    │
│           │                                                          │
│           ▼                                                          │
│  批次 2：                                                            │
│  ┌─────────────┐                                                    │
│  │ step_2_filter │ ──▶ [LLM 筛选出 3 篇最相关的]                     │
│  └─────────────┘                                                    │
│           │                                                          │
│           ▼                                                          │
│  批次 3（可并行）：                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ step_3_     │  │ step_3_     │  │ step_3_     │                  │
│  │ fetch_1     │  │ fetch_2     │  │ fetch_3     │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                 │                 │                        │
│         └─────────────────┼─────────────────┘                        │
│                           ▼                                          │
│  批次 4：                                                            │
│  ┌─────────────┐                                                     │
│  │ step_4_     │                                                     │
│  │ analyze     │                                                     │
│  └─────────────┘                                                     │
│           │                                                          │
│           ▼                                                          │
│  批次 5：                                                            │
│  ┌─────────────┐                                                     │
│  │ step_5_     │                                                     │
│  │ summarize   │ ──▶ [最终中文报告]                                   │
│  └─────────────┘                                                     │
│                                                                      │
│  失败处理：                                                           │
│  - step_3_fetch_2 失败 → 重试 3 次 → 仍失败 → 标记，跳过依赖它的步骤   │
│  - 用户可选择：重新规划 或 手动修复后继续                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. 学术论文参考

### 6.1 Chain-of-Thought 相关论文

#### 6.1.1 Chain-of-Thought Prompting（原始论文）

**论文**：[Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903)

**引用**：
> Wei, J., Wang, X., Schuurmans, D., Bosma, M., Xia, F., Chi, E., ... & Zhou, D. (2022). *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*. NeurIPS 2022.

**核心贡献**：
- 提出 CoT 的基本思想：通过在 Prompt 中包含推理步骤示例，引导模型生成中间推理过程
- 在算术、符号、常识推理任务上取得显著提升
- Few-shot CoT 在 GSM8K 数学题上达到 57% 准确率

**关键实验结果**：

| 方法 | GSM8K | SVAMP | StrategyQA |
|------|-------|-------|-------------|
| Direct (无 CoT) | 18% | 59% | 71% |
| CoT (ours) | 57% | 65% | 79% |

#### 6.1.2 Self-Consistency

**论文**：[Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171)

**引用**：
> Wang, X., Wei, J., Schuurmans, D., Le, Q. V., Chi, E. H., & Zhou, D. (2023). *Self-Consistency Improves Chain of Thought Reasoning in Language Models*. ICLR 2023.

**核心贡献**：
- 提出自洽性解码策略：采样多条不同推理链，投票选择最一致的答案
- 在多个推理任务上显著提升 CoT 效果
- 无需额外训练，仅通过推理时采样实现

**代码示例**：

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

def self_consistency(model_name: str, question: str, n_samples: int = 40):
    """
    Self-Consistency 实现
    """
    model = AutoModelForCausalLM.from_pretrained(model_name)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    # 多次采样生成不同的推理链
    reasoning_chains = []
    for _ in range(n_samples):
        inputs = tokenizer(question + "\n让我们一步一步思考。", 
                          return_tensors="pt")
        
        # 使用不同的 temperature 采样
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=256,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        
        reasoning_chain = tokenizer.decode(outputs[0])
        reasoning_chains.append(reasoning_chain)
    
    # 提取答案并投票
    answers = [extract_answer(chain) for chain in reasoning_chains]
    answer_counts = Counter(answers)
    
    return answer_counts.most_common(1)[0][0]
```

#### 6.1.3 Least-to-Most Prompting

**论文**：[Least-to-Most Prompting Enables Complex Reasoning in Large Language Models](https://arxiv.org/abs/2205.10625)

**引用**：
> Zhou, D., Schärli, N., Hou, L., Wei, J., Scales, N., Wang, X., & Schuurmans, D. (2023). *Least-to-Most Prompting Enables Complex Reasoning in Large Language Models*. ICLR 2023.

**核心思想**：
- 先将复杂问题分解为简单子问题
- 依次解决每个子问题，后面的子问题可以依赖前面的答案
- 在组合泛化任务上显著优于 CoT

```python
def least_to_most_prompt(problem: str) -> str:
    """
    Least-to-Most: 从简单到复杂的提示策略
    """
    # Step 1: 分解问题
    decomposition_prompt = f"""
    问题：{problem}
    
    将上述问题分解为简单的子问题，每个子问题应该可以直接回答。
    列出所有子问题：
    """
    subproblems = llm.generate(decomposition_prompt)
    
    # Step 2: 逐个解决子问题
    context = ""
    for subproblem in subproblems:
        solve_prompt = f"{context}\n\n子问题：{subproblem}\n回答："
        answer = llm.generate(solve_prompt)
        context += f"\n子问题：{subproblem}\n回答：{answer}"
    
    # Step 3: 综合回答原问题
    final_prompt = f"""
    原始问题：{problem}
    
    子问题及回答：
    {context}
    
    综合以上，回答原始问题：
    """
    return llm.generate(final_prompt)
```

### 6.2 Planning 相关论文

#### 6.2.1 Tree of Thoughts (ToT)

**论文**：[Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601)

**引用**：
> Yao, S., Yu, D., Zhao, J., Shafran, I., Griffiths, T. L., Cao, Y., & Narasimhan, K. (2023). *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*. NeurIPS 2023.

**核心贡献**：
- 将 CoT 的线性链扩展为树/图结构
- 支持多路径探索和自我评估
- 在 Game of 24、创意写作等任务上显著优于 CoT

**关键实验结果**：

| 方法 | Game of 24 | 5x5 Grid | 叉子谜题 |
|------|------------|----------|----------|
| CoT | 4% | 37% | 61% |
| ToT | **74%** | **90%** | **82%** |

#### 6.2.2 LATS (Language Agent Tree Search)

**论文**：[Language Agent Tree Search Unifies Reasoning, Acting and Planning](https://arxiv.org/abs/2310.04406)

**引用**：
> Zhou, A., Yan, K., Shlapentokh-Rothman, M., Wang, H., & Wang, Y. (2024). *Language Agent Tree Search Unifies Reasoning, Acting and Planning in Language Models*. 

**核心贡献**：
- 将 Monte Carlo Tree Search (MCTS) 引入 LLM Agent
- 结合推理、行动和规划于统一框架
- 在编程、Web导航等任务上取得 SOTA

#### 6.2.3 PlanBench

**论文**：[PlanBench: A Benchmark for Planning and Reasoning in Language Models](https://arxiv.org/abs/2306.17194)

**引用**：
> Valmeekam, K., Kambhampati, S., et al. (2023). *PlanBench: A Benchmark for Planning and Reasoning in Language Models*.

**核心贡献**：
- 提出评估 LLM 规划能力的标准化基准
- 包含经典规划问题（Blocksworld、Sokoban）和新颖问题
- 发现当前 LLM 在规划任务上仍有显著不足

### 6.3 关键对比总结

| 论文 | 年份 | 会议 | 核心思想 | 与 CoT/Planning 的关系 |
|------|------|------|----------|------------------------|
| Chain-of-Thought | 2022 | NeurIPS | 推理步骤提示 | CoT 的开创性工作 |
| Self-Consistency | 2023 | ICLR | 多路径投票 | CoT 的增强策略 |
| Least-to-Most | 2023 | ICLR | 分解-解决 | CoT 的改进 |
| Tree of Thoughts | 2023 | NeurIPS | 树搜索规划 | Planning 的代表 |
| LATS | 2024 | - | MCTS 规划 | Planning 的深度整合 |
| PlanBench | 2023 | - | 规划基准测试 | 评估 LLM 规划能力 |

---

## 7. 实践指南：如何选择

### 7.1 决策流程

```
任务类型判断
     │
     ├─ 仅需推理/解释 ──────────────────▶ CoT
     │   - 数学解题
     │   - 逻辑推理
     │   - 问答解释
     │
     ├─ 需要执行多个动作 ─────────────────▶ Planning
     │   - 工具调用
     │   - 数据处理
     │   - 多步骤分析
     │
     ├─ 需要探索多种方案 ─────────────────▶ ToT/LATS
     │   - 创意任务
     │   - 复杂规划问题
     │   - 需要回溯
     │
     └─ 需要实时调整策略 ─────────────────▶ ReAct + 规划
         - 交互式任务
         - 对话系统
         - 需要环境反馈
```

### 7.2 混合策略

**CoT + Planning 的结合**：使用 CoT 进行"推理"，然后将推理结果转化为"规划"执行。

```python
def cot_then_planning(task: str, llm, tools: dict):
    """
    CoT + Planning 混合策略
    1. 使用 CoT 进行推理和分析
    2. 将推理结果转化为可执行规划
    """
    # Phase 1: CoT 推理
    reasoning = llm.think(
        prompt=f"任务：{task}\n请详细分析这个任务，制定执行计划。",
        prompt_type="cot"
    )
    
    # Phase 2: 规划转化
    plan = llm.think(
        prompt=f"""
        基于以下推理过程，生成可执行的任务规划：
        
        推理过程：
        {reasoning}
        
        要求：
        1. 每个步骤必须指定具体的工具
        2. 明确步骤间的依赖关系
        3. 输出 JSON 格式
        """,
        prompt_type="planning"
    )
    
    # Phase 3: 执行规划
    return execute_plan(plan, tools)
```

---

## 8. 总结

### 8.1 核心要点

| 要点 | CoT | Planning |
|------|-----|----------|
| **本质** | 生成推理文本 | 生成任务图 |
| **目标** | 解释推理过程 | 指导任务执行 |
| **输出** | 自然语言 | 结构化数据 |
| **执行** | 不可直接执行 | 可直接执行 |
| **失败处理** | 无 | 重规划/回溯 |
| **灵活性** | 高 | 低 |
| **适用** | 推理/解释任务 | 执行/操作任务 |

### 8.2 关键洞察

1. **CoT 是"思考"，Planning 是"行动"**：CoT 回答"我应该怎么想"，Planning 回答"我应该怎么做"。

2. **两者可互补**：CoT 用于推理和分析，Planning 用于执行和监控。

3. **任务决定选择**：简单推理任务用 CoT，复杂执行任务用 Planning，需要探索的任务用 ToT/LATS。

4. **失败处理是关键差异**：Planning 的结构化特性使其能够系统性地处理失败，CoT 则缺乏这类机制。

---

## 参考文献

1. **CoT 原始论文**
   > Wei, J., Wang, X., Schuurmans, D., Bosma, M., Xia, F., Chi, E., ... & Zhou, D. (2022). *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*. NeurIPS 2022.
   > - arXiv: [2201.11903](https://arxiv.org/abs/2201.11903)

2. **Self-Consistency**
   > Wang, X., Wei, J., Schuurmans, D., Le, Q. V., Chi, E. H., & Zhou, D. (2023). *Self-Consistency Improves Chain of Thought Reasoning in Language Models*. ICLR 2023.
   > - arXiv: [2203.11171](https://arxiv.org/abs/2203.11171)

3. **Least-to-Most Prompting**
   > Zhou, D., Schärli, N., Hou, L., Wei, J., Scales, N., Wang, X., & Schuurmans, D. (2023). *Least-to-Most Prompting Enables Complex Reasoning in Large Language Models*. ICLR 2023.
   > - arXiv: [2205.10625](https://arxiv.org/abs/2205.10625)

4. **Tree of Thoughts**
   > Yao, S., Yu, D., Zhao, J., Shafran, I., Griffiths, T. L., Cao, Y., & Narasimhan, K. (2023). *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*. NeurIPS 2023.
   > - arXiv: [2305.10601](https://arxiv.org/abs/2305.10601)

5. **LATS**
   > Zhou, A., Yan, K., Shlapentokh-Rothman, M., Wang, H., & Wang, Y. (2024). *Language Agent Tree Search Unifies Reasoning, Acting and Planning in Language Models*.
   > - arXiv: [2310.04406](https://arxiv.org/abs/2310.04406)

6. **PlanBench**
   > Valmeekam, K., Kambhampati, S., et al. (2023). *PlanBench: A Benchmark for Planning and Reasoning in Language Models*.
   > - arXiv: [2306.17194](https://arxiv.org/abs/2306.17194)

7. **ReAct（作为对比参考）**
   > Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). *ReAct: Synergizing Reasoning and Acting in Language Models*. ICLR 2023.
   > - arXiv: [2210.03629](https://arxiv.org/abs/2210.03629)

---

*本文档为 LLM Agent 架构调研系列 Q2，深入剖析 CoT 与 Planning 的本质区别。*
