# PDF 深度解析流水线设计文档

**日期**: 2026-03-28
**状态**: 设计中
**版本**: v1.0

---

## 1. 背景与目标

### 现状问题

当前 `extract-pdf-text.py` 使用 PyMuPDF 的 `get_text()` 提取 PDF 纯文本，存在以下问题：

- 公式渲染为 Unicode 乱码或丢失
- 图片完全未提取
- 表格信息丢失
- 扫描版 PDF 无法处理

### 目标

构建一个增强型 PDF 解析流水线，能够：

1. 提取论文的完整内容（文本、公式、图片、表格）
2. 公式输出为 LaTeX 源码
3. 图片独立保存并保留位置引用
4. 表格转为 Markdown 格式
5. 支持 OCR 处理扫描版 PDF

---

## 2. 架构设计

### 2.1 整体架构

```
PDF
  │
  ├─→ Marker ─────────────────────────────────→ 结构化 JSON
  │       │                                          │
  │       │  提取内容:                               │
  │       │  - text: 纯文本段落                      │
  │       │  - images: 公式/图表原始图片              │
  │       │  - tables: HTML结构                     │
  │       │  - ocr_pages: 扫描页OCR结果             │
  │       │                                          │
  │       ▼                                          │
  │   内容块分割                                      │
  │   + 图片哈希缓存检查                               │
  │                                          │
  └─→ Gemini 3.1 Pro ─────────────────────→ 语义增强
          │                                          │
          │  处理内容:                               │
          │  - 公式图片 → LaTeX 校正               │
          │  - 图表图片 → 文字描述                 │
          │  - 表格 → 语义校验                     │
          │  - 上下文推理补充                       │
          │                                          │
          ▼                                          ▼
      text.txt          images/       equations/     tables/
     (含占位符)        (原始图片)      (LaTeX)      (Markdown)
```

### 2.2 组件分工

| 组件 | 职责 | 定位 |
|------|------|------|
| **Marker** | 布局分析、块分割、表格结构、初始OCR | 主提取器（第一层） |
| **Gemini 3.1 Pro** | 公式LaTeX校正、图片描述、表格语义校验 | 选择性修正层（第二层） |

### 2.3 处理流程

```
Step 1: Marker 提取
├── 输入: PDF文件
├── 输出: 结构化JSON (blocks, images, tables, ocr_pages)
└── 缓存检查: 图片哈希 → 跳过已处理

Step 2: Gemini 修正
├── 输入: Marker输出 + 图片块
├── 处理:
│   ├── 公式块 → LaTeX 转换
│   ├── 图片块 → 文字描述
│   └── 表格块 → 语义校验
├── 输出: 修正后的 JSON
└── 失败处理: 降级到 Marker 原生输出

Step 3: 标准化输出
├── 输入: 修正后 JSON
├── 输出:
│   ├── text.txt (含 [[EQ:1]], [[IMG:1]], [[TABLE:1]] 占位符)
│   ├── images/ (原始图片)
│   ├── equations/ (LaTeX 文件)
│   └── tables/ (Markdown 文件)
└── 元数据: extract-status.json
```

---

## 3. 输出结构

### 3.1 目录结构

```
papers/{paper-id}/
├── extract.txt          # 主文本，含占位符引用
├── extract-status.json  # 提取质量报告
├── images/             # 原始图片
│   ├── img-001.png
│   └── img-002.png
├── equations/          # LaTeX 公式
│   ├── eq-001.tex
│   └── eq-002.tex
└── tables/            # Markdown 表格
    ├── table-001.md
    └── table-002.md
```

### 3.2 占位符协议

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `[[EQ:n]]` | 公式编号 n | `见公式 [[EQ:1]]` |
| `[[IMG:n]]` | 图片编号 n | `如图 [[IMG:2]] 所示` |
| `[[TABLE:n]]` | 表格编号 n | `见表 [[TABLE:1]]` |

### 3.3 extract-status.json Schema

```json
{
  "pdf_path": "string",
  "marker_version": "string",
  "gemini_enabled": true,
  "total_blocks": 42,
  "text_blocks": 28,
  "equation_blocks": 8,
  "image_blocks": 4,
  "table_blocks": 2,
  "ocr_pages": 0,
  "cache_hits": 3,
  "gemini_requests": 12,
  "gemini_cost_estimate_usd": 0.15,
  "processing_time_seconds": 45,
  "status": "ok",
  "warnings": []
}
```

---

## 4. Gemini 处理策略

### 4.1 微批处理

- **处理粒度**: Block-level 微批
- **批大小**: 4-8 个同类块一批
- **批分类**: 公式批、图片批、表格批分开处理
- **禁止**: 避免 page-level 整页处理（会引入跨块干扰）

### 4.2 公式处理

```
输入:
- 公式图片（crop）
- 附近文本上下文（前后各一句话）

Prompt 模板:
"Convert this formula image to LaTeX. If uncertain, provide your best guess with [[UNCERTAIN]] flag.
Context: {surrounding_text}
Return: LaTeX string"
```

### 4.3 缓存策略

**缓存键**: `SHA256(image_bytes + prompt_version + model + media_resolution)`

**缓存存储**: `~/.cache/pdf-extractor/`

### 4.4 失败处理阶梯

1. **语法检查**: 验证 LaTeX 可编译
2. **高分辨率重试**: 提升图片分辨率
3. **精简 Prompt 重试**: 简化提示词
4. **标记 needs_review**: 保留原始Marker输出

---

## 5. 依赖与环境

### 5.1 Python 依赖

```
marker-pdf>=1.0.0
google-generativeai>=0.8.0
pymupdf>=1.27.2
pillow>=10.0.0
```

### 5.2 环境变量

| 变量 | 用途 | 必需 |
|------|------|------|
| `GEMINI_API_KEY` | Google Gemini API 密钥 | 是 |
| `MARKER_CACHE_DIR` | Marker 缓存目录 | 否 |
| `GEMINI_CACHE_DIR` | Gemini 结果缓存目录 | 否 |

---

## 6. 错误处理

### 6.1 错误类型与响应

| 错误类型 | 检测方式 | 处理策略 |
|----------|----------|----------|
| PDF 打开失败 | fitz.open() 异常 | status: corrupted |
| Marker 提取失败 | exit code != 0 | status: marker_failed |
| Gemini API 超时 | requests.Timeout | 重试3次，降级Marker |
| LaTeX 语法错误 | 编译失败 | 标记 [[UNCERTAIN]]，保留原文 |
| 图片哈希命中 | 缓存查询 | 跳过，使用缓存结果 |

### 6.2 降级策略

- Gemini 不可用 → 纯 Marker 输出
- 部分块失败 → 成功的块正常输出，失败的块用 Marker 原生
- 极端情况 → 降级到原始 `extract-pdf-text.py` 行为

---

## 7. 性能与成本

### 7.1 基准估算

| 指标 | 估算值 |
|------|--------|
| 20页论文处理时间 | 30秒 - 2分钟 |
| Gemini API 成本 | $0.10 - $1.00 / 篇 |
| 内存峰值 | < 2GB |
| 磁盘缓存 | ~10MB / 篇（不含原始PDF） |

### 7.2 成本优化

- **Batch API**: 离线处理成本降半
- **缓存命中**: 相同图片不重复计费
- **按需调用**: Gemini 只处理公式/图片/高风险表格

---

## 8. 测试计划

### 8.1 单元测试

- LaTeX 语法验证
- 占位符替换逻辑
- 缓存键生成

### 8.2 集成测试

- 20篇不同类型论文（机器学习、物理、数学）
- 对比 Marker-only vs Marker+Gemini 效果
- 公式识别准确率（人工抽样评估）

### 8.3 基准数据集

- Clean PDFs (原生数字版): 10篇
- Scanned PDFs (扫描版): 5篇
- 复杂公式论文 (含大量数学符号): 5篇

---

## 9. 后续扩展

### 9.1 可选升级路径

| 升级 | 触发条件 | 改动范围 |
|------|----------|----------|
| 公式Lane替换为Mathpix | Gemini符号错误率>5% | 仅替换公式处理模块 |
| 添加本地LLaMA fallback | 需要离线处理 | 新增LLM推理模块 |
| 图表关系推理 | 需要理解图表关联 | 新增图谱分析模块 |

### 9.2 不在本次设计范围

- 音频/视频内容提取
- 手写公式识别
- 多语言PDF支持

---

## 10. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Gemini API 价格波动 | 成本不可控 | 设置预算阈值，监控调用量 |
| 公式识别精度不足 | 学术价值降低 | 提供降级选项，保留原文 |
| 隐私泄露 | 论文内容外传 | 仅使用本地处理或可信云服务 |
| Marker 版本更新 | 兼容性问题 | Pin 版本号，CI 监控 |

---

## 11. 替代方案对比

| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| Marker + Gemini (本方案) | 平衡精度与成本，可迭代 | 需要调优 | **推荐** |
| 纯 Marker | 简单，依赖少 | 公式识别弱 | 备选 |
| Mathpix API | 公式精度最高 | 成本高，依赖外部 | 升级路径 |
| InftyProject | 开源 | 非Python包，Windows专属 | 不推荐 |

---

**文档版本**: v1.0
**下次审查**: 设计评审后
