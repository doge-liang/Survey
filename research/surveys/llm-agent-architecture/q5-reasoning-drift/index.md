---
id: q5-reasoning-drift
title: "Q5: 推理断层解决方案"
category: agent-reasoning
level: advanced
tags: [reasoning-drift, self-correction, prompt-engineering, agent]
related-questions: [q1, q2, q6]
date: 2026-03-30
---

# Q5: 推理断层解决方案

## 1. 概述

在大语言模型（LLM）Agent 系统在实际部署中，一个普遍但往往被忽视的问题是**推理断层（Reasoning Drift）**，也被称为**目标偏离（Goal Deviation）**或**结果与目标不一致（Result-Task Misalignment）**。这种现象发生在 Agent 在执行多步骤任务过程中，由于缺乏持续的自我监控和纠正机制，导致推理过程逐渐偏离原始目标，最终产出的结果与用户期望大相径庭。

推理断层是限制 LLM Agent 在复杂、长期任务中可靠性的核心瓶颈之一。与传统的软件系统不同，LLM Agent 的推理过程是隐式的、概率性的，且缺乏运行时类型检查和断言机制。当 Agent 在中间步骤做出错误假设或选择次优路径时，系统往往无法自动检测和纠正，而是将错误累积到最终输出中。

本文系统性地分析推理断层的定义、成因和表现，并从三个维度探讨主流解决方案：

| 解决维度 | 核心技术 | 代表工作 |
|----------|----------|----------|
| **提示工程** | System Prompt 设计、CoV、目标重述 | Chain-of-Verification、Self-Correct |
| **记忆机制** | 短期记忆、长期记忆、记忆管理 | MemGPT、Reflexion |
| **架构设计** | Supervisor 模式、分层控制、反射机制 | Reflexion、AutoGen、ChatDev |

理解这些解决方案的设计原理和适用场景，对于构建可靠的 LLM Agent 系统至关重要。

---

## 2. 问题定义与表现

### 2.1 什么是推理断层

**推理断层（Reasoning Drift）** 是指 LLM Agent 在执行复杂任务时，由于缺乏对原始目标的持续锚定，导致推理过程和最终结果逐渐偏离用户初始意图的现象。这一概念与**错误累积（Error Accumulation）**、**目标漂移（Goal Drift）**、**任务偏离（Task Deviation）**等术语密切相关，但侧重点略有不同：

- **错误累积**强调中间步骤的错误如何在后续步骤中被放大
- **目标漂移**强调 Agent 逐步遗忘或误解原始目标
- **推理断层**更强调推理链条的断裂或偏离

从本质上讲，推理断层是 LLM 作为推理引擎的**有限上下文窗口**与复杂任务的**长程依赖**之间的矛盾产物。Agent 必须在"完整保留任务上下文"和"有效利用有限上下文"之间取得平衡，而这一平衡在实践中往往难以维持。

### 2.2 为什么 LLM Agent 容易出现推理断层

LLM Agent 容易出现推理断层的原因是多方面的，涉及模型本身的特性以及系统设计的局限性：

#### 2.2.1 上下文窗口限制与信息衰减

LLM 的上下文窗口虽然已经大幅扩展（从 4K 到 128K tokens 甚至更多），但在处理超长任务时仍然面临挑战。更关键的是，即使信息在上下文中保持完整，LLM 对上下文中**不同位置信息的利用程度并不均匀**——越早出现的信息越容易被"遗忘"或"淡化"，这种现象被称为**上下文衰减（Context Decay）**。

```
任务：用户要求 Agent 分析一家公司近5年的财务数据并生成投资建议

上下文分布：
┌─────────────────────────────────────────────────────────────────────┐
│ [系统提示]  [用户原始问题]  [中间步骤1]  [中间步骤2]  ...  [当前步骤] │
│   早期           早期           中间          中间           近期       │
│                                                                  │
│  ←─── 信息利用率递减 ───→                         ↑              │
│                                              当前步骤能"看到"的信息
│                                              原始目标可能被稀释
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.2.2 缺乏内省机制

人类在执行复杂任务时会不断进行**元认知（Metacognition）**监控——"我目前做得怎么样？""我的方法是否正确？""我是否在正确的轨道上？"然而，LLM 本身并不具备这种内省能力。在标准的 ReAct 或 CoT 框架中，Agent 的"思考（Thought）"主要是为了生成下一个动作，而非评估当前状态与目标的一致性。

#### 2.2.3 概率性推理与错误传播

LLM 的推理本质上是概率性的——即使在相同的输入和系统提示下，不同的采样温度或随机种子可能导致截然不同的推理路径。当某个中间步骤的推理出现偏差时，这种偏差会通过后续的 Thought-Action-Observation 循环被**级联放大**，形成所谓的**错误传播（Error Propagation）**。

#### 2.2.4 工具调用的不确定性

LLM Agent 通常依赖外部工具（搜索 API、代码执行器、数据库查询等）来获取信息或执行操作。然而，工具返回的结果可能存在：
- **格式错误**：返回结果与预期结构不一致
- **内容偏差**：搜索结果与查询意图不完全匹配
- **部分失败**：工具调用超时或返回空结果

当 Agent 无法正确处理这些异常情况时，推理链条可能被迫走向错误的方向。

### 2.3 推理断层的具体表现示例

#### 示例 1：论文调研任务中的目标偏离

```
用户任务：调研近一年关于"大模型在代码生成中的安全漏洞检测"的研究论文

理想轨迹：
Step 1: 搜索 "LLM code generation security vulnerability detection"
Step 2: 筛选近一年（2025年3月-2026年3月）的论文
Step 3: 阅读每篇论文的方法和实验部分
Step 4: 对比各论文的贡献和创新点
Step 5: 总结发现并输出结构化报告

实际轨迹（发生推理断层）：
Step 1: 搜索 "LLM code generation"  ← 关键词过于宽泛
Step 2: 获得大量代码生成相关论文（未聚焦安全漏洞检测）
Step 3: Agent 开始阅读第一篇论文，发现是关于代码补全的
Step 4: "这篇论文很有趣，继续深入..."  ← 偏离原始目标
Step 5: 最终报告聚焦于代码补全，而非安全漏洞检测
```

#### 示例 2：数据分析任务中的累积误差

```
用户任务：分析某公司季度销售数据，找出增长最快的三个产品线

Agent 执行过程：
Step 1: 加载数据文件 sales_data.csv
Step 2: 计算各产品线季度增长率
Step 3: 由于数据中存在缺失值，Agent 决定"跳过"某些行  ← 首次误差
Step 4: 排序时使用文本排序而非数值排序              ← 二次误差
Step 5: 输出的"Top 3 产品线"与实际不符
```

#### 示例 3：对话式任务中的目标遗忘

```
用户（多轮对话）：
第一轮：Agent，帮我在 GitHub 上找 5 篇关于 RAG 的高星项目
第二轮：很好，现在帮我分析第一个项目的架构
第三轮：除了 RAG，这个项目还用到了哪些 AI 技术？
第四轮（推理断层）：Agent 错误地开始分析通用的代码托管功能，
                   遗忘了"AI 技术"这一筛选条件
```

### 2.4 推理断层的量化评估

虽然推理断层是定性描述的现象，但研究者已经开始尝试量化评估。以下是几个常用的评估维度：

| 评估维度 | 定义 | 测量方法 |
|----------|------|----------|
| **目标保持度** | 最终输出与原始目标的匹配程度 | 人工标注 / GPT-4 评分 |
| **步骤一致性** | 各步骤之间的逻辑连贯性 | 轨迹分析 |
| **任务完成率** | 成功完成所有子目标的比例 | 任务特定指标 |
| **错误恢复率** | Agent 能否在错误发生后自我纠正 | 轨迹回溯分析 |

---

## 3. 提示工程解决方案

提示工程是缓解推理断层的第一道防线，其核心思想是通过**精心设计的系统提示**和**结构化的推理模板**，引导 LLM Agent 保持对原始目标的持续关注，并在必要时进行自我纠正。

### 3.1 System Prompt 设计：任务强调与约束条件

System Prompt 是 LLM Agent 行为的核心驱动力。有效的 System Prompt 设计需要在三个层面进行优化：

#### 3.1.1 任务强调（Task Emphasis）

在 System Prompt 中明确强调任务的**核心目标**和**关键约束**，使 Agent 在每个推理步骤都能"看到"这些信息：

```python
SYSTEM_PROMPT_TASK_EMPHASIS = """
# 任务执行系统

## 你的角色
你是一个专业的研究助手，擅长分析和总结信息。

## 核心任务
{original_task}  # 用户原始任务应始终保持在上下文中

## 关键约束
1. **始终锚定原始目标**：在每个思考步骤中，问自己"我是否在推进原始目标？"
2. **拒绝次优路径**：如果某个行动不能直接服务于原始目标，不要执行它
3. **保持任务边界**：不要超出原始任务的范围（如未要求则不添加额外分析）

## 工作流程
1. 理解原始任务
2. 分解为可执行的子目标
3. 逐个完成子目标，期间持续检查是否与原始目标一致
4. 整合结果并验证是否满足原始任务要求

## 警告信号
如果发现自己：
- 正在处理原始任务中没有提到的内容
- 无法清楚说明当前步骤与原始任务的关系
- 花了超过 3 个步骤在同一个子问题上
请立即停下来，重新审视是否偏离了目标。
"""

def build_system_prompt(original_task: str) -> str:
    """构建强调任务目标的 System Prompt"""
    return SYSTEM_PROMPT_TASK_EMPHASIS.format(original_task=original_task)
```

#### 3.1.2 约束条件（Constraints Specification）

通过明确的约束条件，防止 Agent 在执行过程中"自由发挥"：

```python
SYSTEM_PROMPT_WITH_CONSTRAINTS = """
# 受约束的任务执行系统

## 任务定义
{original_task}

## 硬性约束（必须遵守，违反则任务失败）
1. **输出格式约束**：{output_format}
2. **范围约束**：{scope_constraints}
3. **质量约束**：{quality_requirements}

## 软性指导（建议遵守）
1. 每个动作前简单说明"这个动作将如何推进任务"
2. 完成后总结"我完成了什么，如何验证"

## 边界案例处理
- 如果无法完成某个子目标，**立即报告**而非尝试掩盖
- 如果需要额外信息，**明确请求**而非猜测
- 如果任务过于模糊，**在假设前先确认**
"""
```

#### 3.1.3 任务强调的最佳实践

根据经验，以下 System Prompt 设计原则对缓解推理断层最为有效：

| 原则 | 错误示例 | 正确示例 |
|------|----------|----------|
| **重复目标** | 只在开头提及一次目标 | 在每个推理步骤的提示中重复目标 |
| **具体而非抽象** | "做好分析" | "输出包含：1) 各产品线增长率 2) 同比/环比对比 3) 结论" |
| **可验证的标准** | "确保准确" | "所有数字必须与数据源一致，保留2位小数" |
| **边界明确** | "分析相关发现" | "只分析直接回答用户问题的内容，其他存疑待补充" |

### 3.2 Chain-of-Verification (CoV) 模式

**Chain-of-Verification（验证链，CoV）** 是由 Meta AI 研究团队在 2023 年提出的一种提示方法，旨在通过结构化的自我验证减少 LLM 的幻觉和错误。CoV 的核心思想是将"验证"作为一个独立的、显式的步骤纳入推理过程。

#### 3.2.1 CoV 的核心机制

CoV 包含四个主要阶段：

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Chain-of-Verification                         │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  初始   │───▶│  生成   │───▶│  验证   │───▶│  最终   │      │
│  │  响应   │    │  验证   │    │  计划   │    │  响应   │      │
│  │          │    │  问题   │    │  执行   │    │          │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│                                                                      │
│  阶段1: LLM 生成初始响应（可能包含错误）                               │
│  阶段2: LLM 生成针对响应中每个声明的验证问题                           │
│  阶段3: 独立执行验证（可通过工具或额外推理）                           │
│  阶段4: 基于验证结果生成修正后的最终响应                               │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.2.2 CoV 的 Prompt 模板

```python
CHAIN_OF_VERIFICATION_PROMPT = """
# Chain-of-Verification 任务执行模板

## 阶段 1：初始响应生成
基于以下任务生成初始响应：
任务：{original_task}

初始响应：
{initial_response}

## 阶段 2：生成验证问题
针对上述初始响应中的每个关键声明，生成具体的验证问题。
格式要求：
- 每个验证问题必须可以直接通过事实或逻辑检验来回答
- 避免模糊的评估问题（如"这合理吗？"），使用具体问题（如"X 是否大于 Y？"）

验证问题列表：
"""

def generate_verification_questions(initial_response: str, task: str) -> list[str]:
    """生成验证问题"""
    prompt = f"""
初始响应：
{initial_response}

任务：{task}

针对上述响应中的每个关键声明，列出 3-5 个具体的验证问题。
这些问题的答案应该是可验证的（是/否，或具体的事实/数字）。

输出格式：
1. [验证问题1]
2. [验证问题2]
...
"""
    response = llm.generate(prompt)
    return parse_questions(response)

def execute_verification(questions: list[str]) -> list[str]:
    """执行验证（可以是工具调用或额外推理）"""
    results = []
    for q in questions:
        # 方式1：使用工具验证（如搜索、计算）
        if requires_tool(q):
            result = execute_tool_verification(q)
        # 方式2：使用 LLM 推理验证
        else:
            result = llm.verify(q)
        results.append(result)
    return results

def generate_final_response(task: str, initial: str, verifications: list[dict]) -> str:
    """基于验证结果生成最终响应"""
    prompt = f"""
原始任务：{task}

初始响应：{initial}

验证结果：
{format_verifications(verifications)}

根据验证结果，修正初始响应中的任何错误，并生成最终响应。
对于每个被验证为错误的声明，说明错误原因并提供正确信息。
"""
    return llm.generate(prompt)
```

#### 3.2.3 CoV 在推理断层缓解中的应用

CoV 可以有效缓解推理断层的关键在于：它将**目标一致性检查**从隐式转为显式。以下是针对推理断层的 CoV 变体：

```python
REASONING_DRIFT_COV = """
# 推理断层检测的 Chain-of-Verification

## 任务
{task}

## 当前推理状态
{current_reasoning_trace}

## 验证阶段
针对上述推理过程，执行以下验证：

### 验证 1：目标一致性
问题：这个推理过程是否始终服务于原始任务？
回答格式：[是/否]，如果"否"，说明偏离点

### 验证 2：步骤逻辑性  
问题：每个推理步骤是否在逻辑上承接前一步？
回答格式：[是/否]，如果"否"，指出逻辑断裂点

### 验证 3：证据支撑
问题：每个关键结论是否有充分的证据或数据支撑？
回答格式：[是/否/部分]，如果"否"或"部分"，列出缺乏支撑的结论

### 验证 4：完整性
问题：最终输出是否覆盖了任务的所有关键方面？
回答格式：[是/否]，如果"否"，列出缺失的方面
"""

def detect_reasoning_drift(reasoning_trace: str, task: str) -> dict:
    """使用 CoV 检测推理断层"""
    prompt = REASONING_DRIFT_COV.format(
        task=task,
        current_reasoning_trace=reasoning_trace
    )
    result = llm.generate(prompt)
    return parse_verification_result(result)
```

### 3.3 目标重述机制

**目标重述（Goal Restatement）** 是一种简单但极为有效的提示技术，其核心思想是要求 Agent 在关键节点（如开始新阶段、遇到困难、准备输出结果时）**显式重述原始任务目标**，以对抗上下文中目标信息的自然衰减。

#### 3.3.1 目标重述的时机

| 时机 | 目的 | 示例提示 |
|------|------|----------|
| **任务开始** | 明确任务边界 | "我理解任务是：...，请确认" |
| **阶段转换** | 防止阶段性偏离 | "进入新阶段前，让我回顾：原始目标是..." |
| **遇到障碍** | 重新聚焦 | "遇到困难，我应该回顾：任务的核心要求是..." |
| **输出前** | 最终一致性检查 | "在输出前，对照原始目标验证：..." |
| **每 N 步** | 持续锚定 | "回顾：我当前在做什么？原始目标是什么？" |

#### 3.3.2 目标重述的 Prompt 设计

```python
GOAL_RESTATEMENT_PROMPT = """
# 目标重述模板

## 原始任务
{original_task}

## 当前状态
{current_state}

## 目标重述检查
请在回答前完成以下检查：

### 我的当前任务是什么？（用一句话重述）
答：

### 我的当前任务与原始任务的关系？
答：[ ] 正在推进原始任务
    [ ] 偏离了原始任务（说明：...）
    [ ] 不确定（说明：...）

### 如果发现偏离，我应该如何纠正？
答：
"""

def goal_restatement_check(original_task: str, current_state: str) -> dict:
    """
    在关键节点执行目标重述检查
    
    Returns:
        dict: {
            "restated_task": str,  # 重述的任务
            "alignment_status": str,  # "aligned" | "drifted" | "uncertain"
            "correction": str,  # 如果偏离，提供纠正建议
        }
    """
    prompt = GOAL_RESTATEMENT_PROMPT.format(
        original_task=original_task,
        current_state=current_state
    )
    response = llm.generate(prompt)
    return parse_restatement_response(response)
```

#### 3.3.3 集成目标重述的 Agent 循环

```python
def agent_loop_with_goal_restatement(task: str, tools: list[Tool], restatement_interval: int = 3):
    """
    带目标重述功能的 Agent 执行循环
    
    Args:
        task: 原始任务
        tools: 可用工具列表
        restatement_interval: 每隔多少步执行一次目标重述检查
    """
    history = []
    step_count = 0
    
    while not is_complete(task, history):
        # 关键节点：目标重述检查
        if step_count > 0 and step_count % restatement_interval == 0:
            current_state = summarize_history(history)
            check = goal_restatement_check(task, current_state)
            
            if check["alignment_status"] == "drifted":
                print(f"⚠️ 检测到推理断层：{check['correction']}")
                history.append({
                    "type": "correction",
                    "content": check['correction']
                })
            elif check["alignment_status"] == "uncertain":
                print(f"❓ 不确定当前状态：{check['correction']}")
        
        # 正常执行步骤
        context = build_context(task, history)
        thought = generate_thought(context)
        
        if is_final_answer(thought):
            break
        
        action, input_data = parse_action(thought)
        observation = execute_tool(tools, action, input_data)
        
        history.append({
            "thought": thought,
            "action": action,
            "observation": observation
        })
        step_count += 1
    
    return synthesize_final_answer(task, history)
```

### 3.4 其他提示工程技术

#### 3.4.1 思维骨架（Skeleton-of-Thought）

通过先规划整体框架，再逐步填充细节的方式，确保任务始终按计划推进：

```python
SKELETON_OF_THOUGHT_PROMPT = """
# 思维骨架模板

## 任务
{task}

## 第一步：规划骨架
在开始执行之前，先规划任务的整体骨架（不超过 5 个主要步骤）。

输出格式：
步骤 1：[主要目标/阶段]
步骤 2：[主要目标/阶段]
步骤 3：[主要目标/阶段]
...

## 第二步：填充细节
完成骨架规划后，逐个填充每个步骤的详细内容。
在完成当前步骤前，不要跳到下一步。

## 约束
- 如果某步骤无法完成，明确说明原因并请求指导
- 定期检查当前步骤是否与骨架一致
"""
```

#### 3.4.2 自我一致性（Self-Consistency）

通过让 Agent 生成多个推理路径，然后选择最一致的答案，减少单次推理的随机性导致的断层：

```python
SELF_CONSISTENCY_PROMPT = """
# 自我一致性检查

## 任务
{task}

## 要求
1. 用**不同的方法/角度**解决这个问题 3 次
2. 对每种方法，记录：
   - 使用的推理路径
   - 得到的中间结论
   - 最终答案

3. 检查三种方法的结果是否一致
   - 如果一致：置信度高，可以输出
   - 如果不一致：分析分歧原因，选择最合理的答案

## 输出格式
方法 A：[推理路径和结论]
方法 B：[推理路径和结论]
方法 C：[推理路径和结论]

一致性分析：[一致/不一致的原因分析]
最终答案：[选择和理由]
"""
```

---

## 4. 记忆机制解决方案

提示工程在单次交互中效果显著，但在处理**长期任务**或**多轮对话**时，上下文窗口的限制使得提示工程的方法不再足够。记忆机制通过在 LLM Agent 中引入**显式的记忆存储和检索系统**，使得 Agent 能够超越上下文窗口的限制，保持对任务历史的完整追踪。

### 4.1 记忆系统的类型与层次

LLM Agent 的记忆系统通常分为三个层次：

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LLM Agent 记忆层次                            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    长期记忆（Long-Term Memory）                │    │
│  │  - 持久化存储，跨会话保留                                      │    │
│  │  - 目标、子目标、关键约束                                      │    │
│  │  - 成功模式和失败模式                                         │    │
│  │  - 外部知识检索（如 RAG）                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▲                                       │
│                              │ 提取 relevant memories                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    短期记忆（Short-Term Memory）             │    │
│  │  - 当前会话内的历史记录                                        │    │
│  │  - 任务进度、已完成步骤                                        │    │
│  │  - 当前推理状态                                                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▲                                       │
│                              │ 更新                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    工作记忆（Working Memory）                  │    │
│  │  - LLM 当前"看到"的上下文                                      │    │
│  │  - 活跃的推理链条                                              │    │
│  │  - 当前注意力焦点                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 短期记忆：保持任务焦点

短期记忆用于在单个任务执行过程中维护关键信息，防止上下文窗口的信息衰减导致的推理断层。

#### 4.2.1 任务状态跟踪器

```python
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

@dataclass
class TaskState:
    """任务状态跟踪器"""
    original_task: str
    created_at: datetime = field(default_factory=datetime.now)
    sub_goals: list[dict] = field(default_factory=list)  # 子目标列表
    completed_steps: list[dict] = field(default_factory=list)  # 已完成步骤
    current_focus: Optional[str] = None  # 当前焦点
    last_checkpoint: Optional[datetime] = None  # 上次检查点
    
    def add_step(self, step: dict):
        """添加已完成步骤"""
        step["completed_at"] = datetime.now()
        self.completed_steps.append(step)
        self.last_checkpoint = datetime.now()
    
    def add_subgoal(self, goal: dict):
        """添加子目标"""
        self.sub_goals.append(goal)
    
    def get_progress_summary(self) -> str:
        """获取进度摘要"""
        total = len(self.sub_goals)
        completed = len([g for g in self.sub_goals if g.get("status") == "completed"])
        return f"进度: {completed}/{total} 子目标"
    
    def to_memory_string(self) -> str:
        """转换为记忆字符串"""
        lines = [
            f"原始任务: {self.original_task}",
            f"进度: {self.get_progress_summary()}",
            f"当前子目标: {self.current_focus or '无'}",
            "已完成步骤:",
        ]
        for step in self.completed_steps[-5:]:  # 只保留最近5步
            lines.append(f"  - {step.get('description', 'N/A')}")
        return "\n".join(lines)
```

#### 4.2.2 主动回忆机制

```python
class ShortTermMemory:
    """短期记忆管理器"""
    
    def __init__(self, max_steps_in_context: int = 10):
        self.max_steps_in_context = max_steps_in_context
        self.task_state: Optional[TaskState] = None
        self.recent_actions = []  # 最近的动作历史
    
    def start_task(self, task: str):
        """开始新任务"""
        self.task_state = TaskState(original_task=task)
        self.recent_actions = []
    
    def add_step(self, thought: str, action: str, observation: str):
        """记录执行步骤"""
        step = {
            "thought": thought,
            "action": action,
            "observation": observation[:200] if len(observation) > 200 else observation
        }
        self.task_state.add_step(step)
        self.recent_actions.append(step)
        
        # 保持历史在限制内
        if len(self.recent_actions) > self.max_steps_in_context:
            self.recent_actions.pop(0)
    
    def get_context_prompt(self) -> str:
        """生成上下文提示（用于 LLM 输入）"""
        if not self.task_state:
            return ""
        
        return f"""
## 任务状态
{self.task_state.to_memory_string()}

## 最近动作历史
{self._format_recent_actions()}

## 当前任务进度
{self._format_progress()}

### 提醒
- 请参考上述任务状态，确保你的行动与原始目标一致
- 如果发现当前行动偏离原始目标，请调整策略
"""
    
    def _format_recent_actions(self) -> str:
        """格式化最近动作"""
        if not self.recent_actions:
            return "无"
        return "\n".join([
            f"{i+1}. [{a['action']}] {a['observation'][:50]}..."
            for i, a in enumerate(self.recent_actions[-3:])
        ])
    
    def _format_progress(self) -> str:
        """格式化进度"""
        if not self.task_state:
            return ""
        completed = len([s for s in self.task_state.completed_steps])
        return f"已执行 {completed} 个步骤"
```

### 4.3 长期记忆：存储目标与子目标

长期记忆用于跨会话存储关键信息，使得 Agent 能够在长时间跨度内保持任务的连续性。

#### 4.3.1 目标持久化存储

```python
import json
from pathlib import Path
from typing import Optional
from datetime import datetime

class LongTermMemory:
    """长期记忆管理器"""
    
    def __init__(self, storage_path: str = "./data/memory"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.active_tasks_file = self.storage_path / "active_tasks.json"
        self.completed_tasks_file = self.storage_path / "completed_tasks.json"
    
    def save_task_goal(self, task_id: str, goal: dict):
        """
        保存任务目标到长期记忆
        
        Args:
            task_id: 任务唯一标识
            goal: 目标字典，包含:
                - original_task: 原始任务描述
                - sub_goals: 子目标列表
                - constraints: 约束条件
                - success_criteria: 成功标准
        """
        task_file = self.storage_path / f"task_{task_id}.json"
        
        task_data = {
            "task_id": task_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "status": "active",
            **goal
        }
        
        with open(task_file, "w", encoding="utf-8") as f:
            json.dump(task_data, f, ensure_ascii=False, indent=2)
        
        self._update_active_tasks(task_id, goal)
    
    def get_task_goal(self, task_id: str) -> Optional[dict]:
        """获取任务目标"""
        task_file = self.storage_path / f"task_{task_id}.json"
        if task_file.exists():
            with open(task_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return None
    
    def update_subgoal_status(self, task_id: str, subgoal_id: str, status: str, result: str = ""):
        """更新子目标状态"""
        task_data = self.get_task_goal(task_id)
        if not task_data:
            return
        
        for subgoal in task_data.get("sub_goals", []):
            if subgoal.get("id") == subgoal_id:
                subgoal["status"] = status
                subgoal["updated_at"] = datetime.now().isoformat()
                if result:
                    subgoal["result"] = result
                break
        
        task_data["updated_at"] = datetime.now().isoformat()
        
        task_file = self.storage_path / f"task_{task_id}.json"
        with open(task_file, "w", encoding="utf-8") as f:
            json.dump(task_data, f, ensure_ascii=False, indent=2)
    
    def retrieve_relevant_tasks(self, query: str, limit: int = 5) -> list[dict]:
        """
        基于查询检索相关任务
        
        这模拟了 Agent 从经验中学习的能力
        """
        relevant = []
        
        for task_file in self.storage_path.glob("task_*.json"):
            if task_file.name == "active_tasks.json":
                continue
            
            with open(task_file, "r", encoding="utf-8") as f:
                task_data = json.load(f)
            
            # 简单关键词匹配（实际应用中可使用 Embedding）
            query_lower = query.lower()
            task_text = json.dumps(task_data).lower()
            
            if query_lower in task_text:
                relevant.append(task_data)
                if len(relevant) >= limit:
                    break
        
        return relevant
    
    def _update_active_tasks(self, task_id: str, goal: dict):
        """更新活跃任务索引"""
        active_tasks = {}
        if self.active_tasks_file.exists():
            with open(self.active_tasks_file, "r", encoding="utf-8") as f:
                active_tasks = json.load(f)
        
        active_tasks[task_id] = {
            "original_task": goal.get("original_task", ""),
            "last_accessed": datetime.now().isoformat()
        }
        
        with open(self.active_tasks_file, "w", encoding="utf-8") as f:
            json.dump(active_tasks, f, ensure_ascii=False, indent=2)
```

#### 4.3.2 反思与总结机制

Reflexion 框架中提出的**反思（Reflection）**机制是长期记忆的重要组成部分。Agent 不仅记录执行历史，还对历史进行**高层次总结**，形成可复用的经验：

```python
class ReflectionMemory:
    """反思记忆：存储 Agent 的高层次总结和经验"""
    
    def __init__(self):
        self.success_patterns = []  # 成功模式
        self.failure_patterns = []  # 失败模式
        self.lessons = []  # 经验教训
    
    def add_experience(self, task: str, trajectory: list[dict], outcome: str, reflection: str):
        """
        添加经验到记忆
        
        Args:
            task: 任务描述
            trajectory: 执行轨迹
            outcome: 执行结果（"success" / "failure" / "partial"）
            reflection: Agent 自己的反思总结
        """
        experience = {
            "task": task,
            "outcome": outcome,
            "reflection": reflection,
            "timestamp": datetime.now().isoformat(),
            "key_decisions": self._extract_key_decisions(trajectory),
            "turning_points": self._identify_turning_points(trajectory)
        }
        
        if outcome == "success":
            self.success_patterns.append(experience)
        else:
            self.failure_patterns.append(experience)
        
        self.lessons.append(reflection)
    
    def get_relevant_experience(self, current_task: str) -> dict:
        """获取与当前任务相关的经验"""
        # 简化实现：基于关键词匹配
        # 实际应用中应使用 Embedding + 向量检索
        
        current_lower = current_task.lower()
        
        relevant = {
            "successes": [],
            "failures": [],
            "lessons": []
        }
        
        for exp in self.success_patterns[-10:]:  # 最近10个成功经验
            if any(kw in exp["task"].lower() for kw in current_task.split()[:3]):
                relevant["successes"].append(exp)
        
        for exp in self.failure_patterns[-10:]:  # 最近10个失败经验
            if any(kw in exp["task"].lower() for kw in current_task.split()[:3]):
                relevant["failures"].append(exp)
        
        return relevant
    
    def generate_prompt_context(self, current_task: str) -> str:
        """生成包含相关经验的提示上下文"""
        exp = self.get_relevant_experience(current_task)
        
        context = "\n## 相关经验\n"
        
        if exp["successes"]:
            context += "### 成功经验\n"
            for s in exp["successes"][:3]:
                context += f"- {s['task']}: {s['reflection'][:100]}...\n"
        
        if exp["failures"]:
            context += "### 失败教训\n"
            for f in exp["failures"][:3]:
                context += f"- {f['task']}: {f['reflection'][:100]}...\n"
        
        return context
    
    def _extract_key_decisions(self, trajectory: list[dict]) -> list[str]:
        """从轨迹中提取关键决策"""
        decisions = []
        for step in trajectory:
            if "thought" in step and any(kw in step["thought"].lower() 
                                          for kw in ["决定", "选择", "采用", "decide", "choose", "adopt"]):
                decisions.append(step["thought"][:100])
        return decisions
    
    def _identify_turning_points(self, trajectory: list[dict]) -> list[str]:
        """识别转折点（结果显著变化的节点）"""
        turning_points = []
        prev_quality = None
        
        for i, step in enumerate(trajectory):
            if "observation" in step:
                # 简化：假设 observation 质量评分
                quality = self._estimate_quality(step["observation"])
                if prev_quality is not None and abs(quality - prev_quality) > 0.3:
                    turning_points.append(f"Step {i}: 质量从 {prev_quality:.2f} 变为 {quality:.2f}")
                prev_quality = quality
        
        return turning_points
    
    def _estimate_quality(self, observation: str) -> float:
        """估计观察结果的质量（简化实现）"""
        # 实际应用中需要更复杂的评估
        length_score = min(len(observation) / 500, 1.0)
        return 0.5 + length_score * 0.5
```

### 4.4 MemGPT 系统分析

**MemGPT**（Towards LLMs as Operating Systems）是由 UC Berkeley 研究团队提出的系统，其核心思想是将 LLM Agent 的记忆管理类比为操作系统的内存管理机制。

#### 4.4.1 MemGPT 的核心概念

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MemGPT 系统架构                              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      LLM Core (CPU)                         │    │
│  │  - 执行推理和决策                                            │    │
│  │  - 类似 CPU 处理指令                                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Memory Tiers                              │    │
│  │                                                              │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │  Core Memory (上下文窗口)                              │    │    │
│  │  │  - System prompt                                      │    │    │
│  │  │  - 最近的对话                                          │    │    │
│  │  │  - 当前任务状态                                        │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                         │ 召回/遗忘                          │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │  External Memory (向量数据库/文件系统)                 │    │    │
│  │  │  - 历史对话摘要                                        │    │    │
│  │  │  - 知识库                                              │    │    │
│  │  │  - 用户偏好                                            │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Memory Manager                             │    │
│  │  - 监控上下文使用量                                           │    │
│  │  - 决定何时召回/遗忘                                          │    │
│  │  - 维护记忆层次结构                                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.4.2 MemGPT 的关键机制

**层级记忆管理**：MemGPT 模拟操作系统的内存层次结构，实现主动的记忆管理：

```python
# MemGPT 风格的状态管理
class MemGPTMemoryManager:
    """MemGPT 风格的记忆管理器"""
    
    # 记忆层级
    TIER_CONTEXT = "context"      # 上下文窗口（类比 L1 Cache）
    TIER_MAIN = "main"            # 主记忆（类比 RAM）
    TIER_ARCHIVE = "archive"      # 归档记忆（类比 Disk）
    
    def __init__(self, context_limit: int = 128000):
        self.context_limit = context_limit
        self.current_context_usage = 0
        
        # 记忆存储
        self.context_memory = []   # 核心记忆（始终在上下文中）
        self.main_memory = []     # 主记忆（可通过召回加入上下文）
        self.archive_memory = []  # 归档记忆（需要时检索）
    
    def add_to_context(self, item: dict, priority: str = "normal"):
        """添加项目到上下文记忆"""
        item_size = self._estimate_size(item)
        
        # 检查是否需要内存管理
        while self.current_context_usage + item_size > self.context_limit:
            self._evict_to_main()
        
        self.context_memory.append({
            **item,
            "priority": priority,
            "added_at": datetime.now()
        })
        self.current_context_usage += item_size
    
    def _evict_to_main(self):
        """将低优先级项目从上下文驱逐到主记忆"""
        # 找到最低优先级的项目
        lowest_priority = min(self.context_memory, 
                            key=lambda x: self._priority_value(x["priority"]))
        
        self.context_memory.remove(lowest_priority)
        self.main_memory.append(lowest_priority)
        self.current_context_usage -= self._estimate_size(lowest_priority)
    
    def recall_to_context(self, query: str, max_items: int = 5):
        """从主记忆召回相关项目到上下文"""
        # 简化的检索逻辑
        # 实际应用中应使用向量相似度检索
        relevant = []
        
        for item in reversed(self.main_memory):  # 最近的优先
            if self._is_relevant(item, query):
                relevant.append(item)
                if len(relevant) >= max_items:
                    break
        
        # 执行召回
        for item in relevant:
            item_size = self._estimate_size(item)
            
            # 确保上下文有足够空间
            while self.current_context_usage + item_size > self.context_limit:
                self._evict_to_main()
            
            self.main_memory.remove(item)
            self.context_memory.append(item)
            self.current_context_usage += item_size
        
        return relevant
    
    def archive_old_memories(self, older_than_days: int = 30):
        """归档过期的记忆"""
        cutoff = datetime.now() - timedelta(days=older_than_days)
        
        to_archive = [m for m in self.main_memory 
                     if m.get("added_at", datetime.now()) < cutoff]
        
        for item in to_archive:
            self.main_memory.remove(item)
            self.archive_memory.append(item)
        
        return len(to_archive)
    
    def _priority_value(self, priority: str) -> int:
        """优先级数值（越小越先被驱逐）"""
        return {"critical": 4, "high": 3, "normal": 2, "low": 1}.get(priority, 2)
    
    def _estimate_size(self, item: dict) -> int:
        """估计项目大小（tokens 近似）"""
        return len(json.dumps(item)) // 4  # 粗略估计
    
    def _is_relevant(self, item: dict, query: str) -> bool:
        """检查项目是否与查询相关（简化实现）"""
        query_keywords = set(query.lower().split())
        item_text = json.dumps(item).lower()
        return bool(query_keywords & set(item_text.split()))
```

### 4.5 记忆机制的选择与组合

在实际应用中，不同类型的记忆机制适用于不同的场景：

| 场景 | 推荐记忆方案 | 说明 |
|------|-------------|------|
| **单次任务，无历史依赖** | 纯短期记忆 | 仅使用任务状态跟踪器 |
| **单次任务，需要多步骤** | 短期记忆 + 目标重述 | 结合结构化提示 |
| **多轮对话，有上下文连续性** | 短期 + 长期记忆 | MemGPT 风格的分层管理 |
| **长期项目，跨会话** | 完整三层记忆 | 短期 + 长期 + 反思机制 |
| **开放域任务，需要外部知识** | 记忆 + RAG | 结合知识检索 |

---

## 5. 架构设计解决方案

提示工程和记忆机制分别在"引导推理"和"维持状态"层面缓解推理断层，但它们都依赖于 LLM 本身的推理能力。当推理断层严重到一定程度时，LLM 可能无法通过"自我提醒"来纠正偏差。此时，需要从**架构层面**引入额外的监督和控制机制。

### 5.1 Supervisor Agent 模式（双 Agent 架构）

**Supervisor Agent 模式**是解决推理断层最直观的架构方案之一。其核心思想是引入一个专门的**监督者（Supervisor）**来监控执行者（Worker/Executor）的推理过程，确保其始终在正确的轨道上。

#### 5.1.1 双 Agent 架构的设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Supervisor Agent 架构                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      Supervisor Agent                         │   │
│  │  - 负责任务分解和规划                                         │   │
│  │  - 监控 Worker 的执行过程                                     │   │
│  │  - 检测推理断层并触发纠正                                      │   │
│  │  - 决定何时终止任务                                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                 │                                    │
│           ┌─────────────────────┴─────────────────────┐             │
│           │                  │                        │             │
│           ▼                  ▼                        ▼             │
│  ┌─────────────┐    ┌─────────────┐         ┌─────────────┐        │
│  │   Worker    │    │   Worker    │   ...   │   Worker    │        │
│  │  (Executor) │    │  (Executor) │         │  (Executor) │        │
│  │  - 执行具体 │    │  - 执行具体 │         │  - 执行具体 │        │
│  │    操作     │    │    操作     │         │    操作     │        │
│  └─────────────┘    └─────────────┘         └─────────────┘        │
│                                                                      │
│  Supervisor 与 Worker 之间的通信：                                    │
│  1. Supervisor → Worker: 分配合体任务、传递目标                      │
│  2. Worker → Supervisor: 报告进度、请求确认                          │
│  3. Supervisor → Worker: 纠正指令、调整计划                          │
└─────────────────────────────────────────────────────────────────────┘
```

#### 5.1.2 Supervisor Agent 实现

```python
from dataclasses import dataclass
from enum import Enum
from typing import Optional

class WorkerStatus(Enum):
    """Worker 执行状态"""
    IDLE = "idle"
    WORKING = "working"
    WAITING_CONFIRMATION = "waiting_confirmation"
    COMPLETED = "completed"
    FAILED = "failed"
    DRIFTED = "drifted"

@dataclass
class TaskAssignment:
    """任务分配"""
    task_id: str
    description: str
    original_goal: str
    constraints: list[str]
    priority: int = 1

class SupervisorAgent:
    """监督者 Agent"""
    
    def __init__(self, llm, tools: list[Tool]):
        self.llm = llm
        self.tools = tools
        self.workers: dict[str, WorkerAgent] = {}
        self.task_queue: list[TaskAssignment] = []
        self.active_tasks: dict[str, TaskAssignment] = {}
    
    def assign_task(self, task: str, worker_id: str = "default") -> str:
        """分配任务给 Worker"""
        task_id = generate_task_id()
        
        # Supervisor 先分解任务
        subtasks = self._decompose_task(task)
        
        assignment = TaskAssignment(
            task_id=task_id,
            description=task,
            original_goal=task,
            constraints=self._extract_constraints(task)
        )
        
        self.active_tasks[task_id] = assignment
        
        # 为每个子任务创建 Worker
        for i, subtask in enumerate(subtasks):
            subtask_id = f"{task_id}_sub_{i}"
            self._create_worker(subtask_id, subtask, worker_id)
        
        return task_id
    
    def monitor_worker(self, worker_id: str, worker_output: dict) -> dict:
        """
        监控 Worker 的输出
        
        Returns:
            dict: {
                "status": "approved" | "corrected" | "rejected",
                "feedback": str,  # 给 Worker 的反馈
                "new_instructions": Optional[str]  # 新的指令
            }
        """
        # 检查 Worker 输出是否与原始目标一致
        if worker_id not in self.active_tasks:
            return {"status": "rejected", "feedback": "Task not found"}
        
        original_goal = self.active_tasks[worker_id].original_goal
        
        # Supervisor 进行一致性检查
        consistency_check = self._check_consistency(worker_output, original_goal)
        
        if consistency_check["is_consistent"]:
            return {"status": "approved", "feedback": "Proceed with next step"}
        else:
            # 检测到推理断层，启动纠正
            correction = self._generate_correction(
                worker_output, 
                original_goal,
                consistency_check["deviation_point"]
            )
            return {
                "status": "corrected",
                "feedback": correction["feedback"],
                "new_instructions": correction["new_instructions"]
            }
    
    def _check_consistency(self, output: dict, goal: str) -> dict:
        """检查输出与目标的一致性"""
        prompt = f"""
## 原始目标
{goal}

## Worker 输出
{output.get('result', '')}

## 一致性检查
这个输出是否与原始目标保持一致？
如果不一致：
1. 指出具体偏离点
2. 评估偏离程度（轻微/严重）

输出格式：
{{
    "is_consistent": true/false,
    "deviation_point": "具体偏离描述（如果不一致）",
    "severity": "minor/major/critical（如果不一致）"
}}
"""
        response = self.llm.generate(prompt)
        return parse_json_response(response)
    
    def _generate_correction(self, output: dict, goal: str, deviation_point: str) -> dict:
        """生成纠正指令"""
        prompt = f"""
## 原始目标
{goal}

## Worker 当前输出
{output.get('result', '')}

## 检测到的偏离
{deviation_point}

## 纠正指令
基于原始目标，生成：
1. 简要反馈：解释偏离了什么
2. 新的指令：Worker 应该采取什么行动来纠正

输出格式：
{{
    "feedback": "...",
    "new_instructions": "..."
}}
"""
        response = self.llm.generate(prompt)
        return parse_json_response(response)
    
    def _decompose_task(self, task: str) -> list[str]:
        """分解任务为子任务"""
        prompt = f"""
任务：{task}

将这个任务分解为 3-7 个可执行的子任务。
每个子任务应该：
- 清晰、具体、可验证
- 有一个明确的完成标准
- 可以独立执行（部分子任务可能需要前序子任务的结果）

输出格式：
1. [子任务1描述]
2. [子任务2描述]
...
"""
        response = self.llm.generate(prompt)
        return parse_subtasks(response)
    
    def _extract_constraints(self, task: str) -> list[str]:
        """从任务中提取约束条件"""
        prompt = f"""
任务：{task}

从任务描述中提取所有约束条件，如：
- 格式要求
- 范围限制
- 质量标准
- 时间限制

输出格式：
- [约束1]
- [约束2]
...
"""
        response = self.llm.generate(prompt)
        return parse_constraints(response)
    
    def _create_worker(self, worker_id: str, task: str, base_worker_id: str):
        """创建 Worker"""
        self.workers[worker_id] = WorkerAgent(
            llm=self.llm,
            tools=self.tools,
            supervisor=self,
            task=task
        )
```

#### 5.1.3 Worker Agent 实现

```python
class WorkerAgent:
    """执行者 Agent"""
    
    def __init__(self, llm, tools: list[Tool], supervisor: SupervisorAgent, task: str):
        self.llm = llm
        self.tools = tools
        self.supervisor = supervisor
        self.task = task
        self.history = []
        self.status = WorkerStatus.IDLE
        self.max_retries = 3
    
    def execute(self) -> dict:
        """执行任务"""
        self.status = WorkerStatus.WORKING
        self.history = []
        
        for attempt in range(self.max_retries):
            # 执行推理循环
            result = self._execute_loop()
            
            # 提交给 Supervisor 检查
            feedback = self.supervisor.monitor_worker(
                worker_id=self.task.get("id", "unknown"),
                worker_output=result
            )
            
            if feedback["status"] == "approved":
                self.status = WorkerStatus.COMPLETED
                return result
            elif feedback["status"] == "corrected":
                # 根据纠正指令调整
                result = self._apply_correction(feedback)
                continue
            else:
                self.status = WorkerStatus.FAILED
                return {"error": "Task rejected by supervisor"}
        
        self.status = WorkerStatus.FAILED
        return {"error": "Max retries exceeded"}
    
    def _execute_loop(self) -> dict:
        """执行推理循环"""
        context = self._build_context()
        
        while not self._is_complete():
            thought = self.llm.think(context, prompt="thought")
            
            if self._is_final_answer(thought):
                break
            
            action, input_data = self._parse_action(thought)
            observation = self._execute_tool(action, input_data)
            
            self.history.append({
                "thought": thought,
                "action": action,
                "observation": observation
            })
            
            context = self._build_context()
        
        return {
            "result": self._synthesize_result(),
            "history": self.history
        }
    
    def _apply_correction(self, feedback: dict) -> dict:
        """应用 Supervisor 的纠正"""
        correction_prompt = f"""
## 之前的执行结果
{self._synthesize_result()}

## Supervisor 的反馈
{feedback['feedback']}

## 新的指令
{feedback['new_instructions']}

请根据新的指令，重新执行任务。
"""
        # 将纠正信息加入历史，重新开始执行
        self.history.append({
            "type": "correction",
            "content": feedback['feedback'],
            "new_instructions": feedback['new_instructions']
        })
        
        return self._execute_loop()
    
    def _build_context(self) -> str:
        """构建推理上下文"""
        task_desc = f"当前任务：{self.task}\n\n"
        history_desc = "执行历史：\n" + "\n".join([
            f"- 步骤{i+1}: {h.get('thought', '')[:50]}... -> {h.get('action', '')}"
            for i, h in enumerate(self.history[-5:])
        ])
        return task_desc + history_desc
    
    def _synthesize_result(self) -> str:
        """综合结果"""
        # 简化实现
        if not self.history:
            return ""
        return self.history[-1].get("observation", "")
```

### 5.2 分层控制架构

分层控制架构是 Supervisor 模式的扩展，通过引入更多的控制层级来处理更复杂任务的推理断层问题。

#### 5.2.1 三层控制架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    分层控制架构（Three-Tier Control）                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Level 3: Strategic Controller              │    │
│  │  - 使命级别（Mission-level）的目标管理                       │    │
│  │  - 跨任务的长期目标追踪                                      │    │
│  │  - 重大方向调整                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Level 2: Task Manager                    │    │
│  │  - 单个任务内的子目标管理                                    │    │
│  │  - 子目标间的依赖关系维护                                    │    │
│  │  - 进度监控与异常检测                                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     Level 1: Executor                        │    │
│  │  - 具体工具调用和操作执行                                    │    │
│  │  - 即时的动作-观察循环                                      │    │
│  │  - 实时状态更新                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

#### 5.2.2 分层架构实现

```python
class StrategicController:
    """Level 3: 战略控制器"""
    
    def __init__(self, llm):
        self.llm = llm
        self.missions: dict[str, Mission] = {}
        self.completed_missions: list[str] = []
    
    def create_mission(self, goal: str, constraints: list[str]) -> str:
        """创建新的使命/任务"""
        mission_id = generate_mission_id()
        
        mission = Mission(
            id=mission_id,
            goal=goal,
            constraints=constraints,
            status="active",
            created_at=datetime.now(),
            progress=0.0,
            milestones=[],
            issues=[]
        )
        
        self.missions[mission_id] = mission
        return mission_id
    
    def check_mission_alignment(self, mission_id: str, current_action: str) -> dict:
        """检查当前行动是否与使命一致"""
        mission = self.missions.get(mission_id)
        if not mission:
            return {"aligned": False, "reason": "Mission not found"}
        
        prompt = f"""
## 使命目标
{mission.goal}

## 约束条件
{mission.constraints}

## 当前行动
{current_action}

这个行动是否有助于实现使命目标？是否违反了任何约束？
如果偏离，说明偏离点和建议的纠正方向。

输出格式：
{{
    "aligned": true/false,
    "reason": "...",
    "deviation": "偏离描述（如果偏离）",
    "correction": "纠正建议（如果偏离）"
}}
"""
        return parse_json_response(self.llm.generate(prompt))
    
    def adjust_mission(self, mission_id: str, adjustment: str):
        """调整使命目标（重大方向变更）"""
        mission = self.missions.get(mission_id)
        if mission:
            mission.history.append({
                "type": "adjustment",
                "timestamp": datetime.now(),
                "adjustment": adjustment,
                "previous_goal": mission.goal
            })
            mission.goal = adjustment


class TaskManager:
    """Level 2: 任务管理器"""
    
    def __init__(self, llm, strategic_controller: StrategicController):
        self.llm = llm
        self.strategic = strategic_controller
        self.tasks: dict[str, Task] = {}
    
    def create_task(self, mission_id: str, task_description: str) -> str:
        """创建子任务"""
        task_id = generate_task_id()
        
        task = Task(
            id=task_id,
            mission_id=mission_id,
            description=task_description,
            status="pending",
            subtasks=[],
            completed_subtasks=[],
            progress=0.0
        )
        
        self.tasks[task_id] = task
        return task_id
    
    def update_progress(self, task_id: str, completed_subtask: str, result: dict):
        """更新任务进度"""
        task = self.tasks.get(task_id)
        if task:
            task.completed_subtasks.append({
                "subtask": completed_subtask,
                "result": result,
                "completed_at": datetime.now()
            })
            task.progress = len(task.completed_subtasks) / len(task.subtasks) if task.subtasks else 0
    
    def detect_task_drift(self, task_id: str, current_state: str) -> bool:
        """检测任务级推理断层"""
        task = self.tasks.get(task_id)
        if not task:
            return False
        
        # 使用 LLM 判断是否偏离
        mission = self.strategic.missions.get(task.mission_id)
        if not mission:
            return False
        
        prompt = f"""
## 原始任务
{task.description}

## 任务所属的使命
{mission.goal}

## 当前状态
{current_state}

当前状态是否偏离了原始任务的目标？
评估是否需要干预。

输出：{{"drifted": true/false, "reason": "..."}}
"""
        
        result = parse_json_response(self.llm.generate(prompt))
        return result.get("drifted", False)


class Executor:
    """Level 1: 执行器"""
    
    def __init__(self, llm, tools: list[Tool], task_manager: TaskManager):
        self.llm = llm
        self.tools = tools
        self.task_manager = task_manager
        self.execution_history = []
    
    def execute_subtask(self, subtask_id: str, task_id: str) -> dict:
        """执行子任务"""
        subtask = self._get_subtask(subtask_id)
        
        # ReAct 风格的执行循环
        history = []
        for step in range(max_steps):
            thought = self.llm.think(self._build_context(subtask, history))
            
            if self._is_complete(thought):
                break
            
            action, input_data = self._parse_action(thought)
            observation = self._execute_tool(action, input_data)
            
            history.append({"thought": thought, "action": action, "observation": observation})
            
            # 检查是否需要向 Task Manager 报告
            if len(history) % 5 == 0:
                if self.task_manager.detect_task_drift(task_id, str(history)):
                    return {
                        "status": "drifted",
                        "history": history,
                        "checkpoint": "Task drift detected"
                    }
        
        result = self._synthesize(history)
        self.task_manager.update_progress(task_id, subtask_id, result)
        
        return {"status": "completed", "result": result, "history": history}
```

### 5.3 反射机制（Reflexion）

**Reflexion** 是由 Shinn et al. 在 NeurIPS 2023 提出的框架，其核心创新在于将**语言化的强化学习（Verbal Reinforcement Learning）**应用于 LLM Agent，使其能够通过语言反馈进行自我改进。

#### 5.3.1 Reflexion 的核心思想

Reflexion 的设计基于一个关键洞察：人类在完成任务时，不仅会思考"我要做什么"，还会反思"我做得怎么样"、"我学到了什么"。这种反思能力是人类从错误中学习的关键。Reflexion 将这一能力引入 LLM Agent。

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Reflexion 框架                                  │
│                                                                      │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐               │
│  │   Actor    │───▶│  Evaluator │───▶│ Reflector  │               │
│  │  (执行器)   │    │  (评估器)   │    │  (反思器)   │               │
│  └────────────┘    └────────────┘    └────────────┘               │
│       │                  │                  │                       │
│       │                  │                  │                       │
│       ▼                  ▼                  ▼                       │
│  ┌─────────────────────────────────────────────────────┐          │
│  │                    Memory (记忆)                       │          │
│  │  - Short-term: 当前执行轨迹                            │          │
│  │  - Long-term: 反思总结和经验                           │          │
│  └─────────────────────────────────────────────────────┘          │
│                                                                      │
│  流程：                                                              │
│  1. Actor 执行任务，生成动作和观察                                    │
│  2. Evaluator 评估执行结果，给出二值反馈（成功/失败）                 │
│  3. Reflector 基于反馈生成高层次反思，总结经验教训                    │
│  4. 反思结果存入记忆，用于指导后续执行                                │
└─────────────────────────────────────────────────────────────────────┘
```

#### 5.3.2 Reflexion 实现

```python
class ReflexionAgent:
    """Reflexion Agent 实现"""
    
    def __init__(self, llm, tools: list[Tool]):
        self.llm = llm
        self.tools = tools
        
        # 记忆组件
        self.short_term_memory: list[dict] = []  # 执行轨迹
        self.long_term_memory = ReflectionMemory()  # 反思记忆
        
        # 组件
        self.actor = Actor(llm, tools)
        self.evaluator = Evaluator(llm)
        self.reflector = Reflector(llm)
    
    def run(self, task: str, max_iterations: int = 10) -> dict:
        """
        运行 Reflexion Agent
        
        迭代执行：Actor → Evaluator → Reflector
        直到任务成功或达到最大迭代次数
        """
        self.short_term_memory = []
        
        for iteration in range(max_iterations):
            print(f"\n=== Iteration {iteration + 1} ===")
            
            # Step 1: Actor 执行任务
            # 融合长期记忆中的相关经验到上下文中
            context = self._build_context(task)
            actor_output = self.actor.execute(task, context)
            
            self.short_term_memory.append({
                "iteration": iteration,
                "type": "execution",
                "output": actor_output
            })
            
            # Step 2: Evaluator 评估结果
            evaluation = self.evaluator.evaluate(task, actor_output)
            print(f"Evaluation: {evaluation['decision']} - {evaluation['reasoning']}")
            
            if evaluation["decision"] == "success":
                # 反思成功的经验
                reflection = self.reflector.reflect(
                    task=task,
                    trajectory=self.short_term_memory,
                    outcome="success"
                )
                self.long_term_memory.add_experience(
                    task=task,
                    trajectory=self.short_term_memory,
                    outcome="success",
                    reflection=reflection
                )
                return {
                    "status": "success",
                    "result": actor_output,
                    "iterations": iteration + 1
                }
            
            # Step 3: Reflector 反思失败
            reflection = self.reflector.reflect(
                task=task,
                trajectory=self.short_term_memory,
                outcome="failure",
                feedback=evaluation
            )
            print(f"Reflection: {reflection}")
            
            # 将反思存入长期记忆
            self.long_term_memory.add_experience(
                task=task,
                trajectory=self.short_term_memory,
                outcome="failure",
                reflection=reflection
            )
            
            # 更新 Actor 的上下文（融入反思）
            self.short_term_memory.append({
                "iteration": iteration,
                "type": "reflection",
                "reflection": reflection
            })
        
        return {
            "status": "failed",
            "reason": "Max iterations exceeded",
            "final_reflection": self.reflector.summarize_failures(
                self.short_term_memory
            )
        }
    
    def _build_context(self, task: str) -> str:
        """构建包含相关记忆的上下文"""
        # 获取相关经验
        relevant_exp = self.long_term_memory.get_relevant_experience(task)
        
        context_parts = [
            f"当前任务：{task}",
            self.long_term_memory.generate_prompt_context(task)
        ]
        
        # 添加最近的执行历史
        if self.short_term_memory:
            context_parts.append(
                "近期执行历史：\n" + 
                "\n".join([
                    f"- [{m.get('iteration', '?')}] {m.get('type', 'unknown')}"
                    for m in self.short_term_memory[-5:]
                ])
            )
        
        return "\n\n".join(context_parts)


class Actor:
    """Actor：执行器组件"""
    
    def __init__(self, llm, tools):
        self.llm = llm
        self.tools = tools
    
    def execute(self, task: str, context: str) -> dict:
        """执行任务（ReAct 风格）"""
        history = []
        max_steps = 10
        
        for step in range(max_steps):
            prompt = f"""
## 任务
{task}

## 上下文
{context}

## 历史
{self._format_history(history)}

请继续执行任务。
"""
            thought = self.llm.think(prompt, mode="thought")
            
            if self._is_terminal(thought):
                break
            
            action, input_data = self._parse_action(thought)
            observation = self._execute_tool(action, input_data)
            
            history.append({
                "step": step + 1,
                "thought": thought,
                "action": action,
                "observation": observation
            })
        
        return {
            "history": history,
            "final_answer": self._extract_answer(history)
        }
    
    def _format_history(self, history: list[dict]) -> str:
        """格式化历史"""
        if not history:
            return "无"
        return "\n".join([
            f"Step {h['step']}: {h['thought'][:50]}... -> {h['action']}"
            for h in history[-3:]
        ])
    
    def _is_terminal(self, thought: str) -> bool:
        """判断是否达到终止状态"""
        return any(kw in thought.lower() for kw in ["完成", "答案是", "final answer", "done"])
    
    def _parse_action(self, thought: str) -> tuple[str, str]:
        """解析动作"""
        # 简化实现
        return "unknown", ""
    
    def _execute_tool(self, action: str, input_data: str) -> str:
        """执行工具"""
        # 实现工具调用
        return ""
    
    def _extract_answer(self, history: list[dict]) -> str:
        """提取最终答案"""
        if not history:
            return ""
        return history[-1].get("observation", "")


class Evaluator:
    """Evaluator：评估器组件"""
    
    def __init__(self, llm):
        self.llm = llm
    
    def evaluate(self, task: str, actor_output: dict) -> dict:
        """评估 Actor 的输出"""
        prompt = f"""
## 原始任务
{task}

## Actor 输出
{actor_output.get('final_answer', '')}

## 执行轨迹
{self._format_trajectory(actor_output.get('history', []))}

请评估 Actor 的输出是否成功完成了任务。

判断标准：
- 输出是否解决了任务要求？
- 是否有遗漏的关键部分？
- 是否有错误或幻觉？

输出格式（JSON）：
{{
    "decision": "success" | "failure",
    "reasoning": "评估理由",
    "score": 0-10,
    "issues": ["问题1", "问题2"]（如有）
}}
"""
        return parse_json_response(self.llm.generate(prompt))
    
    def _format_trajectory(self, trajectory: list[dict]) -> str:
        """格式化轨迹"""
        if not trajectory:
            return "无"
        return "\n".join([
            f"Step {t['step']}: {t.get('thought', '')[:80]}..."
            for t in trajectory[-5:]
        ])


class Reflector:
    """Reflector：反思器组件"""
    
    def __init__(self, llm):
        self.llm = llm
    
    def reflect(self, task: str, trajectory: list[dict], outcome: str, 
                feedback: dict = None) -> str:
        """
        生成反思
        
        反思应该：
        1. 分析成功/失败的原因
        2. 提取关键经验教训
        3. 提供可操作的改进建议
        """
        prompt = f"""
## 原始任务
{task}

## 执行结果
结果：{outcome}
评估反馈：{feedback if feedback else 'N/A'}

## 执行轨迹
{self._format_trajectory(trajectory)}

请进行高层次反思：

1. **原因分析**：为什么这次执行成功/失败？关键因素是什么？
2. **经验教训**：从这次执行中学到了什么？
3. **改进建议**：下次执行类似任务时应该注意什么？

请用简洁的语言总结，不超过 200 字。
"""
        return self.llm.generate(prompt)
    
    def summarize_failures(self, trajectory: list[dict]) -> str:
        """总结多次失败的经验"""
        reflections = [
            m.get("reflection", "")
            for m in trajectory
            if m.get("type") == "reflection"
        ]
        
        if not reflections:
            return "没有反思记录"
        
        prompt = f"""
## 多次失败的反思
{reflections}

请总结这些失败的共同模式和根本原因。
"""
        return self.llm.generate(prompt)
    
    def _format_trajectory(self, trajectory: list[dict]) -> str:
        """格式化轨迹"""
        lines = []
        for m in trajectory:
            if m.get("type") == "execution":
                for h in m.get("output", {}).get("history", []):
                    lines.append(f"Step {h['step']}: {h.get('thought', '')[:80]}...")
            elif m.get("type") == "reflection":
                lines.append(f"[反思] {m.get('reflection', '')[:100]}...")
        return "\n".join(lines) if lines else "无"
```

### 5.4 架构方案的选择与权衡

不同的架构方案适用于不同的场景，需要在**复杂性**、**可靠性**、**成本**之间进行权衡：

| 架构方案 | 复杂性 | 可靠性 | LLM 调用成本 | 适用场景 |
|----------|--------|--------|--------------|----------|
| **单 Agent + 提示工程** | 低 | 中 | 低 | 简单任务，单次执行 |
| **Supervisor 模式** | 中 | 高 | 中-高（2x） | 中等复杂度，需要监督 |
| **分层控制** | 高 | 很高 | 高（3x+） | 复杂任务，多子目标 |
| **Reflexion** | 中-高 | 高 | 高（多次迭代） | 需要从错误中学习 |

---

## 6. 代码示例

以下是一个整合了多种推理断层缓解技术的完整 Agent 实现示例：

### 6.1 完整 Agent 实现

```python
"""
Reasoning Drift-resistant Agent
整合了提示工程、记忆机制和架构设计的完整实现
"""

from dataclasses import dataclass, field
from typing import Optional, Callable
from datetime import datetime
from enum import Enum

class DriftStatus(Enum):
    """推理断层状态"""
    ALIGNED = "aligned"
    SUSPECTED = "suspected"
    DETECTED = "detected"
    CORRECTED = "corrected"

@dataclass
class AgentConfig:
    """Agent 配置"""
    # 提示工程配置
    enable_goal_restatement: bool = True
    restatement_interval: int = 3  # 每隔多少步重述目标
    enable_cov: bool = False  # Chain-of-Verification
    
    # 记忆配置
    enable_short_term_memory: bool = True
    max_steps_in_context: int = 10
    enable_long_term_memory: bool = False
    
    # 架构配置
    use_supervisor: bool = False
    enable_reflexion: bool = False
    max_iterations: int = 10
    
    # 断层检测配置
    drift_check_threshold: float = 0.7  # 触发检查的置信度阈值


class RobustAgent:
    """
    抗推理断层 Agent
    
    整合了多种技术：
    1. 结构化提示（目标强调、约束条件）
    2. 短期记忆（任务状态跟踪）
    3. 目标重述机制
    4. 推理断层检测与纠正
    """
    
    def __init__(
        self,
        llm: Callable[[str], str],
        tools: list[dict],
        config: AgentConfig = None
    ):
        self.llm = llm
        self.tools = tools
        self.config = config or AgentConfig()
        
        # 记忆系统
        self.short_term = ShortTermMemory(
            max_steps=self.config.max_steps_in_context
        )
        self.long_term = LongTermMemory() if self.config.enable_long_term_memory else None
        self.reflection = ReflectionMemory() if self.config.enable_reflexion else None
        
        # Supervisor（如果启用）
        self.supervisor = None
        if self.config.use_supervisor:
            self.supervisor = SupervisorAgent(
                llm=self.llm,
                tools=self.tools
            )
        
        # 断层检测状态
        self.drift_history: list[dict] = []
    
    def run(self, task: str) -> dict:
        """运行 Agent"""
        # 初始化
        self.short_term.start_task(task)
        step_count = 0
        drift_status = DriftStatus.ALIGNED
        
        # 主循环
        while step_count < self.config.max_iterations:
            step_count += 1
            
            # 构建上下文
            context = self._build_context(task)
            
            # 目标重述检查
            if self.config.enable_goal_restatement and step_count % self.config.restatement_interval == 0:
                drift_status = self._check_and_handle_drift(task, context)
                if drift_status == DriftStatus.DETECTED:
                    continue  # 重新开始当前步骤
            
            # Supervisor 监控（如果启用）
            if self.supervisor:
                supervisor_feedback = self.supervisor.monitor(step_count, context)
                if supervisor_feedback.get("action") == "correct":
                    context = supervisor_feedback.get("new_context", context)
            
            # 生成下一步行动
            response = self.llm(context)
            
            # 解析响应
            thought, action, action_input, observation = self._parse_response(response)
            
            # 记录到短期记忆
            self.short_term.add_step(thought, action, observation)
            
            # 检查是否完成
            if self._is_complete(response):
                break
        
        # 最终结果
        return {
            "result": self._synthesize_result(),
            "steps": step_count,
            "drift_events": len(self.drift_history),
            "final_status": drift_status.value
        }
    
    def _build_context(self, task: str) -> str:
        """构建推理上下文"""
        parts = [
            self._system_prompt(),
            f"\n## 当前任务\n{task}",
        ]
        
        # 添加短期记忆上下文
        if self.config.enable_short_term_memory:
            parts.append(self.short_term.get_context_prompt())
        
        # 添加长期记忆上下文
        if self.long_term:
            parts.append(self.long_term.generate_prompt_context(task))
        
        # 添加反思上下文
        if self.reflection:
            parts.append(self.reflection.generate_prompt_context(task))
        
        return "\n".join(parts)
    
    def _system_prompt(self) -> str:
        """生成系统提示"""
        return f"""
# 抗推理断层执行系统

## 你的角色
你是一个专业的 AI 助手，负责准确完成用户任务。

## 核心原则
1. **始终锚定原始目标**：每个思考步骤都必须服务于任务目标
2. **持续自检**：定期回顾"我是否在正确的轨道上？"
3. **透明执行**：清楚说明每个动作的理由
4. **诚实报告**：无法完成时明确说明，而非猜测

## 工作流程
1. 理解任务目标
2. 分解为可执行步骤
3. 逐步执行，期间进行自我检查
4. 完成时验证结果是否满足目标

## 目标重述检查点
每完成 3 个步骤，进行一次目标重述检查：
- "我现在在做什么？"
- "这与原始目标的关系是什么？"
- "是否需要调整？"

## 输出格式
Thought: [你的思考]
Action: [动作名称]
Action Input: [动作输入]
Observation: [观察结果]
```
"""
    
    def _check_and_handle_drift(self, task: str, context: str) -> DriftStatus:
        """检查并处理推理断层"""
        current_state = self.short_term.get_recent_summary()
        
        prompt = f"""
## 原始任务
{task}

## 当前状态
{current_state}

## 目标一致性检查
你是否仍在推进原始任务？
- 如果是：确认并继续
- 如果否：指出偏离点和纠正建议

输出格式（JSON）：
{{
    "status": "aligned" | "suspected" | "detected",
    "reason": "...",
    "correction": "纠正建议（如需要）"
}}
"""
        
        result = self.llm(prompt)
        parsed = self._parse_json(result)
        
        status = parsed.get("status", "aligned")
        
        if status in ["suspected", "detected"]:
            self.drift_history.append({
                "step": len(self.short_term.recent_actions),
                "status": status,
                "reason": parsed.get("reason", ""),
                "correction": parsed.get("correction", ""),
                "timestamp": datetime.now().isoformat()
            })
            
            if status == "detected":
                # 添加纠正指令到记忆
                self.short_term.add_step(
                    thought=f"检测到推理断层：{parsed.get('reason', '')}",
                    action="goal_restatement",
                    observation=parsed.get("correction", "")
                )
        
        return DriftStatus(status)
    
    def _parse_response(self, response: str) -> tuple[str, str, str, str]:
        """解析 LLM 响应"""
        # 简化实现
        lines = response.strip().split("\n")
        
        thought = ""
        action = ""
        action_input = ""
        observation = ""
        
        current_field = None
        for line in lines:
            line = line.strip()
            if line.startswith("Thought:"):
                current_field = "thought"
                thought = line[8:].strip()
            elif line.startswith("Action:"):
                current_field = "action"
                action = line[7:].strip()
            elif line.startswith("Action Input:"):
                current_field = "input"
                action_input = line[13:].strip()
            elif line.startswith("Observation:"):
                current_field = "observation"
                observation = line[12:].strip()
            elif current_field and line:
                # 多行内容
                if current_field == "thought":
                    thought += " " + line
                elif current_field == "action":
                    action += " " + line
                elif current_field == "input":
                    action_input += " " + line
                elif current_field == "observation":
                    observation += " " + line
        
        return thought, action, action_input, observation
    
    def _is_complete(self, response: str) -> bool:
        """判断是否完成"""
        return any(kw in response.lower() for kw in ["final answer", "最终答案", "完成", "done"])
    
    def _synthesize_result(self) -> str:
        """综合最终结果"""
        if not self.short_term.recent_actions:
            return ""
        
        # 使用 LLM 综合
        prompt = f"""
基于以下执行历史，综合最终结果：

{self.short_term.to_memory_string()}

请输出最终结果，确保：
1. 直接回答原始任务
2. 清晰展示关键发现
3. 不添加任务之外的内容
"""
        return self.llm(prompt)


# 使用示例
def example_usage():
    """使用示例"""
    
    def mock_llm(prompt: str) -> str:
        """模拟 LLM 调用"""
        # 简化实现，实际应用中应调用真实的 LLM API
        return """
Thought: 我需要先搜索相关的论文
Action: search_arxiv
Action Input: {"query": "RAG reinforcement learning", "limit": 10}
Observation: 返回了10篇论文，其中5篇涉及RAG与RL的结合
"""
    
    tools = [
        {"name": "search_arxiv", "description": "搜索 arXiv 论文"},
        {"name": "fetch_paper", "description": "获取论文详情"},
    ]
    
    agent = RobustAgent(
        llm=mock_llm,
        tools=tools,
        config=AgentConfig(
            enable_goal_restatement=True,
            restatement_interval=3,
            enable_short_term_memory=True,
            enable_long_term_memory=False,
            max_iterations=10
        )
    )
    
    result = agent.run("调研近一年关于RAG与强化学习结合的研究论文")
    
    print(f"执行完成：{result['steps']} 步")
    print(f"推理断层事件：{result['drift_events']}")
    print(f"最终状态：{result['final_status']}")
    print(f"结果：{result['result']}")


if __name__ == "__main__":
    example_usage()
```

### 6.2 推理断层检测器

```python
"""
独立的推理断层检测器
可以集成到现有 Agent 中使用
"""

from dataclasses import dataclass
from typing import Optional
import re

@dataclass
class DriftDetectionResult:
    """检测结果"""
    is_drifting: bool
    confidence: float  # 0-1
    drift_type: Optional[str]  # "goal_forgetting", "constraint_violation", etc.
    description: str
    recommendation: str

class DriftDetector:
    """推理断层检测器"""
    
    def __init__(self, llm=None):
        self.llm = llm
    
    def detect(self, task: str, history: list[dict], current_step: dict) -> DriftDetectionResult:
        """
        检测推理断层
        
        Args:
            task: 原始任务
            history: 执行历史
            current_step: 当前步骤
        
        Returns:
            DriftDetectionResult: 检测结果
        """
        if self.llm:
            return self._llm_based_detection(task, history, current_step)
        else:
            return self._rule_based_detection(task, history, current_step)
    
    def _llm_based_detection(
        self, 
        task: str, 
        history: list[dict], 
        current_step: dict
    ) -> DriftDetectionResult:
        """基于 LLM 的检测"""
        prompt = f"""
## 原始任务
{task}

## 执行历史
{self._format_history(history)}

## 当前步骤
{current_step}

请分析是否存在推理断层：

1. **目标遗忘**：当前步骤是否遗忘了原始任务？
2. **约束违反**：是否有违反任务约束的行为？
3. **逻辑断裂**：当前步骤与历史是否连贯？
4. **范围蔓延**：是否在处理任务之外的内容？

输出格式（JSON）：
{{
    "is_drifting": true/false,
    "confidence": 0.0-1.0,
    "drift_type": "goal_forgetting/constraint_violation/logic_break/scope_creep/none",
    "description": "详细描述",
    "recommendation": "如果drifting，建议如何纠正"
}}
"""
        response = self.llm(prompt)
        return self._parse_result(response)
    
    def _rule_based_detection(
        self, 
        task: str, 
        history: list[dict], 
        current_step: dict
    ) -> DriftDetectionResult:
        """基于规则的检测"""
        task_keywords = set(task.lower().split())
        history_text = " ".join([
            h.get("thought", "") + " " + h.get("action", "")
            for h in history
        ])
        current_text = current_step.get("thought", "") + " " + current_step.get("action", "")
        
        # 计算关键词覆盖率
        history_coverage = len(task_keywords & set(history_text.lower().split())) / max(len(task_keywords), 1)
        current_coverage = len(task_keywords & set(current_text.lower().split())) / max(len(task_keywords), 1)
        
        # 检测下降趋势
        if current_coverage < history_coverage * 0.5:
            return DriftDetectionResult(
                is_drifting=True,
                confidence=0.8,
                drift_type="goal_forgetting",
                description=f"关键词覆盖率从 {history_coverage:.2f} 下降到 {current_coverage:.2f}",
                recommendation="重新审视原始任务，确保当前步骤与任务目标一致"
            )
        
        # 检测是否在重复同一类型步骤
        if len(history) >= 3:
            recent_actions = [h.get("action", "") for h in history[-3:]]
            if len(set(recent_actions)) == 1:
                return DriftDetectionResult(
                    is_drifting=True,
                    confidence=0.7,
                    drift_type="logic_break",
                    description="连续3步执行相同动作，可能陷入循环",
                    recommendation="考虑换一种方法或重新规划"
                )
        
        return DriftDetectionResult(
            is_drifting=False,
            confidence=0.9,
            drift_type=None,
            description="未检测到明显的推理断层",
            recommendation=""
        )
    
    def _format_history(self, history: list[dict]) -> str:
        """格式化历史"""
        return "\n".join([
            f"Step {i+1}: [{h.get('action', 'unknown')}] {h.get('thought', '')[:50]}..."
            for i, h in enumerate(history[-5:])
        ])
    
    def _parse_result(self, response: str) -> DriftDetectionResult:
        """解析 LLM 输出"""
        try:
            import json
            data = json.loads(response)
            return DriftDetectionResult(
                is_drifting=data.get("is_drifting", False),
                confidence=data.get("confidence", 0.5),
                drift_type=data.get("drift_type"),
                description=data.get("description", ""),
                recommendation=data.get("recommendation", "")
            )
        except:
            return DriftDetectionResult(
                is_drifting=False,
                confidence=0.0,
                drift_type=None,
                description="解析失败",
                recommendation=""
            )


# 使用示例
def example_drift_detection():
    """检测器使用示例"""
    
    detector = DriftDetector()
    
    task = "调研近一年关于大模型在代码生成安全漏洞检测的研究"
    
    history = [
        {"action": "search", "thought": "搜索相关论文"},
        {"action": "fetch", "thought": "获取论文详情"},
        {"action": "analyze", "thought": "分析论文方法"},
    ]
    
    current_step = {
        "action": "browse",
        "thought": "查看一些好玩的项目",  # 明显偏离
        "observation": ""
    }
    
    result = detector.detect(task, history, current_step)
    
    print(f"是否漂移：{result.is_drifting}")
    print(f"置信度：{result.confidence:.2f}")
    print(f"漂移类型：{result.drift_type}")
    print(f"描述：{result.description}")
    print(f"建议：{result.recommendation}")


if __name__ == "__main__":
    example_drift_detection()
```

---

## 7. 参考文献

### 7.1 核心论文

1. **Reflexion: Language Agents with Verbal Reinforcement Learning**
   > Shinn, N., Cassano, F., Gopinath, A., Narasimhan, K., & Yao, S. (2023). *Reflexion: Language Agents with Verbal Reinforcement Learning*. NeurIPS 2023.
   - arXiv: [2303.11366](https://arxiv.org/abs/2303.11366)
   - 核心贡献：将语言化强化学习应用于 LLM Agent，实现从错误中自我改进

2. **MemGPT: Towards LLMs as Operating Systems**
   > Packer, C., Wooders, S., Lin, K., Fang, V., Patil, S. G., Stoica, I., & Gonzalez, J. E. (2023). *MemGPT: Towards LLMs as Operating Systems*. UC Berkeley.
   - arXiv: [2310.08560](https://arxiv.org/abs/2310.08560)
   - 核心贡献：引入层级记忆管理系统，突破上下文窗口限制

3. **Chain-of-Verification Reduces Hallucination in Large Language Models**
   > Dhuliawala, S., Komeili, M., Xu, J., Railean, R., & Weston, J. (2023). *Chain-of-Verification Reduces Hallucination in Large Language Models*. Meta AI.
   - arXiv: [2310.16969](https://arxiv.org/abs/2310.16969)
   - 核心贡献：提出验证链模式，通过结构化自我验证减少幻觉和错误

4. **ReAct: Synergizing Reasoning and Acting in Language Models**
   > Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). *ReAct: Synergizing Reasoning and Acting in Language Models*. ICLR 2023.
   - arXiv: [2210.03629](https://arxiv.org/abs/2210.03629)
   - 核心贡献：提出 Thought-Action-Observation 交织的推理模式

5. **Self-Correction: A Emerging Paradigm for LLM Development**
   > Huang, X., Chen, W., Wu, J., & others. (2024). *A Survey on Self-Correction in Large Language Models*.
   - arXiv: [2401.04997](https://arxiv.org/abs/2401.04997)
   - 核心贡献：全面综述 LLM 自我纠正技术的发展

### 7.2 相关论文

6. **Tree of Thoughts: Deliberate Problem Solving with Large Language Models**
   > Yao, S., Yu, D., Zhao, J., Shafran, I., Griffiths, T. L., Cao, Y., & Narasimhan, K. (2023). *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*. NeurIPS 2023.
   - arXiv: [2305.10601](https://arxiv.org/abs/2305.10601)

7. **Language Agent Tree Search Unifies Reasoning, Acting and Planning**
   > Zhou, A., Yan, K., Shlapentokh-Rothman, M., Wang, H., & Wang, Y. (2024). *Language Agent Tree Search Unifies Reasoning, Acting and Planning*.
   - arXiv: [2310.04406](https://arxiv.org/abs/2310.04406)

8. **SELF-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection**
   > Asai, A., Wu, Z., Wang, Y., Sil, A., & Ji, H. (2024). *SELF-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection*.
   - arXiv: [2310.11511](https://arxiv.org/abs/2310.11511)

9. **Agent Drift: Quantifying Behavioral Degradation in Multi-Agent LLM Systems**
   > Rath, A. (2025). *Agent Drift: Quantifying Behavioral Degradation in Multi-Agent LLM Systems Over Extended Interactions*.
   - arXiv: [2601.04170](https://arxiv.org/html/2601.04170v1)

10. **Measuring Reasoning Drift in LLM Agents**
    > Romanchuk, O. (2025). *Measuring Reasoning Drift in LLM Agents: Why Models Are Stable on Facts but Fall Apart on Human Context*.
    - Medium Article

### 7.3 工具与框架

- **LangChain Agents**: https://python.langchain.com/docs/concepts/agents/
- **AutoGen**: https://microsoft.github.io/autogen/
- **ChatDev**: https://chatdev.together.ai/
- **MemGPT GitHub**: https://github.com/Humelo/MemGPT
- **Reflexion GitHub**: https://github.com/noahshinn024/reflexion

---

## 附录 A：推理断层检测清单

在实际开发中，可以使用以下清单来检测和预防推理断层：

```
□ 任务定义阶段
  □ 原始目标是否清晰、具体？
  □ 约束条件是否明确？
  □ 成功标准是否可验证？

□ System Prompt 设计
  □ 是否包含任务强调？
  □ 是否明确约束条件？
  □ 是否有自我检查提示？

□ 执行过程
  □ 是否定期进行目标重述？
  □ 是否监控执行轨迹的一致性？
  □ 是否记录异常情况？

□ 架构设计
  □ 是否有 Supervisor 监控？
  □ 是否有记忆机制？
  □ 是否支持错误恢复？

□ 完成后验证
  □ 最终结果是否与原始目标一致？
  □ 是否覆盖所有关键要求？
  □ 是否有遗漏或错误？
```

---

## 附录 B：不同场景的推荐方案

| 场景 | 推荐组合 | 理由 |
|------|----------|------|
| **简单查询任务** | 基础提示工程 | 任务简单，无需复杂机制 |
| **单次复杂分析** | 提示工程 + 目标重述 + CoV | 需要确保分析完整性 |
| **多轮对话助手** | 短期记忆 + 目标重述 | 需要维持对话上下文 |
| **长期项目研究** | 完整记忆系统 + 分层架构 | 需要跨会话连续性 |
| **需要自我改进** | Reflexion + 反思记忆 | 需要从错误中学习 |
| **高可靠性要求** | Supervisor + 多层检测 | 需要严格监督和控制 |

---

*本文档为 LLM Agent 架构调研系列 Q5，探讨推理断层的定义、成因和解决方案。*
