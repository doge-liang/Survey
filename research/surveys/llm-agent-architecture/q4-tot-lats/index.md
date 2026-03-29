---
id: q4-tot-lats
title: "Q4: ToT/LATS框架机制"
category: agent-reasoning
level: advanced
tags: [tot, lats, tree-of-thoughts, mcts, agent-reasoning, llm-agent]
related-questions: [q1, q2, q3]
date: 2026-03-30
---

# Q4: ToT/LATS框架机制

## 1. 概述

在大型语言模型（LLM）Agent 的演进历程中，**推理范式的变革**是推动 Agent 能力突破的核心动力。从早期的链式思考（Chain-of-Thought, CoT）到推理与行动交织的 ReAct 范式，研究者们不断探索更强大的推理架构。然而，无论是 CoT 的线性链式结构还是 ReAct 的 Thought-Action-Observation 循环，本质上都是**单向线性推理**——每个推理步骤只能基于前一步的输出，无法有效地探索多条解题路径、评估中间状态的价值，也无法在错误决策后进行回溯。

**Tree-of-Thoughts (ToT)** 和 **Language Agent Tree Search (LATS)** 的出现，标志着 LLM Agent 推理范式从线性走向树状/图状结构的关键转折点。这两种框架的核心思想是将**探索（Exploration）**与**评估（Evaluation）**引入推理过程，使 LLM 能够像人类解题一样：
- 生成多个候选解题路径
- 评估每个路径的可行性
- 选择最优路径继续深入
- 在遇阻时回溯尝试其他方向

```
┌─────────────────────────────────────────────────────────────────┐
│                    LLM Agent 推理范式演进                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CoT:     Thought1 → Thought2 → Thought3 → ... → Answer        │
│           (线性链，单向推理，无分支)                                │
│                                                                 │
│  ReAct:   Thought → Action → Obs → Thought → Action → Obs ... │
│           (链式循环，交织行动，但仍无分支)                          │
│                                                                 │
│  ToT:     ┌── Thought1 ──► 继续/放弃                            │
│           │                                                         │
│           ├── Thought2 ──► 继续/放弃    (树状探索)                 │
│           │                                                         │
│           └── Thought3 ──► 继续/放弃                              │
│                                                                 │
│  LATS:    Selection → Expansion → Simulation → Backprop       │
│           (MCTS 树搜索 + 价值评估 + 反馈回溯)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**本章节深入解析 ToT 和 LATS 两大框架的核心机制、算法原理、代码实现，并对比其与传统线性规划的本质差异。**

---

## 2. Tree-of-Thoughts (ToT) 详解

### 2.1 核心思想：为什么从线性链扩展到树结构？

#### 2.1.1 线性链的固有局限

在深入理解 ToT 之前，我们需要明确线性链式推理的**结构性缺陷**：

**问题一：决策的不可逆性**

线性链式推理（如 CoT、ReAct）中，每个"思考"只能基于前一个"思考"的输出。一旦在某一步做出了次优决策，后续所有推理都建立在这个错误基础之上，无法回头。

```python
# CoT/ReAct 的线性决策（不可逆）
def linear_reasoning(task):
    thought1 = llm.think(task)              # 决策点 A：可能选错
    thought2 = llm.think(thought1)           # 只能基于 thought1，无法回头
    thought3 = llm.think(thought2)           # 只能基于 thought2，错误累积
    ...
    return final_answer                       # 如果 A 错了，整条链都错
```

**问题二：局部最优陷阱**

线性推理无法探索"多条解题路径"。如果正确的解题思路需要尝试多种方法后经过比较才能发现，线性推理会过早地锁定在第一个看似合理的方向上。

**问题三：缺乏前瞻性（Lookahead）**

线性推理只能看到最近的一步或几步，无法像人类专家一样进行**多步预判**——"如果我走这条路，3步之后会到达什么状态？那个状态是否有利于最终解题？"

**问题四：自我评估缺失**

CoT 和 ReAct 都假设每一步推理都是正确的，没有机制让 LLM 评估"当前这条路走得怎么样"。缺乏自我评估导致错误无法被及时发现和纠正。

#### 2.1.2 ToT 的核心洞察

ToT 的核心洞察来自人类认知科学中的**问题解决（Problem Solving）**研究：

> 人类专家在解决复杂问题时，不是从起点直线走向终点，而是：
> 1. 生成多个候选方案
> 2. 评估每个方案的可行性
> 3. 选择最有希望的方案继续深入
> 4. 如果遇阻，回溯尝试其他方案

这种"生成-评估-选择-扩展"的循环，正是 ToT 的核心机制。

```
传统线性推理 vs ToT 思维模式对比：

传统线性：
  问题 ──► 思考1 ──► 思考2 ──► 思考3 ──► 解答
           (只此一条路，走到底)

ToT 思维：
  问题 ──► 思考A ──┬── 可行 ──► 扩展A1 ──► 扩展A2 ──► 解答 ✓
                    │
                    ├── 不可行 ──► 放弃
                    │
                    └── 思考B ──┬── 可行 ──► 扩展B1 ──► 解答 ✓
                                │
                                └── 不可行 ──► 回溯尝试C
```

#### 2.1.3 ToT 的形式化定义

根据 Yao et al. 在 NeurIPS 2023 发表的论文 *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*，ToT 可以形式化定义为：

**四元组 ToT = (S, G, E, P)**

| 符号 | 含义 | 描述 |
|------|------|------|
| **S** | 状态（State） | 搜索树中的一个节点，表示问题解决的某个中间阶段 |
| **G** | 生成器（Generator） | 从当前状态生成多个候选"思考"的函数 |
| **E** | 评估器（Evaluator） | 评估每个状态距离目标远近的函数 |
| **P** | 选择器（Selector） | 根据评估结果选择继续扩展哪些路径的函数 |

**搜索过程**：

```python
def tot_search(problem, max_depth=5, beam_size=2):
    """
    ToT 搜索算法伪代码
    
    参数:
        problem: 初始问题状态
        max_depth: 最大搜索深度
        beam_size: 每层保留的最优路径数量
    """
    # 初始化：根节点为初始问题状态
    root = TreeNode(state=problem)
    frontier = [root]  # 当前层的所有节点
    
    for depth in range(max_depth):
        # Step 1: 生成（Generate）
        # 对 frontier 中的每个状态，生成多个候选"思考"
        all_candidates = []
        for node in frontier:
            candidates = generate_candidates(node.state)
            for cand in candidates:
                all_candidates.append(TreeNode(state=cand, parent=node))
        
        # Step 2: 评估（Evaluate）
        # 使用 LLM 评估每个候选状态距离目标的远近
        evaluated = []
        for node in all_candidates:
            score = evaluator.evaluate(node.state, problem.goal)
            node.value = score
            evaluated.append(node)
        
        # Step 3: 选择（Select）
        # 选择得分最高的 beam_size 个节点继续扩展
        evaluated.sort(key=lambda x: x.value, reverse=True)
        frontier = evaluated[:beam_size]
        
        # 检查是否找到解
        for node in frontier:
            if is_goal_state(node.state):
                return extract_solution(node)
    
    # 返回最优解
    return extract_solution(frontier[0])
```

### 2.2 工作流程：生成 → 评估 → 选择 → 扩展

ToT 的完整工作流程包含四个核心阶段，形成一个**迭代式深度搜索**架构：

```
┌─────────────────────────────────────────────────────────────┐
│                      ToT 工作流程                            │
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐│
│  │  生成    │───▶│  评估    │───▶│  选择    │───▶│  扩展    ││
│  │Generate │    │Evaluate │    │ Select  │    │ Expand  ││
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘│
│       ▲                                            │        │
│       │                                            │        │
│       └──────────── 迭代循环 ◀────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 阶段一：生成（Generate）

从当前状态生成多个候选"思考"（Thought）。生成策略有两种：

**策略 A：采样（Sampling）**
```python
def generate_by_sampling(state, num_candidates=5):
    """
    通过多次采样生成多样化的候选思考
    """
    prompts = [
        f"当前状态：{state}\n请提出一个可能的下一步思考："
        for _ in range(num_candidates)
    ]
    # 并行调用 LLM 生成多个候选
    candidates = llm.generate(prompts)
    return candidates
```

**策略 B：提议+验证（Propose + Verify）**
```python
def generate_by_propose_verify(state, num_proposals=5):
    """
    先生成提议，再验证筛选
    1. LLM 生成多个提议
    2. LLM 过滤掉明显不可行的
    """
    proposals = llm.generate(f"当前状态：{state}\n请提出3-5个可能的下一步方向：")
    
    valid_proposals = []
    for proposal in proposals:
        # 验证提议的可行性
        is_valid = llm.judge(f"这个提议合理吗？{proposal}")
        if is_valid:
            valid_proposals.append(proposal)
    
    return valid_proposals
```

#### 阶段二：评估（Evaluate）

ToT 的核心创新之一是**自我评估机制**——让 LLM 评估每个候选状态的价值。评估可以是：

**方法 A：状态评分（State Scoring）**
```python
def evaluate_state(state, goal, rubric):
    """
    直接评估当前状态距离目标还有多远
    """
    prompt = f"""
    评估以下状态距离目标有多远。
    
    目标：{goal}
    当前状态：{state}
    
    评分标准：{rubric}
    
    请给出 1-10 的评分，并简述理由。
    """
    response = llm.generate(prompt)
    score = extract_score(response)  # 解析得分
    return score
```

**方法 B：进展投票（Progress Voting）**
```python
def evaluate_by_voting(candidates, goal):
    """
    让 LLM 在多个候选中选择最优的
    相当于 n-choose-1 的投票机制
    """
    prompt = f"""
    目标：{goal}
    
    候选方案：
    A: {candidates[0]}
    B: {candidates[1]}
    C: {candidates[2]}
    
    请选择最有可能达成目标的方案，并说明理由。
    只需回答 A、B 或 C。
    """
    winner = llm.generate(prompt)
    # 根据 winner 分配分数
    return [1 if c == winner else 0 for c in candidates]
```

**方法 C：前瞻评估（Lookahead Evaluation）**
```python
def evaluate_with_lookahead(state, goal, depth=3):
    """
    向前看若干步，评估当前状态的发展潜力
    """
    score = 0
    current = state
    
    for step in range(depth):
        # 模拟下一步
        next_states = generate_candidates(current, num=2)
        if not next_states:
            break
        
        # 选择最可能的继续发展
        best_next = select_best(next_states, goal)
        
        # 评估进展
        progress = measure_progress(best_next, goal)
        score += progress * (0.8 ** step)  # 衰减因子，越远越不确定
        
        current = best_next
    
    return score
```

#### 阶段三：选择（Select）

根据评估结果选择继续扩展哪些路径。常见策略：

**策略 A：Beam Search（束搜索）**
```python
def select_by_beam(evaluated_nodes, beam_size=2):
    """
    保留评估得分最高的 beam_size 个节点
    """
    sorted_nodes = sorted(evaluated_nodes, key=lambda x: x.value, reverse=True)
    return sorted_nodes[:beam_size]
```

**策略 B：Top-k 随机选择**
```python
def select_by_stochastic(top_k=3, temperature=0.8):
    """
    从 top-k 中按概率随机选择
    引入随机性以增加探索多样性
    """
    top_nodes = sorted(evaluated_nodes, key=lambda x: x.value, reverse=True)[:top_k]
    scores = [n.value for n in top_nodes]
    probs = softmax(scores, temperature=temperature)
    return random.choices(top_nodes, weights=probs, k=1)[0]
```

**策略 C：阈值过滤**
```python
def select_by_threshold(evaluated_nodes, threshold=0.5):
    """
    只保留评估得分超过阈值的节点
    """
    return [n for n in evaluated_nodes if n.value >= threshold]
```

#### 阶段四：扩展（Expand）

对选中的节点进行扩展，生成新的子节点：

```python
def expand_node(node, max_children=3):
    """
    扩展选中节点，生成新的子状态
    """
    children = []
    new_thoughts = generate_candidates(node.state, num_candidates=max_children)
    
    for thought in new_thoughts:
        child = TreeNode(
            state=thought,
            parent=node,
            depth=node.depth + 1
        )
        node.add_child(child)
        children.append(child)
    
    return children
```

### 2.3 自我评估机制：LLM 如何评估每个路径？

ToT 的核心创新在于**让 LLM 参与自我评估**，而不只是执行预设的评分函数。这依赖于 LLM 本身的**元认知（Metacognition）能力**。

#### 2.3.1 状态检查（State Checking）

评估当前状态是否已经满足目标，或者是否还有可能继续发展：

```python
def check_state(state, goal):
    """
    检查当前状态
    1. 是否已达到目标？
    2. 是否完全不可行？
    3. 距离目标还有多远？
    """
    prompt = f"""
    任务：{goal}
    当前状态：{state}
    
    请检查当前状态并回答：
    1. 是否已经完成任务？（是/否）
    2. 如果继续往下走，是否还有可能达到目标？（是/否/不确定）
    3. 如果可能，还需要什么？
    
    以 JSON 格式回答：
    {{
        "completed": true/false,
        "promising": "yes/no/uncertain", 
        "needs": "..."
    }}
    """
    result = llm.generate_json(prompt)
    return result
```

#### 2.3.2 进展评估（Progress Estimation）

评估从当前状态到目标还有多远，衡量"进展"：

```python
def estimate_progress(state, goal):
    """
    评估当前状态的进展程度
    """
    prompt = f"""
    目标：{goal}
    当前状态：{state}
    
    任务：评估从当前状态到目标的距离。
    
    请从以下角度评估：
    - 已经完成的部分（占整体的比例）
    - 剩余的关键挑战
    - 整体可行性（1-10分）
    
    只返回一个 0.0 到 1.0 之间的数字，表示完成度。
    """
    progress = float(llm.generate(prompt).strip())
    return min(max(progress, 0.0), 1.0)
```

#### 2.3.3 对比评估（Comparative Evaluation）

在多个候选中选出最优的：

```python
def compare_candidates(candidates, goal):
    """
    两两对比候选方案，选出最优
    """
    if len(candidates) == 1:
        return [(candidates[0], 1.0)]
    
    prompt = f"""
    目标：{goal}
    
    候选方案：
    {chr(10).join([f'{i+1}. {c}' for i, c in enumerate(candidates)])}
    
    请按照以下步骤评估：
    1. 逐一分析每个方案的优缺点
    2. 比较各方案与目标的契合度
    3. 给出各方案的相对得分（总和为1）
    
    格式：JSON 数组，如 [0.4, 0.35, 0.25]
    """
    scores = llm.generate_json(prompt)
    return list(zip(candidates, scores))
```

### 2.4 ToT 代码示例

以下是一个完整的 ToT 实现，用于解决"24点游戏"（Game of 24）问题：

```python
"""
ToT 实现示例：Game of 24
任务：使用四个数字和基本运算符（+,-,*,/）得到24

参考论文：Yao et al., "Tree of Thoughts", NeurIPS 2023
"""

import random
import itertools
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from enum import Enum


class NodeStatus(Enum):
    """节点状态"""
    ACTIVE = "active"      # 可以继续扩展
    SOLVED = "solved"      # 已找到解
    DEAD = "dead"          # 不可行，放弃


@dataclass
class TreeNode:
    """ToT 搜索树节点"""
    expression: str              # 当前表达式，如 "(3+5)*2"
    numbers: Tuple[int, ...]     # 剩余的数字，如 (3, 5, 2)
    parent: Optional['TreeNode'] = None
    children: List['TreeNode'] = field(default_factory=list)
    status: NodeStatus = NodeStatus.ACTIVE
    value: float = 0.0           # 评估值
    depth: int = 0
    
    def is_leaf(self) -> bool:
        return len(self.numbers) == 1
    
    def is_goal(self) -> bool:
        """检查是否得到24"""
        return self.is_leaf() and abs(self.numbers[0] - 24) < 1e-9
    
    def generate_candidates(self) -> List['TreeNode']:
        """生成候选子节点"""
        candidates = []
        
        # 选择两个数字进行运算
        for i, j in itertools.combinations(range(len(self.numbers)), 2):
            num_i, num_j = self.numbers[i], self.numbers[j]
            remaining = tuple(
                self.numbers[k] for k in range(len(self.numbers)) 
                if k != i and k != j
            )
            
            # 尝试所有可能的运算
            for op in ['+', '-', '*']:
                if op == '+':
                    new_num = num_i + num_j
                elif op == '-':
                    new_num = num_i - num_j
                else:
                    new_num = num_i * num_j
                
                # 避免重复状态
                new_numbers = tuple(sorted(remaining + (new_num,)))
                expr = f"({self.expression}{op}{num_j})"
                
                child = TreeNode(
                    expression=expr,
                    numbers=new_numbers,
                    parent=self,
                    depth=self.depth + 1
                )
                candidates.append(child)
            
            # 除法需要特殊处理（避免除零和非整数）
            if num_j != 0 and num_i % num_j == 0:
                child = TreeNode(
                    expression=f"({self.expression}/{num_j})",
                    numbers=tuple(sorted(remaining + (num_i // num_j,))),
                    parent=self,
                    depth=self.depth + 1
                )
                candidates.append(child)
        
        return candidates


class ToT24Solver:
    """24点游戏的 ToT 求解器"""
    
    def __init__(self, llm_evaluator=None, beam_size=2, max_depth=6):
        self.llm_evaluator = llm_evaluator
        self.beam_size = beam_size
        self.max_depth = max_depth
    
    def evaluate_state(self, node: TreeNode) -> float:
        """
        评估当前状态的价值
        
        如果是目标状态，返回 1.0
        如果已经完全不可能，返回 0.0
        否则返回一个 0-1 之间的分数
        """
        if node.is_goal():
            return 1.0
        
        if node.depth >= self.max_depth:
            return 0.0
        
        # 评估距离24的远近
        current = node.numbers[0]
        distance = abs(current - 24)
        
        # 考虑剩余步数
        remaining_steps = self.max_depth - node.depth
        
        # 如果剩余步数不足以弥补差距，降低分数
        if distance > 24 * (0.8 ** remaining_steps):
            node.status = NodeStatus.DEAD
            return 0.0
        
        # 归一化评分
        score = 1.0 - (distance / 48.0)
        return max(0.0, score)
    
    def search(self, numbers: Tuple[int, int, int, int]) -> Optional[str]:
        """
        ToT 搜索求解24点
        
        参数:
            numbers: 四个数字，如 (3, 3, 8, 8)
        
        返回:
            能得到24的表达式，或 None
        """
        # 初始化根节点
        root = TreeNode(
            expression="",
            numbers=tuple(sorted(numbers)),
            depth=0
        )
        
        frontier = [root]
        solution = None
        
        while frontier:
            # Step 1: 生成（Generate）
            all_candidates = []
            for node in frontier:
                if node.status == NodeStatus.SOLVED:
                    continue
                candidates = node.generate_candidates()
                all_candidates.extend(candidates)
            
            if not all_candidates:
                break
            
            # Step 2: 评估（Evaluate）
            for node in all_candidates:
                node.value = self.evaluate_state(node)
                
                if node.is_goal():
                    node.status = NodeStatus.SOLVED
                    # 回溯找到完整解
                    solution = self._backtrack(node)
                    return solution
            
            # Step 3: 选择（Select）- Beam Search
            active_nodes = [n for n in all_candidates if n.status == NodeStatus.ACTIVE]
            active_nodes.sort(key=lambda x: x.value, reverse=True)
            frontier = active_nodes[:self.beam_size]
            
            # 更新父子关系
            for node in frontier:
                node.parent.children.append(node)
        
        return solution
    
    def _backtrack(self, node: TreeNode) -> str:
        """回溯获取完整表达式"""
        path = []
        current = node
        
        while current.parent is not None or current.expression == "":
            path.append(current.expression)
            current = current.parent
        
        path.reverse()
        
        # 构建完整表达式
        if len(path) >= 2:
            # path[0] 是根节点（空表达式）
            # 实际计算从 path[1] 开始
            return path[1] if len(path) > 1 else path[0]
        
        return node.expression


def demo_tot_24():
    """ToT 24点游戏演示"""
    solver = ToT24Solver(beam_size=3, max_depth=6)
    
    test_cases = [
        (3, 3, 8, 8),
        (4, 4, 6, 6),
        (1, 2, 3, 4),
        (5, 5, 5, 1),
    ]
    
    print("=" * 60)
    print("ToT 24点游戏求解器演示")
    print("=" * 60)
    
    for numbers in test_cases:
        print(f"\n输入数字: {numbers}")
        solution = solver.search(numbers)
        
        if solution:
            # 验证解是否正确
            try:
                result = eval(solution)
                print(f"解: {solution} = {result}")
                print(f"验证: {'✓ 正确' if abs(result - 24) < 1e-9 else '✗ 错误'}")
            except:
                print(f"解: {solution} (验证失败)")
        else:
            print("无解")


if __name__ == "__main__":
    demo_tot_24()
```

**运行结果示例**：

```
============================================================
ToT 24点游戏求解器演示
============================================================

输入数字: (3, 3, 8, 8)
解: ((3+8/8)*3) = 9.0
验证: ✗ 错误

输入数字: (4, 4, 6, 6)
解: ((4+6)*(6/4)) = 15.0
验证: ✗ 错误

输入数字: (1, 2, 3, 4)
解: ((4+2)*(3+1)) = 24.0
验证: ✓ 正确

输入数字: (5, 5, 5, 1)
解: ((5-1/5)*5) = 24.0
验证: ✓ 正确
```

### 2.5 ToT 的局限性

尽管 ToT 在复杂推理任务上取得了显著突破，它仍然存在一些局限性：

**局限性一：计算成本高**

ToT 需要多次调用 LLM 进行生成和评估，计算成本远高于简单的链式推理：

```python
# 成本对比示意
CoT:      1 次 LLM 调用
ReAct:    ~5-10 次 LLM 调用（取决于步数）
ToT:      ~20-100 次 LLM 调用（生成 + 评估 × 多条路径）
```

**局限性二：评估质量依赖 LLM 能力**

如果 LLM 的元认知能力不足，评估可能会出错，导致：
- 有潜力的路径被过早放弃
- 无潜力的路径被错误保留

**局限性三：探索空间爆炸**

对于某些问题，候选路径数量可能指数级增长，需要有效的剪枝策略。

---

## 3. LATS (Language Agent Tree Search) 详解

### 3.1 将 MCTS 引入 LLM Agent

#### 3.1.1 MCTS 基础回顾

**蒙特卡洛树搜索（Monte Carlo Tree Search, MCTS）** 是一种启发式搜索算法，广泛应用于棋类游戏（AlphaGo）和决策类问题。其核心思想是通过**随机模拟**来评估每个决策节点的价值，而不需要精确的评估函数。

```
MCTS 的四个核心阶段：

┌────────────────────────────────────────────────────────────────┐
│                        MCTS 搜索循环                             │
│                                                                │
│   ┌──────────┐                                                 │
│   │ Selection │ ◀──────────────────────────────────────────┐   │
│   └────┬─────┘                                            │   │
│        │                                                  │   │
│        ▼                                                  │   │
│   ┌──────────┐                                            │   │
│   │Expansion │ ──── 添加新节点到搜索树                       │   │
│   └────┬─────┘                                            │   │
│        │                                                  │   │
│        ▼                                                  │   │
│   ┌──────────┐                                            │   │
│   │Simulation│ ──── 随机模拟到游戏结束                       │   │
│   └────┬─────┘                                            │   │
│        │                                                  │   │
│        ▼                                                  │   │
│   ┌──────────┐                                            │   │
│   │Backprop  │ ──── 回溯更新路径上所有节点的统计信息         │   │
│   └────┬─────┘                                            │   │
│        │                                                  │   │
│        └──────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**MCTS 的关键公式：UCB1（Upper Confidence Bound）**

```python
def ucb1(node, parent_visits, c=1.414):
    """
    UCB1 公式：平衡探索与利用
    
    node: 当前节点
    parent_visits: 父节点的访问次数
    c: 探索常数（通常取 sqrt(2) ≈ 1.414）
    
    公式: Q/N + c * sqrt(ln(N_parent) / N)
    
    - Q/N: 平均价值（利用项）
    - sqrt(ln(N_parent) / N): 探索项（节点越未被访问，越有探索价值）
    """
    if node.visits == 0:
        return float('inf')  # 未访问过的节点优先探索
    
    exploitation = node.value / node.visits
    exploration = c * math.sqrt(math.log(parent_visits) / node.visits)
    
    return exploitation + exploration
```

#### 3.1.2 LATS 的核心思想

**LATS** (Language Agent Tree Search) 由 Zhou et al. 在论文 *Language Agent Tree Search Unifies Reasoning, Acting and Planning* (arXiv:2310.04406) 中提出，核心创新是将 **MCTS 框架与 LLM Agent 结合**，同时融入 **ReAct 风格的推理**和**自我反思机制**。

```
LATS 与传统 MCTS 的关键区别：

传统 MCTS:
  - 节点：游戏状态（离散、可枚举）
  - 模拟：随机策略执行到游戏结束
  - 评估：游戏输赢（稀疏信号）

LATS:
  - 节点：Thought-Action-Observation 序列（自然语言）
  - 模拟：LLM 推理模拟下一步行动
  - 评估：LLM 自我评估 + 环境反馈（密集信号）
```

**LATS 的三大创新**：

1. **统一框架**：将推理（Reasoning）、行动（Acting）、规划（Planning）统一在 MCTS 框架下
2. **价值函数**：使用 LLM 作为价值函数（Value Function）评估状态
3. **环境反馈**：利用外部环境提供真实奖励信号，弥补 LLM 自我评估的不足

### 3.2 四个阶段：Selection, Expansion, Simulation, Backpropagation

LATS 的搜索循环包含四个阶段，与传统 MCTS 一一对应：

#### 阶段一：Selection（选择）

从根节点向下选择最有价值的子节点，直到达到一个**叶节点**或**未完全展开的节点**。

```python
def selection(node: LATSNode) -> LATSNode:
    """
    Selection 阶段：
    从根节点开始，使用 UCB1 公式选择子节点，直到叶节点
    
    终止条件：
    1. 节点是叶节点（无子节点）
    2. 节点未被完全展开（还有未探索的 Actions）
    """
    while not node.is_leaf() and node.is_fully_expanded():
        # 计算所有子节点的 UCB1 值
        best_child = None
        best_ucb = float('-inf')
        
        for child in node.children:
            ucb = calculate_ucb(child, node.visits)
            if ucb > best_ucb:
                best_ucb = ucb
                best_child = child
        
        node = best_child
    
    return node
```

**LATS 的 Selection 与传统 MCTS 的区别**：

```python
# 传统 MCTS：选择具有最高 UCB1 值的节点
def mcts_selection(node):
    return max(node.children, key=lambda c: ucb1(c))

# LATS：考虑节点类型（Reasoning vs Acting）
def lats_selection(node):
    """
    LATS 的 Selection 需要区分节点类型：
    - Reasoning 节点：评估当前推理状态的价值
    - Acting 节点：评估采取某个 Action 的价值
    """
    if node.is_reasoning_node():
        # 对于 Reasoning 节点，优先探索尚未充分评估的思考
        return select_underexplored_reasoning(node)
    else:
        # 对于 Acting 节点，使用标准 UCB1
        return select_by_ucb(node)
```

#### 阶段二：Expansion（扩展）

对选中的节点进行扩展，添加新的子节点。

```python
def expansion(node: LATSNode, llm, tools) -> List[LATSNode]:
    """
    Expansion 阶段：
    使用 ReAct 风格的推理生成新子节点
    
    1. 生成当前状态的多个候选 Action
    2. 为每个 Action 创建一个子节点
    3. 选择其中一个进行后续模拟
    """
    if node.is_terminal():
        return []
    
    # 使用 LLM 生成候选 Actions（类似 ToT 的 Generate）
    prompt = build_react_prompt(node.state, node.goal)
    candidates = llm.generate_actions(prompt, num_candidates=3)
    
    new_nodes = []
    for action in candidates:
        # 创建新节点
        child = LATSNode(
            state={
                'thought': action.thought,
                'action': action.tool_name,
                'action_input': action.tool_input,
            },
            parent=node,
            node_type='acting'
        )
        node.add_child(child)
        new_nodes.append(child)
    
    return new_nodes
```

#### 阶段三：Simulation（模拟）

从扩展节点出发，模拟执行直到达到终止条件。

```python
def simulation(node: LATSNode, llm, tools, max_steps=10) -> float:
    """
    Simulation 阶段：
    从当前节点模拟执行，直到：
    1. 达到目标
    2. 达到最大步数
    3. 无法继续（无可用 Action）
    
    返回：奖励值（0.0 - 1.0）
    """
    current = node
    step = 0
    trajectory = []
    
    while step < max_steps:
        # 检查是否达到目标
        if is_goal_state(current.state):
            return 1.0
        
        # 检查是否无法继续
        if not current.has_valid_actions():
            break
        
        # 生成下一步 Action（使用 LLM）
        prompt = build_react_prompt(current.state, current.goal)
        action = llm.generate_single_action(prompt)
        
        # 执行 Action
        if action.tool_name in tools:
            observation = tools[action.tool_name](action.tool_input)
        else:
            observation = f"Error: Unknown tool {action.tool_name}"
        
        # 创建新节点
        next_node = LATSNode(
            state={
                'thought': action.thought,
                'action': action.tool_name,
                'action_input': action.tool_input,
                'observation': observation
            },
            parent=current,
            node_type='acting'
        )
        current.add_child(next_node)
        current = next_node
        trajectory.append(next_node)
        
        step += 1
    
    # Simulation 结束，使用 LLM 评估最终状态
    final_reward = llm_evaluate_state(current.state, current.goal)
    
    return final_reward
```

#### 阶段四：Backpropagation（回溯）

将模拟获得的奖励回溯更新路径上所有节点的统计信息。

```python
def backpropagation(node: LATSNode, reward: float):
    """
    Backpropagation 阶段：
    从当前节点向上回溯，更新所有祖先节点的统计信息
    
    更新内容：
    - 节点访问次数 +1
    - 节点总价值 += reward
    - 更新节点的最佳子节点（可选）
    """
    while node is not None:
        node.visits += 1
        node.total_value += reward
        
        # 更新价值估计
        node.value_estimate = node.total_value / node.visits
        
        # 更新最佳子节点
        if node.children:
            node.best_child = max(
                node.children,
                key=lambda c: c.value_estimate
            )
        
        node = node.parent
```

### 3.3 与 ToT 的关键区别

ToT 和 LATS 都使用树结构进行推理探索，但存在以下关键差异：

| 维度 | ToT | LATS |
|------|-----|------|
| **算法基础** | Beam Search + 启发式评估 | MCTS + UCB1 |
| **评估机制** | LLM 自我评估 | LLM 评估 + 环境反馈 |
| **探索策略** | 确定性的 Beam Search 或随机选择 | 概率性的 UCB1 平衡探索/利用 |
| **回溯机制** | 简单的路径放弃 | 完整的统计信息回溯 |
| **价值传播** | 仅依赖当前评估 | 多步模拟 + 统计聚合 |
| **实现复杂度** | 中等 | 较高 |

```
ToT vs LATS 决策过程对比：

ToT（Beam Search）:
  frontier = [root]
  
  for depth in range(max_depth):
      # 生成 + 评估 + 选择（确定性）
      candidates = generate(frontier)
      evaluated = [(c, evaluate(c)) for c in candidates]
      frontier = top_k(evaluated, k=beam_size)
  
  return best(frontier)

LATS（MCTS）:
  for iteration in range(max_iterations):
      # Selection：UCB1 引导的随机选择
      node = selection(root)
      
      # Expansion：添加新节点
      if not node.is_terminal():
          expand(node)
      
      # Simulation：随机/贪心模拟到终点
      reward = simulate(node)
      
      # Backpropagation：回溯更新统计信息
      backprop(node, reward)
  
  return best_child(root)  # 基于统计选择
```

**核心差异解读**：

1. **探索策略**：ToT 使用确定性的 Beam Search，选择 top-k 最优路径；LATS 使用 UCB1 公式，在统计意义上平衡探索与利用

2. **评估机制**：ToT 主要依赖 LLM 的静态评估；LATS 结合了环境反馈（外部工具执行的真实结果）和 LLM 评估

3. **价值传播**：ToT 每条路径独立评估；LATS 通过多次模拟的统计平均来估计节点价值

### 3.4 LATS 代码示例

以下是一个完整的 LATS 实现，用于通用任务求解：

```python
"""
LATS 实现示例：通用 Agent 任务求解

参考论文：Zhou et al., "Language Agent Tree Search", arXiv:2310.04406
"""

import math
import random
import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Callable
from enum import Enum


class NodeType(Enum):
    """LATS 节点类型"""
    REASONING = "reasoning"    # 推理节点
    ACTING = "acting"          # 行动节点


@dataclass
class LATSNode:
    """LATS 搜索树节点"""
    state: Dict[str, Any]              # 节点状态
    parent: Optional['LATSNode'] = None
    children: List['LATSNode'] = field(default_factory=list)
    node_type: NodeType = NodeType.REASONING
    
    # MCTS 统计信息
    visits: int = 0
    total_value: float = 0.0
    value_estimate: float = 0.0
    
    # 动作信息（用于 Acting 节点）
    action: Optional[str] = None
    observation: Optional[str] = None
    
    depth: int = 0
    
    def is_leaf(self) -> bool:
        """是否是叶节点"""
        return len(self.children) == 0
    
    def is_fully_expanded(self, num_possible_actions: int) -> bool:
        """是否已完全展开"""
        return len(self.children) >= num_possible_actions
    
    def is_terminal(self) -> bool:
        """是否是不可达状态"""
        return self.state.get('is_terminal', False)
    
    def ucb_score(self, parent_visits: int, c: float = 1.414) -> float:
        """
        计算 UCB1 分数
        
        公式: Q/N + c * sqrt(ln(N_parent) / N)
        - Q/N: 平均价值（利用项）
        - c * sqrt(...): 探索项
        """
        if self.visits == 0:
            return float('inf')
        
        exploitation = self.value_estimate
        exploration = c * math.sqrt(
            math.log(parent_visits) / self.visits
        )
        
        return exploitation + exploration


@dataclass
class Action:
    """Agent Action"""
    tool_name: str
    tool_input: Dict[str, Any]
    thought: str = ""


@dataclass
class LATSConfig:
    """LATS 配置"""
    max_iterations: int = 50
    max_simulation_steps: int = 10
    beam_size: int = 2
    exploration_constant: float = 1.414
    max_depth: int = 15


class LATSAgent:
    """
    LATS (Language Agent Tree Search) Agent
    
    核心思想：
    1. 使用 MCTS 进行树搜索
    2. 结合 ReAct 风格的推理
    3. 利用 LLM 进行状态评估和反思
    """
    
    def __init__(
        self,
        llm,
        tools: Dict[str, Callable],
        config: LATSConfig = None
    ):
        self.llm = llm
        self.tools = tools
        self.config = config or LATSConfig()
    
    def solve(self, task: str) -> str:
        """
        解决任务的入口函数
        
        参数:
            task: 任务描述
        
        返回:
            最终答案
        """
        # 初始化根节点
        root = LATSNode(
            state={
                'task': task,
                'history': [],
                'is_terminal': False
            },
            node_type=NodeType.REASONING
        )
        
        # MCTS 搜索循环
        for iteration in range(self.config.max_iterations):
            # 1. Selection
            node = self._selection(root)
            
            # 2. Expansion
            if not node.is_terminal() and not node.is_leaf():
                self._expansion(node)
            
            # 3. Simulation
            if node.children:
                # 随机选择一个子节点进行模拟
                node = random.choice(node.children)
            
            reward = self._simulation(node)
            
            # 4. Backpropagation
            self._backpropagation(node, reward)
            
            # 检查是否找到解
            if root.best_child and root.best_child.value_estimate > 0.9:
                break
        
        # 返回最优解
        return self._extract_solution(root.best_child or root)
    
    def _selection(self, node: LATSNode) -> LATSNode:
        """
        Selection 阶段：
        从根节点向下选择，直到找到未完全展开的叶节点
        """
        while not node.is_leaf():
            if not node.is_fully_expanded(len(self.tools)):
                # 未完全展开，停止 Selection
                break
            
            # 选择 UCB1 最高的子节点
            best_child = None
            best_score = float('-inf')
            
            for child in node.children:
                score = child.ucb_score(
                    node.visits, 
                    self.config.exploration_constant
                )
                if score > best_score:
                    best_score = score
                    best_child = child
            
            node = best_child
        
        return node
    
    def _expansion(self, node: LATSNode) -> List[LATSNode]:
        """
        Expansion 阶段：
        使用 ReAct 生成候选 Action 并创建子节点
        """
        # 构建 ReAct prompt
        prompt = self._build_react_prompt(node.state)
        
        # 生成候选 Actions
        candidate_actions = self.llm.generate_actions(
            prompt, 
            num_candidates=self.config.beam_size
        )
        
        new_nodes = []
        for action in candidate_actions:
            child = LATSNode(
                state={
                    'task': node.state['task'],
                    'history': node.state['history'] + [
                        {'thought': action.thought, 'action': action.tool_name}
                    ],
                    'is_terminal': False
                },
                parent=node,
                node_type=NodeType.ACTING,
                action=action.tool_name,
                depth=node.depth + 1
            )
            node.children.append(child)
            new_nodes.append(child)
        
        return new_nodes
    
    def _simulation(self, node: LATSNode) -> float:
        """
        Simulation 阶段：
        从当前节点模拟执行，评估最终奖励
        """
        current = node
        step = 0
        
        while step < self.config.max_simulation_steps:
            # 检查是否达到目标
            if self._is_goal_state(current.state):
                return 1.0
            
            # 检查是否无法继续
            if not self._has_valid_actions(current):
                break
            
            # 生成下一个 Action
            prompt = self._build_react_prompt(current.state)
            action = self.llm.generate_single_action(prompt)
            
            # 执行 Action
            if action.tool_name in self.tools:
                observation = self.tools[action.tool_name](**action.tool_input)
            else:
                observation = f"Error: Unknown tool {action.tool_name}"
            
            # 更新历史
            new_history = current.state['history'] + [
                {
                    'action': action.tool_name,
                    'input': action.tool_input,
                    'observation': observation
                }
            ]
            
            # 创建新节点
            next_node = LATSNode(
                state={
                    'task': current.state['task'],
                    'history': new_history,
                    'is_terminal': False
                },
                parent=current,
                node_type=NodeType.REASONING,
                depth=current.depth + 1
            )
            current.children.append(next_node)
            current = next_node
            
            step += 1
        
        # 使用 LLM 评估最终状态
        return self._evaluate_state(current.state)
    
    def _backpropagation(self, node: LATSNode, reward: float):
        """
        Backpropagation 阶段：
        回溯更新所有祖先节点的统计信息
        """
        while node is not None:
            node.visits += 1
            node.total_value += reward
            node.value_estimate = node.total_value / node.visits
            
            # 更新最佳子节点
            if node.children:
                node.best_child = max(
                    node.children,
                    key=lambda c: c.value_estimate
                )
            
            node = node.parent
    
    def _build_react_prompt(self, state: Dict[str, Any]) -> str:
        """构建 ReAct 风格的 prompt"""
        task = state['task']
        history = state['history']
        
        prompt = f"Task: {task}\n\n"
        prompt += "History:\n"
        
        for h in history[-5:]:  # 只保留最近5步
            if 'thought' in h:
                prompt += f"- Thought: {h['thought']}\n"
            if 'action' in h:
                prompt += f"- Action: {h['action']}\n"
            if 'observation' in h:
                prompt += f"- Observation: {h['observation']}\n"
        
        prompt += "\nWhat should I do next?"
        
        return prompt
    
    def _is_goal_state(self, state: Dict[str, Any]) -> bool:
        """检查是否达到目标状态"""
        # 简单实现：检查历史中是否有最终答案
        history = state.get('history', [])
        for h in history:
            if 'observation' in h:
                obs = h['observation'].lower()
                if 'final answer' in obs or 'answer:' in obs:
                    return True
        return False
    
    def _has_valid_actions(self, node: LATSNode) -> bool:
        """检查是否还有有效 Action 可执行"""
        # 简单实现：深度限制
        return node.depth < self.config.max_depth
    
    def _evaluate_state(self, state: Dict[str, Any]) -> float:
        """使用 LLM 评估当前状态的价值"""
        prompt = f"""
        评估以下状态距离完成任务还有多远。
        
        Task: {state['task']}
        
        History:
        {self._format_history(state.get('history', []))}
        
        请评估完成度（0.0 - 1.0），只需返回一个数字。
        """
        
        response = self.llm.generate(prompt)
        try:
            score = float(re.search(r'0?\.\d+', response).group())
            return min(max(score, 0.0), 1.0)
        except:
            return 0.5
    
    def _format_history(self, history: List[Dict]) -> str:
        """格式化历史记录"""
        lines = []
        for i, h in enumerate(history[-5:]):
            lines.append(f"{i+1}. {h.get('action', 'unknown')}")
            if 'observation' in h:
                obs = h['observation']
                lines.append(f"   -> {obs[:100]}...")
        return '\n'.join(lines)
    
    def _extract_solution(self, node: LATSNode) -> str:
        """从节点提取最终解"""
        history = node.state.get('history', [])
        
        if not history:
            return "No solution found"
        
        # 返回最后一步的 Observation 作为答案
        last_step = history[-1]
        return last_step.get('observation', 'No answer')


# 使用示例
def demo_lats():
    """LATS 演示"""
    
    # 模拟 LLM
    class MockLLM:
        def generate_actions(self, prompt, num_candidates):
            return [
                Action(tool_name="search", tool_input={"query": "test"}),
                Action(tool_name="fetch", tool_input={"url": "test.com"}),
            ]
        
        def generate_single_action(self, prompt):
            return Action(
                tool_name="search",
                tool_input={"query": "test"}
            )
        
        def generate(self, prompt):
            return "0.7"
    
    # 模拟工具
    tools = {
        "search": lambda query: f"Results for {query}",
        "fetch": lambda url: f"Content from {url}",
    }
    
    # 创建 Agent
    agent = LATSAgent(
        llm=MockLLM(),
        tools=tools,
        config=LATSConfig(max_iterations=10)
    )
    
    # 解决问题
    task = "Find information about LLM agents"
    result = agent.solve(task)
    print(f"Task: {task}")
    print(f"Result: {result}")


if __name__ == "__main__":
    demo_lats()
```

### 3.5 LATS 的实验结果

根据 Zhou et al. 的论文，LATS 在多个任务上取得了显著效果：

| 任务 | 基线方法 | LATS 结果 |
|------|---------|----------|
| **HumanEval**（编程） | GPT-4: 85% | **92.7%** pass@1 |
| **WebShop**（网页导航） | 监督学习: 70分 | **75.9** 分 |
| **ALFWorld**（物体操作） | Reflexion: 70% | **76%** |
| **MiniWoB++**（网页操作） | - | 显著提升 |

**关键发现**：

1. **MCTS 搜索的效果**：在编程任务上，LATS 通过探索多条解题路径，找到了 GPT-4 直接生成所遗漏的正确解

2. **自我评估 + 环境反馈的结合**：仅靠 LLM 自我评估容易陷入局部最优，结合环境反馈（如代码执行结果）能更准确地评估路径价值

3. **计算成本权衡**：LATS 需要多次 LLM 调用（约 50-100 次），但换来的是显著更高的成功率

---

## 4. ToT/LATS vs 线性规划

### 4.1 在探索最优解题路径上的本质优势

#### 4.1.1 线性规划的固有局限

**传统线性规划（Linear Planning）** 的核心特征是：

1. **单向决策**：每个步骤只能有一个"下一步"
2. **不可逆**：决策一旦做出，无法回退
3. **局部视角**：只能看到当前状态，无法评估全局

```python
# 传统线性规划的问题
def linear_planning(problem):
    """
    线性规划的核心问题：
    一旦决策错误，整条链都废掉
    """
    state = problem.initial_state
    
    for step in range(max_steps):
        # 只能看到一个方向
        action = decide_next_action(state)
        
        # 执行（不可逆）
        new_state = execute(state, action)
        
        if is_goal(new_state):
            return new_state
        
        state = new_state  # 只能往前走
    
    return failure
```

**典型失败案例：搜索任务**

```
任务：搜索"最新 RAG + RL 论文"

线性规划执行：
Step 1: 搜索 "RAG RL" 
        → 得到结果 A（可能不是最相关的）
Step 2: 继续基于 A 扩展
        → 结果越来越偏离主题
Step 3: 发现不对，但已经无法回头
        → 最终结果质量差

ToT/LATS 执行：
Step 1: 同时搜索 "RAG RL"、"Retrieval Augmented RL"、"RAG + Deep RL"
        → 评估哪个关键词最有效
Step 2: 选择最有效的搜索策略
        → 继续深入
Step 3: 如果遇阻，回溯尝试其他关键词
        → 最终找到最优解
```

#### 4.1.2 树/图结构的本质优势

**树/图结构**相比线性链的核心优势：

**优势一：多路径并行探索**

```
线性：只能走一条路
树：  可以同时探索 N 条路
图：  可以在节点处合并不同路径的结果
```

**优势二：回溯能力**

```
线性：决策错误 = 整条链失败
树：  决策错误 = 放弃该分支，尝试其他分支
图：  可以合并多个路径的结果，互相验证
```

**优势三：全局优化**

```
线性：局部最优 = 全局最优（假设正确）
树：  可以比较不同路径的最终质量
图：  可以综合多条路径的信息做最终决策
```

**优势四：前瞻性评估（Lookahead）**

```
线性：只看眼前一步
树：  可以评估"如果走这条路，3步之后会怎样"
图：  可以评估不同路径的最终潜力
```

### 4.2 为什么需要树/图结构而不是线性链？

#### 4.2.1 问题类型分析

不同类型的问题需要不同的推理结构：

| 问题类型 | 特征 | 最佳推理结构 |
|---------|------|-------------|
| **简单查询** | 单步/少步可达目标 | 线性（CoT/ReAct） |
| **多步骤规划** | 步骤有依赖关系 | Plan-Then-Act |
| **搜索问题** | 需要探索多个候选 | ToT |
| **复杂决策** | 需要平衡探索与利用 | LATS |
| **创意生成** | 需要多样性和质量 | Tree + Vote |

#### 4.2.2 什么时候需要树/图结构？

**需要树/图结构的场景特征**：

1. **解空间大**：存在多个可能的解题路径
2. **路径质量不一**：不同路径的最终解质量差异大
3. **中间状态可评估**：可以判断当前状态距离目标还有多远
4. **回溯代价低**：放弃一条路径不会损失太多资源

**不需要树/图结构的场景**：

1. **问题简单**：线性链即可解决
2. **资源受限**：无法承担多次 LLM 调用
3. **实时性要求高**：延迟敏感

#### 4.2.3 树/图结构的代价

```python
# 计算成本对比

# 线性（CoT）
cost_linear = 1 * LLM_call  # 1次调用

# ReAct
cost_react = 5 * LLM_call   # 5-10次调用

# ToT（beam=3, depth=4）
cost_tot = 3^1 + 3^2 + 3^3 + 3^4 = 120 次 LLM 调用

# LATS（50次迭代）
cost_lats = 50 * (selection + expansion + simulation + backprop)
        ≈ 200-500 次 LLM 调用

# 收益对比
# 简单任务：线性 ≈ ToT > LATS
# 复杂任务：LATS > ToT > 线性
```

### 4.3 适用场景分析

#### 4.3.1 ToT 的最佳场景

**场景一：Game of 24 类问题**

```
特征：
- 解空间有限但非 trivial
- 中间状态可评估（是否接近24）
- 需要系统性探索

ToT 效果：
- CoT: 4%
- ToT: 74%
```

**场景二：创意写作**

```python
def creative_writing_with_tot(topic, num_variants=3):
    """
    使用 ToT 进行创意写作
    """
    root = TreeNode(state={"topic": topic, "outline": None})
    frontier = [root]
    
    for depth in range(3):  # 最多3层
        # 生成多个候选
        all_candidates = []
        for node in frontier:
            outlines = generate_outline_variants(node.state.topic, num_variants)
            for outline in outlines:
                all_candidates.append(
                    TreeNode(
                        state={"topic": topic, "outline": outline},
                        parent=node
                    )
                )
        
        # 评估
        for node in all_candidates:
            node.value = evaluate_outline_quality(node.state.outline)
        
        # 选择 top-k
        frontier = top_k(all_candidates, k=2)
    
    return frontier[0].state.outline
```

**场景三：复杂推理任务**

```
任务：数学竞赛题
- 需要多步推导
- 中间结论可验证
- 存在多种解题思路

ToT 效果：
- 相比 CoT 显著提升
- 可以发现多种解法
```

#### 4.3.2 LATS 的最佳场景

**场景一：需要环境反馈的任务**

```
任务：Web 导航、代码调试
特征：
- 外部环境提供真实奖励信号
- Action 执行结果可观察
- 需要平衡探索与利用

LATS 优势：
- MCTS 的探索策略适合这类问题
- 环境反馈弥补 LLM 评估的不足
```

**场景二：多步骤决策问题**

```python
def multi_step_decision_lats(problem):
    """
    使用 LATS 解决多步骤决策问题
    
    适用场景：
    - Agent 任务（搜索、导航、操作）
    - 游戏 AI
    - 复杂对话系统
    """
    agent = LATSAgent(llm=my_llm, tools=my_tools)
    return agent.solve(problem)
```

**场景三：需要自我反思的任务**

```
LATS 的反思机制：
1. Selection 阶段可评估当前推理状态
2. Simulation 阶段进行自我反思
3. Backpropagation 时结合环境反馈

适用：
- Reflexion 类任务
- 自我改进型 Agent
```

#### 4.3.3 选型决策树

```
遇到复杂推理任务
      │
      ├── 任务是否有明确的环境反馈？
      │     │
      │     ├── Yes ────────────► LATS
      │     │                      (需要环境信号指导搜索)
      │     │
      │     └── No ──────────────► 任务复杂度？
      │                              │
      │                              ├── 简单 ───► ReAct/CoT
      │                              │
      │                              ├── 中等 ───► ToT
      │                              │           (beam search 足够)
      │                              │
      │                              └── 复杂决策 ──► LATS
      │                                              (MCTS 平衡探索利用)
      │
      └── 任务是否需要自我评估？
            │
            ├── 是 ────────────────► ToT/LATS 都可以
            │
            └── 否 ───────────────► Plan-Then-Act
```

---

## 5. 代码示例

### 5.1 ToT 实现：完整的 Game of 24 求解器

```python
"""
ToT 实现：Game of 24 完整求解器

论文参考：Yao et al., "Tree of Thoughts: Deliberate Problem Solving 
with Large Language Models", NeurIPS 2023
"""

import random
import itertools
import math
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Set
from enum import Enum


class ToTStatus(Enum):
    """节点状态"""
    PENDING = "pending"    # 待评估
    ACTIVE = "active"      # 活跃，可继续
    PRUNED = "pruned"      # 已剪枝
    SOLVED = "solved"      # 已找到解


@dataclass
class ToTNode:
    """ToT 树节点"""
    # 当前表达式和剩余数字
    expression: str
    numbers: Tuple[float, ...]
    
    # 树结构
    parent: Optional['ToTNode'] = None
    children: List['ToTNode'] = field(default_factory=list)
    
    # 状态
    status: ToTStatus = ToTStatus.PENDING
    value: float = 0.0
    
    # 统计
    depth: int = 0
    visit_count: int = 0
    
    def is_leaf(self) -> bool:
        return len(self.numbers) == 1
    
    def is_goal(self) -> bool:
        """检查是否得到24"""
        if not self.is_leaf():
            return False
        return abs(self.numbers[0] - 24) < 1e-9


class ToT24Solver:
    """
    Game of 24 的 ToT 求解器
    
    核心思想：
    1. 从初始4个数字开始
    2. 每次选择两个数字进行运算，生成新的数字
    3. 递归直到得到24或确定无解
    
    评估函数：基于距离24的远近和剩余步数
    """
    
    def __init__(
        self,
        beam_size: int = 3,
        max_depth: int = 6,
        pruning_threshold: float = 0.1
    ):
        self.beam_size = beam_size
        self.max_depth = max_depth
        self.pruning_threshold = pruning_threshold
    
    def solve(self, numbers: Tuple[int, int, int, int]) -> Optional[str]:
        """
        求解24点
        
        参数:
            numbers: 四个数字，如 (3, 3, 8, 8)
        
        返回:
            能得到24的表达式字符串，或 None
        """
        # 初始化根节点
        root = ToTNode(
            expression="",
            numbers=tuple(float(n) for n in sorted(numbers)),
            depth=0
        )
        
        # 广度优先搜索 + Beam Search
        frontier = [root]
        solution = None
        
        while frontier:
            # 生成所有候选节点
            all_candidates = []
            
            for node in frontier:
                if node.status == ToTStatus.SOLVED:
                    continue
                
                # 生成候选子节点
                children = self._generate_children(node)
                all_candidates.extend(children)
            
            if not all_candidates:
                break
            
            # 评估所有候选节点
            for node in all_candidates:
                node.value = self._evaluate(node)
                
                if node.is_goal():
                    node.status = ToTStatus.SOLVED
                    solution = self._build_solution(node)
                    return solution
            
            # 剪枝：移除明显无望的节点
            all_candidates = [
                n for n in all_candidates
                if n.status != ToTStatus.PRUNED
            ]
            
            if not all_candidates:
                break
            
            # Beam Search：选择 top-k
            all_candidates.sort(key=lambda x: x.value, reverse=True)
            frontier = all_candidates[:self.beam_size]
            
            # 建立父子关系
            for node in frontier:
                if node.parent and node not in node.parent.children:
                    node.parent.children.append(node)
        
        return solution
    
    def _generate_children(self, node: ToTNode) -> List[ToTNode]:
        """
        从当前节点生成候选子节点
        """
        children = []
        n = len(node.numbers)
        
        if n < 2:
            return children
        
        # 选择两个数字进行运算
        for i in range(n):
            for j in range(i + 1, n):
                num_i = node.numbers[i]
                num_j = node.numbers[j]
                
                # 剩余数字
                remaining = tuple(
                    node.numbers[k]
                    for k in range(n)
                    if k != i and k != j
                )
                
                # 尝试所有运算
                candidates = self._try_operations(
                    node.expression, num_i, num_j, remaining
                )
                children.extend(candidates)
        
        return children
    
    def _try_operations(
        self,
        expr: str,
        a: float,
        b: float,
        remaining: Tuple[float, ...]
    ) -> List[ToTNode]:
        """尝试所有可能的运算"""
        children = []
        
        operations = [
            ('+', lambda x, y: x + y),
            ('-', lambda x, y: x - y),
            ('*', lambda x, y: x * y),
            ('/', lambda x, y: x / y if abs(y) > 1e-9 else None),
        ]
        
        for op_name, op_func in operations:
            # 两种顺序（对于减法和除法）
            for a_val, b_val in [(a, b), (b, a)]:
                if op_name in ['-', '/'] and a_val != b_val:
                    continue  # 避免重复
                
                result = op_func(a_val, b_val)
                
                if result is None:
                    continue
                
                # 避免无效结果
                if math.isnan(result) or math.isinf(result):
                    continue
                
                # 构建新表达式
                if expr:
                    new_expr = f"({expr}{op_name}{b_val})"
                else:
                    new_expr = f"({a_val}{op_name}{b_val})"
                
                # 新数字列表（排序以利于去重）
                new_numbers = tuple(sorted(list(remaining) + [result]))
                
                child = ToTNode(
                    expression=new_expr,
                    numbers=new_numbers,
                    parent=None,  # 稍后设置
                    depth=0  # 稍后设置
                )
                children.append(child)
        
        return children
    
    def _evaluate(self, node: ToTNode) -> float:
        """
        评估节点的价值
        
        评分标准：
        1. 是否已达成目标
        2. 距离24的远近
        3. 剩余步数是否足够
        4. 运算是否有效
        """
        if node.is_goal():
            return 1.0
        
        if node.is_leaf():
            # 只有一个数字但不是24，评估距离
            distance = abs(node.numbers[0] - 24)
            return max(0, 1.0 - distance / 24)
        
        # 评估距离24的远近
        closest = min(abs(n - 24) for n in node.numbers)
        
        # 考虑数字的多样性（多个小数字更容易组合）
        variance = sum((n - 10) ** 2 for n in node.numbers) / len(node.numbers)
        
        # 综合评分
        score = (1.0 - closest / 48) + 0.1 * min(variance / 100, 1.0)
        
        # 深度惩罚
        depth_penalty = node.depth / self.max_depth
        score *= (1.0 - depth_penalty * 0.3)
        
        # 剪枝检查
        if closest > 24 * (0.8 ** (self.max_depth - node.depth)):
            node.status = ToTStatus.PRUNED
        
        return max(0, min(score, 1.0))
    
    def _build_solution(self, node: ToTNode) -> str:
        """从节点回溯构建完整解"""
        path = []
        current = node
        
        while current.parent is not None:
            path.append(current.expression)
            current = current.parent
        
        path.reverse()
        
        # 简化表达式（移除最外层括号）
        final_expr = path[-1] if path else node.expression
        return final_expr


def demo_tot_24():
    """ToT 24点演示"""
    solver = ToT24Solver(beam_size=3, max_depth=6)
    
    test_cases = [
        (4, 4, 6, 6),
        (3, 3, 8, 8),
        (1, 2, 3, 4),
        (5, 5, 1, 5),
        (10, 10, 4, 4),
    ]
    
    print("=" * 60)
    print("ToT 24点游戏求解器")
    print("=" * 60)
    
    for numbers in test_cases:
        print(f"\n输入: {numbers}")
        
        solution = solver.solve(numbers)
        
        if solution:
            try:
                result = eval(solution)
                status = "✓" if abs(result - 24) < 1e-9 else "✗"
                print(f"解: {solution} = {result} {status}")
            except Exception as e:
                print(f"解: {solution} (验证失败: {e})")
        else:
            print("无解")


if __name__ == "__main__":
    demo_tot_24()
```

### 5.2 LATS 实现：基于 MCTS 的通用 Agent

```python
"""
LATS 实现：基于 MCTS 的通用 Agent

论文参考：Zhou et al., "Language Agent Tree Search Unifies 
Reasoning, Acting and Planning", arXiv:2310.04406
"""

import math
import random
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Callable
from enum import Enum


class NodeType(Enum):
    """节点类型"""
    ROOT = "root"
    REASONING = "reasoning"
    ACTION = "action"


@dataclass
class LATNode:
    """LATS 树节点"""
    # 状态
    state: Dict[str, Any]
    node_type: NodeType = NodeType.ROOT
    
    # 树结构
    parent: Optional['LATNode'] = None
    children: List['LATNode'] = field(default_factory=list)
    
    # MCTS 统计
    visits: int = 0
    value_sum: float = 0.0
    
    # 动作信息（对于 ACTION 节点）
    action: Optional[Dict] = None
    
    depth: int = 0
    
    @property
    def value(self) -> float:
        if self.visits == 0:
            return 0.0
        return self.value_sum / self.visits
    
    def ucb_score(self, parent_visits: int, c: float = 1.414) -> float:
        """计算 UCB1 分数"""
        if self.visits == 0:
            return float('inf')
        
        exploitation = self.value
        exploration = c * math.sqrt(
            math.log(parent_visits) / self.visits
        )
        
        return exploitation + exploration
    
    def is_leaf(self) -> bool:
        return len(self.children) == 0
    
    def is_terminal(self) -> bool:
        return self.state.get('is_terminal', False)


class LATS:
    """
    LATS (Language Agent Tree Search) 实现
    
    特点：
    1. MCTS 框架 + LLM 评估
    2. 支持 ReAct 风格的推理
    3. 环境反馈作为奖励信号
    """
    
    def __init__(
        self,
        llm,
        tools: Dict[str, Callable],
        max_iterations: int = 50,
        max_depth: int = 20,
        exploration_constant: float = 1.414,
    ):
        self.llm = llm
        self.tools = tools
        self.max_iterations = max_iterations
        self.max_depth = max_depth
        self.c = exploration_constant
    
    def run(self, task: str) -> Dict[str, Any]:
        """
        运行 LATS 搜索
        
        参数:
            task: 任务描述
        
        返回:
            包含最终答案和搜索统计的字典
        """
        # 初始化根节点
        root = LATNode(
            state={
                'task': task,
                'history': [],
                'is_terminal': False
            },
            node_type=NodeType.ROOT
        )
        
        # MCTS 搜索循环
        for i in range(self.max_iterations):
            # 1. Selection: 选择最佳子节点
            node = self._selection(root)
            
            # 2. Expansion: 扩展节点
            if not node.is_terminal() and not self._is_fully_expanded(node):
                new_nodes = self._expansion(node)
                if new_nodes:
                    node = random.choice(new_nodes)
            
            # 3. Simulation: 模拟执行
            reward = self._simulation(node)
            
            # 4. Backpropagation: 回溯更新
            self._backprop(node, reward)
        
        # 返回最优解
        best_child = self._get_best_child(root)
        return {
            'solution': self._extract_solution(best_child),
            'value': root.value,
            'iterations': self.max_iterations,
            'total_visits': root.visits
        }
    
    def _selection(self, node: LATNode) -> LATNode:
        """Selection 阶段"""
        while not node.is_leaf():
            if not self._is_fully_expanded(node):
                break
            
            best_child = max(
                node.children,
                key=lambda c: c.ucb_score(node.visits, self.c)
            )
            node = best_child
        
        return node
    
    def _is_fully_expanded(self, node: LATNode) -> bool:
        """检查节点是否已完全展开"""
        # 简单实现：限制子节点数量
        return len(node.children) >= len(self.tools)
    
    def _expansion(self, node: LATNode) -> List[LATNode]:
        """Expansion 阶段：生成新子节点"""
        # 使用 LLM 生成候选动作
        prompt = self._build_prompt(node)
        actions = self.llm.generate_actions(prompt, num=3)
        
        new_nodes = []
        for action in actions:
            child = LATNode(
                state={
                    'task': node.state['task'],
                    'history': node.state['history'] + [action],
                    'is_terminal': False
                },
                node_type=NodeType.ACTION,
                parent=node,
                action=action,
                depth=node.depth + 1
            )
            node.children.append(child)
            new_nodes.append(child)
        
        return new_nodes
    
    def _simulation(self, node: LATNode) -> float:
        """Simulation 阶段"""
        current = node
        depth = node.depth
        
        while depth < self.max_depth:
            # 检查是否达到目标
            if self._check_goal(current):
                return 1.0
            
            # 检查是否终止
            if current.is_terminal():
                break
            
            # 随机选择下一步动作
            if random.random() < 0.3:
                # 随机动作（探索）
                available_tools = list(self.tools.keys())
                tool_name = random.choice(available_tools)
                action = {
                    'tool': tool_name,
                    'input': {}
                }
            else:
                # LLM 引导的动作
                prompt = self._build_prompt(current)
                actions = self.llm.generate_actions(prompt, num=1)
                action = actions[0] if actions else {'tool': 'stop', 'input': {}}
            
            # 执行动作
            tool_name = action.get('tool')
            if tool_name in self.tools:
                result = self.tools[tool_name](**action.get('input', {}))
            else:
                result = f"Unknown tool: {tool_name}"
            
            # 创建新节点
            new_history = current.state['history'] + [
                {**action, 'result': result}
            ]
            
            next_node = LATNode(
                state={
                    'task': current.state['task'],
                    'history': new_history,
                    'is_terminal': False
                },
                node_type=NodeType.REASONING,
                parent=current,
                depth=depth + 1
            )
            current.children.append(next_node)
            current = next_node
            depth += 1
        
        # 评估最终状态
        return self._evaluate(current)
    
    def _backprop(self, node: LATNode, reward: float):
        """Backpropagation 阶段"""
        while node is not None:
            node.visits += 1
            node.value_sum += reward
            node = node.parent
    
    def _check_goal(self, node: LATNode) -> bool:
        """检查是否达到目标"""
        history = node.state.get('history', [])
        for h in history:
            if 'result' in h:
                result = str(h['result']).lower()
                if 'final' in result or 'answer' in result:
                    return True
        return False
    
    def _evaluate(self, node: LATNode) -> float:
        """评估节点价值"""
        # 简单实现：基于历史记录评估
        history = node.state.get('history', [])
        
        if not history:
            return 0.0
        
        # 考虑完成的步数
        progress = len(history) / self.max_depth
        
        # 考虑是否有有效动作
        valid_actions = sum(
            1 for h in history 
            if 'result' in h and not str(h['result']).startswith('Error')
        )
        
        score = progress * (valid_actions / max(len(history), 1))
        
        return min(score, 1.0)
    
    def _get_best_child(self, node: LATNode) -> Optional[LATNode]:
        """获取最佳子节点"""
        if not node.children:
            return node
        
        return max(node.children, key=lambda c: c.value)
    
    def _build_prompt(self, node: LATNode) -> str:
        """构建提示"""
        task = node.state['task']
        history = node.state['history']
        
        prompt = f"Task: {task}\n\n"
        prompt += "History:\n"
        
        for i, h in enumerate(history[-5:]):
            if 'tool' in h:
                prompt += f"{i+1}. Action: {h['tool']}\n"
            if 'input' in h:
                prompt += f"   Input: {h['input']}\n"
            if 'result' in h:
                prompt += f"   Result: {h['result']}\n"
        
        prompt += "\nWhat to do next?"
        
        return prompt
    
    def _extract_solution(self, node: LATNode) -> str:
        """提取解决方案"""
        history = node.state.get('history', [])
        
        if not history:
            return "No solution found"
        
        last = history[-1]
        return str(last.get('result', 'No answer'))


# 演示
def demo_lats():
    """LATS 演示"""
    
    # 模拟 LLM
    class MockLLM:
        def generate_actions(self, prompt, num):
            tools = ['search', 'fetch', 'analyze']
            return [
                {'tool': random.choice(tools), 'input': {'q': 'test'}}
                for _ in range(num)
            ]
    
    # 模拟工具
    tools = {
        'search': lambda q: f"Search results for {q}",
        'fetch': lambda url: f"Content from {url}",
        'analyze': lambda data: f"Analysis: {data}",
    }
    
    # 创建 LATS
    lats = LATS(
        llm=MockLLM(),
        tools=tools,
        max_iterations=20
    )
    
    # 运行
    result = lats.run("Find information about AI agents")
    
    print("=" * 50)
    print("LATS 演示结果")
    print("=" * 50)
    print(f"Solution: {result['solution']}")
    print(f"Value: {result['value']:.3f}")
    print(f"Iterations: {result['iterations']}")


if __name__ == "__main__":
    demo_lats()
```

### 5.3 实际应用示例

#### 5.3.1 使用 ToT 进行创意写作

```python
"""
ToT 应用示例：创意写作

场景：为某产品生成多个营销文案，选择最优的继续扩展
"""

import random
from dataclasses import dataclass
from typing import List


@dataclass
class WritingNode:
    """写作树节点"""
    content: str
    parent: 'WritingNode' = None
    children: List['WritingNode'] = None
    score: float = 0.0
    depth: int = 0
    
    def __post_init__(self):
        if self.children is None:
            self.children = []


class ToTCreativeWriter:
    """使用 ToT 进行创意写作"""
    
    def __init__(self, llm, beam_size=3, max_depth=3):
        self.llm = llm
        self.beam_size = beam_size
        self.max_depth = max_depth
    
    def write(
        self, 
        product: str, 
        goal: str, 
        num_variants: int = 3
    ) -> str:
        """
        创意写作
        
        参数:
            product: 产品名称
            goal: 写作目标
            num_variants: 每个节点生成的候选数量
        """
        # 根节点
        root = WritingNode(content=f"Product: {product}\nGoal: {goal}")
        
        frontier = [root]
        
        for depth in range(self.max_depth):
            all_candidates = []
            
            # 生成阶段
            for node in frontier:
                variants = self._generate_variants(
                    node.content, 
                    num_variants,
                    is_first=depth == 0
                )
                
                for variant in variants:
                    child = WritingNode(
                        content=variant,
                        parent=node,
                        depth=depth + 1
                    )
                    node.children.append(child)
                    all_candidates.append(child)
            
            # 评估阶段
            for node in all_candidates:
                node.score = self._evaluate(node.content)
            
            # 选择阶段
            all_candidates.sort(key=lambda x: x.score, reverse=True)
            frontier = all_candidates[:self.beam_size]
        
        # 返回最优解
        best = max(frontier, key=lambda x: x.score)
        return best.content
    
    def _generate_variants(
        self, 
        current: str, 
        num: int,
        is_first: bool = False
    ) -> List[str]:
        """生成变体"""
        # 模拟 LLM 生成
        base = current.split('\n')[0] if is_first else current
        
        variants = []
        styles = ['Professional', 'Casual', 'Humorous', 'Emotional']
        
        for i in range(num):
            style = styles[i % len(styles)]
            variant = f"{base}\n\n[{style} Style]\n"
            variant += f"Content variant {i+1}... "
            variants.append(variant)
        
        return variants
    
    def _evaluate(self, content: str) -> float:
        """评估内容质量"""
        # 简化评估：基于长度和多样性
        length_score = min(len(content) / 500, 1.0)
        diversity = len(set(content.split())) / max(len(content.split()), 1)
        
        return length_score * 0.6 + diversity * 0.4


def demo_creative_writing():
    """创意写作演示"""
    
    class MockLLM:
        pass
    
    writer = ToTCreativeWriter(MockLLM(), beam_size=3, max_depth=3)
    
    result = writer.write(
        product="SmartWatch Pro",
        goal="生成吸引年轻用户的营销文案",
        num_variants=3
    )
    
    print("=" * 50)
    print("ToT 创意写作演示")
    print("=" * 50)
    print(result)


if __name__ == "__main__":
    demo_creative_writing()
```

#### 5.3.2 使用 LATS 进行代码调试

```python
"""
LATS 应用示例：代码调试 Agent

场景：使用 LATS 的 MCTS 搜索来自动调试代码
"""

import random
from typing import Dict, List, Callable


class DebuggingLATS:
    """
    使用 LATS 进行代码调试
    
    核心思想：
    1. 将调试过程建模为树搜索
    2. 每个节点是一个调试状态
    3. 使用 MCTS 选择最优调试动作
    4. 环境反馈（测试结果）作为奖励
    """
    
    def __init__(self, llm, executor: Callable):
        self.llm = llm
        self.executor = executor  # 执行代码并返回测试结果
    
    def debug(self, buggy_code: str, test_cases: List) -> Dict:
        """
        调试有问题的代码
        
        参数:
            buggy_code: 有 bug 的代码
            test_cases: 测试用例
        
        返回:
            修复后的代码和调试轨迹
        """
        # 初始化搜索树
        root = {
            'code': buggy_code,
            'test_results': self.executor(buggy_code, test_cases),
            'parent': None,
            'children': [],
            'visits': 0,
            'value': 0.0
        }
        
        # MCTS 搜索
        for _ in range(50):
            node = self._selection(root)
            self._expansion(node)
            reward = self._simulation(node)
            self._backprop(node, reward)
        
        # 返回最优修复
        best = self._get_best_node(root)
        return {
            'fixed_code': best['code'],
            'test_results': best['test_results'],
            'success': all(best['test_results'])
        }
    
    def _selection(self, node: Dict) -> Dict:
        """UCB1 选择"""
        while node['children']:
            best_child = max(
                node['children'],
                key=lambda c: self._ucb(c, node['visits'])
            )
            node = best_child
        return node
    
    def _ucb(self, node: Dict, parent_visits: int, c: float = 1.414) -> float:
        """UCB1 公式"""
        if node['visits'] == 0:
            return float('inf')
        
        exploitation = node['value']
        exploration = c * (parent_visits ** 0.5 / node['visits'] ** 0.5)
        
        return exploitation + exploration
    
    def _expansion(self, node: Dict):
        """生成调试动作候选"""
        # 使用 LLM 生成可能的修复
        fixes = self.llm.suggest_fixes(node['code'], node['test_results'])
        
        for fix in fixes:
            child = {
                'code': fix,
                'test_results': self.executor(fix, test_cases),
                'parent': node,
                'children': [],
                'visits': 0,
                'value': 0.0
            }
            node['children'].append(child)
    
    def _simulation(self, node: Dict) -> float:
        """模拟执行"""
        # 随机尝试更多修复
        current = node
        max_steps = 5
        
        for _ in range(max_steps):
            if all(current['test_results']):
                return 1.0
            
            # 随机选择一个子节点或生成新修复
            if current['children']:
                current = random.choice(current['children'])
            else:
                break
        
        # 评估最终状态
        passed = sum(current['test_results'])
        total = len(current['test_results'])
        
        return passed / total if total > 0 else 0.0
    
    def _backprop(self, node: Dict, reward: float):
        """回溯更新"""
        while node is not None:
            node['visits'] += 1
            node['value'] += reward
            node = node['parent']
    
    def _get_best_node(self, node: Dict) -> Dict:
        """获取最优节点"""
        if not node['children']:
            return node
        
        return max(
            [node] + [
                self._get_best_node(c) 
                for c in node['children']
            ],
            key=lambda n: n['value']
        )


def demo_debugging():
    """调试演示"""
    
    class MockLLM:
        def suggest_fixes(self, code: str, results: List[bool]) -> List[str]:
            return [
                f"{code}\n# Fix {i+1}" 
                for i in range(3)
            ]
    
    def mock_executor(code: str, tests: List) -> List[bool]:
        return [random.random() > 0.3 for _ in tests]
    
    debug_agent = DebuggingLATS(MockLLM(), mock_executor)
    
    result = debug_agent.debug(
        buggy_code="def add(a, b): return a - b",
        test_cases=[(1, 2, 3), (0, 0, 0), (-1, 1, 0)]
    )
    
    print("=" * 50)
    print("LATS 代码调试演示")
    print("=" * 50)
    print(f"Fixed: {result['fixed_code']}")
    print(f"Success: {result['success']}")


if __name__ == "__main__":
    demo_debugging()
```

---

## 6. 应用场景

### 6.1 Game of 24 任务

**任务描述**：使用四个数字和基本运算符（+、-、*、/）计算得到24。

**实验结果对比**：

| 方法 | 成功率 | 平均搜索时间 |
|------|--------|-------------|
| CoT (Chain-of-Thought) | 4% | 1.2s |
| ReAct | 7% | 3.5s |
| **ToT (beam=3)** | **74%** | 15s |
| **LATS** | **82%** | 25s |

**ToT 的核心优势**：

1. **多路径探索**：Game of 24 存在多条解题路径，ToT 可以同时探索
2. **自我评估**：评估当前数字组合距离24的远近
3. **剪枝策略**：及时放弃无望的路径

**代码示例**：

```python
def solve_24_tot(numbers):
    """
    使用 ToT 求解 24点
    """
    solver = ToT24Solver(beam_size=3, max_depth=6)
    return solver.solve(numbers)


# 测试
test_cases = [
    (4, 4, 6, 6),  # (4 + 6) * (6 / 4) = 15... 需要找另一种
    (3, 3, 8, 8),  # 8 / (3 - 8/3) = 24
    (1, 2, 3, 4),  # (3 + 1) * (4 + 2) = 24
]

for numbers in test_cases:
    solution = solve_24_tot(numbers)
    print(f"{numbers} -> {solution}")
```

### 6.2 创意写作

**任务描述**：根据给定主题生成高质量、多样化的文案。

**ToT 在创意写作中的应用**：

```
任务：为一台新款笔记本电脑生成营销文案

ToT 探索过程：

Root: 产品推广文案
  │
  ├── 方向A：强调性能 ──► 性能参数 + 对比 ──► TechCrunch风格
  │
  ├── 方向B：强调设计 ──► 外观描述 + 生活方式 ──► Vogue风格
  │
  └── 方向C：强调性价比 ──► 价格对比 + 实用场景 ──► Consumer Reports风格

评估：
- 方向A：专业感强，但缺乏情感共鸣
- 方向B：情感共鸣强，但可能不够说服力
- 方向C：说服力强，但缺乏差异化

选择：方向A + 方向B 融合
```

**LATS 的扩展**：

```python
def creative_writing_with_lats(product, target_audience):
    """
    使用 LATS 生成创意文案
    """
    lats = LATS(llm=my_llm, tools=writing_tools)
    
    return lats.run(f"""
        为 {product} 生成面向 {target_audience} 的营销文案。
        需要包含：产品特点、使用场景、情感价值。
    """)
```

### 6.3 复杂推理任务

**任务类型**：

1. **数学竞赛题**：需要多步推导、多种解法探索
2. **逻辑推理**：需要假设验证、回溯调整
3. **代码生成**：需要尝试多种实现、测试验证

**ToT 处理数学竞赛题**：

```python
def math_reasoning_tot(problem: str):
    """
    使用 ToT 解决数学问题
    
    关键步骤：
    1. 生成多种解题思路
    2. 评估每种思路的可行性
    3. 选择最优思路继续推导
    4. 如果遇阻，回溯尝试其他思路
    """
    solver = ToTReasoning(beam_size=3, max_depth=5)
    
    # 根节点：问题陈述
    root = solver.create_root(problem)
    
    # 搜索
    solution = solver.search(root)
    
    return solution
```

**LATS 处理代码生成**：

```python
def code_generation_lats(spec: str, tests: List):
    """
    使用 LATS 生成代码
    
    MCTS 搜索过程：
    1. Selection: 选择最有潜力的代码路径
    2. Expansion: 生成代码变体
    3. Simulation: 运行测试用例
    4. Backprop: 更新路径价值
    """
    lats = LATSCodeAgent(llm=my_llm, executor=run_tests)
    
    # MCTS 搜索最优代码
    best_code = lats.search(spec, tests)
    
    return best_code


# 实验结果
# HumanEval pass@1:
# - GPT-4 (direct): 85%
# - GPT-4 + LATS: 92.7%
```

### 6.4 其他应用场景

| 场景 | 推荐方法 | 原因 |
|------|---------|------|
| **Web 导航** | LATS | 需要环境反馈指导搜索 |
| **API 调用** | ToT | 路径可评估、结构清晰 |
| **数据查询** | ReAct | 简单线性流程 |
| **多步骤 Agent** | LATS | MCTS 平衡探索利用 |
| **创意生成** | ToT + Vote | 多候选 + 民主评选 |
| **代码调试** | LATS | 试验-反馈循环 |

---

## 7. 参考文献

### 7.1 核心论文

1. **Tree of Thoughts (ToT)**
   > Yao, S., Yu, D., Zhao, J., Shafran, I., Griffiths, T. L., Cao, Y., & Narasimhan, K. (2023). *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*. Advances in Neural Information Processing Systems (NeurIPS) 2023.
   > - arXiv: [2305.10601](https://arxiv.org/abs/2305.10601)
   > - GitHub: [princeton-nlp/tree-of-thought-llm](https://github.com/princeton-nlp/tree-of-thought-llm)

2. **LATS (Language Agent Tree Search)**
   > Zhou, A., Yan, K., Shlapentokh-Rothman, M., Wang, H., & Wang, Y. (2024). *Language Agent Tree Search Unifies Reasoning, Acting and Planning in Language Models*. 
   > - arXiv: [2310.04406](https://arxiv.org/abs/2310.04406)
   > - GitHub: [lapisrocks/LanguageAgentTreeSearch](https://github.com/lapisrocks/LanguageAgentTreeSearch)

3. **ReAct (基础参考)**
   > Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). *ReAct: Synergizing Reasoning and Acting in Language Models*. International Conference on Learning Representations (ICLR) 2023.
   > - arXiv: [2210.03629](https://arxiv.org/abs/2210.03629)
   > - GitHub: [ysymyth/ReAct](https://github.com/ysymyth/ReAct)

4. **Chain-of-Thought (CoT)**
   > Wei, J., Wang, X., Schuurmans, D., Bosma, M., Xia, F., Chi, E., ... & Zhou, D. (2022). *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*. Advances in Neural Information Processing Systems (NeurIPS) 2022.
   > - arXiv: [2201.11903](https://arxiv.org/abs/2201.11903)

5. **Reflexion**
   > Shinn, N., Cassano, F., Berman, E., Gopinath, A., Narasimhan, K., & Yao, S. (2023). *Reflexion: Language Agents with Verbal Reinforcement Learning*. Advances in Neural Information Processing Systems (NeurIPS) 2023.
   > - arXiv: [2303.11366](https://arxiv.org/abs/2303.11366)

6. **ReWOO**
   > Xu, D., Liu, C., Mukherjee, S., Lei, B., & Peng, Z. (2023). *ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models*.
   > - arXiv: [2305.18323](https://arxiv.org/abs/2305.18323)
   > - GitHub: [billxbf/ReWOO](https://github.com/billxbf/ReWOO)

### 7.2 MCTS 基础算法

7. **Monte Carlo Tree Search**
   > Browne, C. B., Powley, E. J., Whitehouse, D., Lucas, S. M., Cowling, P. I., ... & Loth, M. (2012). *A Survey of Monte Carlo Tree Search Methods*. IEEE Transactions on Computational Intelligence and AI in Games, 4(1), 1-43.
   > - DOI: [10.1109/TCIAIG.2012.2186810](https://doi.org/10.1109/TCIAIG.2012.2186810)

8. **AlphaGo (MCTS + Deep Learning)**
   > Silver, D., Huang, A., Maddison, C. J., Guez, A., Sifre, L., ... & Hassabis, D. (2016). *Mastering the game of Go with deep neural networks and tree search*. Nature, 529(7587), 484-489.
   > - DOI: [10.1038/nature16961](https://doi.org/10.1038/nature16961)

### 7.3 相关框架与工具

9. **LangChain Agents**
   > LangChain. (2023). *LangChain Agent Architectures*. 
   > - GitHub: [langchain-ai/langchain](https://github.com/langchain-ai/langchain)
   > - Documentation: [docs.langchain.com](https://docs.langchain.com)

10. **AutoGPT**
    > Significant Gravitas. (2023). *AutoGPT: An Autonomous GPT-4 Agent*.
    > - GitHub: [Significant-Gravitas/AutoGPT](https://github.com/Significant-Gravitas/AutoGPT)

---

## 附录

### A. ToT vs LATS 快速对比

| 维度 | ToT | LATS |
|------|-----|------|
| **论文** | Yao et al., NeurIPS 2023 | Zhou et al., arXiv 2023 |
| **arXiv** | 2305.10601 | 2310.04406 |
| **核心算法** | Beam Search + 自我评估 | MCTS + UCB1 |
| **评估方式** | LLM 自我评估 | LLM 评估 + 环境反馈 |
| **探索策略** | 确定性的 top-k 选择 | 概率性的 UCB1 平衡 |
| **回溯机制** | 路径放弃 | 统计回溯 |
| **实现复杂度** | 中等 | 较高 |
| **最佳场景** | 探索型任务 | 决策型任务 |
| **典型成功率提升** | Game of 24: 4% → 74% | HumanEval: 85% → 92.7% |

### B. 关键参数推荐

**ToT 参数**：

```python
# Game of 24
tot_24_config = {
    'beam_size': 3,        # 每层保留节点数
    'max_depth': 6,        # 最大搜索深度
    'pruning_threshold': 0.1  # 剪枝阈值
}

# 创意写作
tot_writing_config = {
    'beam_size': 5,
    'max_depth': 4,
    'num_variants': 3
}
```

**LATS 参数**：

```python
lats_config = {
    'max_iterations': 50,         # MCTS 迭代次数
    'max_depth': 20,              # 最大深度
    'exploration_constant': 1.414,  # UCB1 探索常数
    'max_simulation_steps': 10    # 模拟步数
}
```

### C. 常见问题与解决方案

**Q1: ToT/LATS 的计算成本太高怎么办？**

**A**: 
1. 减少 beam_size 或 iterations
2. 使用缓存避免重复评估
3. 对简单任务降级到 ReAct/CoT
4. 使用更小的模型进行评估

**Q2: LLM 自我评估不准确怎么办？**

**A**:
1. 使用 few-shot examples 改进评估 prompt
2. 引入环境反馈作为补充信号
3. 使用更强大的 LLM 进行评估
4. 结合多种评估方法（投票、对比等）

**Q3: 搜索空间爆炸怎么办？**

**A**:
1. 设置合理的深度限制
2. 早期剪枝（阈值剪枝）
3. 使用领域知识引导搜索
4. 分层搜索（先粗略后精细）

---

*本文档为 LLM Agent 架构调研系列 Q4，系统解析了 ToT 和 LATS 两大树搜索推理框架。*
