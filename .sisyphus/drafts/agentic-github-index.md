# Draft: Agentic GitHub Project Index System

## 需求来源

用户希望将现有的 GitHub 项目索引系统从"被动记录"升级为"智能管家"。

### 用户原话
> "我希望能实现得更 Agentic 一些"

## 已确认需求

### 核心目标
- 自动化项目分类和标签生成
- AI 驱动的智能分析
- 主动监控和更新
- 知识图谱构建
- 自然语言查询接口

### Intelligence Levels (5级架构)
1. **Level 1**: AI 智能分析（自动分类、标签、摘要）
2. **Level 2**: 主动监控（文件系统监控、自动触发）
3. **Level 3**: 知识图谱（项目关系、学习路径）
4. **Level 4**: 对话式查询（自然语言搜索）
5. **Level 5**: 多 Agent 编排（智能自动化）

## 当前状态

### 项目信息
- **位置**: `D:\Workspace\Survey\`
- **技术栈**: TypeScript, Bun
- **现有项目**: 26 个 GitHub 仓库
- **现有脚本**: `scripts/update-github-index.ts` (205 行基础功能)

### 现有功能
- 扫描 `github/` 目录
- 从 `package.json` 提取项目信息
- 从 git remote 获取仓库 URL
- 生成基础 Markdown 表格

### 现有项目列表 (26个)
- ai-agents-for-beginners, ai-agents-from-scratch
- code-yeongyu-oh-my-opencode
- Fine-Tuning_With_LoRA, flora
- inception-rag, llama.cpp, llama2.c, llm.c
- LLMs-from-scratch, lora_from_scratch
- Mini-LLM, minimind, minivllm
- nanoGPT, oh-my-opencode, openclaw, opencode
- pguso-rag-from-scratch, rag-from-scratch, simple-local-rag
- tinyagents, tinygrad, tinyhnsw
- vectordb, very-simple-vector-database

## 技术决策

### Metis 建议的架构
1. **数据模型**: `ProjectMetadata` 接口
   - 基础信息: directory, name, description, repoUrl
   - Level 1: categories, tags, summary, complexity, primaryLanguage
   - Level 3: relatedProjects, learningPath, dependencies
   - Level 5: analysisStatus, lastAnalyzed, analysisVersion

2. **LLM 集成**: 多提供商支持
   - OpenAI (gpt-4o-mini)
   - Anthropic Claude
   - 本地 Ollama

3. **文件组织**:
   - `scripts/types.ts` - 类型定义
   - `scripts/config.ts` - 配置加载
   - `scripts/llm.ts` - LLM 客户端
   - `scripts/analyzer.ts` - 项目分析器
   - `scripts/watch.ts` - 文件监控
   - `scripts/knowledge-graph.ts` - 知识图谱
   - `scripts/query.ts` - 查询接口
   - `scripts/orchestrator.ts` - 多 Agent 编排

## 研究发现

### 从 Metis 规划中获得
- 8 个具体任务
- 5 个并行 Wave
- 完整的任务依赖图
- 关键路径: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7/8

### 技术风险
1. LLM API 速率限制
2. Token 限制（26 个项目分析）
3. 分析超时
4. 向后兼容性

## 待解决问题

1. **LLM 提供商选择**: 使用哪个 LLM？
   - 选项 A: OpenAI GPT-4o-mini (推荐)
   - 选项 B: Anthropic Claude
   - 选项 C: 本地 Ollama

2. **实施范围**: 从哪个 Level 开始？
   - 选项 A: 只实现 Level 1 (快速验证)
   - 选项 B: 实现 Level 1-2 (核心功能)
   - 选项 C: 实现全部 5 个 Level (完整系统)

3. **测试策略**: 如何验证？
   - 自动化测试
   - Agent 执行 QA
   - 用户手动验证

## 范围边界

### 包含 (IN)
- TypeScript/Bun 实现
- AI 智能分析功能
- 增强的项目索引
- LLM 集成
- 文件监控（可选）

### 不包含 (OUT)
- 复杂的前端界面
- 数据库存储（使用 JSON 文件）
- 外部服务集成（除 LLM API）
- 用户认证系统

---

## 用户确认 (2026-03-10)

### LLM 提供商
- **选择**: Kimi API (kimi-for-coding)
- **兼容性**: OpenAI API 格式兼容
- **优势**: 国内可访问，中文支持好
- **成本**: 待确认

### 敏感信息
- **确认**: 所有 26 个项目都是公开项目
- **风险**: 无敏感信息发送到外部 API
- **状态**: ✅ 可以继续

### 实施范围
- **待确认**: Level 1 only / Level 1-2 / 全部 5 个 Level

---

## 用户确认 (2026-03-10)

### LLM 提供商 ✅ 已确认
- **选择**: Kimi API (kimi-for-coding)
- **兼容性**: OpenAI API 格式兼容
- **优势**: 国内可访问，中文支持好
- **配置**: 使用 `KIMI_API_KEY` 环境变量
- **端点**: `https://api.moonshot.cn/v1` (待确认)

### 敏感信息 ✅ 已确认
- **确认**: 所有 26 个项目都是公开项目
- **风险**: 无敏感信息发送到外部 API
- **状态**: ✅ 可以继续

### 实施范围 ✅ 已确认
- **选择**: Level 1 only (MVP)
- **包含**: AI 智能分析 + 自动分类 + 标签生成
- **排除**: Level 2-5 (未来增强)
