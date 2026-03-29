---
id: q9-function-calling
title: "Q9: Function Calling Schema优化"
category: tool-calling
level: advanced
tags: [function-calling, tool-calling, schema, prompt-engineering, agent]
related-questions: [q8, q10]
date: 2026-03-30
---

# Q9: Function Calling Schema优化

## 1. 概述

### 1.1 问题背景

Function Calling（函数调用）是大型语言模型（LLM）连接外部工具和数据的核心能力。通过定义清晰的Schema，模型能够理解如何与外部系统交互，完成复杂的多步任务。然而，Schema设计的好坏直接影响调用准确率——一个设计不当的Schema可能导致模型频繁调用错误工具、传递错误参数，甚至无法识别何时应该调用工具。

### 1.2 为什么工具Schema设计影响调用准确率

LLM在生成Function Call时，依赖对Schema的理解来做出决策。影响准确率的关键因素包括：

| 因素 | 影响机制 | 典型问题 |
|------|---------|---------|
| **Description质量** | 模型依赖描述理解工具用途和调用时机 | 描述模糊导致误调用 |
| **参数名语义** | 模型通过参数名推断参数含义 | 命名不直观导致参数混淆 |
| **类型约束** | 类型系统指导参数格式 | 类型宽松导致格式错误 |
| **枚举值设计** | 限制可选值范围 | 枚举过多/过少影响灵活性 |
| **必填vs可选** | 影响模型是否填充参数 | 必填项过多导致调用失败 |

### 1.3 基础参数名和类型的局限性

传统的参数设计存在以下局限：

```typescript
// ❌ 常见的不良设计：参数名缺乏语义、类型约束不足
{
  "name": "search",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },           // query是什么？搜索什么来源？
      "limit": { "type": "integer" },         // limit的合理范围是多少？
      "filter": { "type": "string" }          // filter格式是什么？
    },
    "required": ["query"]
  }
}
```

上述设计的局限性：
1. **语义模糊**：`query`可以是任何字符串，模型无法理解其具体含义
2. **范围不明**：`limit`没有最大值限制，可能被填充为极端值
3. **格式不清**：`filter`的格式完全取决于实现者，可能产生歧义

### 1.4 章节安排

本章后续内容安排如下：
- 第2节：Description字段优化，包括负向约束和调用策略描述
- 第3节：参数约束设计，涵盖枚举限制、必填项、嵌套对象等
- 第4节：各大平台的最佳实践（OpenAI、Anthropic、Google A2A）
- 第5节：优化前后的Schema对比代码示例
- 第6节：常见错误与解决方案
- 第7节：参考文献

---

## 2. Description字段优化

Description字段是引导模型行为的核心手段。一个优秀的Description应该清晰、完整、避免歧义。

### 2.1 如何通过描述引导模型行为

#### 2.1.1 Description的核心组成

根据Anthropic官方文档的建议[^1]，一个好的工具Description应包含以下要素：

1. **工具用途**：这个工具做什么？
2. **调用时机**：何时应该使用这个工具？
3. **参数说明**：每个参数代表什么？
4. **返回内容**：工具返回什么数据？
5. **注意事项**：使用时的限制或注意点

#### 2.1.2 好与坏的Description对比

```typescript
// ❌ 不良设计：描述过于简短
{
  "name": "get_stock_price",
  "description": "获取股票价格",
  "parameters": {
    "type": "object",
    "properties": {
      "ticker": { "type": "string" }
    },
    "required": ["ticker"]
  }
}

// ✅ 优化设计：描述完整、语义清晰
{
  "name": "get_stock_price",
  "description": "检索指定股票 ticker 的当前交易价格。\
    当用户询问某只股票的当前价格、实时行情、或需要比较多个股票价格时使用。\
    返回最新成交价（单位为美元）以及交易时间。\
    注意：本工具不提供历史价格、分析师评级或财务报表数据。",
  "parameters": {
    "type": "object",
    "properties": {
      "ticker": {
        "type": "string",
        "description": "股票代码符号，如 AAPL（苹果）、MSFT（微软）、GOOGL（谷歌）。必须是有效在美国主要交易所（NYSE或NASDAQ）上市的股票代码。"
      }
    },
    "required": ["ticker"]
  }
}
```

### 2.2 负向约束（Negative Constraints）

负向约束是告知模型"不要做什么"的重要手段。当工具存在使用限制或禁忌时，明确的负向约束可以防止模型错误调用。

#### 2.2.1 负向约束的使用场景

| 场景 | 约束内容 | 示例 |
|------|---------|------|
| 数据限制 | 工具不返回某些类型的数据 | "本工具不返回历史数据" |
| 权限限制 | 需要特定权限才能使用 | "需要管理员权限" |
| 调用频率 | 有使用频率限制 | "每分钟最多调用10次" |
| 输入格式 | 不接受的输入格式 | "不接受PDF格式文件" |
| 适用范围 | 仅限于特定场景 | "仅适用于美国股票" |

#### 2.2.2 负向约束的实现

```typescript
// ✅ 包含负向约束的工具定义
{
  "name": "send_email",
  "description": "发送电子邮件给指定收件人。\
    使用场景：用户明确要求发送邮件、确认预约、发送会议邀请等需要书面沟通的场景。\
    限制条件：\
    - 不能发送垃圾邮件或营销内容\
    - 收件人必须是有效的邮箱地址\
    - 附件总大小不能超过25MB\
    - 每天发送限额为100封邮件，超出后需要明天再试",
  "parameters": {
    "type": "object",
    "properties": {
      "to": {
        "type": "string",
        "description": "收件人邮箱地址，必须是有效的RFC 5322格式邮箱地址"
      },
      "subject": {
        "type": "string",
        "description": "邮件主题，最多256个字符，不能包含特殊HTML标签"
      },
      "body": {
        "type": "string",
        "description": "邮件正文内容，支持纯文本和基本Markdown格式（**粗体**、*斜体*、链接）"
      },
      "cc": {
        "type": "string",
        "description": "抄送地址，多个地址用逗号分隔，可选"
      }
    },
    "required": ["to", "subject", "body"]
  }
}
```

### 2.3 调用策略描述

调用策略描述指导模型如何在多个工具或多个调用方式之间做出选择。

#### 2.3.1 调用策略的核心要素

```typescript
{
  "name": "file_operations",
  "description": "文件操作工具集，支持读取、写入、删除和搜索文件。\
    \
    调用策略：\
    1. 读取文件前先检查文件是否存在，使用 file_exists 工具\
    2. 写入文件前确保父目录存在，使用 ensure_directory 工具\
    3. 删除文件时，系统会自动创建备份，30天内可恢复\
    4. 搜索文件支持正则表达式，但复杂搜索建议分步进行\
    5. 大文件（>10MB）建议分块读取，避免内存溢出",
  "parameters": {
    "type": "object",
    "properties": {
      "operation": {
        "type": "string",
        "enum": ["read", "write", "delete", "search", "exists"],
        "description": "操作类型：read（读取）、write（写入）、delete（删除）、search（搜索）、exists（检查存在）"
      },
      "path": {
        "type": "string",
        "description": "文件或目录的绝对路径，如 /home/user/documents/report.pdf"
      },
      "content": {
        "type": "string",
        "description": "文件内容（仅write操作需要）"
      },
      "options": {
        "type": "object",
        "description": "可选参数：encoding（编码，默认utf-8）、createParents（自动创建父目录，默认false）"
      }
    },
    "required": ["operation", "path"]
  }
}
```

### 2.4 具体例子对比

#### 2.4.1 搜索工具优化对比

```typescript
// ❌ 优化前：描述不足
{
  "name": "search",
  "description": "搜索工具",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "count": { "type": "integer" }
    },
    "required": ["query"]
  }
}

// ✅ 优化后：描述完整，包含使用指引
{
  "name": "web_search",
  "description": "执行网络搜索，获取与查询关键词相关的最新信息。\
    \
    使用场景：\
    - 用户询问实时新闻、天气、股价等最新信息\
    - 需要验证某些事实或数据\
    - 查找特定主题的最新发展\
    \
    不适用场景：\
    - 用户明确要求回答基于训练数据的问题\
    - 需要深入分析或观点比较（应使用research工具）\
    - 搜索结果通常在5-20条之间，请根据查询复杂度调整count参数",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "搜索关键词，建议使用具体、明确的术语。\
          良好示例：'2024年诺贝尔物理学奖得主'\
          不良示例：'那个叫什么来着的人'"
      },
      "count": {
        "type": "integer",
        "description": "返回结果数量，范围1-50，默认10。\
          简单事实查询：5-10条\
          研究性搜索：20-30条\
          广泛调研：40-50条",
        "minimum": 1,
        "maximum": 50,
        "default": 10
      },
      "source": {
        "type": "string",
        "enum": ["general", "news", "academic", "shopping"],
        "description": "搜索来源类型：general（综合）、news（新闻）、academic（学术）、shopping（购物）"
      },
      "date_range": {
        "type": "string",
        "enum": ["day", "week", "month", "year", "any"],
        "description": "时间范围：day（24小时内）、week（一周内）、month（一个月内）、year（一年内）、any（不限）"
      }
    },
    "required": ["query"],
    "additionalProperties": false
  }
}
```

---

## 3. 参数约束设计

### 3.1 Enum限制vs自由字符串

#### 3.1.1 Enum的优势

Enum（枚举）提供了明确的可选值列表，显著降低模型错误填充的概率：

```typescript
// ✅ 使用Enum限制参数值
{
  "name": "set_reminder",
  "parameters": {
    "type": "object",
    "properties": {
      "frequency": {
        "type": "string",
        "enum": ["once", "daily", "weekly", "monthly"],
        "description": "重复频率：once（仅一次）、daily（每天）、weekly（每周）、monthly（每月）"
      },
      "unit": {
        "type": "string",
        "enum": ["minutes", "hours", "days"],
        "description": "时间单位：minutes（分钟）、hours（小时）、days（天）"
      }
    },
    "required": ["frequency", "unit"]
  }
}
```

#### 3.1.2 何时避免使用Enum

```typescript
// ❌ 过度使用Enum：当可能值过多或不可预测时
{
  "name": "get_city_info",
  "parameters": {
    "type": "object",
    "properties": {
      "country": {
        "type": "string",
        "enum": ["USA", "China", "Japan", "Germany", "France", "UK", "India", "Brazil", "Russia", "Canada"],
        // 世界有近200个国家，这个枚举不完整且难以维护
      },
      "currency": {
        "type": "string",
        "enum": ["USD", "EUR", "GBP", "JPY", "CNY"]
        // 世界上有150+种流通货币，枚举无法覆盖
      }
    }
  }
}

// ✅ 改用字符串 + 描述引导
{
  "name": "get_city_info",
  "parameters": {
    "type": "object",
    "properties": {
      "country": {
        "type": "string",
        "description": "国家名称，使用ISO 3166-1标准英文名称，\
          如 'United States'、'China'、'Japan'。\
          不接受缩写如 'US'、'CHN'。"
      },
      "currency_code": {
        "type": "string",
        "description": "货币代码，使用ISO 4217标准三字母代码，\
          如 'USD'、'EUR'、'GBP'、'JPY'、'CNY'。\
          可通过 get_supported_currencies 工具获取所有支持的货币代码。"
      }
    },
    "required": ["country"]
  }
}
```

### 3.2 Required vs Optional

#### 3.2.1 Required字段设计原则

OpenAI官方建议[^2]：将真正必需的参数标记为required，避免过度要求导致调用失败。

```typescript
// ❌ 过度要求：一些不真正必要的参数被标记为required
{
  "name": "create_calendar_event",
  "parameters": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "start_time": { "type": "string" },
      "end_time": { "type": "string" },
      "location": { "type": "string" },
      "description": { "type": "string" },
      "attendees": { "type": "array" },
      "reminder": { "type": "integer" },
      "color": { "type": "string" }
    },
    "required": ["title", "start_time", "end_time", "location", "description", "attendees", "reminder", "color"]
    // 错误：一个简单的提醒功能需要填写8个字段，其中很多其实有默认值即可
  }
}

// ✅ 合理要求：只标记真正必需的字段
{
  "name": "create_calendar_event",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "事件标题，必填。建议简洁明确，最多100字符。"
      },
      "start_time": {
        "type": "string",
        "description": "开始时间，必填。ISO 8601格式：YYYY-MM-DDTHH:mm:ssZ，如 '2024-06-15T14:00:00Z'"
      },
      "end_time": {
        "type": "string",
        "description": "结束时间，必填。ISO 8601格式。如果不提供，将自动设为开始时间后1小时。"
      },
      "location": {
        "type": "string",
        "description": "地点，可选。如为线上会议，建议使用视频会议链接格式。"
      },
      "description": {
        "type": "string",
        "description": "事件描述，可选。最多5000字符，支持Markdown格式。"
      },
      "attendees": {
        "type": "array",
        "description": "参会人员，可选。每个元素为邮箱地址。"
      },
      "reminder": {
        "type": "integer",
        "description": "提前提醒时间（分钟），可选。默认15分钟，范围5-1440。"
      },
      "color": {
        "type": "string",
        "description": "日历颜色代码，可选。格式为 hex 色值，如 '#FF5733'。"
      }
    },
    "required": ["title", "start_time"],
    "additionalProperties": false
  }
}
```

#### 3.2.2 OpenAI strict模式下的Required处理

使用OpenAI的strict模式时，所有非optional字段都必须在required数组中声明[^3]：

```typescript
// OpenAI strict模式示例
{
  "name": "process_payment",
  "strict": true,  // 启用严格模式
  "parameters": {
    "type": "object",
    "properties": {
      "amount": {
        "type": "number",
        "description": "支付金额，必须为正数"
      },
      "currency": {
        "type": "string",
        "enum": ["USD", "EUR", "GBP", "JPY", "CNY"]
      },
      "card_token": {
        "type": "string",
        "description": "从客户端获取的信用卡令牌"
      },
      "metadata": {
        "type": "object",
        "description": "附加元数据，可选"
      }
    },
    "required": ["amount", "currency", "card_token"],
    "additionalProperties": false
  }
}
```

### 3.3 嵌套对象设计

#### 3.3.1 嵌套层级控制

根据OpenAI的官方建议[^4]，扁平结构（flat structure）通常更容易让模型推理：

```typescript
// ❌ 过度嵌套：增加模型理解难度
{
  "name": "create_order",
  "parameters": {
    "type": "object",
    "properties": {
      "order": {
        "type": "object",
        "properties": {
          "customer": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" },
              "contact": {
                "type": "object",
                "properties": {
                  "email": { "type": "string" },
                  "phone": { "type": "string" }
                }
              }
            }
          },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "product": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" }
                  }
                },
                "quantity": { "type": "integer" }
              }
            }
          },
          "shipping": {
            "type": "object",
            "properties": {
              "address": {
                "type": "object",
                "properties": {
                  "street": { "type": "string" },
                  "city": { "type": "string" },
                  "country": { "type": "string" }
                }
              },
              "method": { "type": "string" }
            }
          }
        }
      }
    },
    "required": ["order"]
  }
}

// ✅ 扁平化设计：减少嵌套层级
{
  "name": "create_order",
  "parameters": {
    "type": "object",
    "properties": {
      "customer_id": {
        "type": "string",
        "description": "客户ID"
      },
      "customer_email": {
        "type": "string",
        "description": "客户邮箱"
      },
      "items": {
        "type": "array",
        "description": "订单商品列表",
        "items": {
          "type": "object",
          "properties": {
            "product_id": { "type": "string" },
            "quantity": { "type": "integer", "minimum": 1 }
          },
          "required": ["product_id", "quantity"]
        }
      },
      "shipping_street": { "type": "string" },
      "shipping_city": { "type": "string" },
      "shipping_country": { "type": "string" },
      "shipping_method": {
        "type": "string",
        "enum": ["standard", "express", "overnight"]
      }
    },
    "required": ["customer_id", "items", "shipping_street", "shipping_city", "shipping_country"]
  }
}
```

#### 3.3.2 复杂嵌套的合理使用

当嵌套能清晰表达数据关系时，合理的嵌套是可接受的：

```typescript
// ✅ 合理的嵌套：地址对象有明确的语义边界
{
  "name": "book_hotel",
  "parameters": {
    "type": "object",
    "properties": {
      "hotel_id": { "type": "string" },
      "guest_name": { "type": "string" },
      "check_in": { "type": "string", "description": "入住日期，YYYY-MM-DD格式" },
      "check_out": { "type": "string", "description": "退房日期，YYYY-MM-DD格式" },
      "room_type": {
        "type": "string",
        "enum": ["standard", "deluxe", "suite"]
      },
      "address": {
        "type": "object",
        "description": "酒店地址信息",
        "properties": {
          "street": { "type": "string" },
          "city": { "type": "string" },
          "state": { "type": "string" },
          "country": { "type": "string" },
          "postal_code": { "type": "string" }
        },
        "required": ["street", "city", "country"]
      },
      "special_requests": {
        "type": "array",
        "description": "特殊要求列表",
        "items": {
          "type": "string",
          "enum": ["non_smoking", "high_floor", "quiet_room", "early_checkin", "late_checkout"]
        }
      }
    },
    "required": ["hotel_id", "guest_name", "check_in", "check_out", "room_type"]
  }
}
```

### 3.4 具体参数约束示例

#### 3.4.1 数值范围约束

```typescript
{
  "name": "adjust_image",
  "parameters": {
    "type": "object",
    "properties": {
      "brightness": {
        "type": "number",
        "description": "亮度调整，范围-100到100，0表示不变",
        "minimum": -100,
        "maximum": 100,
        "default": 0
      },
      "contrast": {
        "type": "number",
        "description": "对比度调整，范围-100到100，0表示不变",
        "minimum": -100,
        "maximum": 100,
        "default": 0
      },
      "saturation": {
        "type": "number",
        "description": "饱和度调整，范围-100到100，0表示不变",
        "minimum": -100,
        "maximum": 100,
        "default": 0
      },
      "blur": {
        "type": "number",
        "description": "模糊半径（像素），范围0到20，0表示不模糊",
        "minimum": 0,
        "maximum": 20,
        "default": 0
      }
    },
    "additionalProperties": false
  }
}
```

#### 3.4.2 字符串格式约束

```typescript
{
  "name": "validate_document",
  "parameters": {
    "type": "object",
    "properties": {
      "document_id": {
        "type": "string",
        "description": "文档ID，格式为 XXX-YYYY-NNNN，其中X为字母，Y为数字，N为0-9",
        "pattern": "^[A-Z]{3}-[0-9]{4}-[0-9]{4}$"
      },
      "email": {
        "type": "string",
        "description": "邮箱地址，必须符合RFC 5322规范"
      },
      "url": {
        "type": "string",
        "description": "网址，必须以 http:// 或 https:// 开头",
        "pattern": "^https?://.+$"
      },
      "phone": {
        "type": "string",
        "description": "国际电话号码，格式：+[国家代码][号码]，如 +8613812345678"
      }
    },
    "required": ["document_id", "email"]
  }
}
```

---

## 4. 最佳实践

### 4.1 OpenAI官方最佳实践

根据OpenAI官方文档[^2][^4]，以下是Function Calling的核心最佳实践：

#### 4.1.1 Schema设计原则

```typescript
// OpenAI推荐的工具定义结构
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "获取指定位置的当前天气信息",  // 清晰、简洁
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "城市名称，如 'San Francisco, CA' 或 'Paris, France'",
          },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            description: "温度单位"
          },
        },
        required: ["location"],
        additionalProperties: false,  // 拒绝额外参数
      },
      strict: true,  // 启用严格模式确保参数符合schema
    },
  },
];
```

#### 4.1.2 扁平结构优先

OpenAI在其o3/o4-mini Function Calling指南中指出[^4]：

> "Flat structures are often easier for the model to reason about: In flatter schemas, argument fields are top-level and immediately visible."

```typescript
// ✅ 推荐：扁平结构
{
  "name": "book_flight",
  "parameters": {
    "type": "object",
    "properties": {
      "from_city": { "type": "string" },
      "to_city": { "type": "string" },
      "departure_date": { "type": "string" },
      "return_date": { "type": "string" },
      "passengers": { "type": "integer" }
    },
    "required": ["from_city", "to_city", "departure_date"]
  }
}

// ❌ 避免：过度嵌套
{
  "name": "book_flight",
  "parameters": {
    "type": "object",
    "properties": {
      "route": {
        "type": "object",
        "properties": {
          "from": { "type": "object", "properties": { "city": { "type": "string" } } },
          "to": { "type": "object", "properties": { "city": { "type": "string" } } }
        }
      },
      "dates": {
        "type": "object",
        "properties": {
          "departure": { "type": "string" },
          "return": { "type": "string" }
        }
      }
    }
  }
}
```

#### 4.1.3 使用strict模式

OpenAI建议在生产环境中启用strict模式[^3]：

```typescript
{
  "type": "function",
  "function": {
    "name": "process_order",
    "strict": true,  // 确保函数调用严格遵循schema
    "parameters": {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          pattern: "^ORD-[0-9]{8}$"  // 订单ID格式：ORD-后跟8位数字
        },
        action: {
          type: "string",
          enum: ["confirm", "cancel", "refund"]
        }
      },
      required: ["order_id", "action"],
      additionalProperties: false
    }
  }
}
```

### 4.2 Anthropic Claude工具使用设计

Anthropic的官方文档[^1]提供了针对Claude的详细设计指南：

#### 4.2.1 核心设计原则

1. **Description至上**：Anthropic特别强调Description的重要性
2. **input_examples辅助**：对于复杂工具，提供输入示例
3. **工具粒度适中**：避免过多细粒度工具，提供综合工具

```typescript
// Anthropic风格的工具定义
const tools = [
  {
    name: "get_stock_price",
    description: `检索指定股票 ticker 的当前交易价格。

    这个工具应该在以下场景使用：
    - 用户询问某只股票的当前价格
    - 需要获取实时股价信息进行比较
    - 用户要求追踪特定股票的价格变动

    这个工具不提供：
    - 历史价格数据（使用 get_historical_prices）
    - 分析师评级（使用 get_analyst_ratings）
    - 财务报表数据（使用 get_financials）

    返回数据包括：当前价格、交易日时间、成交量、市值等基础信息。`,
    input_schema: {
      type: "object",
      properties: {
        ticker: {
          type: "string",
          description: "股票代码符号，如 AAPL、MSFT、GOOGL。必须是有效的在美国主要交易所上市的股票代码。"
        },
        include_extended_hours: {
          type: "boolean",
          description: "是否包含盘前盘后交易数据，默认为 false。"
        }
      },
      required: ["ticker"]
    },
    // 对于复杂工具，提供input_examples
    input_examples: [
      { ticker: "AAPL", include_extended_hours: false },
      { ticker: "TSLA", include_extended_hours: true }
    ]
  }
];
```

#### 4.2.2 工具分组策略

Anthropic建议将相关操作整合到更少的工具中[^1]：

```typescript
// ❌ 过度分散：每个操作一个工具
const badTools = [
  { name: "github_create_issue" },
  { name: "github_close_issue" },
  { name: "github_reopen_issue" },
  { name: "github_comment_issue" },
  { name: "github_assign_issue" },
];

// ✅ 整合设计：按操作类型分组
const goodTools = [
  {
    name: "github_issues",
    description: `GitHub Issues管理工具，支持创建、查询、更新和评论Issue。
    
    使用场景：
    - 用户要求创建新的Issue
    - 查询现有Issue的状态或详情
    - 更新Issue的状态（开启、关闭、里程碑等）
    - 对Issue添加评论
    
    每个操作都需要指定action参数来区分操作类型。`,
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "get", "list", "update", "comment", "close", "reopen"],
          description: "操作类型"
        },
        repo: { type: "string", description: "仓库名称，格式：owner/repo" },
        issue_number: { type: "integer", description: "Issue编号（仅update、comment、close、reopen操作需要）" },
        title: { type: "string", description: "Issue标题（仅create操作需要）" },
        body: { type: "string", description: "Issue正文内容（仅create操作需要）" },
        labels: { type: "array", items: { type: "string" }, description: "标签列表" },
        assignee: { type: "string", description: "被分配人用户名" }
      },
      required: ["action", "repo"]
    }
  }
];
```

### 4.3 Google A2A协议相关设计

Google的A2A（Agent2Agent）协议[^5]虽然主要关注Agent之间的通信，但其设计理念也适用于工具Schema：

#### 4.3.1 A2A的核心概念

A2A协议强调：
- **Agent Card**：Agent的能力描述，用于服务发现
- **Task Lifecycle**：任务状态管理
- **Skill**：Agent暴露的能力单元

#### 4.3.2 Skill Schema设计

```typescript
// 类似A2A Skill定义的工具设计
{
  "name": "data_analysis",
  "description": `数据分析工具集，提供数据处理、统计分析和可视化功能。
  
  主要能力：
  1. 数据处理：清洗、转换、聚合
  2. 统计分析：描述统计、相关性分析、回归分析
  3. 可视化生成：生成图表（折线图、柱状图、散点图、饼图）
  
  输入数据格式支持：
  - CSV（逗号分隔）
  - JSON（平面化结构）
  - Excel（.xlsx，单个工作表）
  
  输出格式：
  - 分析结果为JSON结构
  - 图表为PNG图片（base64编码）`,
  "parameters": {
    "type": "object",
    "properties": {
      "task_type": {
        "type": "string",
        "enum": ["clean", "aggregate", "describe", "correlate", "regress", "visualize"],
        "description": "任务类型：clean（清洗）、aggregate（聚合）、describe（描述统计）、correlate（相关性）、regress（回归）、visualize（可视化）"
      },
      "data": {
        "type": "object",
        "description": "输入数据，根据task_type不同而结构不同"
      },
      "config": {
        "type": "object",
        "description": "任务配置参数",
        "properties": {
          "output_format": {
            "type": "string",
            "enum": ["json", "png", "both"],
            "default": "json"
          },
          "visualization_type": {
            "type": "string",
            "enum": ["line", "bar", "scatter", "pie", "histogram"],
            "description": "图表类型（仅visualize任务需要）"
          }
        }
      }
    },
    "required": ["task_type", "data"]
  }
}
```

#### 4.3.3 多Agent协作的Schema设计

```typescript
// A2A风格的多Agent任务协作Schema
{
  "name": "orchestrate_research",
  "description": `研究任务编排器，协调多个专业Agent完成复杂研究任务。
  
  工作流程：
  1. 分解任务为子任务
  2. 分发给相应的专业Agent（数据收集、分析、写作）
  3. 汇总各Agent的结果
  4. 生成最终报告
  
  协调策略：
  - sequential：按顺序执行子任务
  - parallel：并行执行独立的子任务
  - hierarchical：先并行后顺序汇总`,
  "parameters": {
    "type": "object",
    "properties": {
      "task": {
        "type": "string",
        "description": "研究任务的自然语言描述"
      },
      "strategy": {
        "type": "string",
        "enum": ["sequential", "parallel", "hierarchical"],
        "description": "协调策略"
      },
      "sub_agents": {
        "type": "array",
        "description": "子Agent配置列表",
        "items": {
          "type": "object",
          "properties": {
            "agent_type": {
              "type": "string",
              "enum": ["researcher", "analyzer", "writer", "critic"],
              "description": "Agent类型"
            },
            "task_description": { "type": "string" },
            "depends_on": {
              "type": "array",
              "items": { "type": "integer" },
              "description": "依赖的子Agent索引"
            }
          },
          "required": ["agent_type", "task_description"]
        }
      },
      "output_format": {
        "type": "string",
        "enum": ["report", "slides", "memo", "brief"],
        "default": "report"
      }
    },
    "required": ["task", "strategy", "sub_agents"]
  }
}
```

---

## 5. 代码示例

### 5.1 优化前后的Schema对比

#### 5.1.1 论文搜索工具优化

```typescript
// ❌ 优化前：描述不足、参数设计不良
const BAD_schema = {
  name: "search_papers",
  description: "搜索学术论文",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string" },
      max_results: { type: "integer" }
    },
    required: ["query"]
  }
};

// ✅ 优化后：描述完整、约束明确
const OPTIMIZED_schema = {
  name: "search_papers",
  description: `在学术论文数据库中搜索相关研究论文。

  使用场景：
  - 用户要求查找特定主题的论文
  - 需要验证某个研究问题是否已有解决方案
  - 查找特定论文或作者的其他作品

  数据来源：
  - Semantic Scholar（主要来源）
  - 支持通过DOI、arXiv ID直接获取论文

  返回结果说明：
  - 按相关性排序
  - 包含论文标题、作者、摘要、引用数、发表venue
  - 仅返回有开放获取摘要的论文

  限制：
  - 每次最多返回50篇论文
  - 不包含完整PDF下载链接（使用 get_paper_pdf 工具）`,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: `搜索查询语句，支持：
          - 关键词：'machine learning'
          - 作者：'author:Andrew Ng'
          - 机构：'venue:NeurIPS'
          - DOI：'doi:10.1145/3442188.3445922'
          - arXiv ID：'arxiv:2103.14030'
          
          建议使用具体的专业术语以获得更准确的结果。`
      },
      max_results: {
        type: "integer",
        description: "最大返回结果数，范围1-50",
        minimum: 1,
        maximum: 50,
        default: 10
      },
      year_from: {
        type: "integer",
        description: "发表年份下限（不含），如2018表示只返回2018年之后发表的论文"
      },
      year_to: {
        type: "integer",
        description: "发表年份上限（不含），如2024表示只返回2024年之前发表的论文"
      },
      include_citations: {
        type: "boolean",
        description: "是否包含论文引用关系数据，默认false",
        default: false
      },
      sort_by: {
        type: "string",
        enum: ["relevance", "citation_count", "publication_date"],
        description: "排序方式：relevance（相关性）、citation_count（引用数）、publication_date（发表日期）",
        default: "relevance"
      }
    },
    required: ["query"],
    additionalProperties: false
  }
};
```

#### 5.1.2 日程管理工具优化

```typescript
// ❌ 优化前：扁平但缺乏约束
const BAD_schema = {
  name: "calendar",
  description: "日历管理",
  parameters: {
    type: "object",
    properties: {
      date: { type: "string" },
      time: { type: "string" },
      event: { type: "string" }
    },
    required: ["date", "time", "event"]
  }
};

// ✅ 优化后：结构清晰、约束完整
const OPTIMIZED_schema = {
  name: "manage_calendar",
  description: `管理日历事件，支持创建、查询、更新和删除操作。

  日期时间格式：
  - 必须使用ISO 8601格式
  - 日期：YYYY-MM-DD
  - 时间：HH:mm:ss（24小时制）
  - 时区：UTC偏移量，如 +08:00 或 Z

  事件时长规则：
  - 如果只提供start_time，持续时间默认为1小时
  - 如果同时提供start_time和end_time，以较早者为准
  - 最小持续时间15分钟，最大持续时间24小时

  冲突检测：
  - 创建事件时自动检测与现有事件的冲突
  - 如有冲突，返回冲突事件列表供用户确认
  - 用户可选择覆盖或重新安排`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "query", "update", "delete", "list"],
        description: "操作类型：create（创建）、query（查询单个）、update（更新）、delete（删除）、list（列出范围内事件）"
      },
      event_id: {
        type: "string",
        description: "事件唯一标识符（query、update、delete操作必需）"
      },
      title: {
        type: "string",
        description: "事件标题，最多100字符，必填"
      },
      start_time: {
        type: "string",
        description: "开始时间，格式：YYYY-MM-DDTHH:mm:ssZ，如 2024-06-15T14:00:00Z"
      },
      end_time: {
        type: "string",
        description: "结束时间，格式同start_time。如不提供，默认为start_time后1小时"
      },
      timezone: {
        type: "string",
        description: "时区，格式：Asia/Shanghai、America/New_York、Europe/London等",
        default: "UTC"
      },
      location: {
        type: "string",
        description: "事件地点，最多200字符。可选"
      },
      description: {
        type: "string",
        description: "事件描述，最多5000字符，支持Markdown格式"
      },
      attendees: {
        type: "array",
        description: "参会人员邮箱列表",
        items: {
          type: "string",
          format: "email"
        }
      },
      reminder: {
        type: "object",
        description: "提醒设置",
        properties: {
          method: {
            type: "string",
            enum: ["email", "popup", "sound"],
            description: "提醒方式"
          },
          minutes_before: {
            type: "integer",
            description: "提前提醒分钟数",
            minimum: 5,
            maximum: 1440
          }
        }
      },
      recurrence: {
        type: "string",
        enum: ["none", "daily", "weekly", "monthly", "yearly"],
        description: "重复规则",
        default: "none"
      },
      query_range: {
        type: "object",
        description: "查询时间范围（仅list操作）",
        properties: {
          start: { type: "string", description: "范围开始时间" },
          end: { type: "string", description: "范围结束时间" }
        }
      }
    },
    required: ["action", "title"],
    dependencies: {
      // 定义参数间的依赖关系
      event_id: ["query", "update", "delete"],
      start_time: ["create", "update"],
      query_range: ["list"]
    }
  }
};
```

### 5.2 实际效果对比

#### 5.2.1 测试用例对比

以下是对优化前后的Schema进行测试的示例代码：

```typescript
// test-function-calling.ts

interface TestCase {
  name: string;
  user_input: string;
  expected_tool: string;
  expected_params: Record<string, unknown>;
}

// 优化后的Schema测试用例
const testCases: TestCase[] = [
  {
    name: "基础搜索",
    user_input: "搜索关于Transformer架构的论文",
    expected_tool: "search_papers",
    expected_params: {
      query: "Transformer architecture",
      max_results: 10
    }
  },
  {
    name: "带年份限制的搜索",
    user_input: "找找2020年以后关于GPT模型的论文",
    expected_tool: "search_papers",
    expected_params: {
      query: "GPT language model",
      year_from: 2020,
      max_results: 10
    }
  },
  {
    name: "特定作者搜索",
    user_input: "搜索Yoshua Bengio的最新研究",
    expected_tool: "search_papers",
    expected_params: {
      query: "author:Yoshua Bengio",
      sort_by: "publication_date",
      max_results: 10
    }
  }
];

// 模拟LLM调用（简化版）
async function simulateLLMCall(
  schema: unknown,
  userInput: string
): Promise<{ tool: string; params: Record<string, unknown> }> {
  // 实际应用中，这里会调用真实的LLM API
  // 这里用简单的规则匹配模拟
  const query = extractQuery(userInput);
  return {
    tool: "search_papers",
    params: {
      query,
      max_results: 10
    }
  };
}

function extractQuery(input: string): string {
  // 简化版，实际需要更复杂的NLP处理
  if (input.includes("2020年以后")) {
    return input.replace(/2020年以后/g, "").trim();
  }
  if (input.includes("最新")) {
    return input.replace(/最新/g, "").trim();
  }
  return input;
}

// 测试函数
async function runTests(
  schemaName: string,
  schema: unknown,
  cases: TestCase[]
) {
  console.log(`\n========== 测试: ${schemaName} ==========\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const tc of cases) {
    try {
      const result = await simulateLLMCall(schema, tc.user_input);
      
      const toolMatch = result.tool === tc.expected_tool;
      const paramsMatch = JSON.stringify(result.params) === JSON.stringify(tc.expected_params);
      
      if (toolMatch && paramsMatch) {
        console.log(`✅ ${tc.name}`);
        passed++;
      } else {
        console.log(`❌ ${tc.name}`);
        console.log(`   期望: ${tc.expected_tool} ${JSON.stringify(tc.expected_params)}`);
        console.log(`   实际: ${result.tool} ${JSON.stringify(result.params)}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${tc.name}: ${error}`);
      failed++;
    }
  }
  
  console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
  return { passed, failed };
}

// 运行测试
await runTests("优化前 Schema", BAD_schema, testCases);
await runTests("优化后 Schema", OPTIMIZED_schema, testCases);
```

#### 5.2.2 常见输入处理对比

```typescript
// 处理各种用户输入变体
const userInputs = [
  "给我找几篇RAG的论文",
  "我想了解一下检索增强生成的相关研究",
  "有没有关于2023年的RAG论文？",
  "搜索 paper about RAG",
  "用一下search_papers工具查一下RAG"
];

// 优化前Schema的解析结果
function parseWithBadSchema(userInput: string) {
  // 简单关键词提取
  const query = userInput
    .replace(/给我找|我想了解|有没有|搜索|paper about|用.*工具/g, "")
    .replace(/关于.*年的/g, "")
    .trim();
  
  return {
    query,
    max_results: 10
  };
}

// 优化后Schema的解析增强
function parseWithOptimizedSchema(userInput: string) {
  let query = userInput;
  let yearFrom: number | undefined;
  let maxResults = 10;
  
  // 提取年份约束
  const yearMatch = userInput.match(/(\d{4})年/);
  if (yearMatch) {
    yearFrom = parseInt(yearMatch[1]) + 1;
    query = query.replace(/关于.*年的/g, "");
  }
  
  // 提取数量约束
  if (userInput.includes("几篇")) {
    maxResults = 5;
  } else if (userInput.includes("很多") || userInput.includes("大量")) {
    maxResults = 30;
  }
  
  // 清理query
  query = query
    .replace(/给我找|我想了解|有没有|搜索|paper about|用.*工具/g, "")
    .trim();
  
  const result: Record<string, unknown> = { query, max_results: maxResults };
  if (yearFrom) {
    result.year_from = yearFrom;
  }
  
  return result;
}

console.log("Schema解析对比：\n");
for (const input of userInputs) {
  console.log(`输入: "${input}"`);
  console.log(`  优化前: ${JSON.stringify(parseWithBadSchema(input))}`);
  console.log(`  优化后: ${JSON.stringify(parseWithOptimizedSchema(input))}`);
  console.log();
}
```

---

## 6. 常见错误与解决方案

### 6.1 过度描述

#### 6.1.1 问题表现

过度描述指在Description中包含过多细节、重复说明或无关信息。

```typescript
// ❌ 过度描述示例
{
  "name": "get_weather",
  "description": `获取天气预报。这个工具可以用来获取天气预报信息。
    天气是指在特定时间和地点的大气状况，包括温度、湿度、降水、风速等因素。
    天气预报是通过气象学原理和数据分析来预测未来天气状况的科学。
    在古代，人们通过观察动物行为、云层变化等方式来预测天气。
    现代天气预报依赖于气象卫星、雷达、探空气球等设备收集的数据。
    使用这个工具时，用户需要提供位置信息，可以是城市名称如北京、纽约等。
    位置信息也可以是经纬度坐标，如39.9, 116.4。
    温度单位可以选择摄氏度或华氏度。
    湿度表示空气中水蒸气的含量，用百分比表示。
    降水包括雨、雪、冰雹等形式。
    风速单位通常是米每秒或公里每小时。
    这个工具返回的数据包括温度、湿度、降水概率、风速风向等。
    工具使用前需要确保输入的位置信息是正确的。
    如果输入的位置不存在，将返回错误信息。
    工具返回的数据是实时数据，可能与最终天气情况有差异。
    这个工具不能用于预测地震、火山爆发等地质灾害。
    这个工具也不能用于获取历史天气数据。`  // 过长且包含大量无关信息
}
```

#### 6.1.2 解决方案

```typescript
// ✅ 适度描述
{
  "name": "get_weather",
  "description": `获取指定位置的天气预报信息。

    使用场景：用户询问天气、是否需要带伞、穿什么衣服等日常决策。

    返回数据：温度（摄氏度/华氏度）、湿度、体感温度、降水概率、风速风向、紫外线指数。

    输入要求：
    - location：城市名称或经纬度坐标
    - unit：温度单位（celsius/fahrenheit）

    注意：不提供历史天气或灾害预警服务。`
}
```

#### 6.1.3 描述长度指南

| 工具复杂度 | 建议Description长度 | 示例 |
|-----------|-------------------|------|
| 简单工具（1-2参数） | 50-100字 | 获取当前时间 |
| 中等工具（3-5参数） | 100-300字 | 天气查询、股票价格 |
| 复杂工具（6+参数） | 300-500字 | 日历管理、订单处理 |
| 工具集（多操作） | 500-800字 | GitHub API、文件操作 |

### 6.2 描述不足

#### 6.2.1 问题表现

描述不足导致模型无法正确理解工具用途和参数含义。

```typescript
// ❌ 描述不足示例
{
  "name": "data_process",
  "description": "数据处理工具",
  "parameters": {
    "type": "object",
    "properties": {
      "input": { "type": "string" },
      "config": { "type": "object" },
      "output": { "type": "string" }
    },
    "required": ["input"]
  }
}
```

用户可能的各种误解：
- `input`是什么格式？CSV？JSON？数据库查询？
- `config`要包含什么？如何指定处理逻辑？
- `output`是文件路径还是直接返回数据？

#### 6.2.2 解决方案

```typescript
// ✅ 详细描述
{
  "name": "data_process",
  "description": `对结构化数据执行ETL（提取、转换、加载）处理。

    支持的输入格式：
    - CSV：第一行必须是列名，分隔符为逗号
    - JSON：平面化JSON数组，如 [{"name": "Alice", "age": 30}]
    - TSV：制表符分隔的文件

    处理配置（config）说明：
    - operations：操作序列，如 ["filter", "sort", "aggregate"]
    - filter：过滤条件，格式 {"column": "age", "operator": ">", "value": 18}
    - sort：排序规则，格式 [{"column": "name", "order": "asc"}]
    - aggregate：聚合规则，格式 {"function": "sum", "column": "amount", "groupBy": "category"}

    输出选项（output）：
    - "return"：直接返回处理后的数据（默认）
    - 文件路径：保存为CSV或JSON文件

    示例：
    config = {
      "operations": ["filter", "sort"],
      "filter": {"column": "status", "operator": "=", "value": "active"},
      "sort": [{"column": "created_at", "order": "desc"}]
    }`,
  "parameters": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "输入数据。格式1：直接传入数据数组的JSON字符串。格式2：CSV/TSV文件的本地路径（如 ./data/users.csv）"
      },
      "config": {
        "type": "object",
        "description": "处理配置对象，详见上方说明",
        "properties": {
          "operations": {
            "type": "array",
            "items": { "type": "string", "enum": ["filter", "sort", "aggregate", "transform", "deduplicate"] }
          },
          "filter": { "type": "object" },
          "sort": { "type": "array" },
          "aggregate": { "type": "object" }
        }
      },
      "output": {
        "type": "string",
        "description": "输出选项：'return'（默认）或有效的文件路径（.csv/.json）"
      }
    },
    "required": ["input"]
  }
}
```

### 6.3 冲突约束

#### 6.3.1 问题表现

Schema内部存在逻辑矛盾，导致模型无法生成有效调用。

```typescript
// ❌ 冲突约束示例1：required与optional的矛盾
{
  "name": "create_event",
  "parameters": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "start_time": { "type": "string" },
      "end_time": { "type": "string" },
      "duration_minutes": { "type": "integer" }
    },
    "required": ["title", "start_time"],  // end_time和duration_minutes至少需要一个
    "additionalProperties": false
  }
}

// ❌ 冲突约束示例2：枚举值与描述矛盾
{
  "name": "set_priority",
  "parameters": {
    "type": "object",
    "properties": {
      "priority": {
        "type": "string",
        "enum": ["low", "medium", "high", "urgent"],
        "description": "优先级：low（低）、medium（中）、high（高）、urgent（紧急，只有关键故障才能使用）"
        // 但如果系统不支持"urgent"作为有效值，就产生了矛盾
      }
    },
    "required": ["priority"]
  }
}

// ❌ 冲突约束示例3：类型与格式矛盾
{
  "name": "format_date",
  "parameters": {
    "type": "object",
    "properties": {
      "date": {
        "type": "integer",
        "description": "日期，格式：YYYY-MM-DD，如 2024-06-15"
        // integer类型无法表示"YYYY-MM-DD"格式的字符串
      }
    },
    "required": ["date"]
  }
}
```

#### 6.3.2 解决方案

```typescript
// ✅ 解决冲突1：明确参数关系
{
  "name": "create_event",
  "parameters": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "start_time": { "type": "string", "description": "ISO 8601格式，如 2024-06-15T14:00:00Z" },
      "end_time": { "type": "string", "description": "ISO 8601格式，如不提供则自动设为start_time后1小时" },
      "duration_minutes": {
        "type": "integer",
        "description": "持续时间（分钟），与end_time二选一。如提供end_time则此参数被忽略",
        "minimum": 15,
        "maximum": 1440
      }
    },
    "required": ["title", "start_time"],
    "additionalProperties": false
  }
}

// ✅ 解决冲突2：使用oneOf或明确约束
{
  "name": "set_priority",
  "parameters": {
    "type": "object",
    "properties": {
      "priority": {
        "oneOf": [
          {
            "type": "string",
            "enum": ["low", "medium", "high"],
            "description": "标准优先级"
          },
          {
            "type": "string",
            "const": "urgent",
            "description": "紧急优先级，仅在is_critical=true时可用"
          }
        ]
      },
      "is_critical": {
        "type": "boolean",
        "description": "标记为关键故障，仅在真正紧急情况下设为true"
      }
    },
    "required": ["priority"],
    "additionalProperties": false
  }
}

// ✅ 解决冲突3：类型与格式统一
{
  "name": "format_date",
  "parameters": {
    "type": "object",
    "properties": {
      "date": {
        "type": "string",
        "format": "date",
        "description": "日期，ISO 8601 date格式：YYYY-MM-DD，如 2024-06-15"
      },
      "output_format": {
        "type": "string",
        "enum": ["iso", "us", "eu", "friendly"],
        "description": "输出格式：iso（2024-06-15）、us（06/15/2024）、eu（15/06/2024）、friendly（June 15, 2024）",
        "default": "iso"
      }
    },
    "required": ["date"]
  }
}
```

### 6.4 Schema验证工具

```typescript
// scripts/lib/schema-validator.ts

import type { JSONSchema } from "json-schema";

interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * 验证工具Schema的质量
 */
function validateToolSchema(schema: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!isObject(schema)) {
    errors.push({ path: "", message: "Schema必须是对象", severity: "error" });
    return errors;
  }
  
  const toolSchema = schema as Record<string, unknown>;
  
  // 检查name
  if (!toolSchema.name || typeof toolSchema.name !== "string") {
    errors.push({ path: "name", message: "name必须是非空字符串", severity: "error" });
  } else if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(toolSchema.name)) {
    errors.push({
      path: "name",
      message: "name必须以字母开头，只能包含字母、数字、下划线和连字符",
      severity: "error"
    });
  }
  
  // 检查description
  if (!toolSchema.description) {
    errors.push({ path: "description", message: "缺少description", severity: "warning" });
  } else if (typeof toolSchema.description === "string") {
    const desc = toolSchema.description;
    if (desc.length < 20) {
      errors.push({ path: "description", message: "description过短，可能不足以指导模型", severity: "warning" });
    }
    if (desc.length > 2000) {
      errors.push({ path: "description", message: "description过长，可能包含过多无关信息", severity: "warning" });
    }
  }
  
  // 检查parameters
  const params = toolSchema.parameters;
  if (!params) {
    errors.push({ path: "parameters", message: "缺少parameters定义", severity: "error" });
  } else if (isObject(params)) {
    validateParameters(params as Record<string, unknown>, "", errors);
  }
  
  return errors;
}

function validateParameters(
  params: Record<string, unknown>,
  path: string,
  errors: ValidationError[]
): void {
  if (params.type !== "object") {
    errors.push({
      path: `${path}.type`,
      message: "parameters.type必须是'object'",
      severity: "error"
    });
    return;
  }
  
  const props = params.properties as Record<string, unknown> | undefined;
  const required = params.required as string[] | undefined;
  
  // 检查required中的字段都在properties中
  if (Array.isArray(required)) {
    for (const field of required) {
      if (!props || !props[field]) {
        errors.push({
          path: `${path}.required`,
          message: `required中声明的字段'${field}'在properties中不存在`,
          severity: "error"
        });
      }
    }
  }
  
  // 检查properties中的每个字段
  if (isObject(props)) {
    for (const [key, prop] of Object.entries(props)) {
      if (!isObject(prop)) {
        errors.push({
          path: `${path}.properties.${key}`,
          message: `字段'${key}'的属性定义必须是对象`,
          severity: "error"
        });
        continue;
      }
      
      const propObj = prop as Record<string, unknown>;
      
      // 检查是否有description
      if (!propObj.description) {
        errors.push({
          path: `${path}.properties.${key}`,
          message: `字段'${key}'缺少description`,
          severity: "warning"
        });
      }
      
      // 检查类型与格式的一致性
      if (propObj.type === "string" && propObj.format === "date") {
        // OK
      } else if (propObj.type === "string" && propObj.pattern) {
        if (typeof propObj.pattern !== "string") {
          errors.push({
            path: `${path}.properties.${key}.pattern`,
            message: "pattern必须是字符串",
            severity: "error"
          });
        }
      }
      
      // 检查数值范围
      if (propObj.type === "integer" || propObj.type === "number") {
        if (propObj.minimum !== undefined && propObj.maximum !== undefined) {
          if (propObj.minimum > propObj.maximum) {
            errors.push({
              path: `${path}.properties.${key}`,
              message: `minimum(${propObj.minimum})大于maximum(${propObj.maximum})`,
              severity: "error"
            });
          }
        }
      }
    }
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 使用示例
const schema = {
  name: "test_tool",
  description: "测试工具",
  parameters: {
    type: "object",
    properties: {
      value: { type: "integer" }
    }
  }
};

const errors = validateToolSchema(schema);
if (errors.length > 0) {
  console.log("Schema验证发现问题：");
  for (const err of errors) {
    console.log(`  [${err.severity}] ${err.path}: ${err.message}`);
  }
}
```

---

## 7. 参考文献

[^1]: Anthropic. "Define tools - Claude API Docs". https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools

[^2]: OpenAI. "Function calling". https://developers.openai.com/api/docs/guides/function-calling/

[^3]: OpenAI Community. "Strict=True and Required Fields". https://community.openai.com/t/strict-true-and-required-fields/1131075

[^4]: OpenAI. "o3/o4-mini Function Calling Guide". https://developers.openai.com/cookbook/examples/o-series/o3o4-mini_prompting_guide/

[^5]: A2A Project. "Agent2Agent (A2A) Protocol". https://github.com/a2aproject/A2A

---

## 附录A：Schema检查清单

在提交工具Schema之前，请确认以下检查项：

### A.1 Description检查

- [ ] 清晰说明工具用途（1-2句话）
- [ ] 说明调用时机（何时使用此工具）
- [ ] 说明不适用场景（可选但推荐）
- [ ] 说明返回数据格式和内容
- [ ] 说明任何限制或注意事项
- [ ] 避免过长描述（<500字为佳）
- [ ] 避免重复信息

### A.2 参数检查

- [ ] 每个参数都有description
- [ ] required字段真正必需
- [ ] 枚举值完整且有意义
- [ ] 数值类型有合理范围限制
- [ ] 字符串类型有格式说明或正则约束
- [ ] 没有未使用的参数
- [ ] 没有与描述矛盾的约束

### A.3 结构检查

- [ ] 嵌套层级不超过3层
- [ ] 考虑使用扁平结构替代深度嵌套
- [ ] additionalProperties设置为false（推荐）
- [ ] 考虑启用strict模式

### A.4 示例检查

- [ ] 复杂工具提供input_examples
- [ ] 示例值符合约束条件
- [ ] 示例能够真实反映使用场景

---

## 附录B：Schema模板

### B.1 简单工具模板

```typescript
{
  "name": "tool_name",
  "description": `工具用途的简短描述（50-100字）。

    使用场景：
    - 场景1
    - 场景2

    限制：
    - 限制1
    - 限制2`,
  "parameters": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "参数1的说明"
      },
      "param2": {
        "type": "integer",
        "description": "参数2的说明",
        "minimum": 0,
        "maximum": 100
      }
    },
    "required": ["param1"]
  }
}
```

### B.2 复杂工具模板（多操作）

```typescript
{
  "name": "multi_action_tool",
  "description": `多功能工具，通过action参数区分操作类型。

    支持的操作：
    - create：创建资源
    - read：读取资源
    - update：更新资源
    - delete：删除资源

    操作说明：
    create：...
    read：...
    update：...
    delete：...`,
  "parameters": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["create", "read", "update", "delete"],
        "description": "操作类型"
      },
      "resource_id": {
        "type": "string",
        "description": "资源ID（read、update、delete操作必需）"
      },
      "data": {
        "type": "object",
        "description": "创建或更新时需要的数据（create、update操作需要）",
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "required": ["action"],
    "additionalProperties": false
  }
}
```
