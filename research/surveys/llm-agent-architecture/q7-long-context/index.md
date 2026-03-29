---
id: q7-long-context
title: "Q7: 长上下文优化策略"
category: agent-memory
level: advanced
tags: [context-window, summarization, retrieval, sliding-window, agent]
related-questions: [q6, q8, q10]
date: 2026-03-30
---

# Q7: 长上下文优化策略

## 1. 概述

在大语言模型（LLM）Agent 系统的实际应用中，**对话历史管理**是一个核心挑战。随着交互次数的增加，历史对话记录会不断累积，当其长度超过模型的上下文窗口（Context Window）限制时，Agent 将面临严峻的性能瓶颈。

### 1.1 问题背景

#### 1.1.1 为什么历史对话记录过长会影响 Agent 性能？

当对话历史过长时，会产生以下几类问题：

**1. 上下文窗口溢出（Context Overflow）**

当前主流 LLM 的上下文窗口虽然已从 4K tokens 扩展到 128K 甚至 1M tokens，但实际应用中的对话历史可能远超这一限制。以一个长期运行的客服 Agent 为例：

```
假设场景：连续对话 1000 轮
每轮平均 Token 数：100 tokens（用户输入 + Agent 回复）
总 Token 数：1000 × 100 = 100,000 tokens
```

即使是目前最长的上下文窗口（如 Claude 100K、Gemini 1M），在长期运行场景下仍会面临溢出风险。

**2. 注意力分散（Attention Diffusion）**

Transformer 架构的自注意力机制存在**二次复杂度**问题。当上下文长度增加时：
- 模型需要关注更多的历史 token
- 有效注意力会分散到无关的历史信息上
- 关键信息可能被淹没在大量历史数据中

这导致模型在处理超长上下文时，对重要信息的捕捉能力反而下降。

**3. 计算成本急剧上升**

```
上下文长度与成本关系（假设 GPT-4 Turbo 价格）：
- 4K 上下文：$0.01 / 1K tokens
- 128K 上下文：$0.03 / 1K tokens（3倍成本）

处理 100K tokens 的成本对比：
- 4K × 25 次调用：25 × $0.01 × 4 = $1.00
- 128K 单次调用：$0.03 × 100 = $3.00
```

**4. 推理延迟增加**

长上下文意味着更长的处理时间和首 token 延迟（Time to First Token），严重影响用户体验。

**5. 质量退化（Quality Degradation）**

研究发现，当上下文长度超过一定阈值后，模型性能反而会下降。这被称为**lost in the middle**问题——模型对上下文中间部分的信息理解能力较弱。

#### 1.1.2 上下文窗口限制的影响

上下文窗口限制对 Agent 架构的影响可以从以下几个维度分析：

| 影响维度 | 具体表现 | 严重程度 |
|---------|---------|---------|
| **功能完整性** | 无法处理跨越长窗口的依赖关系 | 高 |
| **任务成功率** | 长期任务无法完成 | 高 |
| **用户体验** | 响应延迟增加、成本上升 | 中 |
| **系统设计** | 必须引入外部记忆机制 | 高 |
| **应用场景** | 限制了在长期交互场景的应用 | 中 |

### 1.2 核心解决思路

针对上下文窗口限制问题，学术界和工业界提出了多种解决策略：

```
┌─────────────────────────────────────────────────────────────────┐
│                  长上下文优化策略分类                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  滑动窗口    │  │   总结压缩    │  │   向量检索    │        │
│  │ Sliding      │  │ Summarization │  │   Vector      │        │
│  │ Window       │  │               │  │   Retrieval   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  选择性检索  │  │   分层记忆   │  │   外部记忆   │        │
│  │  Selective   │  │   Hierarchical│  │   External   │        │
│  │  Retrieval   │  │   Memory      │  │   Memory     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**本文将深入分析其中四种主流策略**：
1. 滑动窗口（Sliding Window）
2. 总结压缩（Summarization）
3. 向量检索（Vector Retrieval）
4. 选择性检索（Selective Retrieval）

---

## 2. 滑动窗口策略

### 2.1 机制原理

滑动窗口（Sliding Window）是处理长上下文最直观的方法。其核心思想是：**只保留最近 N 个 tokens 的上下文，丢弃更早的信息**。

```
┌─────────────────────────────────────────────────────────────────┐
│                    滑动窗口工作原理                               │
│                                                                 │
│  时间轴 ─────────────────────────────────────────────────────▶  │
│                                                                 │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐           │
│  │ t-7 │ t-6 │ t-5 │ t-4 │ t-3 │ t-2 │ t-1 │ t-0 │           │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘           │
│                                                  ▲              │
│                                               窗口大小=4        │
│                                                  │              │
│  窗口内保留：                                     ▼              │
│  ┌─────┬─────┬─────┬─────┐                                       │
│  │ t-3 │ t-2 │ t-1 │ t-0 │  ← 送入模型的上下文                  │
│  └─────┴─────┴─────┴─────┘                                       │
│                                                                 │
│  窗口外丢弃：                                                     │
│  ┌─────┬─────┬─────┬─────┐  ← 已遗忘的历史                     │
│  │ t-7 │ t-6 │ t-5 │ t-4 │                                       │
│  └─────┴─────┴─────┴─────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 算法实现

```python
from typing import List, Tuple

class SlidingWindowMemory:
    """
    滑动窗口记忆管理器
    
    核心思想：只保留最近 N 个对话轮的上下文，
    超出窗口的历史被自动丢弃。
    """
    
    def __init__(self, max_tokens: int = 4000, avg_tokens_per_turn: int = 200):
        """
        Args:
            max_tokens: 最大保留 token 数
            avg_tokens_per_turn: 平均每轮对话的 token 数（估算）
        """
        self.max_tokens = max_tokens
        self.avg_tokens_per_turn = avg_tokens_per_turn
        self.max_turns = max_tokens // avg_tokens_per_turn
        self.history: List[Tuple[str, str]] = []  # [(user_msg, assistant_msg), ...]
    
    def add_turn(self, user_msg: str, assistant_msg: str):
        """添加一轮对话"""
        self.history.append((user_msg, assistant_msg))
        self._trim_if_needed()
    
    def _trim_if_needed(self):
        """如果超过窗口大小，裁剪旧的历史"""
        while self._estimate_tokens() > self.max_tokens and len(self.history) > 1:
            self.history.pop(0)  # 移除最早的对话
    
    def _estimate_tokens(self) -> int:
        """估算当前历史的 token 数（粗略估算）"""
        return len(self.history) * self.avg_tokens_per_turn
    
    def get_context(self) -> str:
        """获取当前上下文"""
        context_parts = []
        for user, assistant in self.history:
            context_parts.append(f"用户: {user}\n助手: {assistant}")
        return "\n---\n".join(context_parts)
    
    def get_recent_turns(self, n: int) -> List[Tuple[str, str]]:
        """获取最近 n 轮对话"""
        return self.history[-n:] if n < len(self.history) else self.history


# 使用示例
memory = SlidingWindowMemory(max_tokens=4000)

# 添加多轮对话
memory.add_turn("你好，请介绍一下北京", "北京是中国的首都...")
memory.add_turn("那里有什么好吃的？", "北京有烤鸭、炸酱面...")
memory.add_turn("明天天气怎么样？", "明天北京晴转多云...")

# 获取当前上下文（自动裁剪旧对话）
context = memory.get_context()
print(f"当前上下文长度（估算）: {memory._estimate_tokens()} tokens")
print(f"保留对话轮数: {len(memory.history)}")
```

### 2.3 优势分析

滑动窗口策略具有以下显著优势：

**1. 实现简单**

滑动窗口是所有策略中实现最为简单的一种。不需要额外的模型调用、向量数据库或复杂的数据结构。核心逻辑只需十几行代码即可实现。

**2. 计算效率高**

由于每次只处理固定长度的上下文，计算复杂度保持恒定。不会随着对话历史的增长而增加。

**3. 延迟可预测**

每次请求的处理时间基本一致，便于系统性能调优和 SLA 保障。

**4. 无额外依赖**

不需要部署额外的组件（如向量数据库、总结模型等），降低了系统复杂度和运维成本。

**5. 确定性行为**

给定相同的输入，总是产生相同的输出窗口，方便调试和测试。

### 2.4 劣势分析

然而，滑动窗口策略也存在明显的局限性：

**1. 可能丢失关键信息**

这是滑动窗口最大的问题。重要的上下文信息可能出现在对话的早期，而在后续对话中需要引用。

```
丢失信息示例：

对话历史（第 1-100 轮，已被滑动窗口丢弃）：
┌────────────────────────────────────────────┐
│ 用户: 我们公司名称是 ABC科技有限公司         │
│ 助手: 好的，我已记住贵公司信息                │
│                                              │
│ 用户: 我们公司的产品叫 X100                  │
│ 助手: 了解，产品 X100 相关问题请告诉我        │
└────────────────────────────────────────────┘

当前对话（第 150 轮）：
┌────────────────────────────────────────────┐
│ 用户: 我们的产品有什么优势？                  │
│ 助手: ??? （不知道"X100"是什么）             │
└────────────────────────────────────────────┘

问题：模型无法回答关于"X100"的问题，因为
该信息已被滑动窗口丢弃
```

**2. 缺乏选择性**

滑动窗口对所有历史信息一视同仁，无法区分：
- 关键事实 vs 闲聊
- 长期有效信息 vs 一次性信息
- 高价值上下文 vs 低价值上下文

**3. 不适合长期任务**

对于需要跨长时间跨度整合信息的任务（如完整的项目分析、深度研究），滑动窗口会导致信息断层。

**4. 边界效应**

在窗口边界处可能产生不连贯的对话体验，尤其是在多轮连续对话中。

### 2.5 适用场景

滑动窗口策略最适合以下场景：

| 场景 | 适用性 | 说明 |
|------|--------|------|
| **短期咨询** | ✅ 非常适合 | 每次对话相对独立，不依赖历史 |
| **简单问答** | ✅ 适合 | 问题答案通常在最近几轮内 |
| **闲聊** | ✅ 适合 | 不需要精确记忆历史细节 |
| **长期任务** | ❌ 不适合 | 需要跨越多轮整合信息 |
| **专业领域** | ⚠️ 谨慎使用 | 关键术语、事实可能被丢弃 |
| **多跳推理** | ❌ 不适合 | 需要关联远距离的多个事实 |

### 2.6 改进变体：带关键信息保留的滑动窗口

针对标准滑动窗口的缺陷，可以引入**关键信息保留机制**：

```python
import re
from typing import Set, Dict

class EnhancedSlidingWindow:
    """
    增强型滑动窗口：结合关键信息保留
    
    策略：
    1. 维护一个"永久记忆"存储关键信息
    2. 普通对话使用滑动窗口
    3. 检索时同时查询永久记忆
    """
    
    def __init__(self, window_tokens: int = 3000, key_memory_tokens: int = 1000):
        self.window_tokens = window_tokens
        self.key_memory_tokens = key_memory_tokens
        
        # 滑动窗口历史
        self.recent_history: List[Tuple[str, str]] = []
        self.recent_tokens = 0
        
        # 关键信息永久记忆
        self.key_memory: Dict[str, str] = {
            # "entity_name": "extracted_info"
        }
        
        # 关键信息模式（可自定义）
        self.key_patterns = [
            r"(公司|企业|组织).*?叫([^\s，,]+)",
            r"产品[名称叫是]([^\s，,]+)",
            r"我叫([^\s，,]+)",
            r"电话是([0-9\-]+)",
        ]
    
    def add_turn(self, user_msg: str, assistant_msg: str):
        """添加对话并提取关键信息"""
        # 先提取关键信息
        self._extract_key_info(user_msg)
        
        # 添加到历史
        turn_tokens = self._estimate_tokens(user_msg + assistant_msg)
        
        # 如果加上这轮会超出窗口，先尝试压缩
        while (self.recent_tokens + turn_tokens > self.window_tokens 
               and len(self.recent_history) > 0):
            removed = self.recent_history.pop(0)
            self.recent_tokens -= self._estimate_tokens(removed[0] + removed[1])
        
        self.recent_history.append((user_msg, assistant_msg))
        self.recent_tokens += turn_tokens
    
    def _extract_key_info(self, text: str):
        """从文本中提取关键信息"""
        for pattern in self.key_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                if len(match) >= 1:
                    key = match[0] if isinstance(match, tuple) else match
                    # 存储到关键记忆（简单实现，实际可用知识图谱）
                    self.key_memory[key] = text
    
    def _estimate_tokens(self, text: str) -> int:
        """估算 token 数（中英文混合）"""
        # 粗略估算：中文按字符计，英文按单词计
        chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
        english_words = len(re.findall(r'[a-zA-Z]+', text))
        return chinese_chars + english_words
    
    def get_context(self) -> str:
        """获取完整上下文"""
        # 组装最近对话
        recent = "\n".join([
            f"用户: {u}\n助手: {a}" 
            for u, a in self.recent_history
        ])
        
        # 组装关键记忆
        key_info = "\n".join([
            f"[关键] {k}: {v[:100]}..." 
            for k, v in self.key_memory.items()
        ])
        
        return f"{key_info}\n\n【最近对话】\n{recent}"


# 使用示例
memory = EnhancedSlidingWindow(window_tokens=3000)

# 模拟长期对话
memory.add_turn(
    "我们是ABC科技有限公司，专门做AI产品", 
    "很高兴认识贵公司！"
)
memory.add_turn(
    "我们主要产品是X100智能助手",
    "了解，X100智能助手，有什么可以帮您？"
)
# ... 中间对话被滑动窗口管理 ...

# 在第50轮时询问：
memory.add_turn(
    "我们的X100产品有什么优势？",
    "根据之前的信息，ABC科技的X100产品..."
)

print(memory.key_memory)
# 输出: {'ABC科技有限公司': '我们是ABC科技有限公司，专门做AI产品', 
#        'X100': '我们主要产品是X100智能助手'}
```

---

## 3. 总结压缩策略

### 3.1 核心思想

总结压缩（Summarization）策略的核心思想是：**当历史信息过多时，使用 LLM 或专门模型将其压缩为摘要，保留核心信息的同时大幅减少 token 数量**。

```
┌─────────────────────────────────────────────────────────────────┐
│                    总结压缩工作原理                               │
│                                                                 │
│  原始历史（10000 tokens）                                       │
│  ┌─────────────────────────────────────────────────┐           │
│  │ 第1轮: 用户询问产品规格...                       │           │
│  │ 助手回复详细规格信息...                          │           │
│  │ 第2轮: 用户询问价格...                          │           │
│  │ 助手回复价格信息...                              │           │
│  │ ... (50轮对话)                                   │           │
│  └─────────────────────────────────────────────────┘           │
│                        │                                         │
│                        ▼ LLM 总结                                │
│  ┌─────────────────────────────────────────────────┐           │
│  │ 【对话摘要】                                    │           │
│  │ • 用户关注产品规格和价格                        │           │
│  │ • 公司是ABC科技，主营AI产品                     │           │
│  │ • 主要产品X100，定价¥999                        │           │
│  │ • 用户表示有购买意向                            │           │
│  └─────────────────────────────────────────────────┘           │
│              (压缩后: ~200 tokens)                               │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 静态总结 vs 动态总结

#### 3.2.1 静态总结（Static Summarization）

静态总结在**固定时间点**生成总结，通常是：
- 对话结束时
- 达到预定 token 阈值时
- 用户主动触发时

**优点**：
- 总结操作只执行一次，性价比高
- 实现相对简单
- 总结结果可缓存复用

**缺点**：
- 无法及时捕捉新信息
- 总结粒度固定，可能过于粗略或过于详细
- 压缩率固定，不够灵活

```python
class StaticSummarizer:
    """
    静态总结器
    
    在固定触发条件下生成单次总结
    """
    
    def __init__(self, llm_client, summary_prompt: str = None):
        self.llm = llm_client
        self.summary_prompt = summary_prompt or DEFAULT_SUMMARY_PROMPT
        self.summary: str = None
        self.source_history: List[Tuple[str, str]] = []
    
    def add_turn(self, user_msg: str, assistant_msg: str):
        """添加对话"""
        self.source_history.append((user_msg, assistant_msg))
        
        # 检查是否需要总结
        if self._should_summarize():
            self._generate_summary()
    
    def _should_summarize(self) -> bool:
        """判断是否需要总结"""
        # 触发条件：超过 token 阈值 或 对话结束
        total_tokens = sum(
            len(u) + len(a) for u, a in self.source_history
        )
        return total_tokens > 4000  # 可配置
    
    def _generate_summary(self):
        """生成总结"""
        history_text = self._format_history()
        
        prompt = f"""
请总结以下对话的要点，保留关键信息：

{history_text}

总结要求：
1. 提取关键事实和信息
2. 保留重要决策和结论
3. 标注未解决的问题
4. 使用简洁的中文
"""
        self.summary = self.llm.generate(prompt)
        # 清空原始历史，保留总结（节省内存）
        self.source_history = []
    
    def _format_history(self) -> str:
        """格式化历史对话"""
        return "\n".join([
            f"用户: {u}\n助手: {a}"
            for u, a in self.source_history
        ])
    
    def get_context(self) -> str:
        """获取当前上下文"""
        parts = []
        if self.summary:
            parts.append(f"【历史总结】\n{self.summary}")
        if self.source_history:
            parts.append(f"【近期对话】\n{self._format_history()}")
        return "\n\n".join(parts)


DEFAULT_SUMMARY_PROMPT = """
你是一个对话总结助手。请总结以下对话的关键信息：

要求：
- 提取关键事实、决策、结论
- 标注重要的用户偏好和需求
- 保留未完成的任务或问题
- 使用简洁的要点格式
"""
```

#### 3.2.2 动态总结（Dynamic Summarization）

动态总结在**每个适当的时间点**增量更新总结，实现更灵活的信息管理。

**优点**：
- 信息捕捉更及时
- 可根据重要性动态调整压缩率
- 更好地保留最近信息的细节

**缺点**：
- 实现复杂度高
- 多次 LLM 调用，成本较高
- 总结之间可能存在不一致

```python
class DynamicSummarizer:
    """
    动态总结器（增量总结）
    
    核心思想：每次添加新对话时，都对"总结 + 新对话"重新总结
    实现增量更新效果
    """
    
    def __init__(self, llm_client, max_summary_tokens: int = 500):
        self.llm = llm_client
        self.max_summary_tokens = max_summary_tokens
        self.summary: str = ""
        self.recent_turns: List[Tuple[str, str]] = []  # 未总结的近期对话
        self.recent_tokens: int = 0
    
    def add_turn(self, user_msg: str, assistant_msg: str):
        """添加对话并触发增量总结"""
        self.recent_turns.append((user_msg, assistant_msg))
        self.recent_tokens += len(user_msg) + len(assistant_msg)
        
        # 当近期对话达到一定量时，触发总结
        if self.recent_tokens > 1500:
            self._incremental_summary()
    
    def _incremental_summary(self):
        """
        增量总结：将当前总结 + 近期对话 合并生成新总结
        
        这是动态总结的核心操作
        """
        if not self.summary and not self.recent_turns:
            return
        
        # 构建总结 prompt
        prompt_parts = []
        
        if self.summary:
            prompt_parts.append(f"【当前总结】\n{self.summary}")
        
        if self.recent_turns:
            recent_text = "\n".join([
                f"用户: {u}\n助手: {a}"
                for u, a in self.recent_turns
            ])
            prompt_parts.append(f"【新对话】\n{recent_text}")
        
        prompt = f"""
请将以下内容合并为一个简洁的总结：

{"="*50}
{"\n".join(prompt_parts)}
{"="*50}

总结要求（控制在 {self.max_summary_tokens} tokens 以内）：
1. 保留所有关键信息
2. 合并重复内容
3. 使用要点格式
4. 保持信息完整性
"""
        self.summary = self.llm.generate(prompt)
        self.recent_turns = []
        self.recent_tokens = 0
    
    def get_context(self) -> str:
        """获取当前上下文"""
        parts = [f"【对话总结】\n{self.summary}"] if self.summary else []
        
        if self.recent_turns:
            recent_text = "\n".join([
                f"用户: {u}\n助手: {a}"
                for u, a in self.recent_turns
            ])
            parts.append(f"【最近对话】\n{recent_text}")
        
        return "\n\n".join(parts)
```

### 3.3 MemGPT 的上下文管理方式

**MemGPT**（arXiv:2310.08560）是微软研究提出的一种创新系统，其设计灵感来自操作系统的内存层次结构。MemGPT 核心思想是：**模拟操作系统中的内存层次（RAM、磁盘、虚拟内存），让 LLM 能够管理"无限"的上下文**。

#### 3.3.1 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        MemGPT 架构                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     LLM (CPU)                           │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │              对话上下文窗口                       │    │   │
│  │  │         (相当于 CPU 寄存器)                      │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│            读写          │          页调度                      │
│            ▼             │             ▼                        │
│  ┌─────────────────┐    │    ┌─────────────────┐             │
│  │   核心记忆        │◄───┼───►│   外部记忆       │             │
│  │ (Working Memory) │    │    │ (External Memory) │            │
│  │                  │    │    │                  │            │
│  │ • 总结的历史      │    │    │ • 完整对话历史   │             │
│  │ • 关键事实       │    │    │ • 检索索引       │             │
│  │ • 当前任务状态   │    │    │ • 文档资料       │             │
│  └─────────────────┘    │    └─────────────────┘             │
│                          │                                     │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.3.2 MemGPT 的关键创新

**1. 分层记忆结构**

MemGPT 引入两层记忆：
- **核心记忆（Core Memory）**：始终在上下文窗口中，包含最重要、最常用的信息
- **外部记忆（External Memory）**：存储在向量数据库中，通过检索访问

**2. 自我管理的函数调用**

MemGPT 赋予 LLM "内存管理"的能力。模型可以主动调用函数来：
- `memory_search`：从外部记忆检索信息
- `memory_write`：将信息写入外部记忆
- `memory_update`：更新核心记忆中的内容

**3. 层级结构的优点**

| 特性 | 说明 |
|------|------|
| **可扩展性** | 外部记忆无限，突破上下文限制 |
| **选择性** | 只有重要信息进入核心记忆 |
| **自管理** | 模型自主决定信息的存放位置 |

#### 3.3.3 MemGPT 代码示例

```python
# MemGPT 风格的记忆管理实现（简化版）

class MemGPTMemory:
    """
    MemGPT 风格的分层记忆管理
    
    核心组件：
    1. Core Memory - 工作记忆，始终在上下文中
    2. External Memory - 外部记忆，按需检索
    """
    
    def __init__(
        self, 
        core_memory_size: int = 4000,    # 核心记忆 token 限制
        retrieval_top_k: int = 3            # 检索返回条数
    ):
        self.core_memory = CoreMemory(limit=core_memory_size)
        self.external_memory = ExternalMemory()
        self.retrieval_top_k = retrieval_top_k
        
        # MemGPT 风格的函数定义
        self.functions = [
            {
                "name": "memory_search",
                "description": "从外部记忆检索相关信息",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "检索查询"
                        }
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "memory_write",
                "description": "将信息写入外部记忆",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string",
                            "description": "要写入的内容"
                        },
                        "importance": {
                            "type": "string",
                            "enum": ["high", "medium", "low"],
                            "description": "重要性等级"
                        }
                    },
                    "required": ["content"]
                }
            },
            {
                "name": "memory_update",
                "description": "更新核心记忆中的内容",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "operation": {
                            "type": "string",
                            "enum": ["append", "replace", "delete"]
                        },
                        "content": {"type": "string"}
                    },
                    "required": ["operation", "content"]
                }
            }
        ]
    
    def handle_function_call(self, function_name: str, arguments: dict) -> str:
        """处理 MemGPT 风格的函数调用"""
        if function_name == "memory_search":
            return self.external_memory.search(
                arguments["query"], 
                top_k=self.retrieval_top_k
            )
        elif function_name == "memory_write":
            return self.external_memory.add(
                arguments["content"],
                importance=arguments.get("importance", "medium")
            )
        elif function_name == "memory_update":
            if arguments["operation"] == "append":
                self.core_memory.append(arguments["content"])
            elif arguments["operation"] == "replace":
                self.core_memory.replace(arguments["content"])
            return "核心记忆已更新"
        
        return "未知函数"
    
    def get_context(self, current_turn: str) -> str:
        """构建完整上下文"""
        # 1. 核心记忆（始终包含）
        core = self.core_memory.get_content()
        
        # 2. 当前对话
        current = f"\n【当前对话】\n{current_turn}"
        
        # 3. 如果核心记忆空间允许，直接返回
        if len(core + current) < 3500:  # 留一些余量
            return f"{core}{current}"
        
        # 4. 如果核心记忆满了，进行检索
        context_parts = [
            f"{core}",
            f"{current}",
            "\n【相关外部记忆】"
        ]
        
        # 提取当前对话的关键词进行检索
        query = current_turn[-500:]  # 使用最近对话作为查询
        relevant = self.external_memory.search(query, top_k=self.retrieval_top_k)
        context_parts.append(relevant)
        
        return "\n".join(context_parts)


class CoreMemory:
    """核心记忆：固定大小的上下文中可用的记忆"""
    
    def __init__(self, limit: int = 4000):
        self.limit = limit
        self.sections: List[str] = []
        self.total_tokens: int = 0
    
    def append(self, content: str):
        """追加内容（如果超出限制，替换最旧的内容）"""
        tokens = self._estimate_tokens(content)
        
        while self.total_tokens + tokens > self.limit and self.sections:
            removed = self.sections.pop(0)
            self.total_tokens -= self._estimate_tokens(removed)
        
        self.sections.append(content)
        self.total_tokens += tokens
    
    def get_content(self) -> str:
        """获取核心记忆内容"""
        if not self.sections:
            return "【核心记忆】\n（空）"
        return "【核心记忆】\n" + "\n".join(self.sections)
    
    def _estimate_tokens(self, text: str) -> int:
        return len(text) // 4  # 粗略估算


class ExternalMemory:
    """外部记忆：基于向量存储的持久记忆"""
    
    def __init__(self):
        # 实际实现中应使用向量数据库
        self.documents: List[dict] = []  # [{"content": str, "embedding": List[float], "importance": str}]
    
    def add(self, content: str, importance: str = "medium"):
        """添加文档到外部记忆"""
        # 实际实现中需要生成 embedding
        doc = {
            "content": content,
            "importance": importance,
            "embedding": self._generate_embedding(content)  # 简化
        }
        self.documents.append(doc)
        return f"已添加到外部记忆 (共 {len(self.documents)} 条)"
    
    def search(self, query: str, top_k: int = 3) -> str:
        """检索最相关的文档"""
        # 简化实现：按重要性 + 长度筛选
        # 实际应使用向量相似度
        
        sorted_docs = sorted(
            self.documents,
            key=lambda d: (
                {"high": 0, "medium": 1, "low": 2}[d["importance"]],
                -len(d["content"])  # 优先较长的
            )
        )
        
        results = sorted_docs[:top_k]
        
        if not results:
            return "（无相关记忆）"
        
        return "\n".join([
            f"- {d['content'][:200]}..." 
            for d in results
        ])
    
    def _generate_embedding(self, text: str) -> List[float]:
        """生成 embedding（简化版）"""
        # 实际应调用 embedding 模型
        import hashlib
        h = int(hashlib.md5(text.encode()).hexdigest()[:8], 16)
        # 返回一个伪embedding
        return [float((h >> i) & 0xFF) / 255.0 for i in range(64)]
```

### 3.4 RECOMP Paper 详解

**RECOMP**（Retrieval-Augmented LM with Compression and Selective Augmentation）是由 Xu 等人在 ICLR 2024 上提出的论文（arXiv:2310.04408）。其核心贡献是**提出两种互补的上下文压缩技术**。

#### 3.4.1 论文核心思想

RECOMP 针对**检索增强语言模型（Retrieval-Augmented LM）**场景，提出两种压缩策略：

**1. 选择性增强（Selective Augmentation）**

只检索与当前查询**真正相关**的文档，避免无关上下文干扰。

**2. 压缩增强（Compression Augmentation）**

对检索到的文档进行**摘要压缩**，保留关键信息同时减少 token 数量。

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECOMP 两种策略对比                           │
│                                                                 │
│  原始 RAG:                                                     │
│  ┌─────────┐    ┌─────────┐    ┌─────────────────────┐         │
│  │  Query  │───▶│ Retrieve│───▶│ All Retrieved Docs │         │
│  └─────────┘    └─────────┘    │ (可能 10+ 文档)      │         │
│                                 └─────────────────────┘         │
│                                            │                    │
│                                            ▼                    │
│                                 ┌─────────────────────┐        │
│                                 │  直接拼入上下文       │        │
│                                 │  ❌ 太多无关信息      │        │
│                                 └─────────────────────┘        │
│                                                                 │
│  RECOMP Selective:                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                   │
│  │  Query  │───▶│ Retrieve│───▶│ Selective│                   │
│  └─────────┘    └─────────┘    │ Filter  │                   │
│                                 └────┬────┘                    │
│                                      ▼                          │
│                            ┌─────────────────┐                 │
│                            │ 只保留相关文档   │                 │
│                            │ (可能有 2-3 篇)  │                 │
│                            └─────────────────┘                 │
│                                                                 │
│  RECOMP Compression:                                           │
│  ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Query  │───▶│ Retrieve│───▶│ Compress │───▶│ 压缩后   │  │
│  └─────────┘    └─────────┘    │ (LLM摘要) │    │ (每篇    │  │
│                                 └──────────┘    │  ~100字)  │  │
│                                                └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.4.2 RECOMP 的技术细节

**论文提出的两种方法**：

**方法一：Selective RECOMP**

```python
def selective_recomp(query: str, retrieved_docs: List[str], threshold: float = 0.5):
    """
    选择性增强：只保留与查询高度相关的文档
    
    核心思想：计算每个文档与查询的相关性分数，
    只保留分数超过阈值的文档
    """
    relevant_docs = []
    
    for doc in retrieved_docs:
        # 计算相关性分数（可用 cross-encoder 或其他方法）
        relevance_score = compute_relevance(query, doc)
        
        if relevance_score >= threshold:
            relevant_docs.append({
                "doc": doc,
                "score": relevance_score
            })
    
    return relevant_docs
```

**方法二：Compression RECOMP**

```python
def compression_recomp(query: str, retrieved_docs: List[str], llm):
    """
    压缩增强：使用 LLM 对每个检索文档生成摘要
    
    核心思想：让 LLM 根据当前 query，提取文档中
    与 query 相关的部分，压缩为简短摘要
    """
    compressed = []
    
    for doc in retrieved_docs:
        compress_prompt = f"""
给定以下文档和查询，请生成一个压缩摘要：

【查询】
{query}

【文档】
{doc}

要求：
1. 只保留与查询相关的内容
2. 压缩到 100 tokens 以内
3. 保持信息的准确性
4. 使用中文输出

压缩摘要：
"""
        summary = llm.generate(compress_prompt)
        compressed.append(summary)
    
    return compressed
```

#### 3.4.3 实验结果

RECOMP 在多个数据集上取得了显著提升：

| 数据集 | 方法 | 提升 |
|--------|------|------|
| **PopQA** | +RECOMP Selective | +2.1% Accuracy |
| **PopQA** | +RECOMP Compression | +3.8% Accuracy |
| **NQ** | +RECOMP Compression | +2.4% Accuracy |
| **TriviaQA** | +RECOMP Compression | +1.9% Accuracy |

关键发现：**Compression RECOMP 在所有数据集上都优于 Selective RECOMP**，说明压缩的重要性高于选择性过滤。

#### 3.4.4 RECOMP 代码示例

```python
"""
RECOMP 风格实现的完整示例
"""

from typing import List, Tuple
import numpy as np


class RECOMPModule:
    """
    RECOMP 核心实现
    
    结合选择性过滤和压缩增强
    """
    
    def __init__(
        self, 
        llm,
        embed_model,  # embedding 模型
        cross_encoder=None,  # 可选：用于相关性打分
        compression_ratio: float = 0.1,  # 压缩到原来的 10%
        relevance_threshold: float = 0.5
    ):
        self.llm = llm
        self.embed_model = embed_model
        self.cross_encoder = cross_encoder
        self.compression_ratio = compression_ratio
        self.relevance_threshold = relevance_threshold
    
    def process(
        self, 
        query: str, 
        retrieved_docs: List[str]
    ) -> Tuple[List[str], List[str]]:
        """
        处理检索结果
        
        Returns:
            (selected_docs, compressed_docs)
        """
        # Step 1: 选择性过滤
        selected = self._selective_filter(query, retrieved_docs)
        
        # Step 2: 压缩增强
        compressed = self._compress(query, selected)
        
        return selected, compressed
    
    def _selective_filter(
        self, 
        query: str, 
        docs: List[str]
    ) -> List[str]:
        """选择性过滤"""
        if self.cross_encoder is None:
            # 如果没有 cross-encoder，使用 embedding 相似度
            query_emb = self.embed_model.encode(query)
            selected = []
            
            for doc in docs:
                doc_emb = self.embed_model.encode(doc)
                sim = cosine_similarity(query_emb, doc_emb)
                
                if sim >= self.relevance_threshold:
                    selected.append(doc)
            
            return selected
        
        # 使用 cross-encoder 进行更准确的相关性打分
        scores = self.cross_encoder.predict([(query, doc) for doc in docs])
        
        return [
            doc for doc, score in zip(docs, scores)
            if score >= self.relevance_threshold
        ]
    
    def _compress(self, query: str, docs: List[str]) -> List[str]:
        """压缩增强"""
        compressed = []
        
        for doc in docs:
            prompt = f"""
【任务】
根据给定的查询，从文档中提取最相关的内容，生成简短摘要。

【查询】
{query}

【文档】
{doc}

【要求】
1. 只保留与查询直接相关的内容
2. 压缩到原文的 {int(self.compression_ratio * 100)}% 左右
3. 保持信息的完整性和准确性
4. 使用中文输出

【摘要】
"""
            summary = self.llm.generate(prompt)
            compressed.append(summary)
        
        return compressed


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """计算余弦相似度"""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
```

### 3.5 总结压缩策略的代码示例

以下是结合了 MemGPT 思想 + RECOMP 压缩技术的完整实现：

```python
"""
完整的总结压缩记忆系统
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum


class CompressionStrategy(Enum):
    """压缩策略枚举"""
    NONE = "none"           # 不压缩
    TRUNCATE = "truncate"   # 简单截断
    SUMMARY = "summary"     # LLM 总结
    RECOMP = "recomp"       # RECOMP 风格


@dataclass
class MemoryItem:
    """记忆条目"""
    content: str
    timestamp: float
    importance: float  # 0.0 - 1.0
    category: str      # "fact", "preference", "task", etc.
    
    def to_string(self) -> str:
        return f"[{self.category}] {self.content}"


class SummarizedMemorySystem:
    """
    基于总结压缩的记忆系统
    
    特性：
    1. 分层记忆：原始记忆 -> 总结记忆 -> 核心记忆
    2. 支持多种压缩策略
    3. 重要性驱动的记忆管理
    """
    
    def __init__(
        self,
        llm,
        context_window: int = 4000,
        summary_trigger_tokens: int = 3000,
        core_memory_limit: int = 1000,
    ):
        self.llm = llm
        self.context_window = context_window
        self.summary_trigger_tokens = summary_trigger_tokens
        self.core_memory_limit = core_memory_limit
        
        # 存储层
        self.raw_memories: List[MemoryItem] = []  # 原始记忆
        self.summary: Optional[str] = None          # 总结记忆
        self.core_facts: List[str] = []           # 核心事实（永久保留）
        
        # 统计
        self.total_tokens = 0
    
    def add_memory(
        self, 
        content: str, 
        importance: float = 0.5,
        category: str = "general"
    ):
        """添加新记忆"""
        import time
        
        item = MemoryItem(
            content=content,
            timestamp=time.time(),
            importance=importance,
            category=category
        )
        
        self.raw_memories.append(item)
        self.total_tokens += len(content)
        
        # 高重要性内容直接进入核心事实
        if importance >= 0.9:
            self._add_to_core(content)
        
        # 检查是否需要触发总结
        if self.total_tokens >= self.summary_trigger_tokens:
            self._trigger_summarization()
    
    def _add_to_core(self, content: str):
        """添加内容到核心事实"""
        # 如果核心事实已满，移除最不重要的
        while len("; ".join(self.core_facts)) > self.core_memory_limit:
            if self.core_facts:
                self.core_facts.pop(0)
        
        self.core_facts.append(content)
    
    def _trigger_summarization(self):
        """触发总结操作"""
        if not self.raw_memories:
            return
        
        # 构建要总结的内容
        raw_content = "\n".join([
            f"- {m.to_string()}" 
            for m in self.raw_memories
        ])
        
        # LLM 总结
        prompt = f"""
请总结以下对话/记忆的要点：

{raw_content}

总结要求：
1. 提取关键信息和事实
2. 保留重要决策和结论
3. 标注用户偏好和需求
4. 控制在 500 tokens 以内
5. 使用要点格式

总结：
"""
        self.summary = self.llm.generate(prompt)
        
        # 清空原始记忆，保留总结
        # （实际实现中可以保留部分高重要性记忆）
        self.raw_memories = []
        self.total_tokens = len(self.summary)
    
    def get_context(self, current_input: str) -> str:
        """获取完整的上下文"""
        context_parts = []
        
        # 1. 核心事实（最重要）
        if self.core_facts:
            context_parts.append(
                "【核心事实】\n" + "; ".join(self.core_facts)
            )
        
        # 2. 总结记忆
        if self.summary:
            context_parts.append(
                f"【对话总结】\n{self.summary}"
            )
        
        # 3. 当前输入
        context_parts.append(
            f"【当前】\n{current_input}"
        )
        
        return "\n\n".join(context_parts)
    
    def search(self, query: str) -> List[str]:
        """搜索相关记忆"""
        results = []
        
        # 搜索核心事实
        for fact in self.core_facts:
            if query.lower() in fact.lower():
                results.append(fact)
        
        # 搜索总结（如果包含相关内容）
        if self.summary and query.lower() in self.summary.lower():
            results.append(self.summary)
        
        return results
```

---

## 4. 向量检索策略

### 4.1 核心原理

向量检索（Vector Retrieval）策略将**对话历史转换为向量表示**，存储在向量数据库中。当需要检索历史时，通过**向量相似度搜索**找到最相关的内容。

```
┌─────────────────────────────────────────────────────────────────┐
│                    向量检索工作原理                               │
│                                                                 │
│  ┌──────────────┐                         ┌──────────────┐    │
│  │  对话历史     │    Embedding Model      │  向量数据库   │    │
│  │              │  ────────────────────▶  │              │    │
│  │ 用户: 产品X   │    ["产品X", "价格",   │  [0.2, 0.8,  │    │
│  │ 助手: ¥999   │     "¥999", ...]        │   0.1, ...]  │    │
│  │ 用户: 规格？  │                         │              │    │
│  │ 助手: ...    │                         │  [0.9, 0.1,  │    │
│  └──────────────┘                         │   0.3, ...]  │    │
│                                            └──────────────┘    │
│                                                   │             │
│                                                   ▼             │
│  ┌──────────────┐    向量相似度                    ┌──────────┐  │
│  │ 当前查询      │  ──────────────────────────▶   │ Top-K    │  │
│  │              │                                 │ 检索结果  │  │
│  │ "X100多少钱？"│                                 │          │  │
│  └──────────────┘                                 │ • X100 ¥999│ │
│                                                   │ • X200 ¥888│ │
│                                                   └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 向量检索的优势

| 优势 | 说明 |
|------|------|
| **精确检索** | 可以根据语义相似度检索，而非简单的时间顺序 |
| **可扩展性** | 向量数据库可存储无限历史 |
| **灵活查询** | 支持复杂查询，如"找到关于X产品的所有讨论" |
| **上下文保持** | 即使对话很长，也能找到早期的重要信息 |
| **去重能力** | 相似的对话片段不会被重复保留 |

### 4.3 与滑动窗口的对比

| 维度 | 滑动窗口 | 向量检索 |
|------|---------|---------|
| **信息保留** | 只保留最近的 | 可保留全部历史 |
| **检索方式** | 时间顺序 | 语义相似度 |
| **关键信息丢失** | 必然丢失 | 可精确找回 |
| **实现复杂度** | 低 | 中-高 |
| **查询延迟** | O(1) | O(log n) ~ O(n) |
| **内存成本** | 固定 | 随数据量增长 |
| **适用场景** | 短期、简单任务 | 长期、复杂任务 |

### 4.4 向量检索实现代码

```python
"""
向量检索记忆系统实现
"""

from typing import List, Tuple, Optional
import numpy as np
from dataclasses import dataclass


@dataclass
class MemoryVector:
    """记忆向量条目"""
    content: str
    vector: np.ndarray
    metadata: dict  # 存储时间、来源等
    importance: float = 0.5


class VectorRetrievalMemory:
    """
    基于向量检索的记忆系统
    
    核心组件：
    1. Embedding 模型：将文本转为向量
    2. 向量索引：高效的相似度搜索
    3. 元数据存储：保留记忆的上下文信息
    """
    
    def __init__(
        self,
        embed_model,  # embedding 模型实例
        vector_dim: int = 1536,  # 向量维度（根据模型）
        top_k: int = 5,          # 默认检索条数
        similarity_threshold: float = 0.7  # 相似度阈值
    ):
        self.embed_model = embed_model
        self.vector_dim = vector_dim
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold
        
        # 存储
        self.memory_vectors: List[MemoryVector] = []
        self.vector_matrix: Optional[np.ndarray] = None  # 优化：预计算矩阵
    
    def add(
        self, 
        content: str, 
        metadata: dict = None,
        importance: float = 0.5
    ):
        """添加记忆"""
        # 生成向量
        vector = self.embed_model.encode(content)
        
        item = MemoryVector(
            content=content,
            vector=vector,
            metadata=metadata or {},
            importance=importance
        )
        
        self.memory_vectors.append(item)
        
        # 重建索引（实际实现应增量更新）
        self._rebuild_index()
    
    def search(
        self, 
        query: str, 
        top_k: Optional[int] = None,
        include_metadata: bool = False
    ) -> List[Tuple[str, float, dict]]:
        """
        语义检索
        
        Args:
            query: 查询文本
            top_k: 返回条数
            include_metadata: 是否返回元数据
        
        Returns:
            [(content, similarity_score, metadata), ...]
        """
        top_k = top_k or self.top_k
        
        # 查询向量
        query_vector = self.embed_model.encode(query)
        
        # 计算相似度
        scores = self._compute_similarities(query_vector)
        
        # 排序并返回 Top-K
        results = []
        indices = np.argsort(scores)[::-1][:top_k]
        
        for idx in indices:
            if scores[idx] >= self.similarity_threshold:
                item = self.memory_vectors[idx]
                if include_metadata:
                    results.append((item.content, float(scores[idx]), item.metadata))
                else:
                    results.append((item.content, float(scores[idx])))
        
        return results
    
    def _compute_similarities(self, query_vector: np.ndarray) -> np.ndarray:
        """计算查询与所有记忆的相似度"""
        if not self.memory_vectors:
            return np.array([])
        
        vectors = np.array([m.vector for m in self.memory_vectors])
        
        # 余弦相似度
        query_norm = np.linalg.norm(query_vector)
        vector_norms = np.linalg.norm(vectors, axis=1)
        
        similarities = np.dot(vectors, query_vector) / (vector_norms * query_norm + 1e-8)
        
        return similarities
    
    def _rebuild_index(self):
        """重建向量索引"""
        if self.memory_vectors:
            self.vector_matrix = np.array([
                m.vector for m in self.memory_vectors
            ])
    
    def delete_oldest(self, n: int = 10):
        """删除最早的 n 条记忆"""
        if n >= len(self.memory_vectors):
            self.memory_vectors = []
            self.vector_matrix = None
        else:
            self.memory_vectors = self.memory_vectors[n:]
            self._rebuild_index()
    
    def get_context(
        self, 
        current_input: str, 
        retrieval_top_k: Optional[int] = None
    ) -> str:
        """构建检索增强的上下文"""
        retrieval_top_k = retrieval_top_k or self.top_k
        
        # 检索相关记忆
        relevant = self.search(current_input, top_k=retrieval_top_k)
        
        if not relevant:
            return current_input
        
        # 组装上下文
        context_parts = ["【相关历史】"]
        
        for i, (content, score) in enumerate(relevant):
            context_parts.append(f"{i+1}. [{score:.2f}] {content}")
        
        context_parts.append("\n【当前输入】")
        context_parts.append(current_input)
        
        return "\n".join(context_parts)


# 向量数据库集成示例（使用 FAISS）
class FAISSVectorMemory(VectorRetrievalMemory):
    """
    使用 FAISS 加速的向量记忆
    
    FAISS 是 Facebook AI 开发的高效向量相似度搜索库
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        try:
            import faiss
            self.faiss_index = None
            self.use_faiss = True
        except ImportError:
            print("FAISS not installed, falling back to numpy")
            self.use_faiss = False
    
    def _rebuild_index(self):
        """重建 FAISS 索引"""
        if not self.use_faiss or not self.memory_vectors:
            super()._rebuild_index()
            return
        
        import faiss
        
        vectors = np.array([
            m.vector for m in self.memory_vectors
        ]).astype('float32')
        
        # 归一化（余弦相似度需要）
        faiss.normalize_L2(vectors)
        
        # 创建 IndexFlatIP（内积，等价于余弦相似度）
        self.faiss_index = faiss.IndexFlatIP(self.vector_dim)
        self.faiss_index.add(vectors)
    
    def search(
        self, 
        query: str, 
        top_k: Optional[int] = None,
        include_metadata: bool = False
    ) -> List[Tuple[str, float, dict]]:
        """使用 FAISS 进行高效检索"""
        if not self.use_faiss or self.faiss_index is None:
            return super().search(query, top_k, include_metadata)
        
        import faiss
        
        top_k = top_k or self.top_k
        
        # 查询向量
        query_vector = self.embed_model.encode(query).reshape(1, -1).astype('float32')
        faiss.normalize_L2(query_vector)
        
        # 搜索
        scores, indices = self.faiss_index.search(query_vector, top_k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.memory_vectors) and score >= self.similarity_threshold:
                item = self.memory_vectors[idx]
                if include_metadata:
                    results.append((item.content, float(score), item.metadata))
                else:
                    results.append((item.content, float(score)))
        
        return results
```

### 4.5 适用场景

向量检索策略最适合以下场景：

| 场景 | 适用性 | 说明 |
|------|--------|------|
| **长期任务** | ✅ 非常适合 | 可跨越任意长度的历史检索 |
| **多跳问答** | ✅ 适合 | 需要关联多个历史片段 |
| **主题查询** | ✅ 适合 | "找到所有关于X的讨论" |
| **复杂推理** | ✅ 适合 | 需要精确找回特定事实 |
| **实时性要求高** | ⚠️ 需要优化 | 检索有额外延迟 |
| **资源受限** | ⚠️ 谨慎使用 | 需要向量数据库资源 |
| **简单对话** | ❌ 过度设计 | 滑动窗口可能更高效 |

---

## 5. 选择性检索策略

### 5.1 选择性上下文（Selective Context）

**选择性上下文（Selective Context）** 是一种由 Li 等人提出的技术（arXiv:2310.06201），其核心思想是：**识别并移除输入上下文中的冗余信息，从而压缩输入长度**。

#### 5.1.1 核心原理

Selective Context 通过分析 token 序列的**信息密度**，识别并移除：
- 重复的 token 或短语
- 低信息量的填充词
- 对最终输出影响小的辅助内容

```
┌─────────────────────────────────────────────────────────────────┐
│                 Selective Context 工作原理                        │
│                                                                 │
│  原始输入：                                                     │
│  ┌─────────────────────────────────────────────────┐           │
│  │ "嗯...那个...我想问一下...就是...关于那个产品... │           │
│  │  呃...X100...就是...它的价格...嗯...是多少..."   │           │
│  └─────────────────────────────────────────────────┘           │
│                         │                                       │
│                         ▼ Selective Context 分析                │
│                         │                                       │
│  ┌─────────────────────────────────────────────────┐           │
│  │ 识别冗余：                                      │           │
│  │ • 填充词："嗯...那个...就是...呃..."           │           │
│  │ • 重复："就是...就是..."                       │           │
│  │ • 停用词："关于"、"的"、"了"                  │           │
│  └─────────────────────────────────────────────────┘           │
│                         │                                       │
│                         ▼ 移除冗余                              │
│  ┌─────────────────────────────────────────────────┐           │
│  │ 压缩结果：                                      │           │
│  │ "X100 价格"                                     │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  压缩率：~85%                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.1.2 Selective Context 的技术实现

```python
"""
Selective Context 实现

核心思想：
1. 使用 LLM 或规则识别上下文中的"冗余"部分
2. 移除冗余，保留核心信息
3. 在压缩后的上下文中进行推理
"""

from typing import List, Tuple
import re


class SelectiveContext:
    """
    选择性上下文压缩器
    
    方法：
    1. 基于规则：移除停用词、重复词
    2. 基于 IDF：移除高频低信息量词
    3. 基于 LLM：让 LLM 判断哪些内容可以移除
    """
    
    def __init__(
        self,
        llm=None,
        method: str = "hybrid",  # "rule", "idf", "llm", "hybrid"
        compression_ratio: float = 0.3  # 目标压缩到 30%
    ):
        self.llm = llm
        self.method = method
        self.compression_ratio = compression_ratio
        
        # 中文停用词（简化版）
        self.stopwords = {
            "的", "了", "在", "是", "我", "有", "和", "就", "不", "人",
            "都", "一", "一个", "上", "也", "很", "到", "说", "要",
            "去", "你", "会", "着", "没有", "看", "好", "自己", "这",
            "嗯", "呃", "那个", "就是", "然后", "其实", "可能", "大概"
        }
    
    def compress(self, text: str) -> str:
        """压缩文本"""
        if self.method == "rule":
            return self._rule_based_compress(text)
        elif self.method == "llm":
            return self._llm_based_compress(text)
        elif self.method == "hybrid":
            return self._hybrid_compress(text)
        else:
            return text
    
    def _rule_based_compress(self, text: str) -> str:
        """基于规则的压缩"""
        # 移除填充词和停用词
        words = text.split()
        filtered = [
            w for w in words 
            if w not in self.stopwords and len(w) > 1
        ]
        
        # 移除重复词
        deduplicated = self._deduplicate(filtered)
        
        return " ".join(deduplicated)
    
    def _llm_based_compress(self, text: str) -> str:
        """基于 LLM 的压缩"""
        if self.llm is None:
            raise ValueError("LLM required for LLM-based compression")
        
        prompt = f"""
请压缩以下文本，移除冗余信息，保留核心内容：

原文：
{text}

压缩要求：
1. 移除填充词、重复词
2. 保留关键信息和实体
3. 保持语义完整
4. 控制在原文的 {int(self.compression_ratio * 100)}% 以内

压缩结果：
"""
        return self.llm.generate(prompt).strip()
    
    def _hybrid_compress(self, text: str) -> str:
        """混合压缩：先用规则，再用 LLM 精修"""
        # Step 1: 规则预压缩
        precompressed = self._rule_based_compress(text)
        
        # 如果预压缩已经足够好，直接返回
        if len(precompressed) < len(text) * self.compression_ratio:
            return precompressed
        
        # Step 2: LLM 精修（如果可用）
        if self.llm:
            return self._llm_based_compress(text)
        
        return precompressed
    
    def _deduplicate(self, words: List[str]) -> List[str]:
        """移除相邻的重复词"""
        if not words:
            return []
        
        result = [words[0]]
        for w in words[1:]:
            if w != result[-1]:
                result.append(w)
        
        return result


# 使用示例
selector = SelectiveContext(method="rule")

original = """
嗯...那个...我想问一下...就是...关于那个产品...呃...X100...就是...
它的价格...嗯...是多少...那个...还有...就是...有没有优惠...
"""

compressed = selector.compress(original)
print(f"原文: {original}")
print(f"压缩后: {compressed}")
# 输出: X100 价格 有没有优惠
```

### 5.2 LLMLingua 压缩技术

**LLMLingua** 是微软研究院提出的prompt压缩技术（EMNLP 2023），后续有 **LLMLingua-2**（ACL 2024）改进版。其核心思想是：**使用一个小模型（如 GPT-2）来判断每个 token 的重要性，保留重要 token，移除不重要 token**。

#### 5.2.1 LLMLingua 核心原理

```
┌─────────────────────────────────────────────────────────────────┐
│                    LLMLingua 工作流程                           │
│                                                                 │
│  输入 Prompt                                                     │
│  ┌─────────────────────────────────────────────────┐           │
│  │ 系统: 你是助手...                                 │           │
│  │ 用户: 帮我写一个Python程序，实现快速排序          │           │
│  │      要求：1. 使用递归 2. 时间复杂度 O(nlogn)   │           │
│  │      3. 代码要注释详细 4. 附带测试用例           │           │
│  └─────────────────────────────────────────────────┘           │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────┐           │
│  │           重要性评分（GPT-2 小模型）              │           │
│  │                                                   │           │
│  │  "你是助手..."    → 0.2 (低，通用填充)           │           │
│  │  "帮我写..."      → 0.9 (高，用户意图)           │           │
│  │  "Python程序"    → 0.95 (高，关键实体)           │           │
│  │  "快速排序"       → 0.95 (高，核心需求)           │           │
│  │  "递归"           → 0.8 (高，需求细节)           │           │
│  │  "注释详细"       → 0.7 (中，需求细节)           │           │
│  │  "还有..."        → 0.1 (低，连接词)             │           │
│  └─────────────────────────────────────────────────┘           │
│                          │                                      │
│                          ▼ 按重要性排序 + 截断                   │
│  ┌─────────────────────────────────────────────────┐           │
│  │ 保留 Top-50% 的高重要性 token                   │           │
│  │                                                   │           │
│  │ "帮我写Python程序快速排序，要求使用递归，        │           │
│  │  时间复杂度Ologn，代码注释详细，附带测试用例"    │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  压缩率：~50%                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.2.2 LLMLingua 代码示例

```python
"""
LLMLingua 风格压缩实现

核心思想：
1. 使用小模型（瓜藤/Llama）评估每个 token 的"条件概率"
2. 条件概率低的 token = 容易被预测 = 信息量少 = 可移除
3. 按重要性排序后截断
"""

from typing import List, Tuple
import math


class LLMLinguaCompressor:
    """
    LLMLingua 风格的 prompt 压缩器
    
    使用困惑度（Perplexity）或类似指标评估 token 重要性
    """
    
    def __init__(
        self,
        small_model,  # 用于评估的小模型（如 GPT-2, Llama）
        target_compression: float = 0.5,  # 目标压缩率
        method: str = "perplexity"  # "perplexity", "attention", "gradient"
    ):
        self.small_model = small_model
        self.target_compression = target_compression
        self.method = method
    
    def compress(
        self, 
        prompt: str, 
        return_scores: bool = False
    ) -> str | Tuple[str, List[float]]:
        """
        压缩 prompt
        
        Returns:
            压缩后的 prompt，或者 (压缩后 prompt, token_scores)
        """
        # 分词
        tokens = self.small_model.tokenize(prompt)
        
        # 计算每个 token 的重要性分数
        scores = self._compute_importance_scores(tokens)
        
        # 按分数排序，选择高重要性的
        ranked_indices = sorted(
            range(len(scores)), 
            key=lambda i: scores[i], 
            reverse=True
        )
        
        # 保留 Top-K
        keep_count = int(len(tokens) * self.target_compression)
        keep_indices = set(ranked_indices[:keep_count])
        
        # 重建序列（保持原始顺序）
        kept_tokens = [
            (i, tokens[i]) 
            for i in range(len(tokens)) 
            if i in keep_indices
        ]
        kept_tokens.sort(key=lambda x: x[0])
        
        result_tokens = [t for _, t in kept_tokens]
        compressed = self.small_model.detokenize(result_tokens)
        
        if return_scores:
            return compressed, scores
        return compressed
    
    def _compute_importance_scores(self, tokens: List[str]) -> List[float]:
        """计算每个 token 的重要性分数"""
        if self.method == "perplexity":
            return self._perplexity_scores(tokens)
        elif self.method == "attention":
            return self._attention_scores(tokens)
        elif self.method == "gradient":
            return self._gradient_scores(tokens)
        else:
            # 均匀分数
            return [1.0] * len(tokens)
    
    def _perplexity_scores(self, tokens: List[str]) -> List[float]:
        """
        基于困惑度的评分
        
        核心思想：
        - 高困惑度 = 难以预测 = 信息量大 = 重要
        - 低困惑度 = 容易预测 = 冗余 = 可移除
        """
        scores = []
        
        for i in range(len(tokens)):
            # 计算 token i 的条件困惑度
            context = tokens[:i]
            target = tokens[i]
            
            # 简化：用模型预测 target 的概率
            prob = self.small_model.predict_probability(context, target)
            
            # 转换为分数（概率越高越不重要）
            score = -math.log(prob + 1e-8)  # 负对数概率
            scores.append(score)
        
        # 归一化
        max_score = max(scores) if scores else 1
        return [s / max_score for s in scores]
    
    def _attention_scores(self, tokens: List[str]) -> List[float]:
        """基于注意力分数的评分"""
        # 使用小模型的前向传播，获取注意力权重
        attention_weights = self.small_model.get_attention(tokens)
        
        # 对每个 token，取其平均注意力分数
        scores = attention_weights.mean(axis=(0, 1)).tolist()
        
        return scores
    
    def _gradient_scores(self, tokens: List[str]) -> List[float]:
        """基于梯度（影响力）的评分"""
        # 需要一个小型的监督信号
        # 这里简化处理
        raise NotImplementedError("Gradient method requires more setup")


# LLMLingua 实际使用示例
def llmlingua_usage_example():
    """
    实际使用 LLMLingua 的示例
    
    需要安装: pip install llmlingua
    """
    try:
        from llmlingua import PromptCompressor
        
        compressor = PromptCompressor(
            model_name="microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
            device_map="cpu"
        )
        
        # 原始 prompt
        prompt = """
系统提示：你是一个专业的Python编程助手。

用户：帮我写一个Python程序，实现快速排序算法。要求：
1. 使用递归实现
2. 时间复杂度要达到 O(n log n)
3. 代码要有详细的中文注释
4. 需要包含测试用例
5. 最好能处理各种边界情况，比如空列表、单元素列表等
6. 如果可以的话，尝试使用列表推导式让代码更简洁

请给出完整的代码实现。
"""
        
        # 压缩（保留 50%）
        compressed = compressor.compress_prompt(
            prompt,
            rate=0.5,  # 压缩到 50%
            force_return_context=True
        )
        
        print("原始长度:", len(prompt))
        print("压缩后:", compressed)
        
    except ImportError:
        print("LLMLingua 未安装，使用简化版实现")


# 完整的选择性检索系统
class SelectiveRetrievalSystem:
    """
    结合选择性上下文和向量检索的混合系统
    
    流程：
    1. 输入 -> 选择性压缩
    2. 压缩后查询 -> 向量检索
    3. 检索结果 -> 送入 LLM
    """
    
    def __init__(
        self,
        selective_compressor: SelectiveContext,
        vector_memory: VectorRetrievalMemory,
        llm
    ):
        self.selective = selective_compressor
        self.vector = vector_memory
        self.llm = llm
    
    def query(self, user_input: str) -> str:
        """处理用户查询"""
        # Step 1: 选择性压缩用户输入
        compressed_input = self.selective.compress(user_input)
        
        # Step 2: 向量检索相关历史
        relevant_history = self.vector.search(compressed_input, top_k=5)
        
        # Step 3: 构建上下文
        context_parts = ["【相关历史】"]
        for content, score in relevant_history:
            context_parts.append(f"[{score:.2f}] {content}")
        
        context_parts.append(f"\n【当前问题】\n{compressed_input}")
        
        context = "\n".join(context_parts)
        
        # Step 4: LLM 生成回答
        response = self.llm.generate(context)
        
        return response
    
    def add_to_memory(self, user_input: str, assistant_response: str):
        """添加对话到记忆"""
        combined = f"用户: {user_input}\n助手: {assistant_response}"
        
        # 压缩后存储
        compressed = self.selective.compress(combined)
        
        self.vector.add(
            content=compressed,
            metadata={
                "user": user_input,
                "assistant": assistant_response
            }
        )
```

### 5.3 选择性检索 vs 其他策略

| 维度 | 选择性检索 | 滑动窗口 | 总结压缩 | 向量检索 |
|------|-----------|---------|---------|---------|
| **压缩粒度** | Token 级 | Document 级 | Document 级 | Document 级 |
| **信息保留** | 选择性保留 | 最近 N 个 | 压缩摘要 | 可全部保留 |
| **语义完整性** | ⚠️ 可能破坏 | ✅ 保持 | ⚠️ 可能失真 | ✅ 完整 |
| **计算成本** | 中 | 低 | 高 | 中-高 |
| **适用场景** | 实时压缩 | 简单任务 | 需要摘要 | 精确检索 |

### 5.4 代码示例：完整的选择性检索系统

```python
"""
选择性检索策略的完整实现
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import re


class CompressionLevel(Enum):
    """压缩级别"""
    LIGHT = 0.3      # 轻度压缩：保留 70%
    MEDIUM = 0.5     # 中度压缩：保留 50%
    HEAVY = 0.2      # 重度压缩：保留 20%


@dataclass
class SelectiveResult:
    """选择性处理结果"""
    original: str
    compressed: str
    removed: List[str]
    compression_ratio: float


class SelectiveRetrieval:
    """
    选择性检索系统
    
    结合多种压缩技术：
    1. 填充词移除
    2. 重复检测
    3. 核心信息提取
    4. 向量检索
    """
    
    def __init__(
        self,
        llm=None,
        vector_store=None,
        compression_level: CompressionLevel = CompressionLevel.MEDIUM
    ):
        self.llm = llm
        self.vector_store = vector_store
        self.compression_level = compression_level
        
        # 填充词模式
        self.filler_patterns = [
            r'嗯+', r'呃+', r'啊+', r'那个+', r'就是+',
            r'然后+', r'其实+', r'可能+', r'大概+',
            r'\.{3,}', r'，+，'  # 连续标点
        ]
        
        # 停用词
        self.stopwords = {
            "的", "了", "在", "是", "我", "有", "和", "就", "不", "人",
            "都", "一", "一个", "上", "也", "很", "到", "说", "要",
            "去", "你", "会", "着", "没有", "看", "好", "自己", "这",
            "那个", "就是", "然后", "其实", "可能", "大概", "的话"
        }
    
    def selective_compress(self, text: str) -> SelectiveResult:
        """
        选择性压缩
        
        流程：
        1. 移除填充词
        2. 移除重复词
        3. 可选：LLM 提取核心
        """
        original = text
        removed = []
        
        # Step 1: 移除填充词
        for pattern in self.filler_patterns:
            matches = re.findall(pattern, text)
            removed.extend(matches)
            text = re.sub(pattern, '', text)
        
        # Step 2: 分词并移除停用词
        words = text.split()
        meaningful = []
        for w in words:
            if w not in self.stopwords and len(w) > 1:
                meaningful.append(w)
            else:
                removed.append(w)
        
        # Step 3: 移除重复词（相邻）
        deduplicated = []
        prev = None
        for w in meaningful:
            if w != prev:
                deduplicated.append(w)
                prev = w
        
        # Step 4: LLM 精修（如果可用）
        if self.llm and len(deduplicated) > 10:
            compressed = self._llm_refine(" ".join(deduplicated))
        else:
            compressed = " ".join(deduplicated)
        
        # 计算压缩率
        compression_ratio = len(compressed) / max(len(original), 1)
        
        return SelectiveResult(
            original=original,
            compressed=compressed,
            removed=removed,
            compression_ratio=compression_ratio
        )
    
    def _llm_refine(self, text: str) -> str:
        """LLM 精炼"""
        if self.llm is None:
            return text
        
        prompt = f"""
请简化以下文本，移除冗余，保留核心信息：

{text}

简化要求：
1. 保留关键实体和动作
2. 移除重复表达
3. 保持通顺
4. 越简短越好

简化结果：
"""
        
        return self.llm.generate(prompt).strip()
    
    def process(
        self, 
        query: str, 
        retrieval_top_k: int = 5
    ) -> Tuple[str, List[Dict]]:
        """
        完整的选择性检索流程
        
        Returns:
            (context_for_llm, retrieved_items)
        """
        # Step 1: 选择性压缩查询
        compressed_query = self.selective_compress(query).compressed
        
        # Step 2: 向量检索（如果可用）
        retrieved = []
        if self.vector_store:
            retrieved = self.vector_store.search(
                compressed_query, 
                top_k=retrieval_top_k,
                include_metadata=True
            )
        
        # Step 3: 构建上下文
        context_parts = []
        
        if retrieved:
            context_parts.append("【相关历史】")
            for i, item in enumerate(retrieved):
                content = item["content"] if isinstance(item, dict) else item
                score = item.get("score", 0) if isinstance(item, dict) else 0
                context_parts.append(f"{i+1}. [{score:.2f}] {content}")
            context_parts.append("")
        
        context_parts.append(f"【当前问题】\n{compressed_query}")
        
        context = "\n".join(context_parts)
        
        return context, retrieved
    
    def add_to_store(
        self, 
        user_input: str, 
        assistant_output: str,
        metadata: Optional[Dict] = None
    ):
        """添加对话到向量存储"""
        if self.vector_store is None:
            return
        
        combined = f"问：{user_input}\n答：{assistant_output}"
        compressed = self.selective_compress(combined).compressed
        
        self.vector_store.add(
            content=compressed,
            metadata={
                **(metadata or {}),
                "original": combined
            }
        )


# 使用示例
def demo_selective_retrieval():
    """演示选择性检索系统的使用"""
    
    # 初始化（需要实际的 LLM 和向量存储）
    # system = SelectiveRetrieval(
    #     llm=your_llm,
    #     vector_store=your_vector_store,
    #     compression_level=CompressionLevel.MEDIUM
    # )
    
    # 示例输入
    user_input = """
    嗯...那个...我想问一下...就是...
    你们那个...X100产品...它的价格...嗯...
    还有就是...有没有优惠...呃...
    如果买多个的话...那个...能不能便宜点...
    那个...还有...
    """
    
    print("原始输入:")
    print(user_input)
    print()
    
    # 模拟压缩
    selector = SelectiveRetrieval()
    result = selector.selective_compress(user_input)
    
    print("压缩后:")
    print(result.compressed)
    print()
    
    print(f"压缩率: {result.compression_ratio:.1%}")
    print(f"移除内容: {result.removed[:10]}...")  # 只显示前10个
```

---

## 6. 方案对比总结

### 6.1 各方案优劣势对比

| 策略 | 优势 | 劣势 | 压缩效果 | 计算成本 |
|------|------|------|---------|---------|
| **滑动窗口** | 实现简单、无额外依赖、延迟稳定 | 必然丢失早期信息、无选择性 | ~50-80% | ⭐ 极低 |
| **总结压缩** | 保留核心信息、可处理任意长度 | LLM 调用成本高、可能失真 | ~80-95% | ⭐⭐⭐⭐ 高 |
| **向量检索** | 可精确找回任意历史、语义相关 | 实现复杂、检索延迟 | ~0%（不减输入） | ⭐⭐⭐ 中-高 |
| **选择性检索** | Token 级压缩、保持结构 | 可能破坏语义、需要小模型 | ~40-60% | ⭐⭐ 中 |
| **MemGPT 分层** | 模拟 OS 内存管理、可扩展 | 实现复杂、需要多个组件 | ~70-90% | ⭐⭐⭐⭐ 高 |

### 6.2 核心维度对比表

| 维度 | 滑动窗口 | 总结压缩 | 向量检索 | 选择性检索 | MemGPT |
|------|---------|---------|---------|-----------|--------|
| **实现复杂度** | ⭐ 低 | ⭐⭐ 中 | ⭐⭐⭐ 高 | ⭐⭐⭐ 中 | ⭐⭐⭐⭐ 高 |
| **信息保留完整性** | ❌ 低 | ⚠️ 中 | ✅ 高 | ⚠️ 中 | ✅ 高 |
| **检索精确度** | ❌ 无检索 | ⚠️ 摘要检索 | ✅ 语义检索 | ⚠️ 模糊 | ✅ 智能 |
| **实时性** | ⚡ 极高 | 🐢 低 | 🐢 中 | ⚡ 高 | 🐢 中 |
| **扩展性** | ❌ 差 | ✅ 好 | ✅ 极好 | ✅ 好 | ✅ 极好 |
| **Token 节省** | 50-80% | 80-95% | 0% | 40-60% | 70-90% |
| **是否丢信息** | 必然丢失 | 可能失真 | 不丢 | 部分丢失 | 可控 |
| **适用场景** | 短期/简单 | 长期/摘要 | 精确检索 | 实时压缩 | 复杂/长期 |

### 6.3 选择决策树

```
┌─────────────────────────────────────────────────────────────────┐
│                  长上下文优化策略选择决策树                        │
│                                                                 │
│                    开始                                          │
│                      │                                          │
│                      ▼                                          │
│          ┌───────────────────────┐                              │
│          │ 对话是否需要跨长窗口  │                              │
│          │ 引用早期重要信息？    │                              │
│          └───────────────────────┘                              │
│                 │            │                                  │
│                是           否                                   │
│                 │            │                                  │
│                 ▼            ▼                                   │
│    ┌─────────────────┐  ┌─────────────────┐                   │
│    │ 信息重要性是否    │  │ 任务复杂度？     │                   │
│    │ 差异明显？        │  └─────────────────┘                   │
│    └─────────────────┘     │            │                       │
│       │         │         是           否                        │
│      是         否         │            │                       │
│       │         │         ▼            ▼                       │
│       ▼         ▼  ┌─────────────┐ ┌─────────────┐             │
│    ┌──────┐  ┌────┴─────┐     │滑动窗口     │               │
│    │向量检索│  │任务简单？│     │(最简单)     │               │
│    │      │  └──────────┘     └─────────────┘               │
│    │ +可选│     │                                              │
│    │总结压缩│   简单                                            │
│    └──────┘    │                                              │
│       │        ▼                                              │
│       │  ┌─────────────┐                                       │
│       │  │ 滑动窗口    │                                       │
│       │  │ (推荐)      │                                       │
│       │  └─────────────┘                                       │
│       │                                                        │
│       ▼                                                        │
│  ┌─────────────────┐                                          │
│  │ 任务需要实时响应？│                                          │
│  └─────────────────┘                                          │
│       │         │                                              │
│      是         否                                              │
│       │         │                                              │
│       ▼         ▼                                              │
│  ┌──────────┐ ┌──────────────┐                                 │
│  │选择性检索│ │ 总结压缩     │                                 │
│  │(快速)    │ │ (高质量)     │                                 │
│  └──────────┘ └──────────────┘                                 │
│                      │                                          │
│                      ▼                                          │
│               ┌──────────────┐                                 │
│               │ MemGPT 分层  │                                 │
│               │ (最完整)     │                                 │
│               └──────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 选型建议

| 应用场景 | 推荐策略 | 理由 |
|---------|---------|------|
| **客服对话（短期）** | 滑动窗口 | 对话简单独立，无需跨轮检索 |
| **客服对话（长期）** | 向量检索 + 选择性检索 | 需要保留客户信息，支持查询历史 |
| **个人助手** | MemGPT 分层 | 需要长期记忆，支持多种任务 |
| **代码助手** | 总结压缩 + 向量检索 | 需要精确找回代码片段，技术文档长 |
| **研究助手** | 向量检索 + 总结压缩 | 需要跨大量文档检索，生成摘要 |
| **实时聊天机器人** | 选择性检索 | 需要低延迟，保持上下文 |
| **多轮对话系统** | 滑动窗口 + 核心记忆 | 简单有效，保留关键信息 |

### 6.5 混合策略建议

实际应用中，**往往需要组合多种策略**：

```
┌─────────────────────────────────────────────────────────────────┐
│                    推荐的混合架构                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      用户输入                            │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Layer 1: 快速选择性压缩                      │   │
│  │         （填充词移除 + 停用词过滤，毫秒级）               │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                     │
│              ┌─────────────┴─────────────┐                      │
│              │                           │                      │
│              ▼                           ▼                      │
│  ┌───────────────────┐     ┌───────────────────┐              │
│  │  Layer 2A:        │     │  Layer 2B:        │              │
│  │  向量检索          │     │  滑动窗口          │              │
│  │  (语义相关历史)    │     │  (近期对话)        │              │
│  └─────────┬─────────┘     └─────────┬─────────┘              │
│            │                         │                        │
│            └───────────┬─────────────┘                        │
│                        │                                      │
│                        ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Layer 3: 上下文组装                         │   │
│  │   核心记忆 + 检索结果 + 近期对话 + 当前输入                │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      LLM 推理                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 参考文献

### 7.1 核心论文

1. **RECOMP: Improving Retrieval-Augmented LMs with Compression and Selective Augmentation**
   > Xu, F., Shi, W., & Choi, E. (2024). *RECOMP: Improving Retrieval-Augmented Language Models with Compression and Selective Augmentation*. ICLR 2024.
   >
   > - arXiv: [2310.04408](https://arxiv.org/abs/2310.04408)
   > - OpenReview: [ICLR 2024](https://openreview.net/forum?id=mlJLVigNHp)
   >
   > **核心贡献**：提出两种互补的上下文压缩技术——选择性增强（Selective Augmentation）和压缩增强（Compression Augmentation），显著提升检索增强语言模型的效率。

2. **MemGPT: Towards LLMs as Operating Systems**
   > Packer, C. et al. (2023). *MemGPT: Towards LLMs as Operating Systems*. arXiv:2310.08560.
   >
   > - arXiv: [2310.08560](https://arxiv.org/abs/2310.08560)
   > - GitHub: [cpacker/MemGPT](https://github.com/cpacker/memgpt)
   > - 后续项目: [Letta](https://github.com/letta-ai/letta)
   >
   > **核心贡献**：引入分层记忆架构（核心记忆 + 外部记忆），让 LLM 能够管理"无限"上下文，模拟操作系统的内存管理机制。

3. **LLMLingua: Innovating LLM Efficiency with Prompt Compression**
   > Microsoft Research (2023). *LLMLingua: Efficient Prompt Compression*.
   >
   > - Paper: [arXiv:2310.12968](https://arxiv.org/abs/2310.12968)
   > - Project Page: [llmlingua.com](https://llmlingua.com)
   >
   > **核心贡献**：使用小模型（GPT-2）评估 token 重要性，实现 2-20 倍的 prompt 压缩，同时保持核心语义。

4. **LLMLingua-2: Efficient and Faithful Task-Agnostic Prompt Compression**
   > Pan, Z., et al. (2024). *LLMLingua-2: Learn Compression Target via Data Distillation*. ACL 2024.
   >
   > - arXiv: [2403.12968](https://arxiv.org/abs/2403.12968)
   > - Demo: [HuggingFace Space](https://huggingface.co/spaces/microsoft/llmlingua-2)
   >
   > **核心贡献**：使用数据蒸馏方法学习压缩目标，提升压缩的忠实度（faithfulness）。

5. **Compressing Context to Enhance Inference Efficiency of Large Language Models**
   > Li, Y., et al. (2023). *Compressing Context to Enhance Inference Efficiency*. EMNLP 2023.
   >
   > - arXiv: [2310.06201](https://arxiv.org/abs/2310.06201)
   > - GitHub: [liyucheng09/Selective_Context](https://github.com/liyucheng09/Selective_Context)
   >
   > **核心贡献**：提出选择性上下文压缩，通过识别和移除冗余信息来提升推理效率。

### 7.2 相关论文

6. **Selective Context for LLMs**
   > Li, Y., et al. (2023). GitHub Repository.
   >
   > - GitHub: [liyucheng09/Selective_Context](https://github.com/liyucheng09/Selective_Context)
   > - Stars: 414+
   >
   > **内容**：压缩 ChatGPT 等 LLM 的输入上下文，节省 40% 的内存和 GPU 时间。

7. **SCA: Selective Compression Attention for Extending Context Window**
   > Zheng, H., et al. (2024). *SCA: Selective Compression Attention*. EMNLP Findings 2024.
   >
   > - ACL Anthology: [2024.findings-emnlp.358](https://aclanthology.org/2024.findings-emnlp.358/)
   >
   > **核心贡献**：通过选择性压缩注意力机制扩展 LLM 的上下文窗口。

### 7.3 工具和实现

| 工具/库 | 描述 | 链接 |
|---------|------|------|
| **Letta (MemGPT)** | MemGPT 的生产级实现，支持多种 LLM | [github.com/letta-ai/letta](https://github.com/letta-ai/letta) |
| **LLMLingua** | 微软研究院的 prompt 压缩库 | [llmlingua.com](https://llmlingua.com) |
| **Selective Context** | 选择性上下文压缩实现 | [GitHub](https://github.com/liyucheng09/Selective_Context) |
| **FAISS** | Facebook AI 的向量相似度搜索库 | [github.com/facebookresearch/faiss](https://github.com/facebookresearch/faiss) |
| **ChromaDB** | 向量数据库 | [chromadb.com](https://chromadb.com) |
| **Qdrant** | 高性能向量数据库 | [qdrant.tech](https://qdrant.tech) |
| **Pinecone** | 云向量数据库服务 | [pinecone.io](https://pinecone.io) |

### 7.4 延伸阅读

- [Managing Memory in AI Agents: Beyond the Context Window](https://arize.com/blog/how-to-manage-llm-context-windows-for-ai-agents/) — Arize AI 博客
- [Context Window Management Techniques](https://www.ai-agentsplus.com/blog/ai-context-window-management-2026) — AI Agents Plus
- [MemGPT with Real-life Example](https://www.digitalocean.com/community/tutorials/memgpt-llm-infinite-context-understanding) — DigitalOcean 教程
- [LongLLMLingua: Accelerating LLMs in Long Context](https://aclanthology.org/2024.acl-long.91.pdf) — ACL 2024

---

## 附录：代码速查表

### A.1 滑动窗口（最简实现）

```python
class SlidingWindow:
    def __init__(self, max_tokens=4000):
        self.max_tokens = max_tokens
        self.history = []
    
    def add(self, user, assistant):
        self.history.append((user, assistant))
        while self._tokens() > self.max_tokens:
            self.history.pop(0)
    
    def get_context(self):
        return "\n".join([f"U:{u}\nA:{a}" for u,a in self.history])
```

### A.2 向量检索（FAISS）

```python
import faiss
import numpy as np

class VectorMemory:
    def __init__(self, dim=1536):
        self.index = faiss.IndexFlatIP(dim)
        self.items = []
    
    def add(self, text, embedding):
        faiss.normalize_L2(embedding.reshape(1,-1))
        self.index.add(embedding.reshape(1,-1))
        self.items.append(text)
    
    def search(self, query_emb, k=5):
        faiss.normalize_L2(query_emb.reshape(1,-1))
        _, indices = self.index.search(query_emb.reshape(1,-1), k)
        return [self.items[i] for i in indices[0]]
```

### A.3 选择性压缩

```python
class SelectiveCompress:
    def __init__(self, llm=None):
        self.llm = llm
        self.stopwords = {"的", "了", "嗯", "那个", "就是"}
    
    def compress(self, text):
        words = text.split()
        filtered = [w for w in words if w not in self.stopwords]
        return " ".join(filtered)
```

---

*本文档为 LLM Agent 架构调研系列 Q7，探讨长上下文优化策略。*
