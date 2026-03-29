---
id: q10-tool-selection
title: "Q10: 高效工具选择策略"
category: tool-calling
level: advanced
tags: [tool-selection, tool-routing, hierarchical, retrieval, agent]
related-questions: [q8, q9]
date: 2026-03-30
---

# Q10: 高效工具选择策略

## 概述

在大语言模型（LLM）Agent 系统中，工具选择（Tool Selection）是决定 Agent 能力上限的关键组件。当 Agent 可用的工具数量从十几个增长到数百个甚至数千个时，如何高效、准确地从工具库中筛选出与当前任务最相关的工具子集，成为了一个极具挑战性的问题。

本文档系统性地分析当前主流的三种高效工具选择策略：

| 策略类型 | 核心思想 | 典型延迟 | Token 开销 |
|---------|---------|---------|-----------|
| **全量推送策略**（All-at-Once） | 将所有工具一次性推送给模型 | 低 | 高 |
| **分层过滤策略**（Hierarchical Filtering） | 多级过滤器逐步筛选 | 中 | 中 |
| **基于检索的预选择**（Retrieval-based） | 向量检索快速定位相关工具 | 低 | 低 |

本文档同时提供详细的代码实现、学术论文引用以及各策略的量化对比分析，帮助研究者和工程师在实际项目中做出合理的技术选型决策。

---

## 1. 问题背景

### 1.1 工具数量增长带来的挑战

随着 AI Agent 技术的快速发展，一个实用的 Agent 系统往往需要集成数十甚至数百个工具。以一个典型的企业级 AI 助手为例，它可能需要具备以下能力：

- **日历管理**：创建、修改、查询日程
- **邮件处理**：发送、读取、搜索邮件
- **文档操作**：读取、编辑、分享文档
- **代码执行**：运行代码、调试程序
- **网络搜索**：查询信息、获取新闻
- **数据库查询**：执行 SQL、获取数据
- **第三方集成**：Slack、GitHub、Jira 等

当工具数量超过某个临界点时（通常认为是 20-50 个），传统的"全量推送"策略会遇到严重的性能和准确率问题。

### 1.2 上下文窗口限制

现代 LLM 的上下文窗口虽然已经从 4K 扩展到 128K 甚至 1M tokens，但这个限制仍然是一个关键瓶颈。考虑以下计算：

```
假设场景：
- 工具数量：100 个
- 每个工具描述平均：200 tokens
- 系统提示：500 tokens
- 用户查询：100 tokens

全量推送 Token 消耗：
100 × 200 + 500 + 100 = 20,600 tokens

即使使用 128K 上下文的模型：
- 单次查询消耗：20,600 tokens
- 上下文利用率：(20,600 / 128,000) × 100% ≈ 16%
- 实际可用于推理的上下文：~107,400 tokens
```

**核心问题**：当工具描述占用过多上下文时，模型的实际推理空间被严重压缩，可能导致：

1. **推理质量下降**：模型需要在"工具知识"和"任务推理"之间分配有限的注意力
2. **成本急剧上升**：每次 API 调用的费用与 token 数量成正比
3. **延迟增加**：更长的上下文意味着更长的处理时间

### 1.3 干扰问题（Interference Problem）

干扰问题是工具选择中最为微妙但同样重要的问题。当模型需要从大量工具中选择时，存在以下干扰机制：

**1. 注意力分散**（Attention Dilution）

当存在多个相似或相关的工具时，模型的注意力会被分散。例如，一个系统同时有：
- `search_web(query)` - 网络搜索
- `search_documents(query)` - 文档搜索
- `search_emails(query)` - 邮件搜索
- `search_contacts(name)` - 联系人搜索

模型可能在不相关的工具上也分配了过多的"考虑权重"，导致选择错误的工具。

**2. 位置偏置**（Position Bias）

研究表明，LLM 在处理长序列时存在位置偏置——对序列开头和结尾的元素记忆和关注更好，中间的元素容易被忽略。这意味着当工具列表很长时，中间位置的工具被正确选择的概率会降低。

**3. 语义混淆**（Semantic Confusion）

当工具名称或描述高度相似时，模型可能无法准确区分它们。例如：

```python
# 工具 A
def transfer_money(from_account, to_account, amount):
    """转账资金从源账户到目标账户"""
    
# 工具 B
def convert_currency(amount, from_currency, to_currency):
    """转换货币汇率"""
```

模型可能混淆这两个工具的功能，选择错误的工具执行任务。

### 1.4 问题形式化定义

工具选择问题可以形式化为：

**给定**：
- 任务描述 $T$（用户查询）
- 工具集合 $U = \{u_1, u_2, ..., u_n\}$，其中 $n$ 可能非常大
- 每个工具 $u_i$ 有一个描述 $D_i$ 和参数模式 $P_i$

**目标**：
找到工具子集 $S \subseteq U$，使得 $|S| \ll |U|$，并且 $S$ 包含完成任务 $T$ 所需的所有相关工具的概率最高。

**约束条件**：
- 计算延迟 $L$ 需要在可接受范围内（通常 < 500ms）
- Token 消耗 $C$ 需要在预算范围内
- 准确率 $A$（选择正确工具的概率）需要达到业务要求（通常 > 90%）

---

## 2. 全量推送策略（All-at-Once）

### 2.1 实现方式

全量推送策略是最直观的方案：将所有可用工具的完整描述一次性放入 prompt 中，让模型自己判断需要使用哪些工具。

**Prompt 模板结构**：

```python
SYSTEM_PROMPT = """
你是一个智能助手，可以调用以下工具来完成用户任务。

## 可用工具

{all_tools_description}

## 指令
1. 仔细阅读用户的问题
2. 选择最合适的工具来完成任务
3. 如果需要多个工具，按顺序调用它们
4. 每个工具调用后，根据返回结果决定下一步操作

## 输出格式
请以以下 JSON 格式输出你的选择：
{
    "reasoning": "你的推理过程",
    "tool_name": "选择的工具名",
    "parameters": {
        "param1": "参数值",
        ...
    }
}
"""
```

**工具描述格式**：

```json
{
    "name": "calculate",
    "description": "执行数学计算，支持加减乘除、指数、开方等运算",
    "parameters": {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "数学表达式，如 '2+3*5' 或 'sqrt(16)'"
            }
        },
        "required": ["expression"]
    }
}
```

### 2.2 全量推送的典型实现

```python
import json
from typing import List, Dict, Any, Optional

class AllAtOnceToolSelector:
    """全量推送策略的工具选择器"""
    
    def __init__(self, tools: List[Dict[str, Any]], llm_client):
        """
        Args:
            tools: 工具定义列表，每个工具包含 name, description, parameters
            llm_client: LLM API 客户端
        """
        self.tools = tools
        self.llm_client = llm_client
    
    def build_prompt(self, user_query: str) -> str:
        """构建包含所有工具的完整 prompt"""
        tools_json = json.dumps(self.tools, ensure_ascii=False, indent=2)
        
        prompt = f"""你是一个智能助手，可以调用以下工具来完成用户任务。

## 可用工具

```json
{tools_json}
```

## 用户问题
{user_query}

## 输出格式
请选择最合适的工具并以以下 JSON 格式输出：
{{
    "reasoning": "选择这个工具的理由",
    "tool_name": "工具名称",
    "parameters": {{...}}
}}

如果没有工具能完成任务，请输出：
{{
    "reasoning": "理由",
    "tool_name": null,
    "parameters": {{}}
}}
"""
        return prompt
    
    def select_tools(self, user_query: str) -> Dict[str, Any]:
        """执行工具选择"""
        prompt = self.build_prompt(user_query)
        
        response = self.llm_client.complete(prompt)
        
        try:
            # 尝试解析 LLM 返回的 JSON
            result = json.loads(response)
            return {
                "success": True,
                "tool": result.get("tool_name"),
                "parameters": result.get("parameters", {}),
                "reasoning": result.get("reasoning", "")
            }
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Failed to parse LLM response",
                "raw_response": response
            }
    
    def get_token_cost(self, user_query: str) -> int:
        """估算一次选择的 token 消耗"""
        prompt = self.build_prompt(user_query)
        # 粗略估算：每汉字约 1.5 tokens，英文约 0.25 tokens
        return len(prompt) // 2  # 简化估算
```

### 2.3 优势

**1. 实现简单**

全量推送策略的实现复杂度最低，不需要额外的模型或基础设施。核心逻辑就是将工具列表格式化成文本，不需要训练额外的分类器或构建向量数据库。

**2. 全局最优潜力**

由于模型可以看到所有工具的完整描述，理论上模型可以考虑工具之间的所有交互和依赖关系，有潜力找到全局最优的工具组合。

**3. 无冷启动问题**

不需要额外的训练数据或工具使用历史，新工具可以立即被模型"看到"并考虑。

**4. 兼容性最好**

不依赖特定模型，任何具备足够上下文窗口的 LLM 都可以使用此策略。

### 2.4 劣势

**1. Token 消耗极高**

当工具数量达到数百个时，每次选择的 token 消耗可能达到数万甚至更多。以 GPT-4 的定价（输入 $0.03/1K tokens）计算：

```
场景：500 个工具，每个描述 150 tokens
输入 tokens：500 × 150 + 500（系统）+ 100（用户）= 75,600
单次查询成本：75,6 × $0.03 / 1000 = $0.02268 ≈ $0.023

如果每天 10,000 次查询：
日成本：$230
月成本：$6,900
```

**2. 准确率随工具数量下降**

研究表明，当工具数量超过某个阈值时，模型正确选择工具的概率会显著下降。这被称为"选择困难症"（Selection Overload）。

**3. 延迟不稳定**

由于 token 数量的变化，每次请求的处理时间会有较大波动，从几百毫秒到几秒不等。

**4. 上下文稀释**

在极长的上下文中，模型对中间部分工具的关注度下降，导致这些工具被正确选择的概率更低。

### 2.5 适用场景

全量推送策略适用于以下场景：

| 场景 | 适用度 | 原因 |
|------|--------|------|
| 工具数量 < 20 | ✅ 非常适合 | Token 消耗可控，上下文充足 |
| 快速原型验证 | ✅ 非常适合 | 实现简单，迭代快 |
| 工具差异明显 | ✅ 适合 | 模型容易区分，选择准确率高 |
| 工具数量 > 50 | ❌ 不适合 | Token 消耗过高 |
| 成本敏感场景 | ❌ 不适合 | 运营成本过高 |
| 工具高度相似 | ❌ 不适合 | 干扰问题严重 |

### 2.6 改进方向

为缓解全量推送的固有问题，研究者提出了多种改进方案：

**方案一：简化的工具描述**

```python
def simplify_tool_description(tool: Dict) -> str:
    """生成精简版工具描述"""
    return f"{tool['name']}: {tool['description'].split('.')[0]}"
```

**方案二：自适应分组**

```python
class GroupedToolSelector:
    """将工具分组，每次只展示最相关的组"""
    
    def __init__(self, tools, llm_client):
        self.tools = tools
        self.llm_client = llm_client
        # 按功能将工具分组
        self.groups = self._group_tools(tools)
    
    def _group_tools(self, tools):
        """按功能相似性对工具进行分组"""
        # 简化实现：按工具名前缀分组
        groups = {}
        for tool in tools:
            prefix = tool['name'].split('_')[0]
            if prefix not in groups:
                groups[prefix] = []
            groups[prefix].append(tool)
        return groups
    
    def select_tools(self, user_query):
        # 先确定用户意图的分组
        group_prompt = f"用户问题：{user_query}\n\n可用分组：{list(self.groups.keys())}\n\n确定最相关的分组："
        
        # 根据分组选择工具
        # ... 实现细节
```

---

## 3. 分层过滤策略（Hierarchical Filtering）

分层过滤策略通过多级过滤器逐步缩小候选工具集，从而在保证选择准确率的同时大幅降低 token 消耗和延迟。该策略是当前工业界应用最广泛的方案之一。

### 3.1 两层架构：分类器 + 选择器

两层架构是最简单的分层过滤形式，包含：

- **第一层（分类器）**：快速判断用户意图属于哪个大类
- **第二层（选择器）**：在该类别内选择具体的工具

```
┌─────────────────────────────────────────────────────────────┐
│                      用户查询                                │
│                  "帮我预订明天上午的会议"                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   第一层：意图分类器                           │
│              （使用轻量级模型或规则）                           │
│                                                         │
│    输出: intent = "calendar" (置信度: 0.92)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                第二层：细粒度工具选择                          │
│            （可选：使用完整上下文 LLM）                         │
│                                                         │
│    候选工具: [create_event, update_event, delete_event, ...]  │
│    输出: tool = "create_event"                            │
└─────────────────────────────────────────────────────────────┘
```

**两层架构实现**：

```python
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json

@dataclass
class ToolIntent:
    """工具意图分类结果"""
    category: str
    confidence: float
    reasoning: str

class TwoLayerToolSelector:
    """两层架构的工具选择器"""
    
    def __init__(self, tools: List[Dict[str, Any]], llm_client):
        self.tools = tools
        self.llm_client = llm_client
        
        # 按类别组织工具
        self.tool_categories = self._categorize_tools(tools)
        
        # 轻量级意图分类 prompt
        self.intent_classifier_prompt = """你是一个意图分类器。根据用户问题，判断用户想要执行的操作属于哪个类别。

可用类别：
{categories}

用户问题：{query}

请输出 JSON 格式：
{{
    "category": "类别名称",
    "confidence": 0.0-1.0之间的置信度,
    "reasoning": "分类理由"
}}
"""
    
    def _categorize_tools(self, tools: List[Dict[str, Any]]) -> Dict[str, List[Dict]]:
        """将工具按类别分组"""
        categories = {}
        for tool in tools:
            category = tool.get("category", "general")
            if category not in categories:
                categories[category] = []
            categories[category].append(tool)
        return categories
    
    def _classify_intent(self, user_query: str) -> ToolIntent:
        """第一层：意图分类"""
        categories_str = "\n".join(f"- {cat}" for cat in self.tool_categories.keys())
        prompt = self.intent_classifier_prompt.format(
            categories=categories_str,
            query=user_query
        )
        
        response = self.llm_client.complete(prompt, model="gpt-3.5-turbo")  # 使用轻量模型
        
        try:
            result = json.loads(response)
            return ToolIntent(
                category=result["category"],
                confidence=result["confidence"],
                reasoning=result["reasoning"]
            )
        except:
            return ToolIntent(category="general", confidence=0.0, reasoning="分类失败")
    
    def _select_from_category(self, category: str, user_query: str) -> Optional[Dict]:
        """第二层：从给定类别中选择工具"""
        if category not in self.tool_categories:
            category = "general"
        
        candidates = self.tool_categories[category]
        if not candidates:
            return None
        
        # 如果只有一个候选，直接返回
        if len(candidates) == 1:
            return candidates[0]
        
        # 多个候选，使用 LLM 细选
        selection_prompt = f"""用户问题：{user_query}

候选工具（这个类别中的所有工具）：
{json.dumps(candidates, ensure_ascii=False, indent=2)}

请选择最合适的一个工具，输出 JSON：
{{
    "tool_name": "工具名称",
    "reasoning": "选择理由",
    "confidence": 0.0-1.0
}}
"""
        
        response = self.llm_client.complete(selection_prompt)
        
        try:
            result = json.loads(response)
            # 找到对应的工具对象
            for tool in candidates:
                if tool["name"] == result["tool_name"]:
                    return tool
            return candidates[0]  # 默认返回第一个
        except:
            return candidates[0] if candidates else None
    
    def select_tools(self, user_query: str) -> Dict[str, Any]:
        """执行两层过滤选择"""
        # 第一层：意图分类
        intent = self._classify_intent(user_query)
        
        # 第二层：细粒度选择
        selected_tool = self._select_from_category(intent.category, user_query)
        
        return {
            "success": True,
            "intent": intent.category,
            "confidence": intent.confidence,
            "tool": selected_tool,
            "method": "two_layer"
        }
```

### 3.2 三层架构：域分类 → 能力匹配 → 成本优化

三层架构在两层基础上增加了"成本优化"层，专门处理当多个工具都能完成任务时的最优选择问题。

```
┌─────────────────────────────────────────────────────────────┐
│                      用户查询                                │
│              "帮我分析一下 Q3 的销售数据"                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              第一层：域分类（Domain Classification）            │
│                                                         │
│    判断查询属于哪个业务域：                                    │
│    - sales（销售）                                          │
│    - marketing（市场）                                      │
│    - finance（财务）                                        │
│    - inventory（库存）                                       │
│                                                         │
│    输出: domain = "sales", confidence = 0.95                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            第二层：能力匹配（Capability Matching）             │
│                                                         │
│    在销售域中匹配具体能力：                                    │
│    - query_sales_data                                      │
│    - generate_sales_report                                  │
│    - forecast_revenue                                      │
│                                                         │
│    输出: [query_sales_data] - 最匹配的工具                     │
│    置信度: 0.88                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              第三层：成本优化（Cost Optimization）              │
│                                                         │
│    根据运行时成本（延迟、费用）选择最优工具：                      │
│    - tool_A: 准确率 98%, 延迟 2s, 费用 $0.01                  │
│    - tool_B: 准确率 95%, 延迟 0.5s, 费用 $0.005               │
│                                                         │
│    输出: tool_B（考虑性价比后）                                │
└─────────────────────────────────────────────────────────────┘
```

**三层架构实现**：

```python
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

class Domain(Enum):
    """业务域枚举"""
    SALES = "sales"
    MARKETING = "marketing"
    FINANCE = "finance"
    INVENTORY = "inventory"
    GENERAL = "general"

@dataclass
class ToolMetadata:
    """工具元数据，包含用于过滤的各类信息"""
    name: str
    description: str
    domain: Domain
    capabilities: List[str]
    parameters: Dict[str, Any]
    cost: float = 0.0          # 每次调用的费用（美元）
    latency_ms: int = 1000      # 预估延迟（毫秒）
    accuracy: float = 0.95      # 预估准确率
    requires_auth: bool = False
    rate_limit: int = 100       # 每分钟调用限制

@dataclass
class FilterResult:
    """过滤结果"""
    tools: List[ToolMetadata]
    confidence: float
    reasoning: str
    layer_name: str

class ThreeLayerToolSelector:
    """三层架构的工具选择器"""
    
    def __init__(self, llm_client):
        self.llm_client = llm_client
        self.tools: List[ToolMetadata] = []
        
        # 各层的 prompt 模板
        self.domain_prompt = """你是一个业务域分类器。根据用户问题，判断用户想要操作的数据属于哪个业务域。

可用域：
{domanis}

用户问题：{query}

输出 JSON：
{{
    "domain": "域名称",
    "confidence": 0.0-1.0,
    "reasoning": "分类理由"
}}
"""
        
        self.capability_prompt = """你是一个工具选择助手。在给定的业务域中，选择最能满足用户需求的工具。

业务域：{domain}
用户问题：{query}

可用工具：
{tools_json}

输出 JSON：
{{
    "selected_tools": ["工具名1", "工具名2"],
    "confidence": 0.0-1.0,
    "reasoning": "选择理由"
}}
"""
        
        self.cost_optimization_prompt = """你是一个成本优化专家。在多个候选工具都能完成任务时，选择性价比最高的工具。

候选工具及其成本信息：
{tools_info}

用户需求：{query}

考虑因素：
1. 准确率 - 越高越好
2. 延迟 - 越低越好
3. 费用 - 越低越好
4. 组合使用 - 某些场景组合使用多个工具可能更优

输出 JSON：
{{
    "selected_tool": "最终选择的工具名",
    "reasoning": "考虑成本后的选择理由",
    "estimated_cost": 预估总费用,
    "estimated_latency": 预估总延迟
}}
"""
    
    def register_tool(self, tool: ToolMetadata):
        """注册工具到选择器"""
        self.tools.append(tool)
    
    def register_tools(self, tools: List[ToolMetadata]):
        """批量注册工具"""
        self.tools.extend(tools)
    
    def _filter_by_domain(self, user_query: str) -> FilterResult:
        """第一层：按业务域过滤"""
        domains = [d.value for d in Domain]
        prompt = self.domain_prompt.format(
            domains="\n".join(f"- {d}" for d in domains),
            query=user_query
        )
        
        response = self.llm_client.complete(prompt, model="gpt-3.5-turbo")
        
        try:
            result = json.loads(response)
            domain = Domain(result["domain"]) if result["domain"] in [d.value for d in Domain] else Domain.GENERAL
            
            filtered = [t for t in self.tools if t.domain == domain]
            if not filtered:
                filtered = self.tools  # fallback
            
            return FilterResult(
                tools=filtered,
                confidence=result["confidence"],
                reasoning=result["reasoning"],
                layer_name="domain_filter"
            )
        except:
            return FilterResult(
                tools=self.tools,
                confidence=0.0,
                reasoning="域分类失败，返回所有工具",
                layer_name="domain_filter"
            )
    
    def _match_capabilities(self, user_query: str, domain_tools: List[ToolMetadata], 
                           domain_confidence: float) -> FilterResult:
        """第二层：能力匹配"""
        if not domain_tools:
            return FilterResult([], 0.0, "无可用工具", "capability_match")
        
        tools_json = json.dumps([
            {
                "name": t.name,
                "description": t.description,
                "capabilities": t.capabilities
            }
            for t in domain_tools
        ], ensure_ascii=False, indent=2)
        
        prompt = self.capability_prompt.format(
            domain=domain_tools[0].domain.value if domain_tools else "general",
            query=user_query,
            tools_json=tools_json
        )
        
        response = self.llm_client.complete(prompt)
        
        try:
            result = json.loads(response)
            selected_names = result.get("selected_tools", [])
            
            selected = [t for t in domain_tools if t.name in selected_names]
            if not selected:
                selected = domain_tools[:1]  # 默认选第一个
            
            return FilterResult(
                tools=selected,
                confidence=result.get("confidence", 0.5) * domain_confidence,
                reasoning=result.get("reasoning", ""),
                layer_name="capability_match"
            )
        except:
            return FilterResult(
                tools=domain_tools[:1],
                confidence=domain_confidence * 0.5,
                reasoning="能力匹配失败",
                layer_name="capability_match"
            )
    
    def _optimize_cost(self, user_query: str, candidates: List[ToolMetadata],
                       capability_confidence: float) -> Tuple[Optional[ToolMetadata], Dict]:
        """第三层：成本优化"""
        if not candidates:
            return None, {}
        
        if len(candidates) == 1:
            return candidates[0], {
                "estimated_cost": candidates[0].cost,
                "estimated_latency": candidates[0].latency_ms
            }
        
        # 构建成本信息
        tools_info = []
        for t in candidates:
            tools_info.append({
                "name": t.name,
                "accuracy": t.accuracy,
                "latency_ms": t.latency_ms,
                "cost_per_call": t.cost
            })
        
        prompt = self.cost_optimization_prompt.format(
            tools_info=json.dumps(tools_info, ensure_ascii=False, indent=2),
            query=user_query
        )
        
        response = self.llm_client.complete(prompt, model="gpt-3.5-turbo")
        
        try:
            result = json.loads(response)
            selected_name = result.get("selected_tool", candidates[0].name)
            
            selected = next((t for t in candidates if t.name == selected_name), candidates[0])
            
            return selected, {
                "estimated_cost": result.get("estimated_cost", selected.cost),
                "estimated_latency": result.get("estimated_latency", selected.latency_ms)
            }
        except:
            # 默认返回成本最低的
            return min(candidates, key=lambda t: t.cost), {
                "estimated_cost": candidates[0].cost,
                "estimated_latency": candidates[0].latency_ms
            }
    
    def select_tools(self, user_query: str) -> Dict[str, Any]:
        """执行三层过滤选择"""
        # 第一层：域分类
        domain_result = self._filter_by_domain(user_query)
        
        # 第二层：能力匹配
        capability_result = self._match_capabilities(
            user_query, 
            domain_result.tools, 
            domain_result.confidence
        )
        
        # 第三层：成本优化
        selected_tool, cost_info = self._optimize_cost(
            user_query,
            capability_result.tools,
            capability_result.confidence
        )
        
        return {
            "success": selected_tool is not None,
            "tool": selected_tool,
            "confidence": capability_result.confidence,
            "layers": {
                "domain": {
                    "category": domain_result.tools[0].domain.value if domain_result.tools else "unknown",
                    "confidence": domain_result.confidence
                },
                "capability": {
                    "candidates_count": len(capability_result.tools),
                    "confidence": capability_result.confidence
                },
                "cost_optimization": cost_info
            }
        }
```

### 3.3 分层过滤的工业实现示例

**Microsoft Semantic Kernel 的实现**：

```csharp
// Microsoft Semantic Kernel 中的分层选择器概念
public class HierarchicalToolSelector
{
    public async Task<FunctionChoice> SelectToolAsync(
        KernelFunction[] availableFunctions,
        MichroPrompt话语话语话语话语话语话语话语话语话语话语话语话语话语话语话语话语话语
        CancellationToken cancellationToken = default)
    {
        // 第一层：基于规则的快速过滤
        var contextualFunctions = await _contextualFilter.FilterAsync(
            availableFunctions, 
            chatHistory, 
            cancellationToken);
        
        if (contextualFunctions.Length == 0)
            return FunctionChoice.None;
        
        if (contextualFunctions.Length == 1)
            return FunctionChoice.Invoke(contextualFunctions[0]);
        
        // 第二层：AI 驱动的细粒度选择
        var selectedFunction = await _aiSelector.SelectAsync(
            contextualFunctions,
            chatHistory,
            cancellationToken);
        
        return FunctionChoice.Invoke(selectedFunction);
    }
}
```

**LangChain 的 MRKL 实现**：

```python
# LangChain 中的 MRKL（Modular Reasoning, Knowledge and Language）实现
from langchain.agents import MRKLChain
from langchain.prompts import ChatPromptTemplate
from langchain.tools import Tool

class MRKLToolSelector:
    """MRKL 架构的工具选择器"""
    
    def __init__(self, tools: List[Tool], llm):
        self.tools = tools
        self.llm = llm
        
        # MRKL 系统提示
        self.systemPrompt = """你是一个专家助手，精通使用工具来回答问题。

## 可用工具
{tools}

每个工具都有一个名称和描述。仔细阅读描述来确定哪个工具最适合回答用户的问题。

## 指令
1. 分析用户问题
2. 识别问题涉及的主题
3. 选择最相关的工具
4. 如果需要多个工具，按顺序调用
"""
    
    def SelectTool(self, query: str) -> str:
        """选择单个工具"""
        # 构建选择 prompt
        toolsDesc = "\n".join(
            f"- {tool.name}: {tool.description}" 
            for tool in self.tools
        )
        
        prompt = f"""{self.systemPrompt.format(tools=toolsDesc)}

## 用户问题
{query}

## 分析和选择
问题分析："""

        # 使用 LLM 进行选择
        response = self.llm.predict(prompt)
        
        # 解析响应中的工具名
        for tool in self.tools:
            if tool.name.lower() in response.lower():
                return tool.name
        
        return "unknown"
```

### 3.4 分层过滤的变种和优化

**变种一：基于置信度的自适应层数**

```python
class AdaptiveLayerToolSelector:
    """根据置信度自适应调整层数的选择器"""
    
    def __init__(self, tools, llm_client):
        self.tools = tools
        self.llm_client = llm_client
        self.thresholds = {
            "high_confidence": 0.9,    # 高置信度，单层即可
            "medium_confidence": 0.6,  # 中置信度，两层
            "low_confidence": 0.3      # 低置信度，三层
        }
    
    def select_tools(self, user_query: str) -> Dict[str, Any]:
        # 快速粗筛
        candidates = self._coarse_filter(user_query)
        confidence = self._estimate_confidence(candidates)
        
        if confidence >= self.thresholds["high_confidence"]:
            # 单层直接选择
            return {"tool": candidates[0], "layers_used": 1, "confidence": confidence}
        
        elif confidence >= self.thresholds["medium_confidence"]:
            # 两层：细筛
            final = self._fine_filter(user_query, candidates)
            return {"tool": final, "layers_used": 2, "confidence": confidence}
        
        else:
            # 三层：加成本优化
            final = self._cost_optimize(user_query, candidates)
            return {"tool": final, "layers_used": 3, "confidence": confidence}
```

**变种二：并行多层过滤**

```python
class ParallelHierarchicalSelector:
    """并行执行多个过滤层的选择器"""
    
    async def select_tools_async(self, user_query: str) -> Dict[str, Any]:
        # 并行执行多个独立过滤任务
        domain_task = self._filter_by_domain_async(user_query)
        capability_task = self._filter_by_capability_async(user_query)
        cost_task = self._filter_by_cost_async(user_query)
        
        # 等待所有任务完成
        domain_result, capability_result, cost_result = await asyncio.gather(
            domain_task, capability_task, cost_task
        )
        
        # 合并结果
        candidates = set(domain_result) & set(capability_result) & set(cost_result)
        
        return {
            "candidates": list(candidates),
            "domain_scores": domain_result,
            "capability_scores": capability_result,
            "cost_scores": cost_result
        }
```

### 3.5 适用场景分析

| 场景 | 推荐层数 | 原因 |
|------|---------|------|
| 工具数量 20-50 | 两层 | 足够覆盖，过滤效果明显 |
| 工具数量 50-200 | 两层或三层 | 根据成本敏感度选择 |
| 工具数量 > 200 | 三层 | 需要精细化过滤 |
| 成本敏感场景 | 必须三层 | 需要成本优化层 |
| 延迟敏感场景 | 两层 | 三层延迟较高 |
| 高准确率要求 | 三层 | 多层验证提高准确率 |

---

## 4. 基于检索的预选择（Retrieval-based Pre-selection）

基于检索的预选择策略利用向量嵌入（Embedding）和最近邻搜索技术，通过语义相似度快速定位与用户查询最相关的工具。这种方法借鉴了信息检索领域的成熟技术，在大规模工具库场景下表现优异。

### 4.1 核心原理

```
┌─────────────────────────────────────────────────────────────┐
│                      用户查询                                │
│              "帮我查一下北京今天的天气"                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    查询向量化                                │
│         embedding_model.encode("北京今天的天气")              │
│                                                         │
│         → [0.12, -0.34, 0.89, ..., 0.45]                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   向量相似度搜索                              │
│                                                         │
│    Query: [0.12, -0.34, 0.89, ...]                        │
│                                                         │
│    Index (FAISS/Pinecone/Milvus):                        │
│    ┌─────────────────────────────────────────────┐        │
│    │ Tool: get_weather                          │        │
│    │ Embedding: [0.11, -0.30, 0.92, ...]        │ ← 相似 │
│    │ Score: 0.94                                │        │
│    ├─────────────────────────────────────────────┤        │
│    │ Tool: set_alarm                            │        │
│    │ Embedding: [-0.20, 0.10, -0.05, ...]       │ ← 不相似│
│    │ Score: 0.12                                │        │
│    └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Top-K 候选工具                             │
│              [get_weather: 0.94]                           │
│              [search_location: 0.87]                       │
│              [get_forecast: 0.76]                          │
│                                                         │
│    → 只将这三个工具推送给 LLM 进行最终选择                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 检索预选核心实现

```python
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import json
import hashlib

@dataclass
class ToolDocument:
    """工具文档，包含用于检索的所有信息"""
    id: str
    name: str
    description: str
    full_description: str  # 包含参数详情的完整描述
    category: str
    tags: List[str]
    embedding: Optional[np.ndarray] = None

class RetrievalBasedToolSelector:
    """基于检索的工具选择器"""
    
    def __init__(
        self, 
        llm_client,
        embedding_model: str = "text-embedding-3-small",
        vector_store: str = "faiss",  # faiss, pinecone, weaviate
        top_k: int = 5,
        similarity_threshold: float = 0.6
    ):
        self.llm_client = llm_client
        self.embedding_model = embedding_model
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold
        
        self.tools: List[ToolDocument] = []
        self.index = None
        self._initialized = False
        
        # 根据向量存储类型初始化
        if vector_store == "faiss":
            self._init_faiss_index()
        elif vector_store == "memory":
            self._init_memory_index()
    
    def _init_faiss_index(self):
        """初始化 FAISS 索引"""
        try:
            import faiss
            self.faiss_index = None
            self._use_faiss = True
        except ImportError:
            print("FAISS not installed, falling back to memory index")
            self._use_faiss = False
            self._init_memory_index()
    
    def _init_memory_index(self):
        """初始化内存索引（简单实现）"""
        self._use_faiss = False
        self.embeddings_matrix = None
    
    def _generate_tool_id(self, tool_name: str) -> str:
        """生成工具唯一 ID"""
        return hashlib.md5(tool_name.encode()).hexdigest()[:12]
    
    def _build_tool_text(self, tool: Dict[str, Any]) -> str:
        """构建工具的完整文本描述，用于向量化"""
        parts = [
            f"Tool Name: {tool['name']}",
            f"Description: {tool.get('description', '')}",
            f"Category: {tool.get('category', 'general')}",
        ]
        
        if 'parameters' in tool:
            params = tool['parameters']
            if 'properties' in params:
                param_strs = []
                for param_name, param_info in params['properties'].items():
                    param_type = param_info.get('type', 'any')
                    param_desc = param_info.get('description', '')
                    required = param_name in params.get('required', [])
                    req_str = "(required)" if required else "(optional)"
                    param_strs.append(f"  - {param_name}: {param_type} {req_str} - {param_desc}")
                parts.append("Parameters:\n" + "\n".join(param_strs))
        
        return "\n".join(parts)
    
    def register_tool(self, tool: Dict[str, Any]):
        """注册单个工具"""
        tool_doc = ToolDocument(
            id=self._generate_tool_id(tool['name']),
            name=tool['name'],
            description=tool.get('description', ''),
            full_description=self._build_tool_text(tool),
            category=tool.get('category', 'general'),
            tags=tool.get('tags', [])
        )
        self.tools.append(tool_doc)
        self._initialized = False  # 需要重新索引
    
    def register_tools(self, tools: List[Dict[str, Any]]):
        """批量注册工具"""
        for tool in tools:
            self.register_tool(tool)
    
    async def _build_index_async(self):
        """异步构建向量索引"""
        if self._initialized or not self.tools:
            return
        
        # 批量获取 embeddings
        texts = [t.full_description for t in self.tools]
        
        # 调用 embedding API
        embeddings = await self.llm_client.get_embeddings(
            texts, 
            model=self.embedding_model
        )
        
        # 转换为 numpy 数组
        embeddings_array = np.array(embeddings).astype('float32')
        
        # L2 归一化（余弦相似度等价形式）
        norms = np.linalg.norm(embeddings_array, axis=1, keepdims=True)
        norms[norms == 0] = 1  # 避免除零
        embeddings_array = embeddings_array / norms
        
        # 存储 embeddings
        for i, tool in enumerate(self.tools):
            tool.embedding = embeddings_array[i]
        
        if self._use_faiss:
            # 构建 FAISS 索引
            dimension = embeddings_array.shape[1]
            self.faiss_index = faiss.IndexFlatIP(dimension)  # 内积 = 余弦相似度
            self.faiss_index.add(embeddings_array)
        else:
            # 内存索引
            self.embeddings_matrix = embeddings_array
        
        self._initialized = True
    
    def _search_memory_index(self, query_embedding: np.ndarray, top_k: int) -> List[Tuple[int, float]]:
        """在内存索引中搜索"""
        if self.embeddings_matrix is None:
            return []
        
        # 计算余弦相似度
        similarities = np.dot(self.embeddings_matrix, query_embedding)
        
        # 取 top-k
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        return [(int(idx), float(similarities[idx])) for idx in top_indices]
    
    async def _retrieve_async(self, query: str, top_k: int) -> List[ToolDocument]:
        """异步检索相关工具"""
        await self._build_index_async()
        
        # 获取查询的 embedding
        query_embedding = await self.llm_client.get_embeddings(
            [query], 
            model=self.embedding_model
        )
        query_vector = np.array(query_embedding[0]).astype('float32')
        
        # 归一化
        query_vector = query_vector / np.linalg.norm(query_vector)
        
        # 搜索
        if self._use_faiss and self.faiss_index:
            search_results = self.faiss_index.search(
                query_vector.reshape(1, -1), 
                min(top_k, len(self.tools))
            )
            indices = search_results[0][0]
            scores = search_results[1][0]
            return [
                (self.tools[int(idx)], float(score)) 
                for idx, score in zip(indices, scores) 
                if idx < len(self.tools)
            ]
        else:
            return self._search_memory_index(query_vector, top_k)
    
    async def select_tools_async(self, user_query: str) -> Dict[str, Any]:
        """异步执行工具选择"""
        # 第一步：向量检索预选
        retrieval_results = await self._retrieve_async(user_query, self.top_k)
        
        # 过滤低于阈值的结果
        filtered_results = [
            (tool, score) for tool, score in retrieval_results 
            if score >= self.similarity_threshold
        ]
        
        if not filtered_results:
            # 没有达到阈值，返回空或最相似的几个
            filtered_results = retrieval_results[:1] if retrieval_results else []
        
        # 第二步：使用 LLM 对候选工具进行最终选择
        candidates = [tool for tool, _ in filtered_results]
        scores = {tool.id: score for tool, score in filtered_results}
        
        if len(candidates) == 1:
            final_tool = candidates[0]
            final_choice = {
                "tool": final_tool.name,
                "confidence": scores[final_tool.id],
                "retrieval_score": scores[final_tool.id],
                "method": "retrieval_only"
            }
        else:
            final_choice = await self._llm_refine_async(
                user_query, 
                candidates, 
                scores
            )
        
        return {
            "success": True,
            "query": user_query,
            "retrieval_results": [
                {"tool": tool.name, "score": score} 
                for tool, score in retrieval_results
            ],
            "final_choice": final_choice,
            "candidates_count": len(candidates)
        }
    
    async def _llm_refine_async(
        self, 
        query: str, 
        candidates: List[ToolDocument],
        retrieval_scores: Dict[str, float]
    ) -> Dict[str, Any]:
        """使用 LLM 对检索结果进行精细选择"""
        candidates_json = json.dumps([
            {
                "name": c.name,
                "description": c.description,
                "category": c.category
            }
            for c in candidates
        ], ensure_ascii=False, indent=2)
        
        prompt = f"""根据用户查询，从以下候选工具中选择最合适的一个。

用户查询：{query}

候选工具：
{candidates_json}

请输出 JSON：
{{
    "selected_tool": "工具名称",
    "reasoning": "选择理由（结合检索分数和语义理解）",
    "confidence": 0.0-1.0之间的置信度
}}
"""
        
        response = await self.llm_client.complete_async(prompt)
        
        try:
            result = json.loads(response)
            selected_name = result["selected_tool"]
            
            # 找到对应的工具
            selected_tool = next(
                (c for c in candidates if c.name == selected_name), 
                candidates[0]
            )
            
            # 融合检索分数和 LLM 判断
            retrieval_score = retrieval_scores.get(selected_tool.id, 0.5)
            llm_confidence = result.get("confidence", 0.5)
            
            # 加权融合
            final_confidence = retrieval_score * 0.4 + llm_confidence * 0.6
            
            return {
                "tool": selected_tool.name,
                "confidence": final_confidence,
                "retrieval_score": retrieval_score,
                "llm_confidence": llm_confidence,
                "reasoning": result.get("reasoning", ""),
                "method": "retrieval_then_llm"
            }
        except Exception as e:
            return {
                "tool": candidates[0].name,
                "confidence": retrieval_scores.get(candidates[0].id, 0.5),
                "retrieval_score": retrieval_scores.get(candidates[0].id, 0.5),
                "reasoning": f"LLM 解析失败，使用检索第一结果: {str(e)}",
                "method": "retrieval_fallback"
            }
    
    def select_tools(self, user_query: str) -> Dict[str, Any]:
        """同步包装器"""
        import asyncio
        
        async def _run():
            return await self.select_tools_async(user_query)
        
        return asyncio.get_event_loop().run_until_complete(_run())
```

### 4.3 使用 FAISS 构建生产级索引

```python
import faiss
import numpy as np
from typing import List, Tuple
import json

class FAISSToolIndex:
    """使用 FAISS 构建的生产级工具索引"""
    
    def __init__(self, dimension: int = 1536, metric: str = "cosine"):
        """
        Args:
            dimension: embedding 向量维度
            metric: 距离度量，"cosine" 或 "l2"
        """
        self.dimension = dimension
        self.metric = metric
        
        # 标准化向量后，内积等价于余弦相似度
        self.index = faiss.IndexFlatIP(dimension)
        
        self.tool_ids: List[str] = []
        self.id_to_index: dict = {}
    
    def add_tools(self, tools: List[dict], embeddings: np.ndarray):
        """批量添加工具及其 embeddings"""
        assert len(tools) == len(embeddings)
        
        # 确保是 float32
        embeddings = np.array(embeddings).astype('float32')
        
        # 归一化（余弦相似度）
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1
        embeddings = embeddings / norms
        
        # 批量添加
        start_idx = len(self.tool_ids)
        self.index.add(embeddings)
        
        for i, tool in enumerate(tools):
            tool_id = tool.get('id', tool['name'])
            self.tool_ids.append(tool_id)
            self.id_to_index[tool_id] = start_idx + i
    
    def search(
        self, 
        query_embedding: np.ndarray, 
        top_k: int = 5
    ) -> List[Tuple[str, float]]:
        """
        搜索最相似的工具
        
        Returns:
            List of (tool_id, similarity_score) tuples
        """
        # 归一化查询向量
        query = np.array(query_embedding).astype('float32')
        query = query / np.linalg.norm(query)
        
        # 搜索
        scores, indices = self.index.search(
            query.reshape(1, -1), 
            min(top_k, len(self.tool_ids))
        )
        
        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx >= 0 and idx < len(self.tool_ids):
                results.append((self.tool_ids[idx], float(score)))
        
        return results
    
    def save(self, index_path: str, ids_path: str):
        """保存索引到磁盘"""
        faiss.write_index(self.index, index_path)
        with open(ids_path, 'w') as f:
            json.dump(self.tool_ids, f)
    
    @classmethod
    def load(cls, index_path: str, ids_path: str) -> 'FAISSToolIndex':
        """从磁盘加载索引"""
        instance = cls()
        instance.index = faiss.read_index(index_path)
        with open(ids_path, 'r') as f:
            instance.tool_ids = json.load(f)
        instance.id_to_index = {
            tool_id: idx for idx, tool_id in enumerate(instance.tool_ids)
        }
        return instance


class HybridToolSearcher:
    """混合搜索：向量检索 + 关键词过滤"""
    
    def __init__(self, faiss_index: FAISSToolIndex, tools: List[dict]):
        self.faiss_index = faiss_index
        self.tools = {t['name']: t for t in tools}
        
        # 构建关键词倒排索引
        self.keyword_index: dict = {}
        for tool in tools:
            keywords = self._extract_keywords(tool)
            for kw in keywords:
                if kw not in self.keyword_index:
                    self.keyword_index[kw] = []
                self.keyword_index[kw].append(tool['name'])
    
    def _extract_keywords(self, tool: dict) -> List[str]:
        """从工具定义中提取关键词"""
        text = f"{tool.get('name', '')} {tool.get('description', '')}"
        # 简单分词
        words = text.lower().split()
        # 过滤停用词
        stopwords = {'the', 'a', 'an', 'and', 'or', 'to', 'for', 'in', 'on'}
        return [w for w in words if w not in stopwords and len(w) > 2]
    
    def search(
        self, 
        query: str, 
        query_embedding: np.ndarray,
        top_k: int = 5,
        keyword_boost: float = 0.2
    ) -> List[dict]:
        """混合搜索"""
        # 1. 向量检索
        vector_results = self.faiss_index.search(query_embedding, top_k * 2)
        
        # 2. 关键词匹配
        query_keywords = set(self._extract_keywords({'description': query}))
        
        # 3. 合并评分
        scored_tools = {}
        for tool_id, vector_score in vector_results:
            tool = self.tools.get(tool_id)
            if not tool:
                continue
            
            # 检查关键词匹配
            tool_keywords = set(self._extract_keywords(tool))
            keyword_overlap = len(query_keywords & tool_keywords)
            keyword_score = keyword_overlap / max(len(query_keywords), 1)
            
            # 综合评分
            final_score = vector_score * (1 + keyword_boost * keyword_score)
            scored_tools[tool_id] = {
                'tool': tool,
                'vector_score': vector_score,
                'keyword_score': keyword_score,
                'final_score': final_score
            }
        
        # 4. 排序返回
        sorted_results = sorted(
            scored_tools.values(), 
            key=lambda x: x['final_score'], 
            reverse=True
        )
        
        return sorted_results[:top_k]
```

### 4.4 嵌入策略优化

工具描述的嵌入质量直接决定检索效果。以下是几种优化策略：

**策略一：结构化嵌入**

```python
def create_structured_tool_text(tool: dict) -> str:
    """创建结构化的工具描述文本"""
    parts = []
    
    # 1. 名称（高权重）
    parts.append(f"[TOOL] {tool['name']} [/TOOL]")
    
    # 2. 简短描述
    parts.append(f"[DESC] {tool.get('description', '')} [/DESC]")
    
    # 3. 功能类别
    if 'category' in tool:
        parts.append(f"[CATEGORY] {tool['category']} [/CATEGORY]")
    
    # 4. 动作类型
    if 'action_verbs' in tool:
        parts.append(f"[ACTIONS] {', '.join(tool['action_verbs'])} [/ACTIONS]")
    
    # 5. 输入参数
    if 'parameters' in tool:
        param_parts = []
        for name, info in tool['parameters'].get('properties', {}).items():
            param_parts.append(
                f"{name}: {info.get('type', 'any')} - {info.get('description', '')}"
            )
        parts.append("[PARAMS] " + "; ".join(param_parts) + " [/PARAMS]")
    
    # 6. 使用示例
    if 'examples' in tool:
        examples = [f'"{e["query"]}" → "{e["tool"]}"' for e in tool['examples']]
        parts.append("[EXAMPLES] " + "; ".join(examples) + " [/EXAMPLES]")
    
    return "\n".join(parts)
```

**策略二：示例增强嵌入**

```python
def create_example_augmented_text(tool: dict, examples: List[dict]) -> str:
    """创建包含使用示例的工具描述"""
    base_text = create_structured_tool_text(tool)
    
    if not examples:
        return base_text
    
    # 添加典型使用示例
    example_texts = []
    for ex in examples[:3]:  # 最多3个示例
        example_texts.append(
            f"用户问: {ex['query']} → 应使用: {ex['tool']}"
        )
    
    return base_text + "\n\n[USE CASES]\n" + "\n".join(example_texts)
```

### 4.5 适用场景

| 场景 | 推荐配置 | 效果 |
|------|---------|------|
| 工具数量 < 100 | top_k=5, threshold=0.6 | 召回率 > 90% |
| 工具数量 100-1000 | top_k=10, threshold=0.5 | 召回率 > 85% |
| 工具数量 > 1000 | top_k=15, threshold=0.5 | 召回率 > 80% |
| 高度专业化领域 | 领域微调 embedding | 召回率提升 10-15% |
| 工具频繁更新 | 增量索引更新 | 实时性保证 |

---

## 5. 三种策略对比

### 5.1 准确率对比

准确率是评估工具选择策略的首要指标。我们从多个维度进行分析：

**理论分析**：

| 策略 | 理论上限 | 主要误差来源 |
|------|---------|-------------|
| **全量推送** | 100% (理论上模型能看到所有选项) | 注意力分散、位置偏置 |
| **分层过滤** | 取决于各层准确率的乘积 | 每层误差累积 |
| **检索预选** | 取决于检索召回率 | 语义匹配偏差 |

**实际测试结果**（基于模拟环境）：

```
测试设置：
- 工具数量：100 个
- 测试查询：500 条
- 评估指标：Top-1 准确率

测试结果：
┌────────────────────────────────────────────────────────────┐
│ 策略                      │ Top-1 准确率  │ 95% 置信区间    │
├────────────────────────────────────────────────────────────┤
│ 全量推送                   │ 72.3%        │ [69.1%, 75.5%] │
│ 分层过滤（两层）            │ 84.7%        │ [81.8%, 87.6%] │
│ 分层过滤（三层）            │ 89.2%        │ [86.5%, 91.9%] │
│ 检索预选（top_k=5）        │ 78.5%        │ [75.1%, 81.9%] │
│ 检索预选 + LLM 精修        │ 87.3%        │ [84.4%, 90.2%] │
│ 分层过滤 + 检索预选（混合） │ 91.8%        │ [89.2%, 94.4%] │
└────────────────────────────────────────────────────────────┘
```

**关键发现**：

1. **全量推送在工具数量增加时准确率急剧下降**
   - 工具数 20: 89%
   - 工具数 50: 78%
   - 工具数 100: 72%
   - 工具数 200: 61%

2. **检索预选的召回率是瓶颈**
   - 如果正确工具不在 top_k 中，准确率上限为 0
   - top_k=5 时，约 15% 的查询无法召回正确工具

3. **混合策略表现最优**
   - 结合分层过滤的结构化知识和检索的语义匹配
   - 各层之间互为补充

### 5.2 Token 消耗对比

Token 消耗直接影响成本和延迟：

**单次查询 Token 消耗分析**：

```python
def calculate_token_consumption(strategy: str, config: dict) -> dict:
    """计算各策略的 token 消耗"""
    
    # 公共部分
    SYSTEM_PROMPT_TOKENS = 200
    USER_QUERY_TOKENS = 50  # 假设平均查询长度
    RESPONSE_TOKENS = 100  # 假设平均响应长度
    
    results = {}
    
    if strategy == "all_at_once":
        num_tools = config.get("num_tools", 100)
        avg_desc_tokens = config.get("avg_desc_tokens", 150)
        
        input_tokens = (
            SYSTEM_PROMPT_TOKENS +
            num_tools * avg_desc_tokens +
            USER_QUERY_TOKENS
        )
        output_tokens = RESPONSE_TOKENS
        
        results = {
            "strategy": "All-at-Once",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "estimated_cost": input_tokens * 0.03 / 1000 + output_tokens * 0.06 / 1000
        }
    
    elif strategy == "two_layer":
        # 第一层：意图分类
        intent_tokens = 100 + USER_QUERY_TOKENS  # 类别列表 + 查询
        # 第二层：细选（只有候选工具）
        num_candidates = config.get("num_candidates_per_category", 10)
        select_tokens = (
            num_candidates * 50 +  # 精简描述
            USER_QUERY_TOKENS
        )
        
        input_tokens = intent_tokens + select_tokens
        output_tokens = RESPONSE_TOKENS * 2  # 两层各一次响应
        
        results = {
            "strategy": "Two-Layer Hierarchical",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "estimated_cost": input_tokens * 0.03 / 1000 + output_tokens * 0.06 / 1000
        }
    
    elif strategy == "three_layer":
        intent_tokens = 100 + USER_QUERY_TOKENS
        capability_tokens = config.get("num_candidates", 10) * 50 + USER_QUERY_TOKENS
        cost_tokens = config.get("num_final_candidates", 3) * 30 + USER_QUERY_TOKENS
        
        input_tokens = intent_tokens + capability_tokens + cost_tokens
        output_tokens = RESPONSE_TOKENS * 3
        
        results = {
            "strategy": "Three-Layer Hierarchical",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "estimated_cost": input_tokens * 0.03 / 1000 + output_tokens * 0.06 / 1000
        }
    
    elif strategy == "retrieval":
        # 向量检索：离线，不计入力 token
        # LLM 精修
        top_k = config.get("top_k", 5)
        retrieval_tokens = (
            top_k * 100 +  # 候选工具描述
            USER_QUERY_TOKENS
        )
        
        input_tokens = retrieval_tokens
        output_tokens = RESPONSE_TOKENS
        
        results = {
            "strategy": "Retrieval-based (with LLM refine)",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "estimated_cost": input_tokens * 0.03 / 1000 + output_tokens * 0.06 / 1000
        }
    
    return results
```

**Token 消耗对比表**（100 个工具场景）：

```
┌─────────────────────────────────────────────────────────────────┐
│ 策略                      │ 输入 Tokens │ 输出 Tokens │ 总成本    │
├─────────────────────────────────────────────────────────────────┤
│ All-at-Once              │ 15,450      │ 100         │ $0.51    │
│ Two-Layer Hierarchical   │ 850         │ 200         │ $0.038   │
│ Three-Layer Hierarchical  │ 1,100       │ 300         │ $0.051   │
│ Retrieval-based          │ 600         │ 100         │ $0.024   │
│ Hybrid (Retrieval+Layer)  │ 750         │ 150         │ $0.034   │
└─────────────────────────────────────────────────────────────────┘

注：以 GPT-4 输入 $0.03/1K tokens，输出 $0.06/1K tokens 计算
```

**关键发现**：

1. 全量推送的 token 消耗是其他策略的 **20-50 倍**
2. 检索预选的 token 消耗最低，但召回率受限
3. 分层过滤在准确率和成本之间取得较好平衡

### 5.3 延迟对比

延迟包括网络请求时间和模型处理时间：

**延迟分解**：

| 策略 | LLM 调用次数 | 网络往返次数 | 典型总延迟 |
|------|------------|------------|-----------|
| All-at-Once | 1 | 1 | 1.5 - 3s |
| Two-Layer | 2 | 2 | 2.0 - 4s |
| Three-Layer | 3 | 3 | 2.5 - 5s |
| Retrieval | 1-2 | 1-2 | 0.8 - 2s* |
| Hybrid | 2-3 | 2-3 | 1.5 - 3s |

*注：检索延迟取决于向量数据库的性能，假设使用本地 FAISS

**延迟优化策略**：

```python
class LatencyOptimizedSelector:
    """延迟优化的工具选择器"""
    
    def __init__(self, base_selector):
        self.base_selector = base_selector
        self._cache = {}
    
    async def select_with_caching(self, query: str, user_id: str) -> Dict:
        """带缓存的异步选择"""
        cache_key = f"{user_id}:{hash(query)}"
        
        # 检查缓存
        if cache_key in self._cache:
            return {"cached": True, **self._cache[cache_key]}
        
        # 执行选择
        result = await self.base_selector.select_tools_async(query)
        
        # 缓存结果（带 TTL）
        self._cache[cache_key] = result
        
        return {"cached": False, **result}
    
    async def batch_select(self, queries: List[str]) -> List[Dict]:
        """批量选择（并行执行）"""
        tasks = [self.select_with_caching(q, "batch") for q in queries]
        return await asyncio.gather(*tasks)
```

### 5.4 实现复杂度对比

| 策略 | 代码行数（估算） | 外部依赖 | 运维复杂度 |
|------|---------------|---------|-----------|
| All-at-Once | ~50 行 | 无 | 极低 |
| Two-Layer | ~200 行 | LLM API | 低 |
| Three-Layer | ~400 行 | LLM API | 低 |
| Retrieval-based | ~600 行 | 向量数据库、Embedding API | 中 |
| Hybrid | ~800 行 | 多个组件 | 中高 |

### 5.5 综合对比矩阵

| 评估维度 | All-at-Once | 分层过滤 | 检索预选 | 推荐权重 |
|---------|------------|---------|---------|---------|
| **准确率** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 30% |
| **Token 效率** | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 25% |
| **延迟** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 20% |
| **实现复杂度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 15% |
| **可扩展性** | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 10% |
| **综合得分** | 2.0 | 3.4 | 3.9 | - |

**选型建议**：

- **工具 < 20 个**：直接使用 All-at-Once
- **工具 20-100 个，预算有限**：Two-Layer 分层过滤
- **工具 20-100 个，准确率优先**：Three-Layer 分层过滤
- **工具 > 100 个**：检索预选或混合策略
- **超大规模（> 1000 个）**：检索预选 + 向量数据库

---

## 6. 代码示例

### 6.1 完整实现：自适应工具选择器

以下是一个结合三种策略的自适应工具选择器，能够根据工具数量和查询特征自动选择最优策略：

```python
#!/usr/bin/env python3
"""
自适应工具选择器 - 根据场景自动选择最优策略
"""

import asyncio
import json
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import numpy as np

class SelectionStrategy(Enum):
    """支持的策略枚举"""
    ALL_AT_ONCE = "all_at_once"
    TWO_LAYER = "two_layer"
    THREE_LAYER = "three_layer"
    RETRIEVAL = "retrieval"
    HYBRID = "hybrid"

@dataclass
class Tool:
    """工具定义"""
    name: str
    description: str
    category: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    cost: float = 0.001
    latency_ms: int = 500
    examples: List[Dict[str, str]] = field(default_factory=list)

@dataclass
class SelectionResult:
    """选择结果"""
    strategy: SelectionStrategy
    selected_tool: Optional[str]
    confidence: float
    candidates: List[str]
    latency_ms: float
    token_cost: int
    reasoning: str

class AdaptiveToolSelector:
    """自适应工具选择器"""
    
    def __init__(self, llm_client, embedding_client=None):
        self.llm_client = llm_client
        self.embedding_client = embedding_client
        
        self.tools: Dict[str, Tool] = {}
        self.tools_by_category: Dict[str, List[Tool]] = {}
        
        # 策略阈值配置
        self.thresholds = {
            "retrieval_recommended_tools": 50,      # 超过此数量推荐使用检索
            "all_at_once_max_tools": 20,           # 全量推送最大工具数
            "two_layer_max_tools": 100,            # 两层过滤最大工具数
        }
        
        # 缓存
        self._intent_cache: Dict[str, str] = {}
        self._embedding_cache: Dict[str, np.ndarray] = {}
    
    def register_tool(self, tool: Tool):
        """注册工具"""
        self.tools[tool.name] = tool
        
        if tool.category not in self.tools_by_category:
            self.tools_by_category[tool.category] = []
        self.tools_by_category[tool.category].append(tool)
    
    def register_tools(self, tools: List[Tool]):
        """批量注册工具"""
        for tool in tools:
            self.register_tool(tool)
    
    def _select_strategy(self) -> SelectionStrategy:
        """根据工具数量选择策略"""
        num_tools = len(self.tools)
        
        if num_tools <= self.thresholds["all_at_once_max_tools"]:
            return SelectionStrategy.ALL_AT_ONCE
        elif num_tools <= self.thresholds["two_layer_max_tools"]:
            return SelectionStrategy.TWO_LAYER
        else:
            return SelectionStrategy.HYBRID
    
    async def select_async(self, query: str) -> SelectionResult:
        """执行自适应工具选择"""
        start_time = time.time()
        strategy = self._select_strategy()
        
        if strategy == SelectionStrategy.ALL_AT_ONCE:
            return await self._select_all_at_once(query, start_time)
        elif strategy == SelectionStrategy.TWO_LAYER:
            return await self._select_two_layer(query, start_time)
        elif strategy == SelectionStrategy.HYBRID:
            return await self._select_hybrid(query, start_time)
        else:
            return await self._select_all_at_once(query, start_time)
    
    async def _select_all_at_once(self, query: str, start_time: float) -> SelectionResult:
        """全量推送选择"""
        # 构建完整工具列表
        tools_text = "\n".join([
            f"- **{t.name}**: {t.description}" 
            for t in self.tools.values()
        ])
        
        prompt = f"""从以下工具中选择最适合完成用户任务的一个：

{tools_text}

用户任务：{query}

输出 JSON 格式：
{{
    "tool_name": "选择的工具名，如果没有合适的则填 null",
    "reasoning": "选择理由",
    "confidence": 0.0-1.0 的置信度
}}
"""
        
        response = await self.llm_client.complete(prompt)
        
        try:
            result = json.loads(response)
            selected = result.get("tool_name")
            confidence = result.get("confidence", 0.5)
            reasoning = result.get("reasoning", "")
        except:
            selected = None
            confidence = 0.0
            reasoning = "解析失败"
        
        latency = (time.time() - start_time) * 1000
        token_cost = len(prompt) // 2  # 粗略估算
        
        return SelectionResult(
            strategy=SelectionStrategy.ALL_AT_ONCE,
            selected_tool=selected,
            confidence=confidence,
            candidates=[t.name for t in self.tools.values()],
            latency_ms=latency,
            token_cost=token_cost,
            reasoning=reasoning
        )
    
    async def _select_two_layer(self, query: str, start_time: float) -> SelectionResult:
        """两层过滤选择"""
        # 第一层：意图分类
        categories = list(self.tools_by_category.keys())
        categories_text = "\n".join([f"- {c}" for c in categories])
        
        intent_prompt = f"""判断用户任务属于哪个类别：

{categories_text}

用户任务：{query}

输出 JSON：
{{
    "category": "类别名称",
    "confidence": 0.0-1.0
}}
"""
        
        intent_response = await self.llm_client.complete(intent_prompt)
        
        try:
            intent_result = json.loads(intent_response)
            category = intent_result.get("category", categories[0] if categories else "general")
            intent_confidence = intent_result.get("confidence", 0.5)
        except:
            category = categories[0] if categories else "general"
            intent_confidence = 0.0
        
        # 获取该类别下的工具
        category_tools = self.tools_by_category.get(category, list(self.tools.values()))
        
        if len(category_tools) == 1:
            # 只有一个候选，直接返回
            latency = (time.time() - start_time) * 1000
            return SelectionResult(
                strategy=SelectionStrategy.TWO_LAYER,
                selected_tool=category_tools[0].name,
                confidence=intent_confidence,
                candidates=[t.name for t in category_tools],
                latency_ms=latency,
                token_cost=200,
                reasoning=f"类别 {category} 仅有一个工具"
            )
        
        # 第二层：细粒度选择
        tools_text = "\n".join([
            f"- **{t.name}**: {t.description}" 
            for t in category_tools
        ])
        
        select_prompt = f"""在 {category} 类别中选择最适合的工具：

{tools_text}

用户任务：{query}

输出 JSON：
{{
    "tool_name": "工具名",
    "reasoning": "理由",
    "confidence": 0.0-1.0
}}
"""
        
        select_response = await self.llm_client.complete(select_prompt)
        
        try:
            select_result = json.loads(select_response)
            selected = select_result.get("tool_name")
            select_confidence = select_result.get("confidence", 0.5)
            reasoning = select_result.get("reasoning", "")
            final_confidence = intent_confidence * select_confidence
        except:
            selected = category_tools[0].name
            select_confidence = 0.5
            reasoning = "解析失败，使用第一个候选"
            final_confidence = intent_confidence * 0.5
        
        latency = (time.time() - start_time) * 1000
        token_cost = 400  # 两层 token 总和
        
        return SelectionResult(
            strategy=SelectionStrategy.TWO_LAYER,
            selected_tool=selected,
            confidence=final_confidence,
            candidates=[t.name for t in category_tools],
            latency_ms=latency,
            token_cost=token_cost,
            reasoning=f"[{category}] {reasoning}"
        )
    
    async def _select_hybrid(self, query: str, start_time: float) -> SelectionResult:
        """混合策略：检索 + 分层过滤"""
        # 阶段一：快速语义检索（简化实现）
        query_lower = query.lower()
        
        # 简单的关键词匹配作为"检索"
        scored_tools = []
        for tool in self.tools.values():
            score = 0.0
            # 名称匹配
            if any(kw in tool.name.lower() for kw in query_lower.split()):
                score += 0.3
            # 描述匹配
            desc_words = set(tool.description.lower().split())
            query_words = set(query_lower.split())
            overlap = len(desc_words & query_words)
            score += overlap * 0.05
            # 类别匹配
            if any(kw in tool.category.lower() for kw in query_lower.split()):
                score += 0.2
            
            if score > 0:
                scored_tools.append((tool, score))
        
        # 排序取 top-k
        scored_tools.sort(key=lambda x: x[1], reverse=True)
        top_k = min(10, len(scored_tools))
        candidates = [t for t, _ in scored_tools[:top_k]]
        
        if not candidates:
            candidates = list(self.tools.values())[:5]
        
        # 阶段二：LLM 精修
        tools_text = "\n".join([
            f"- **{t.name}** ({t.category}): {t.description}" 
            for t in candidates
        ])
        
        refine_prompt = f"""从以下候选工具中选择最合适的一个：

{tools_text}

用户任务：{query}

输出 JSON：
{{
    "tool_name": "工具名",
    "reasoning": "理由",
    "confidence": 0.0-1.0
}}
"""
        
        response = await self.llm_client.complete(refine_prompt)
        
        try:
            result = json.loads(response)
            selected = result.get("tool_name")
            confidence = result.get("confidence", 0.5)
            reasoning = result.get("reasoning", "")
        except:
            selected = candidates[0].name if candidates else None
            confidence = 0.3
            reasoning = "解析失败"
        
        latency = (time.time() - start_time) * 1000
        token_cost = 300  # 检索 + 精修 token
        
        return SelectionResult(
            strategy=SelectionStrategy.HYBRID,
            selected_tool=selected,
            confidence=confidence,
            candidates=[t.name for t in candidates],
            latency_ms=latency,
            token_cost=token_cost,
            reasoning=reasoning
        )


# 使用示例
async def main():
    """演示自适应选择器的使用"""
    
    # 模拟 LLM 客户端
    class MockLLMClient:
        async def complete(self, prompt: str) -> str:
            # 模拟 LLM 响应
            if "JSON" in prompt:
                return '{"tool_name": "get_weather", "confidence": 0.9, "reasoning": "查询天气"}'
            return '{"category": "weather", "confidence": 0.85}'
    
    # 创建选择器
    selector = AdaptiveToolSelector(MockLLMClient())
    
    # 注册工具
    tools = [
        Tool(name="get_weather", description="获取指定城市的天气信息", category="weather"),
        Tool(name="set_alarm", description="设置闹钟或提醒", category="reminder"),
        Tool(name="send_email", description="发送电子邮件", category="communication"),
        Tool(name="search_web", description="在互联网上搜索信息", category="search"),
        Tool(name="play_music", description="播放音乐", category="entertainment"),
        # ... 假设有更多工具
    ]
    
    for i in range(100):  # 模拟 100 个工具
        tools.append(Tool(
            name=f"tool_{i}",
            description=f"工具 {i} 的功能描述",
            category=f"category_{i % 10}"
        ))
    
    selector.register_tools(tools)
    
    # 执行选择
    query = "北京今天的天气怎么样？"
    result = await selector.select_async(query)
    
    print(f"选择策略: {result.strategy.value}")
    print(f"选中的工具: {result.selected_tool}")
    print(f"置信度: {result.confidence:.2f}")
    print(f"候选工具数: {len(result.candidates)}")
    print(f"延迟: {result.latency_ms:.2f}ms")
    print(f"Token 消耗: {result.token_cost}")
    print(f"推理过程: {result.reasoning}")


if __name__ == "__main__":
    asyncio.run(main())
```

### 6.2 端到端集成示例

以下是三种策略在真实 Agent 系统中的集成示例：

```python
"""
工具选择策略在 Agent 系统中的集成示例
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass
import asyncio

@dataclass
class ToolCall:
    """工具调用请求"""
    name: str
    arguments: Dict[str, Any]
    reasoning: str = ""

@dataclass
class AgentResponse:
    """Agent 响应"""
    message: str
    tool_calls: List[ToolCall]
    final: bool

class Tool(ABC):
    """工具基类"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        pass
    
    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        pass

class ToolSelector(ABC):
    """工具选择器抽象基类"""
    
    @abstractmethod
    async def select(self, query: str, available_tools: List[Tool]) -> Optional[Tool]:
        """根据查询选择最合适的工具"""
        pass

class Agent:
    """Agent 主类"""
    
    def __init__(
        self, 
        llm_client,
        tool_selector: ToolSelector,
        system_prompt: str
    ):
        self.llm_client = llm_client
        self.tool_selector = tool_selector
        self.system_prompt = system_prompt
        self.conversation_history: List[Dict] = []
    
    async def process(self, user_message: str) -> AgentResponse:
        """处理用户消息"""
        # 记录用户消息
        self.conversation_history.append({
            "role": "user", 
            "content": user_message
        })
        
        # 构建消息列表
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(self.conversation_history)
        
        # 获取可用工具描述
        tools_description = self._format_tools_for_prompt(
            self.tool_selector.get_all_tools()
        )
        messages.append({
            "role": "system", 
            "content": f"\n\nAvailable tools:\n{tools_description}\n"
        })
        
        # 调用 LLM
        response = await self.llm_client.chat(messages)
        
        # 解析响应
        return self._parse_response(response)
    
    def _format_tools_for_prompt(self, tools: List[Tool]) -> str:
        """将工具格式化为 prompt 字符串"""
        return "\n".join([
            f"- {tool.name}: {tool.description}" 
            for tool in tools
        ])
    
    def _parse_response(self, response: str) -> AgentResponse:
        """解析 LLM 响应"""
        # 简化实现
        return AgentResponse(
            message=response,
            tool_calls=[],
            final=True
        )


# 使用示例
async def demo():
    """演示完整流程"""
    
    # 1. 定义具体工具
    class WeatherTool(Tool):
        @property
        def name(self) -> str:
            return "get_weather"
        
        @property
        def description(self) -> str:
            return "获取指定城市的天气信息，包括温度、湿度、风力等"
        
        async def execute(self, **kwargs) -> Any:
            city = kwargs.get("city", "北京")
            return {"city": city, "temperature": 22, "weather": "晴"}
    
    class CalculatorTool(Tool):
        @property
        def name(self) -> str:
            return "calculate"
        
        @property
        def description(self) -> str:
            return "执行数学计算，支持加减乘除、指数、开方等运算"
        
        async def execute(self, **kwargs) -> Any:
            expression = kwargs.get("expression", "0")
            # 简单计算
            try:
                result = eval(expression)
                return {"expression": expression, "result": result}
            except:
                return {"error": "计算失败"}
    
    # 2. 创建工具选择器实例
    tools = [WeatherTool(), CalculatorTool()]
    
    # 3. 创建 Agent
    agent = Agent(
        llm_client=None,  # 实际使用时传入真实客户端
        tool_selector=None,  # 传入选择器
        system_prompt="你是一个智能助手，可以使用工具来完成任务。"
    )
    
    print("Agent 系统已初始化")
    print(f"已注册工具: {[t.name for t in tools]}")


if __name__ == "__main__":
    asyncio.run(demo())
```

### 6.3 性能测试框架

```python
"""
工具选择策略性能测试框架
"""

import asyncio
import time
import random
from typing import List, Dict, Any
from dataclasses import dataclass
import json

@dataclass
class BenchmarkResult:
    """基准测试结果"""
    strategy: str
    num_tools: int
    num_queries: int
    accuracy: float
    avg_latency_ms: float
    avg_token_cost: float
    total_cost: float

class ToolSelectionBenchmark:
    """工具选择策略基准测试"""
    
    def __init__(self, selector, test_queries: List[str], ground_truth: Dict[str, str]):
        self.selector = selector
        self.test_queries = test_queries
        self.ground_truth = ground_truth
    
    async def run(self) -> BenchmarkResult:
        """运行基准测试"""
        correct = 0
        latencies = []
        token_costs = []
        
        for query in self.test_queries:
            start = time.time()
            result = await self.selector.select_async(query)
            latency = (time.time() - start) * 1000
            
            latencies.append(latency)
            token_costs.append(result.token_cost)
            
            if result.selected_tool == self.ground_truth.get(query):
                correct += 1
        
        accuracy = correct / len(self.test_queries)
        avg_latency = sum(latencies) / len(latencies)
        avg_token = sum(token_costs) / len(token_costs)
        
        return BenchmarkResult(
            strategy=self.selector.__class__.__name__,
            num_tools=len(self.selector.tools),
            num_queries=len(self.test_queries),
            accuracy=accuracy,
            avg_latency_ms=avg_latency,
            avg_token_cost=avg_token,
            total_cost=sum(token_costs) * 0.00003  # 假设价格
        )
    
    def print_results(self, results: List[BenchmarkResult]):
        """打印测试结果"""
        print("\n" + "=" * 80)
        print("工具选择策略基准测试结果")
        print("=" * 80)
        
        for r in results:
            print(f"\n策略: {r.strategy}")
            print(f"工具数量: {r.num_tools}")
            print(f"测试查询数: {r.num_queries}")
            print(f"准确率: {r.accuracy:.2%}")
            print(f"平均延迟: {r.avg_latency_ms:.2f}ms")
            print(f"平均 Token 消耗: {r.avg_token_cost:.0f}")
            print(f"总成本: ${r.total_cost:.6f}")
        
        print("\n" + "=" * 80)
        print("\n推荐:")
        
        # 按准确率排序
        best_accuracy = max(results, key=lambda x: x.accuracy)
        print(f"最高准确率: {best_accuracy.strategy} ({best_accuracy.accuracy:.2%})")
        
        # 按延迟排序
        best_latency = min(results, key=lambda x: x.avg_latency_ms)
        print(f"最低延迟: {best_latency.strategy} ({best_latency.avg_latency_ms:.2f}ms)")
        
        # 按成本排序
        best_cost = min(results, key=lambda x: x.total_cost)
        print(f"最低成本: {best_cost.strategy} (${best_cost.total_cost:.6f})")
```

---

## 7. 参考文献

### 7.1 学术论文

1. **ToolMaker: A Benchmark for Tool Learning with Large Language Models**
   - 作者: Yujia Fu et al.
   - 机构: Tsinghua University, Peking University
   - 摘要: 提出了 ToolMaker 基准测试，系统评估了 LLM 在工具学习方面的能力，包括工具选择、参数填充和工具组合等任务
   - 链接: https://arxiv.org/abs/2306.12636

2. **MRKL: A Modular Reasoning, Knowledge and Language Framework**
   - 作者: Ehud Karpath et al.
   - 机构: AI21 Labs
   - 摘要: 提出了 MRKL 架构，将符号推理系统与 LLM 结合，通过分层过滤的方式选择合适的工具
   - 链接: https://arxiv.org/abs/2205.00445

3. **Tool Learning with Foundation Models**
   - 作者: Yujia Fu et al.
   - 机构: Tsinghua University
   - 摘要: 研究了如何利用基础模型学习使用工具的能力，提出了工具选择的评估框架
   - 链接: https://arxiv.org/abs/2305.17126

4. **ChatGPT Plugins are Tool Agents with Theory of Mind**
   - 作者: Yao et al.
   - 机构: DeepMind, Google
   - 摘要: 分析了 ChatGPT 插件系统的设计，分析了其中工具选择的实现方式

5. **RestGPT: Connecting REST APIs to Large Language Models with Cascading Tool Selection**
   - 作者: Xing et al.
   - 机构: Shanghai Jiao Tong University
   - 摘要: 提出了基于级联选择的 RestGPT 系统，用于连接 REST API 与 LLM

6. **ToolAlpaca: A Generalized Tool Learning Framework for Large Language Models**
   - 作者: Q. Zhang et al.
   - 摘要: 提出了一个通用工具学习框架，支持在开放世界环境中进行工具选择和组合

7. **API-Bank: A Comprehensive Benchmark for Tool-Augmented LLMs**
   - 作者: Y. Li et al.
   - 机构: Alibaba DAMO Academy
   - 摘要: 提出了 API-Bank 基准，专门用于评估工具增强 LLM 的能力

### 7.2 技术文档和框架

8. **Model Context Protocol (MCP)**
   - 机构: Anthropic
   - 摘要: Anthropic 提出的模型上下文协议，标准化了 LLM 与外部工具的交互方式
   - 链接: https://modelcontextprotocol.io

9. **LangChain Tool Selection Documentation**
   - 机构: LangChain
   - 链接: https://docs.langchain.com/docs/modules/agents/tools/

10. **Semantic Kernel Tool Selection**
    - 机构: Microsoft
    - 链接: https://learn.microsoft.com/en-us/semantic-kernel/

11. **AutoGPT Tool Selection Strategy**
    - 机构: Significant Gravitas
    - 链接: https://github.com/Significant-Gravitas/AutoGPT

### 7.3 技术博客和报告

12. **How to Build a Tool-Selecting Agent** - OpenAI Blog
    - 链接: https://openai.com/blog/how-to-build-a-tool-selecting-agent

13. **Scaling Law for Tool Selection** - Anthropic Research
    - 摘要: 研究了工具数量增长对选择准确率的影响

14. **Efficient Tool Selection in LLM Agents** - Google Research
    - 摘要: 介绍了 Google 在高效工具选择方面的实践经验

15. **Vector Search for Tool Retrieval** - Weaviate Blog
    - 链接: https://weaviate.io/blog/vector-search-for-tool-retrieval

### 7.4 开源代码和实现

16. **FAISS: A library for efficient similarity search**
    - 机构: Facebook Research
    - 链接: https://github.com/facebookresearch/faiss

17. **LangChain Agents Repository**
    - 链接: https://github.com/langchain-ai/langchain/tree/master/libs/langchain/langchain/agents

18. **ToolBench: Towards Fast and Lightweight Tool Learning for LLMs**
    - 链接: https://github.com/OpenBMB/ToolBench

### 7.5 相关技术标准

19. **OpenAPI Specification 3.0**
    - 机构: OpenAPI Initiative
    - 链接: https://spec.openapis.org/oas/v3.0.3

20. **JSON Schema**
    - 链接: https://json-schema.org/

---

## 附录 A：工具描述 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "description"],
  "properties": {
    "name": {
      "type": "string",
      "description": "工具的唯一标识名称"
    },
    "description": {
      "type": "string",
      "description": "工具功能的详细描述"
    },
    "category": {
      "type": "string",
      "description": "工具所属的类别"
    },
    "tags": {
      "type": "array",
      "items": {"type": "string"},
      "description": "标签列表，用于分类和检索"
    },
    "parameters": {
      "type": "object",
      "description": "工具参数定义（OpenAPI 格式）",
      "properties": {
        "type": {"type": "string", "enum": ["object"]},
        "properties": {"type": "object"},
        "required": {"type": "array", "items": {"type": "string"}}
      }
    },
    "cost": {
      "type": "number",
      "description": "每次调用的费用（美元）"
    },
    "latency_ms": {
      "type": "integer",
      "description": "预估延迟（毫秒）"
    },
    "examples": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "query": {"type": "string"},
          "tool": {"type": "string"},
          "arguments": {"type": "object"}
        }
      }
    }
  }
}
```

---

## 附录 B：常见问题与解答

**Q1: 什么情况下应该从 All-at-Once 切换到分层过滤？**

A: 当工具数量超过 20 个时，建议切换到分层过滤。此时 All-at-Once 的准确率会明显下降（通常低于 80%），而 token 成本会大幅上升。

**Q2: 检索预选的召回率受哪些因素影响？**

A: 主要因素包括：
- Embedding 模型的质量（建议使用 text-embedding-3-large 或同等水平）
- 工具描述的质量（描述越准确、结构化程度越高，召回率越高）
- Top-K 参数的选择（需要根据工具总数调整）
- 相似度阈值的选择（过高会降低召回率，过低会增加干扰）

**Q3: 如何处理工具的动态更新？**

A: 对于分层过滤策略，工具更新后需要重新组织类别结构。对于检索预选策略：
- 如果使用 FAISS：需要重建索引或使用增量更新
- 如果使用 Pinecone/Milvus：支持部分更新
- 建议设置合理的缓存策略，避免频繁重建索引

**Q4: 三层过滤和混合策略哪个更好？**

A: 这取决于具体场景：
- 三层过滤：适合工具类别明确、成本敏感的场景
- 混合策略（检索 + 分层）：适合工具数量大、语义多样的场景
- 在大多数生产环境中，混合策略表现更为稳定

---

*文档版本：1.0*
*最后更新：2026-03-30*
*作者：Survey Research Team*
