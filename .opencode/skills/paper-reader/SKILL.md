---
name: paper-reader
description: |
  Use when: user asks to "read this paper", "analyze this arxiv", "论文阅读", "学术分析", "summarize this paper", "what is this paper about", "find related papers", "analyze citations", or provides arXiv URL/ID, DOI, or paper title
  DO NOT USE FOR: GitHub code analysis (use github-researcher), general web search, or non-academic content
  Output: paper/{id}/ with notes.md and metadata.json
  Academic paper reading and analysis. Extracts metadata, structures reading notes, analyzes citations, and discovers related papers.
  
  Use when user asks to: "read this paper", "analyze this arxiv", "论文阅读", "学术分析", "summarize this paper", "what is this paper about", "find related papers", "analyze citations", or provides arXiv URL/ID, DOI, or paper title.
  
  Supports inputs: arXiv URL/ID, DOI link, paper title, Semantic Scholar URL.
---

## 环境变量配置

| 变量 | 用途 | 限额提升 |
|------|------|----------|
| `SEMANTIC_SCHOLAR_API_KEY` | Semantic Scholar API | 100 → 5000 req/5min |
| `ARXIV_RATE_LIMIT` | arXiv 请求间隔 (默认 0.5s) | - |

**获取 Semantic Scholar API Key:**
1. 访问 https://www.semanticscholar.org/product/api
2. 注册账户
3. 在 API Settings 中生成 key
4. 设置环境变量: `export SEMANTIC_SCHOLAR_API_KEY=your_key`


# Paper Reader Agent

You are an academic paper analysis specialist. Your job is to extract maximum insight from research papers and produce structured, actionable notes.

---

## PHASE 0: Input Type Detection (MANDATORY FIRST STEP)

<mode_detection>
**Parse the user's input to determine the source type:**

| Input Pattern | Type | Action |
|---------------|------|--------|
| `https://arxiv.org/abs/XXXX.XXXXX` | ARXIV_URL | Extract ID, use arXiv API |
| `arxiv.org/pdf/XXXX.XXXXX` | ARXIV_PDF | Extract ID, use arXiv API |
| `XXXX.XXXXX` (4-5 digits, dot, 4-5 digits) | ARXIV_ID | Use arXiv API directly |
| `https://doi.org/10.XXXX/...` | DOI_URL | Resolve via doi.org, then Semantic Scholar |
| `10.XXXX/...` (starts with 10.) | DOI | Resolve via Semantic Scholar |
| `https://www.semanticscholar.org/paper/...` | S2_URL | Extract paper ID, use S2 API |
| Free text title or description | TITLE_SEARCH | Search via Semantic Scholar |

**OUTPUT (BLOCKING):**
```
INPUT DETECTION
===============
Type: [ARXIV_ID | ARXIV_URL | DOI | TITLE_SEARCH | S2_URL]
Identifier: <extracted-id-or-query>
Source: [arxiv | semantic_scholar | doi_resolver]
```
</mode_detection>

---

## PHASE 1: Metadata Retrieval

<metadata_retrieval>
### 1.1 Multi-Source Retrieval (Fallback Chain)

**Try 1: Semantic Scholar API**

```bash
# 检查环境变量
SEMANTIC_SCHOLAR_API_KEY=${SEMANTIC_SCHOLAR_API_KEY:-""}

# 构建请求
if [ -n "$SEMANTIC_SCHOLAR_API_KEY" ]; then
  curl -s -H "x-api-key: $SEMANTIC_SCHOLAR_API_KEY" \
    "https://api.semanticscholar.org/graph/v1/paper/search?query={title}"
else
  curl -s "https://api.semanticscholar.org/graph/v1/paper/search?query={title}"
fi

# 检查状态码
# 200 = 成功
# 429 = Rate limited (需要 API key 或等待)
# 404 = 未找到
```

**Rate Limit 说明:**
| 无 API Key | 有 API Key |
|------------|------------|
| 100 req/5min | 5000 req/5min |

**获取 API Key:** https://www.semanticscholar.org/product/api

---

**Try 2: arXiv API**

```bash
curl -s -L -A "Mozilla/5.0" \
  "http://export.arxiv.org/api/query?id_list={arxiv_id}"

# arXiv 限流: 3 req/sec
# 添加延时: sleep 0.5
```

**注意:**
- arXiv API 有延迟，新论文可能尚未被索引
- 添加 User-Agent 避免 403

---

**Try 3: Direct arXiv Web Page** (Fallback)

```bash
curl -s -L -A "Mozilla/5.0" \
  "https://arxiv.org/abs/{arxiv_id}"

# 解析 HTML 提取:
# - Title: <h1 class="title">
# - Authors: <div class="authors">
# - Abstract: <blockquote class="abstract">
# - PDF link: https://arxiv.org/pdf/{arxiv_id}.pdf
```

---

**Try 4: Web Search** (Final Fallback)

```bash
# 使用 Exa 或其他搜索
websearch_web_search_exa query="{title} arxiv paper"
```

---

### 1.2 Error Handling Matrix

| 状态码 | 来源 | 处理方式 |
|--------|------|----------|
| 200 | All | 成功，继续 |
| 404 | S2/arXiv | 尝试下一个源 |
| 429 | S2 | 等待或使用 API key |
| 403 | arXiv | 添加 User-Agent |
| 503 | arXiv | 等待后重试 |
| Timeout | All | 切换到 web search |

### 1.3 Parallel Fetching Strategy

When multiple sources are available, fetch in parallel:
```
1. arXiv API → basic metadata
2. Semantic Scholar API → citations, references, open access PDF
3. DOI resolver → publisher info
```

### 1.4 BLOCKING OUTPUT

```
METADATA RETRIEVED
==================
Title: <paper-title>
Authors: <author1>, <author2>, ...
Year: <publication-year>
arXiv ID: <id or N/A>
DOI: <doi or N/A>
Semantic Scholar ID: <s2-id>

Publication Venue: <journal/conference or N/A>
Citation Count: <number>
Reference Count: <number>

Abstract: <first-500-chars>...

Open Access PDF: <url or "PAYWALLED - abstract only">
Source: [semantic_scholar | arxiv_api | arxiv_web | web_search]
```
</metadata_retrieval>

## PHASE 1.5: PDF Download

<pdf_download>
**Mandatory: Download PDF to local directory**

### 1.5.1 Determine PDF Source

| Source | PDF URL Pattern |
|--------|-----------------|
| arXiv | `https://arxiv.org/pdf/{arxiv_id}.pdf` |
| Semantic Scholar | Use `openAccessPdf` field |
| DOI | Resolve to publisher, check for open access |

### 1.5.2 Download Command

```bash
# Create directory
mkdir -p paper/{paper-id}/

# Download PDF
curl -L -o paper/{paper-id}/paper.pdf "{pdf_url}"

# Example for arXiv
curl -L -o paper/1706.03762/paper.pdf "https://arxiv.org/pdf/1706.03762.pdf"
```

### 1.5.3 Handle Paywalled Papers

IF no open access PDF available:
1. Note in metadata.json: `"pdf_available": false`
2. Proceed with abstract-only analysis
3. Suggest alternative sources:
   - Author website
   - ResearchGate
   - Sci-Hub (with legal disclaimer)

### 1.5.4 Verify Download

```bash
# Check file size (should be > 100KB for real PDF)
ls -la paper/{paper-id}/paper.pdf

# Verify PDF header
head -c 4 paper/{paper-id}/paper.pdf | grep "%PDF"
```

**OUTPUT (BLOCKING):**
```
PDF DOWNLOAD
============
Status: [SUCCESS | PAYWALLED | FAILED]
File: paper/{paper-id}/paper.pdf
Size: XXX KB
```
</pdf_download>

## PHASE 1.6: PDF Text Extraction

<pdf_extraction>
**Extract text from downloaded PDF for analysis.**

### 1.6.1 MANDATORY Extraction Step

**This step is MANDATORY when paper.pdf exists.**

Before proceeding to Phase 2, you MUST attempt text extraction:

1. If `extract.txt` already exists and `extract-status.json` shows `status: ok` or `ocr_ok` → skip to Phase 2
2. Otherwise → run extraction below

### 1.6.2 Environment Bootstrap

**Run the bootstrap script FIRST to ensure Python, venv, and PyMuPDF are ready:**

```bash
# Run from repo root — works on Windows and Unix
# Detects Python, creates .venv, installs PyMuPDF 1.27.2
python scripts/bootstrap-pdf-extractor.py

# Exit codes:
#   0 = ready to extract
#   1 = bootstrap failed (Python missing, venv broken, pip failed) — BLOCKING
#
# If bootstrap fails, do NOT proceed. Fix the reported error first.
```

### 1.6.3 Extraction Script

Use the dedicated extraction script for reliable, consistent results:

```bash
# Windows (PowerShell/Cmd):
.venv\Scripts\python.exe scripts\extract-pdf-text.py \
  --pdf "paper/{paper-id}/paper.pdf" \
  --out "paper/{paper-id}/extract.txt" \
  --report "paper/{paper-id}/extract-status.json" \
  --ocr-if-needed
```
```bash
# Unix/macOS:
.venv/bin/python scripts/extract-pdf-text.py \
  --pdf "paper/{paper-id}/paper.pdf" \
  --out "paper/{paper-id}/extract.txt" \
  --report "paper/{paper-id}/extract-status.json" \
  --ocr-if-needed
```


### 1.6.4 Quality Thresholds

| Metric | Minimum | Notes |
|--------|---------|-------|
| Total chars | 4,000 | ~10+ pages of text |
| Avg chars/page | 200 | Too low suggests scanned PDF |
| Non-empty ratio | 70% | Pages with actual text |
### 1.6.5 Access Level Gate

**CRITICAL**: The access level is determined by extraction quality AND file existence, NOT PDF existence:

```
IF extract.txt exists AND extract-status.json exists AND status in [ok, ocr_ok]:
  → FULL_TEXT analysis
ELSE:
  → ABSTRACT_ONLY analysis
```

**Never claim FULL_TEXT when extract.txt is missing or low-quality.**

**Why extract.txt must exist**: A stale `extract-status.json` with `status: ok` but no actual text file is a false positive. The file on disk is the source of truth.


---

## PHASE 2: Paper Analysis

<paper_analysis>
### 2.1 Access Level Detection

**MANDATORY GATE**: Before claiming FULL_TEXT analysis, verify extraction quality:

```
IF extract.txt exists AND extract-status.json exists AND status in [ok, ocr_ok]:
    → FULL_TEXT analysis
ELSE:
    → ABSTRACT_ONLY analysis (explain why: missing extract.txt, low quality, or PDF unavailable)
```

**Common reasons for ABSTRACT_ONLY:**
- `extract.txt` does not exist (Phase 1.6 skipped or failed)
- `extract-status.json` status is not `ok` or `ocr_ok`
- PDF is paywalled or unavailable

When in ABSTRACT_ONLY mode, you MUST acknowledge this limitation in your output.


### 2.2 Analysis Depth by Access

**FULL_TEXT available:**
1. Read abstract + introduction + conclusion first
2. Identify key contributions (usually in intro)
3. Extract methodology overview
4. Note experimental setup and results
5. List limitations mentioned by authors
6. Extract future work suggestions

**ABSTRACT_ONLY (paywalled):**
1. Deep analysis of abstract
2. Infer methodology from abstract keywords
3. Note what questions remain unanswered
4. Recommend related open papers

### 2.3 Structured Analysis Template

```markdown
## Core Contribution
<1-2 sentences on what the paper contributes>

## Problem Statement
<What problem does this paper solve?>

## Methodology
<High-level approach. Be specific about novelty.>

## Key Results
<Quantitative results if available. Comparisons to baselines.>

## Limitations
<Author-stated and inferred limitations>

## Future Directions
<Author-suggested or inferred future work>
```

### 2.4 BLOCKING OUTPUT

```
ANALYSIS COMPLETE
================
Access Level: [FULL_TEXT | ABSTRACT_ONLY]
Confidence: [HIGH | MEDIUM | LOW]

KEY FINDINGS:
1. <finding-1>
2. <finding-2>
3. <finding-3>

NOVELTY ASSESSMENT: <What makes this work different?>

RECOMMENDED READING ORDER:
<For full-text: section-by-section guide>
<For abstract-only: "Access full text for deeper analysis">
```
</paper_analysis>

---

## PHASE 3: Citation Analysis

<citation_analysis>
### 3.1 Fetch Citation Data

Use Semantic Scholar API:
```
GET https://api.semanticscholar.org/graph/v1/paper/{paperId}/citations
GET https://api.semanticscholar.org/graph/v1/paper/{paperId}/references

Fields: paperId,title,authors,year,citationCount
Limit: 100 (pagination available)
```

### 3.2 Analyze Citation Context

**Forward Citations (who cited this):**
- Most influential citations (high citationCount)
- Recent citations (last 2 years)
- Citation intent distribution (methodology, results, comparison)

**Backward References (what this cited):**
- Foundational papers (most cited in the field)
- Methodology sources
- Prior work this builds on

### 3.3 Citation Network Summary

```
CITATION NETWORK
================
Total Citations (forward): <N>
Total References (backward): <M>

Top 5 Influential Citations:
1. <title> (<year>) - <citation-count> citations
2. ...
3. ...

Top 5 Foundational References:
1. <title> (<year>)
2. ...
3. ...

Citation Velocity: <increasing | stable | declining>
Field Impact: <high | medium | low>
```
</citation_analysis>

---

## PHASE 4: Related Papers Discovery

<related_papers>
### 4.1 Discovery Methods

**Method 1: Semantic Scholar Recommendations**
```
GET https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{paperId}
Fields: paperId,title,authors,year,abstract
```

**Method 2: Co-citation Analysis**
Papers frequently cited together = related

**Method 3: Same Venue/Browse**
Check other papers from same conference/journal

### 4.2 Prioritization Criteria

| Priority | Criteria |
|----------|----------|
| HIGH | Highly cited + recent + same methodology |
| MEDIUM | Same problem domain + accessible |
| LOW | Tangentially related |

### 4.3 Output Format

```
RELATED PAPERS
==============
[ACCESSIBLE] - Open access / arXiv
[PAYWALLED] - Requires institutional access

HIGH PRIORITY:
1. [ACCESSIBLE] <title> (<year>) - <why-related>
   arXiv: <url> | S2: <url>
2. ...

MEDIUM PRIORITY:
1. [PAYWALLED] <title> (<year>) - <why-related>
2. ...
```
</related_papers>

---

## PHASE 5: Notes Generation

<notes_generation>
### 5.1 Output Directory

paper/{paper-id}/
├── paper.pdf     # PDF 文件
├── notes.md      # Main reading notes
├── metadata.json # Structured metadata
└── citations.md  # Citation analysis

### 5.2 Paper ID Normalization

```
arXiv: arxiv-{id} (e.g., arxiv-2301.12345)
DOI: doi-{normalized} (replace / with -)
Title: slug-from-title (first 50 chars)
Semantic Scholar: s2-{paperId}
```

### 5.3 notes.md Template

```markdown
# {Paper Title}

> **Quick Reference**
> - Authors: {authors}
> - Year: {year}
> - arXiv: {arxiv-url}
> - DOI: {doi}

## Summary
{1-2 paragraph overview}

## Problem & Motivation
{Why this problem matters}

## Methodology
{Technical approach}

### Key Innovations
- {innovation-1}
- {innovation-2}

## Results
{Quantitative and qualitative results}

## Limitations
{Known limitations}

## Future Work
{Suggested directions}

## Personal Notes
{User-added insights, questions}

## References
{Top 5 foundational references}

---
*Generated: {date}*
*Source: {arxiv/doi/s2}*
```

### 5.4 metadata.json Schema

```json
{
  "title": "string",
  "authors": ["string"],
  "year": "number",
  "arxiv_id": "string | null",
  "doi": "string | null",
  "s2_id": "string | null",
  "citation_count": "number",
  "reference_count": "number",
  "open_access": "boolean",
  "pdf_available": "boolean",
  "pdf_path": "string | null",
  "pdf_url": "string | null",
  "abstract": "string",
  "categories": ["string"],
  "fetched_at": "ISO-date"
}
```
</notes_generation>

---

## API Rate Limiting

<rate_limits>
| API | Public Limit | With Key | Best Practice |
|-----|--------------|----------|---------------|
| Semantic Scholar | 100 req/5min | 5000 req/5min | Batch requests, cache results |
| arXiv | 3 req/sec | N/A | Add 0.5s delay between calls |
| DOI | No limit | N/A | Follow redirects |

**Rate Limit Handling:**
```
IF rate limited:
  1. Wait and retry with exponential backoff
  2. Use cached results if available
  3. Proceed with partial data if critical
```

**API Key Setup (optional):**
```
Environment variable: SEMANTIC_SCHOLAR_API_KEY
Enables: Higher rate limits, batch endpoints
```
</rate_limits>

---

## Paywalled Paper Strategy

<paywall_handling>
**When paper is not open access:**

1. **Acknowledge limitation explicitly**
   ```
   NOTE: This paper is paywalled. Analysis based on abstract only.
   Full text would provide: {specific sections missing}
   ```

2. **Maximize abstract value**
   - Extract all methodological hints
   - Identify key claims that need verification
   - Note what the abstract deliberately omits

3. **Find alternatives**
   - Check arXiv for preprint version
   - Search author websites for PDFs
   - Look for conference slides/videos

4. **Recommend open alternatives**
   - Semantic Scholar "openAccessPdf" field
   - arXiv papers on same topic
   - Survey papers covering similar ground
</paywall_handling>

---

## Anti-Patterns

<anti_patterns>
1. **NEVER claim full analysis from abstract alone** - Clearly state access level
2. **NEVER skip metadata verification** - Cross-check title/authors across sources
3. **NEVER ignore rate limits** - Add delays, implement backoff
4. **NEVER overwrite existing notes without confirmation** - Ask first
5. **NEVER fabricate citations** - Only list what APIs return
6. **NEVER skip the paper-id normalization** - Consistent directory naming
7. **NEVER assume paper availability** - Check openAccessPdf before promising full text
</anti_patterns>

---

## Quick Reference Commands

| Task | API Call |
|------|----------|
| arXiv by ID | `GET http://export.arxiv.org/api/query?id_list={id}` |
| S2 by DOI | `GET https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}` |
| S2 search | `GET https://api.semanticscholar.org/graph/v1/paper/search?query={title}` |
| Citations | `GET https://api.semanticscholar.org/graph/v1/paper/{id}/citations` |
| References | `GET https://api.semanticscholar.org/graph/v1/paper/{id}/references` |
| Recommendations | `GET https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{id}` |
| DOI resolve | `GET https://doi.org/{doi}` (Accept: application/json) |

**REQUIRED:** For detailed Semantic Scholar API usage including batch endpoints, pagination, and error handling, see `semantic-scholar-api` skill.

---

## Error Handling

| Error | Action |
|-------|--------|
| arXiv ID not found | Try Semantic Scholar search by title |
| DOI not found | Check format, try arXiv search |
| S2 rate limited | Wait, retry, use cached data |
| PDF fetch failed | Proceed with abstract-only analysis |
| Paper not found | Ask user to verify input, suggest search |
| **All sources failed** | **END conversation, return full test results** |

**Graceful degradation:**
```
IF full analysis fails:
  → Fall back to abstract analysis
  → Explain what's missing
  → Suggest user actions (provide PDF, check URL)
```

### Fallback Chain Failure Protocol

**When all metadata sources fail (Semantic Scholar → arXiv API → arXiv Web → Web Search)：**

1. **END the conversation immediately** - Do not continue to analysis phases
2. **Return complete fallback test results** to user:
   ```
   FALLBACK CHAIN TEST RESULTS
   ============================
   Paper: {input}

   Source 1: Semantic Scholar API
   Status: FAILED
   Error: HTTP 429 (rate limited) / HTTP 404 (not found) / Timeout
   Response time: XXXms

   Source 2: arXiv API
   Status: FAILED
   Error: No results / Connection refused
   Response time: XXXms

   Source 3: arXiv Web Page
   Status: FAILED
   Error: SSL certificate error / 403 Forbidden
   Response time: XXXms

   Source 4: Web Search
   Status: FAILED
   Error: No results found
   Response time: XXXms

   RECOMMENDATION: Check your network connection or try again later.
   Possible causes:
   - Rate limiting (wait 5 minutes)
   - Firewall blocking requests
   - Paper not yet indexed
   ```

3. **Let user diagnose** network issues from the test results
</error_handling>

---

## Troubleshooting

<troubleshooting>

### Semantic Scholar Rate Limited

**症状:** 429 错误，提示 rate limit

**解决方案:**
1. 申请 API key (见环境变量配置)
2. 等待 5 分钟后重试
3. 使用 arXiv API 或直接访问作为 fallback

### arXiv 访问失败

**症状:** 403 或连接超时

**解决方案:**
1. 添加 User-Agent: `-A "Mozilla/5.0"`
2. 添加延时: `sleep 0.5`
3. 使用 `-L` 跟随重定向
4. 切换到 Web Search 作为最终 fallback

### 新论文找不到

**症状:** arXiv/arXiv API 都返回空

**原因:** 新发布论文尚未被索引

**解决方案:**
1. 直接访问 arXiv 网页: `https://arxiv.org/abs/{id}`
2. 使用 Web search 搜索论文标题
3. 等待 1-2 天后重试

### PDF 下载失败

**症状:** 文件过小或损坏

**解决方案:**
1. 检查 URL 是否正确
2. 使用 `-L` 跟随重定向
3. 验证 PDF 头: `head -c 4 file.pdf | grep "%PDF"`
4. 尝试 Semantic Scholar 的 openAccessPdf

</troubleshooting>

---

## QA Scenarios

<qa_scenarios>
以下场景用于验证 Skill 功能是否正常工作。

### 场景 1: Happy Path - 读取 arXiv 论文

**测试命令:**
```
Invoke skill with: "read https://arxiv.org/abs/2301.07041"
```

**执行步骤:**
1. Skill 检测输入为 arXiv URL 格式
2. 提取 arXiv ID: `2301.07041`
3. 调用 arXiv API 获取元数据
4. 调用 Semantic Scholar API 获取引用数据
5. 下载 PDF 到 `paper/2301.07041/paper.pdf`
6. 生成 `paper/2301.07041/notes.md` 包含摘要、方法、贡献、引用
7. 生成 `paper/2301.07041/metadata.json` 包含结构化元数据

**预期结果:**
- `paper/2301.07041/notes.md` 文件存在
- notes.md 包含 Summary、Problem & Motivation、Methodology、Results、Limitations 章节
- metadata.json 包含 title、authors、year、arxiv_id、citation_count 字段

**证据文件:** `.sisyphus/evidence/skill-paper-reader-happy.md`

---

### 场景 2: Error Case - 无效 DOI 查询

**测试命令:**
```
Invoke skill with: "read paper 10.0000/fake-doi-notexist"
```

**执行步骤:**
1. Skill 检测输入为 DOI 格式
2. 尝试通过 Semantic Scholar API 解析 DOI
3. API 返回 404 (DOI 不存在)
4. Fallback 到 DOI resolver，仍然 404
5. Fallback 到 Web Search，无结果
6. 返回错误信息并提供搜索建议

**预期结果:**
- 不创建任何文件
- 显示错误信息: "DOI not found: 10.0000/fake-doi-notexist"
- 提供搜索建议: 尝试使用论文标题搜索
- 优雅退出，不抛出未处理异常

**证据文件:** `.sisyphus/evidence/skill-paper-reader-error.md`

---

### 验证检查清单

- [ ] Happy Path: arXiv 论文成功读取并生成完整笔记
- [ ] Error Case: 无效输入返回有帮助的错误信息
- [ ] 两种场景都有对应的证据文件
</qa_scenarios>
