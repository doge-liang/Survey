# opencode-dynamic-context-pruning

> OpenCode 智能上下文剪枝插件 —— 通过管理对话上下文自动优化 Token 用量，降低 AI 对话成本并提升响应质量。

[![GitHub stars](https://img.shields.io/github/stars/Opencode-DCP/opencode-dynamic-context-pruning)](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning)
[![npm version](https://img.shields.io/npm/v/@tarquinen/opencode-dcp)](https://www.npmjs.com/package/@tarquinen/opencode-dcp)
[![License: AGPL-3.0](https://img.shields.io/github/license/Opencode-DCP/opencode-dynamic-context-pruning)](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning)
[![npm weekly downloads](https://img.shields.io/npm/dw/@tarquinen/opencode-dcp)](https://www.npmjs.com/package/@tarquinen/opencode-dcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-82.5%25-blue)](https://www.typescriptlang.org/)

## 概述

**opencode-dynamic-context-pruning**（简称 DCP）是一个为 OpenCode AI 编程助手设计的上下文管理插件，通过智能剪枝对话历史中的冗余内容来自动降低 Token 消耗。该项目于 2025 年 11 月创建，至今已获得 1400+ Stars、81 Forks，每周 npm 下载量达 15,000+ 次，是 OpenCode 生态中最受欢迎的插件之一。

DCP 的核心理念是：**在不改变用户对话历史的前提下，通过 LLM 驱动的压缩工具和自动清理策略，将已处理完毕的内容替换为精简摘要，从而在长对话场景中显著节省 Token 成本**。与 OpenCode 原生 compaction 不同，DCP 允许模型自主判断何时激活压缩、压缩哪一部分对话，而非仅在会话达到最大上下文限制时才触发。

### 关键特性速览

- **LLM 驱动的智能压缩**: 模型自行决定何时激活压缩、压缩哪个范围，生成的摘要更精准
- **零成本自动策略**: 去重、覆盖写入、错误清除 —— 无需模型介入，后台自动运行
- **嵌套压缩保护**: 新的压缩块可嵌套旧的压缩摘要，信息层层叠加而非稀释丢失
- **实时进度可视化**: 压缩活动有进度条指示，用户随时掌握上下文优化状态
- **灵活配置体系**: 支持 3 层配置文件覆盖（全局 → 自定义目录 → 项目），完全可定制

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| **语言** | TypeScript | 主语言，占比 82.5% |
| **运行时** | Node.js (ESM) | 使用 `type: "module"` |
| **构建工具** | TypeScript (tsc) | 编译为 `./dist/index.js` |
| **OpenCode SDK** | @opencode-ai/sdk ^1.1.48 | 与 OpenCode 核心通信 |
| **Token 计数** | @anthropic-ai/tokenizer ^0.0.4 | Anthropic Tokenizer |
| **配置验证** | zod ^4.3.6 | 运行时 schema 验证 |
| **模糊匹配** | fuzzball ^2.2.3 | 相似性计算 |
| **JSON 解析** | jsonc-parser ^3.3.1 | 注释支持的配置解析 |
| **测试框架** | Bun test runner | 使用 `tsx` 加载器 |
| **格式工具** | Prettier ^3.8.1 | 代码格式化 |

**辅助语言:**
- Python (13.8%) — scripts/ 目录下提供的 token 统计等工具脚本
- Shell (3.7%) — 测试脚本

## 项目结构

```
opencode-dynamic-context-pruning/
├── index.ts               # 插件入口，导出 Plugin 类型
├── package.json           # npm 包配置，peerDependency: @opencode-ai/plugin >= 0.13.7
├── dcp.schema.json        # JSON Schema 配置规范（完整配置参考）
├── tsconfig.json          # TypeScript 编译配置
├── scripts/               # 辅助工具脚本
│   ├── opencode-token-stats        # Token 消耗统计
│   ├── opencode-session-timeline   # 会话时间线分析
│   ├── opencode-find-session       # 会话查找
│   ├── opencode-get-message        # 消息获取
│   ├── opencode_api.py             # Python 版 API 封装
│   ├── print.ts                    # 打印脚本
│   └── README.md                   # 脚本使用说明
├── lib/                   # 核心库（源码在 npm 包中为编译后 dist/）
│   ├── config.ts          # 配置加载：3层覆盖（全局/自定义/项目）
│   ├── hooks.ts           # 核心 Hook 系统：消息转换/系统提示/命令拦截
│   ├── state.ts           # 会话状态管理
│   ├── logger.ts          # 调试日志
│   ├── auth.ts            # 安全模式认证
│   ├── host-permissions.ts # 工具权限快照
│   ├── tools/             # 工具定义
│   │   └── compress.ts    # 统一压缩工具（v3.0.0+ 核心）
│   └── prompts/           # 提示词管理
│       └── store.ts       # 提示词存储与覆盖
├── tests/                 # 测试
│   ├── host-permissions.test.ts
│   └── test-dcp-cache.sh
├── assets/images/         # 演示截图
├── CONTRIBUTING.md
└── LICENSE (AGPL-3.0)
```

**配置搜索路径（优先级递增）:**
1. `~/.config/opencode/dcp.jsonc` — 全局配置
2. `$OPENCODE_CONFIG_DIR/dcp.jsonc` — 自定义配置目录
3. `.opencode/dcp.jsonc` — 项目级配置（优先级最高）

## 核心特性

### 1. Compress 压缩工具（v3.0.0 统一架构）

DCP v3.0.0 将旧的 distill / compress / prune 三工具系统合并为单一的 `compress` 工具，简化了接口设计。

**工作原理:**
1. 模型调用 `compress` 工具，指定要压缩的对话范围
2. DCP 将选定范围的对话内容替换为 LLM 生成的**技术摘要**
3. 原始历史记录**不会被修改**（保存在本地），仅在发送给 LLM 时替换
4. 当新的压缩块与旧压缩块重叠时，旧摘要会**嵌套**到新摘要中，信息逐层保留

**受保护内容（不会被压缩）:**
- 默认保护工具: `task`, `skill`, `todowrite`, `todoread`, `compress`, `batch`, `plan_enter`, `plan_exit`
- 通过 `compress.protectedTools` 可用 glob 模式（如 `mcp_*`）追加保护工具
- 通过 `compress.protectUserMessages` 可保护用户消息不被压缩

### 2. 自动清理策略（零成本）

无需模型介入，后台自动运行，仅在 `compress` 工具执行时重新计算：

| 策略 | 功能 | 默认状态 |
|------|------|---------|
| **Deduplication（去重）** | 识别重复的工具调用（同工具 + 同参数），仅保留最新输出 | 启用 |
| **Supersede Writes（覆盖写入）** | 当新的写入/编辑操作针对同一文件时，移除旧输出 | 启用 |
| **Purge Errors（错误清除）** | 错误工具调用的输入内容在 N 轮后清除（默认 4 轮），保留错误消息 | 启用 |

### 3. Nudge 提示机制

DCP 通过**系统提示注入**的方式向模型推送压缩提示，分为三种类型：

- **Context-limit nudge**: 当上下文超过 `maxContextLimit` 时触发，提示频率可配置（`nudgeFrequency`）
- **Turn nudge**: 用户消息后等待 N 轮（`iterationNudgeThreshold`，默认 15）添加提醒
- **Iteration nudge**: 压缩进度迭代提示

支持强制模式切换: `nudgeForce: "strong"` 或 `"soft"`

### 4. /dcp 命令行工具

```
/dcp                      # 显示所有可用命令
/dcp context             # 显示当前会话 Token 用量分类统计
/dcp stats               # 显示跨会话累计剪枝统计
/dcp sweep [N]           # 清扫最近 N 个工具输出（默认自上次用户消息后）
/dcp manual [on|off]     # 切换手动模式（AI 不自动调用压缩工具）
/dcp compress [focus]    # 手动触发一次压缩，可选聚焦文本
/dcp decompress <N>      # 解压指定 ID 的压缩块
/dcp recompress <N>      # 重新压缩指定 ID 的已解压块
```

### 5. 提示词覆盖系统

DCP 提供 5 个可编辑的提示词（默认禁用，需 `experimental.customPrompts: true`）:
- `system` — 系统提示
- `compress` — 压缩行为指导
- `context-limit-nudge` — 上下文超限提示
- `turn-nudge` — 轮次提醒
- `iteration-nudge` — 迭代提醒

启用后，默认提示词写入 `~/.config/opencode/dcp-prompts/defaults/`，用户可在 `overrides/` 目录创建同名文件进行覆盖。

### 6. 其他高级特性

- **Glob 模式保护**: `protectedTools` 和 `protectedFilePatterns` 支持 `*` 和 `?` 通配符
- **Per-Model 限制**: 通过 `modelMaxLimits` 和 `modelMinLimits` 为不同模型设置不同的上下文阈值
- **子代理支持**: `experimental.allowSubAgents: true` 允许子代理上下文也参与压缩（实验性）
- **压缩缓存影响**: 剪枝会改变消息结构，导致 LLM 提供商的 prompt cache 前缀匹配失效。实测缓存命中率从 90% 降至约 85%，但 Token 节省通常值得这个代价
- **统一 Schema 选项**: `compress.flatSchema: true` 可将嵌套参数展平为 4 个简单字符串参数

## 架构设计

### 插件架构

DCP 基于 OpenCode 的 Plugin API 构建。`index.ts` 导出一个符合 `Plugin` 类型的异步函数，注册以下生命周期钩子：

```typescript
// 实验性 Hook: 消息流拦截
"experimental.chat.system.transform"   // 系统提示 → 注入 DCP 提示词
"experimental.chat.messages.transform"  // 消息列表 → 替换压缩内容为摘要
"chat.message"                         // 缓存 variant
"experimental.text.complete"           // 文本补全处理

// 命令 Hook
"command.execute.before"              // 命令执行前 → 路由 /dcp 命令

// 工具定义
tool: { compress: createCompressTool(...) }  // 注册 compress 工具

// 配置钩子
config: async (opencodeConfig) => { ... }   // 注入 DCP 配置到 OpenCode
```

### 消息转换流程

```
用户消息 → OpenCode 发送请求
    ↓
DCP Hook: "experimental.chat.messages.transform"
    ├─ 策略处理（去重、覆盖写入、错误清除）
    ├─ 压缩块展开（如有）
    ├─ Token 计数与阈值检查
    └─ 替换后的消息列表
    ↓
OpenCode → LLM
```

### 配置架构

DCP 采用 JSON Schema 驱动（`dcp.schema.json`）的配置体系：

- **Zod 运行时验证**: 确保用户配置符合 schema
- **默认值自动应用**: 无需完整配置，展开默认配置块即可覆盖
- **3 层覆盖机制**: 支持项目级 → 全局级的配置继承

### 版本演进

- **v1.x - v2.x**: 旧版 3-tool 架构（distill / compress / prune 分离）
- **v3.0.0 (2026-03-09)**: 架构重构，三工具统一为单一 `compress` 工具，新增大量配置选项
- 当前活跃开发中（最新 v3.0.4），维护频率很高（61 个 releases）

## 快速开始

### 安装

在 OpenCode 配置文件中添加插件：

```jsonc
// opencode.jsonc
{
    "plugin": ["@tarquinen/opencode-dcp@latest"],
}
```

重启 OpenCode，插件自动启动并应用默认配置。

### 配置示例

```jsonc
// ~/.config/opencode/dcp.jsonc  或  项目 .opencode/dcp.jsonc
{
    // 启用调试日志（排查问题时开启）
    "debug": false,

    // 手动模式（AI 不自动压缩）
    "manualMode": {
        "enabled": false,
        "automaticStrategies": true  // 自动策略仍运行
    },

    // 压缩工具配置
    "compress": {
        "permission": "allow",      // ask | allow | deny
        "maxContextLimit": "80%",    // 软上限，超出后持续推送压缩提示
        "minContextLimit": "20%",    // 软下限，低于此值关闭提醒
        "nudgeFrequency": 5,         // 每 5 次请求触发一次上限提示
        "iterationNudgeThreshold": 15, // 用户消息后 15 轮开始提醒
        "nudgeForce": "soft",        // strong | soft
        "flatSchema": false,
        "protectedTools": [],        // 追加保护工具（glob 模式）
        "protectUserMessages": false // 保护用户消息不被压缩
    },

    // 自动策略
    "strategies": {
        "deduplication": { "enabled": true },
        "supersedeWrites": { "enabled": true },
        "purgeErrors": { "enabled": true, "turns": 4 }
    },

    // 实验性功能
    "experimental": {
        "allowSubAgents": false,
        "customPrompts": false
    }
}
```

### Token 统计

```bash
# 进入 DCP 会话后，使用命令查看 Token 用量
/dcp context   # 当前会话 Token 分类统计
/dcp stats     # 跨会话累计统计

# 或者使用 scripts 目录下的工具脚本
bun scripts/opencode-token-stats
```

## 学习价值

### 可以从这个项目学习到的内容

1. **OpenCode Plugin 系统设计**: DCP 是 OpenCode 插件生态的标杆实现，展示了如何利用 `experimental.chat.messages.transform` 拦截消息流、如何注册自定义工具、如何注入系统提示词
2. **LLM 驱动的上下文管理**: 如何设计 LLM 可控的压缩工具，让模型自主决定何时压缩、压缩什么范围，而非固定规则触发
3. **嵌套压缩与信息保留**: 多层压缩块嵌套的技术设计，确保信息在多次压缩后仍能逐层叠加保留，而非稀释丢失
4. **零成本自动策略**: 无需模型介入的去重、覆盖写入、错误清除策略设计，适合作为自动化规则引擎的参考
5. **配置系统设计**: JSON Schema 验证 + 3 层覆盖的配置体系，可复用于其他插件或工具
6. **Hook 系统架构**: 通过 Hook 模式（而非直接修改源码）扩展主程序行为，是插件化设计的经典范式
7. **Token 优化实战**: 在真实 AI 编程助手中降低 Token 消耗的工程实践，包括缓存失效的权衡取舍
8. **TypeScript Plugin 开发**: peerDependency 模式、ESM 模块、Zod 运行时验证等现代 npm 插件开发最佳实践

### 适合深入阅读的源码文件

| 文件 | 重点学习 |
|------|---------|
| `index.ts` | Plugin 架构全貌，Hook 注册方式 |
| `lib/hooks.ts` | 消息拦截、提示词注入、命令路由 |
| `lib/tools/compress.ts` | compress 工具实现，压缩摘要生成 |
| `lib/config.ts` | JSON Schema 配置加载与验证 |
| `dcp.schema.json` | 完整配置规范设计 |

## 相关项目

| 项目 | 描述 | 相似度 |
|------|------|--------|
| [Tarquinen/opencode-dynamic-context-pruning](https://github.com/Tarquinen/opencode-dynamic-context-pruning) | 同名上游仓库（DCP 作者 Tarquinen 的原始 fork） | 同一项目 |
| [haryisharry/opencode-dynamic-context-compressing](https://github.com/haryisharry/opencode-dynamic-context-compressing) | 社区 fork，MIT 许可证 | 中等 |
| [opencode.ai](https://opencode.ai/) | OpenCode AI 编程助手主项目 | 高（宿主项目） |
| [@opencode-ai/sdk](https://www.npmjs.com/package/@opencode-ai/sdk) | OpenCode SDK，供插件使用的核心接口库 | 高（依赖库） |
| [@opencode-ai/plugin](https://www.npmjs.com/package/@opencode-ai/plugin) | OpenCode Plugin API 类型定义 | 高（依赖库） |

### OpenCode 生态插件

| 插件 | 描述 |
|------|------|
| [Chikage0o0/opencode](https://github.com/Chikage0o0/opencode) | OpenCode 配置合集（含 DCP） |
| IgorWarzocha/opencode-config | Smithery 上的 OpenCode 配置向导 |
| 其他 MCP Servers | 通过 MCP 协议扩展 OpenCode 功能 |

## 参考资料

- [GitHub 仓库](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning)
- [npm 包](https://www.npmjs.com/package/@tarquinen/opencode-dcp)
- [OpenCode 官网](https://opencode.ai/)
- [OpenCode DCP 文档](https://lzw.me/docs/opencodedocs/Opencode-DCP/opencode-dynamic-context-pruning/)
- [DCP v3.0.0 Release Notes](https://newreleases.io/project/github/Opencode-DCP/opencode-dynamic-context-pruning/release/v3.0.0)
- [Linux.do 社区讨论：opencode-dcp 这个插件这么猛？](https://linux.do/t/topic/1542870)

---

*Generated: 2026-03-18*
