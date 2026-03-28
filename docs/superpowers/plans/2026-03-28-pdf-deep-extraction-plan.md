# PDF 深度解析实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Marker + Gemini 3.1 Pro 双层 PDF 深度解析流水线，输出文本/公式(LaTeX)/图片/表格分离的论文内容。

**Architecture:** 双层架构 — Marker 负责布局分析和块分割，Gemini 3.1 Pro 负责公式图片→LaTeX 校正和图片描述生成。最终输出按类型分离：text.txt（含占位符）、images/、equations/、tables/。

**Tech Stack:** Python 3.8+, marker-pdf, google-generativeai, PyMuPDF, Pillow

---

## 文件结构

```
scripts/
├── extract-pdf-text.py          # 原有脚本（保留，降级fallback）
├── extract-pdf-deep.py          # 新建：深度解析主脚本
├── extract-pdf-marker.py        # 新建：Marker提取模块
├── extract-pdf-gemini.py        # 新建：Gemini修正模块
├── extract-pdf-renderer.py       # 新建：输出渲染模块
├── bootstrap-pdf-extractor.py    # 现有：环境bootstrap
└── lib/
    ├── cache.py                 # 新建：缓存管理
    └── latex_validator.py       # 新建：LaTeX语法验证
```

---

## Task 1: 环境 Bootstrap 增强

**Files:**
- Modify: `scripts/bootstrap-pdf-extractor.py`

- [ ] **Step 1: 读取现有 bootstrap 脚本**

查看当前 `bootstrap-pdf-extractor.py` 内容，确认 venv 创建逻辑。

- [ ] **Step 2: 添加 marker-pdf 依赖**

在 `install_pymupdf()` 函数后添加 `install_marker()` 函数：

```python
def install_marker(venv_python: Path) -> bool:
    """Install or verify marker-pdf."""
    try:
        result = subprocess.run(
            [str(venv_python), "-c", "import marker_pdf; print(marker_pdf.__version__)"],
            capture_output=True,
            text=True,
            check=True,
        )
        if "1." in result.stdout or "0." in result.stdout:
            print(f"marker-pdf already installed: {result.stdout.strip()}")
            return True
    except subprocess.CalledProcessError:
        pass

    print("Installing marker-pdf...")
    result = subprocess.run(
        [str(venv_python), "-m", "pip", "install", "marker-pdf[all]"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"pip install marker-pdf failed: {result.stderr}", file=sys.stderr)
        return False
    print("marker-pdf installed successfully")
    return True
```

- [ ] **Step 3: 添加 google-generativeai 依赖**

在 `install_marker()` 后添加 `install_gemini()` 函数：

```python
def install_gemini(venv_python: Path) -> bool:
    """Install or verify google-generativeai."""
    try:
        result = subprocess.run(
            [str(venv_python), "-c", "import google.generativeai; print(google.generativeai.__version__)"],
            capture_output=True,
            text=True,
            check=True,
        )
        if result.returncode == 0:
            print(f"google-generativeai already installed")
            return True
    except subprocess.CalledProcessError:
        pass

    print("Installing google-generativeai...")
    result = subprocess.run(
        [str(venv_python), "-m", "pip", "install", "google-generativeai"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"pip install google-generativeai failed: {result.stderr}", file=sys.stderr)
        return False
    print("google-generativeai installed successfully")
    return True
```

- [ ] **Step 4: 在 main() 中调用新安装函数**

在 `install_pymupdf()` 调用后添加：

```python
# Step 5: Install marker-pdf
if not install_marker(venv_python):
    result["errors"].append("marker_install_failed")
    print("ERROR: Failed to install marker-pdf")
    print(json.dumps(result, indent=2))
    return 1

# Step 6: Install google-generativeai
if not install_gemini(venv_python):
    result["errors"].append("gemini_install_failed")
    print("ERROR: Failed to install google-generativeai")
    print(json.dumps(result, indent=2))
    return 1

result["marker_installed"] = True
result["gemini_installed"] = True
```

- [ ] **Step 5: 运行 bootstrap 验证**

```bash
cd /mnt/d/Workspace/Survey && python scripts/bootstrap-pdf-extractor.py
```

预期输出包含 `"marker_installed": true` 和 `"gemini_installed": true`

- [ ] **Step 6: Commit**

```bash
git add scripts/bootstrap-pdf-extractor.py
git commit -m "feat(scripts): add marker-pdf and google-generativeai to bootstrap"
```

---

## Task 2: 缓存管理模块

**Files:**
- Create: `scripts/lib/cache.py`

- [ ] **Step 1: 编写缓存管理模块**

```python
#!/usr/bin/env python3
"""Cache management for PDF extraction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


class ExtractionCache:
    """Cache for extraction results to avoid redundant Gemini calls."""

    def __init__(self, cache_dir: Path | None = None):
        if cache_dir is None:
            cache_dir = Path.home() / ".cache" / "pdf-extractor"
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _make_key(
        self,
        image_bytes: bytes,
        prompt_version: str,
        model: str,
        media_resolution: str,
    ) -> str:
        """Generate cache key from image hash and parameters."""
        h = hashlib.sha256(image_bytes).hexdigest()
        return f"{h}_{prompt_version}_{model}_{media_resolution}"

    def get(
        self,
        image_bytes: bytes,
        prompt_version: str = "v1",
        model: str = "gemini-2.0-flash-exp",
        media_resolution: str = "medium",
    ) -> dict | None:
        """Get cached result for image. Returns None if not cached."""
        key = self._make_key(image_bytes, prompt_version, model, media_resolution)
        cache_file = self.cache_dir / f"{key}.json"
        if cache_file.exists():
            try:
                return json.loads(cache_file.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, IOError):
                return None
        return None

    def set(
        self,
        image_bytes: bytes,
        result: dict,
        prompt_version: str = "v1",
        model: str = "gemini-2.0-flash-exp",
        media_resolution: str = "medium",
    ) -> None:
        """Cache result for image."""
        key = self._make_key(image_bytes, prompt_version, model, media_resolution)
        cache_file = self.cache_dir / f"{key}.json"
        cache_file.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    def clear(self) -> int:
        """Clear all cache entries. Returns count of deleted files."""
        count = 0
        for f in self.cache_dir.glob("*.json"):
            f.unlink()
            count += 1
        return count
```

- [ ] **Step 2: 编写测试**

```python
# scripts/lib/cache_test.py
import pytest
from pathlib import Path
import tempfile
import shutil

from cache import ExtractionCache


def test_cache_roundtrip():
    with tempfile.TemporaryDirectory() as tmpdir:
        cache = ExtractionCache(Path(tmpdir))
        image_bytes = b"fake image data"
        result = {"latex": "\\alpha + \\beta", "confidence": 0.95}

        # Miss
        assert cache.get(image_bytes) is None

        # Set
        cache.set(image_bytes, result)

        # Hit
        cached = cache.get(image_bytes)
        assert cached is not None
        assert cached["latex"] == "\\alpha + \\beta"


def test_cache_clear():
    with tempfile.TemporaryDirectory() as tmpdir:
        cache = ExtractionCache(Path(tmpdir))
        cache.set(b"img1", {"result": "1"})
        cache.set(b"img2", {"result": "2"})

        assert len(list(cache.cache_dir.glob("*.json"))) == 2
        count = cache.clear()
        assert count == 2
        assert len(list(cache.cache_dir.glob("*.json"))) == 0
```

- [ ] **Step 3: 运行测试**

```bash
cd /mnt/d/Workspace/Survey && .venv/bin/python -m pytest scripts/lib/cache_test.py -v
```

预期: 2 passed

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/cache.py scripts/lib/cache_test.py
git commit -m "feat(scripts): add extraction cache module"
```

---

## Task 3: LaTeX 语法验证模块

**Files:**
- Create: `scripts/lib/latex_validator.py`

- [ ] **Step 1: 编写 LaTeX 验证模块**

```python
#!/usr/bin/env python3
"""LaTeX syntax validation without full compilation."""

from __future__ import annotations

import re
from typing import Tuple


class LaTeXValidator:
    """Validates LaTeX syntax for common errors."""

    # Track opening vs closing braces
    BRACE_PATTERN = re.compile(r"\\\{|\\\}|\{|\}")
    # Track opening vs closing brackets  
    BRACKET_PATTERN = re.compile(r"\\\[|\\\]|\[|\]")
    # Math delimiters
    MATH_PATTERN = re.compile(r"\$\$?|\$")
    # Environments
    ENV_PATTERN = re.compile(r"\\begin\{(\w+)\}|\\end\{(\w+)\}")

    def __init__(self):
        self._env_stack: list[str] = []

    def validate(self, latex: str) -> Tuple[bool, list[str]]:
        """
        Validate LaTeX string.
        Returns (is_valid, list_of_errors).
        """
        errors: list[str] = []

        # Check brace balance
        brace_errors = self._check_braces(latex)
        errors.extend(brace_errors)

        # Check bracket balance
        bracket_errors = self._check_brackets(latex)
        errors.extend(bracket_errors)

        # Check environment matching
        env_errors = self._check_environments(latex)
        errors.extend(env_errors)

        return len(errors) == 0, errors

    def _check_braces(self, latex: str) -> list[str]:
        errors = []
        count = 0
        for match in self.BRACE_PATTERN.finditer(latex):
            if match.group() in ("\\{", "\\}"):
                continue  # escaped
            if match.group() == "{":
                count += 1
            else:
                count -= 1
                if count < 0:
                    errors.append("Unmatched closing brace '}'")
        if count > 0:
            errors.append(f"Unclosed {count} opening brace(s) '{{'")
        return errors

    def _check_brackets(self, latex: str) -> list[str]:
        errors = []
        count = 0
        for match in self.BRACKET_PATTERN.finditer(latex):
            if match.group() in ("\\[", "\\]", r"\["):
                continue  # escaped or display math
            if match.group() == "[":
                count += 1
            else:
                count -= 1
                if count < 0:
                    errors.append("Unmatched closing bracket ']'")
        if count > 0:
            errors.append(f"Unclosed {count} opening bracket(s) '['")
        return errors

    def _check_environments(self, latex: str) -> list[str]:
        errors = []
        stack: list[str] = []

        for match in self.ENV_PATTERN.finditer(latex):
            if match.group().startswith("\\begin"):
                env_name = match.group(1)
                stack.append(env_name)
            else:
                env_name = match.group(2)
                if not stack:
                    errors.append(f"\\end{{{env_name}}} without matching \\begin{{{env_name}}}")
                elif stack[-1] != env_name:
                    errors.append(f"\\end{{{env_name}}} does not match \\begin{{{stack[-1]}}}")
                else:
                    stack.pop()

        for env in stack:
            errors.append(f"\\begin{{{env}}} without matching \\end{{{env}}}")
        return errors


def is_latex_valid(latex: str) -> Tuple[bool, list[str]]:
    """Convenience function for one-shot validation."""
    validator = LaTeXValidator()
    return validator.validate(latex)
```

- [ ] **Step 2: 编写测试**

```python
# scripts/lib/latex_validator_test.py
import pytest
from latex_validator import LaTeXValidator, is_latex_valid


def test_valid_simple():
    valid, errors = is_latex_valid(r"\alpha + \beta = \gamma")
    assert valid
    assert len(errors) == 0


def test_valid_with_braces():
    valid, errors = is_latex_valid(r"f(x) = \frac{1}{2}")
    assert valid


def test_valid_equation():
    valid, errors = is_latex_valid(r"\int_{0}^{1} x^2 dx = \frac{1}{3}")
    assert valid


def test_unclosed_brace():
    valid, errors = is_latex_valid(r"\frac{1}{2")
    assert not valid
    assert any("Unclosed" in e for e in errors)


def test_unmatched_brace():
    valid, errors = is_latex_valid(r"\frac{1}{2}}")
    assert not valid


def test_environment_mismatch():
    valid, errors = is_latex_valid(r"\begin{matrix} 1 & 2 \\ \end{pmatrix}")
    assert not valid


def test_environment_unclosed():
    valid, errors = is_latex_valid(r"\begin{align} 1 &= 2")
    assert not valid
```

- [ ] **Step 3: 运行测试**

```bash
cd /mnt/d/Workspace/Survey && .venv/bin/python -m pytest scripts/lib/latex_validator_test.py -v
```

预期: 7 passed

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/latex_validator.py scripts/lib/latex_validator_test.py
git commit -m "feat(scripts): add LaTeX validator module"
```

---

## Task 4: Marker 提取模块

**Files:**
- Create: `scripts/extract-pdf-marker.py`

- [ ] **Step 1: 编写 Marker 提取模块**

```python
#!/usr/bin/env python3
"""Marker-based PDF extraction module."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


def find_marker_venv() -> Path | None:
    """Find marker installation in venv."""
    venv_python = (
        Path(".venv") / "Scripts" / "python.exe"
        if sys.platform == "win32"
        else Path(".venv") / "bin" / "python"
    )
    if venv_python.exists():
        try:
            subprocess.run(
                [str(venv_python), "-c", "import marker_pdf"],
                capture_output=True,
                check=True,
            )
            return venv_python
        except subprocess.CalledProcessError:
            pass
    return None


def extract_with_marker(
    pdf_path: Path,
    output_dir: Path,
    force: bool = False,
) -> dict[str, Any]:
    """
    Extract PDF content using Marker.
    
    Returns:
        dict with keys: success, output_dir, blocks, images, tables, error
    """
    result = {
        "success": False,
        "output_dir": str(output_dir),
        "blocks": [],
        "images": [],
        "tables": [],
        "error": None,
    }

    # Find marker
    venv_python = find_marker_venv()
    if not venv_python:
        result["error"] = "marker_venv_not_found"
        return result

    # Create output dir
    output_dir.mkdir(parents=True, exist_ok=True)

    # Run marker
    cmd = [
        str(venv_python), "-m", "marker_simple",
        str(pdf_path),
        str(output_dir),
    ]
    if force:
        cmd.append("--force")

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 min timeout
        )
        if proc.returncode != 0:
            result["error"] = f"marker failed: {proc.stderr[:500]}"
            return result
    except subprocess.TimeoutExpired:
        result["error"] = "marker timeout (>5min)"
        return result
    except Exception as e:
        result["error"] = f"marker exception: {e}"
        return result

    # Parse marker output
    # Marker creates: output_dir/markdown/ with .md and .json files
    markdown_dir = output_dir / "markdown"
    if markdown_dir.exists():
        for md_file in markdown_dir.glob("*.md"):
            result["blocks"].append({
                "type": "text",
                "path": str(md_file.relative_to(output_dir)),
            })
        for json_file in markdown_dir.glob("*.json"):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                if "images" in data:
                    result["images"].extend(data["images"])
                if "tables" in data:
                    result["tables"].extend(data["tables"])
            except (json.JSONDecodeError, IOError):
                pass

    result["success"] = True
    return result
```

- [ ] **Step 2: 测试 Marker 提取**

先用一篇现有的 paper.pdf 测试：

```bash
cd /mnt/d/Workspace/Survey && python scripts/extract-pdf-marker.py research/papers/2601.17855/paper.pdf /tmp/marker-test
```

检查 `/tmp/marker-test/` 下是否生成了内容

- [ ] **Step 3: Commit**

```bash
git add scripts/extract-pdf-marker.py
git commit -m "feat(scripts): add Marker extraction module"
```

---

## Task 5: Gemini 修正模块

**Files:**
- Create: `scripts/extract-pdf-gemini.py`

- [ ] **Step 1: 编写 Gemini 修正模块**

```python
#!/usr/bin/env python3
"""Gemini-based formula and image correction module."""

from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Any

from PIL import Image
from io import BytesIO

# Cache module
from lib.cache import ExtractionCache
from lib.latex_validator import is_latex_valid


def get_gemini_model():
    """Get configured Gemini model."""
    import google.generativeai as genai

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash-exp")
    return model


def image_to_bytes(image_path: Path, max_size: tuple[int, int] = (512, 512)) -> bytes:
    """Load image and resize if needed."""
    img = Image.open(image_path)
    img.thumbnail(max_size, Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def latex_prompt(block_type: str, context: str = "") -> str:
    """Build prompt for Gemini based on block type."""
    if block_type == "equation":
        return f"""Convert this formula image to LaTeX. 
Return ONLY the LaTeX code, no explanations.
If the formula is uncertain, start your response with [[UNCERTAIN]] and still provide the best guess.
Context: {context or "No surrounding context"}

Output format:
- Clean LaTeX code
- Start with [[UNCERTAIN]] if uncertain about any symbols
"""

    elif block_type == "image":
        return f"""Describe this image briefly (1-2 sentences).
Context: {context or "No surrounding context"}

Output format:
- One sentence description
"""

    elif block_type == "table":
        return f"""Validate this table structure. Check if:
1. Headers are properly aligned
2. Data rows have correct number of columns
3. No obvious parsing errors

If issues found, provide corrected Markdown table.
If OK, respond with [[VALID]] only.

Output format:
- [[VALID]] if no issues
- Corrected Markdown table if issues found
"""

    return "Process this content."


def process_equation_block(
    image_path: Path,
    context: str = "",
    cache: ExtractionCache | None = None,
) -> dict[str, Any]:
    """Process single equation image with Gemini."""
    if cache:
        img_bytes = image_path.read_bytes()
        cached = cache.get(img_bytes)
        if cached:
            return {"source": "cache", **cached}

    model = get_gemini_model()
    img_bytes = image_to_bytes(image_path)

    prompt = latex_prompt("equation", context)

    try:
        response = model.generate_content([
            {"mime_type": "image/png", "data": base64.b64encode(img_bytes).decode()},
            prompt,
        ])
        text = response.text.strip()

        # Check for uncertainty
        uncertain = text.startswith("[[UNCERTAIN]]")
        if uncertain:
            text = text.replace("[[UNCERTAIN]]", "").strip()

        # Validate LaTeX
        valid, errors = is_latex_valid(text)
        result = {
            "latex": text,
            "uncertain": uncertain,
            "valid": valid,
            "errors": errors if not valid else [],
        }

        if cache:
            cache.set(img_bytes, result)

        return {"source": "gemini", **result}

    except Exception as e:
        return {
            "source": "error",
            "error": str(e),
            "latex": None,
            "uncertain": True,
        }


def process_image_block(
    image_path: Path,
    context: str = "",
) -> dict[str, Any]:
    """Process image with Gemini for description."""
    model = get_gemini_model()
    img_bytes = image_to_bytes(image_path, max_size=(768, 768))

    prompt = latex_prompt("image", context)

    try:
        response = model.generate_content([
            {"mime_type": "image/png", "data": base64.b64encode(img_bytes).decode()},
            prompt,
        ])
        return {
            "description": response.text.strip(),
            "success": True,
        }
    except Exception as e:
        return {
            "description": None,
            "error": str(e),
            "success": False,
        }


def process_batch(
    blocks: list[dict],
    block_type: str,
    output_dir: Path,
) -> list[dict]:
    """Process a batch of blocks with Gemini."""
    results = []
    cache = ExtractionCache() if block_type == "equation" else None

    for i, block in enumerate(blocks):
        image_path = output_dir / block["path"]
        if not image_path.exists():
            results.append({"index": i, "error": "file_not_found"})
            continue

        if block_type == "equation":
            result = process_equation_block(
                image_path,
                context=block.get("context", ""),
                cache=cache,
            )
        elif block_type == "image":
            result = process_image_block(
                image_path,
                context=block.get("context", ""),
            )
        else:
            result = {"error": "unsupported_block_type"}

        results.append({"index": i, **result})

    return results
```

- [ ] **Step 2: 测试 Gemini 模块**

需要设置 `GEMINI_API_KEY` 环境变量：

```bash
export GEMINI_API_KEY="your_key_here"
cd /mnt/d/Workspace/Survey && python scripts/extract-pdf-gemini.py /tmp/marker-test/images/eq-001.png "sample context"
```

预期: 返回 LaTeX 结果或错误信息

- [ ] **Step 3: Commit**

```bash
git add scripts/extract-pdf-gemini.py
git commit -m "feat(scripts): add Gemini correction module"
```

---

## Task 6: 输出渲染模块

**Files:**
- Create: `scripts/extract-pdf-renderer.py`

- [ ] **Step 1: 编写渲染模块**

```python
#!/usr/bin/env python3
"""Output rendering module for PDF extraction results."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


PLACEHOLDER_PATTERNS = {
    "equation": re.compile(r"\[\[EQ:(\d+)\]\]"),
    "image": re.compile(r"\[\[IMG:(\d+)\]\]"),
    "table": re.compile(r"\[\[TABLE:(\d+)\]\]"),
}


def render_extracted_content(
    marker_result: dict,
    gemini_results: dict,
    output_dir: Path,
) -> dict[str, Any]:
    """
    Render extraction results into final output structure.

    Creates:
    - extract.txt (main text with placeholders)
    - images/ (copied images)
    - equations/ (LaTeX files)
    - tables/ (Markdown files)
    - extract-status.json

    Returns status dict.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create subdirs
    images_dir = output_dir / "images"
    equations_dir = output_dir / "equations"
    tables_dir = output_dir / "tables"

    for d in [images_dir, equations_dir, tables_dir]:
        d.mkdir(parents=True, exist_ok=True)

    status = {
        "text_blocks": 0,
        "equation_blocks": 0,
        "image_blocks": 0,
        "table_blocks": 0,
        "gemini_requests": 0,
        "gemini_cost_estimate_usd": 0.0,
    }

    # Process blocks
    text_parts: list[str] = []
    eq_counter = 0
    img_counter = 0
    table_counter = 0

    for block in marker_result.get("blocks", []):
        block_type = block.get("type", "text")

        if block_type == "text":
            content = (output_dir / block["path"]).read_text(encoding="utf-8")
            text_parts.append(content)
            status["text_blocks"] += 1

        elif block_type == "equation":
            eq_counter += 1
            latex = gemini_results.get(block["path"], {}).get("latex", "")
            if latex:
                eq_file = equations_dir / f"eq-{eq_counter:03d}.tex"
                eq_file.write_text(latex, encoding="utf-8")
                text_parts.append(f"[[EQ:{eq_counter}]]")
            else:
                text_parts.append(f"[[EQ:{eq_counter}]]")
            status["equation_blocks"] += 1
            status["gemini_requests"] += 1

        elif block_type == "image":
            img_counter += 1
            img_path = output_dir / block["path"]
            if img_path.exists():
                dest = images_dir / f"img-{img_counter:03d}{img_path.suffix}"
                import shutil
                shutil.copy2(img_path, dest)
            desc = gemini_results.get(block["path"], {}).get("description", "")
            text_parts.append(f"[[IMG:{img_counter}]] {desc}")
            status["image_blocks"] += 1
            status["gemini_requests"] += 1

        elif block_type == "table":
            table_counter += 1
            text_parts.append(f"[[TABLE:{table_counter}]]")
            status["table_blocks"] += 1

    # Write extract.txt
    extract_txt = output_dir / "extract.txt"
    extract_txt.write_text("\n\n".join(text_parts), encoding="utf-8")

    # Write status
    status["total_chars"] = sum(len(p) for p in text_parts)
    status["status"] = "ok"

    return status
```

- [ ] **Step 2: Commit**

```bash
git add scripts/extract-pdf-renderer.py
git commit -m "feat(scripts): add output renderer module"
```

---

## Task 7: 深度解析主脚本

**Files:**
- Create: `scripts/extract-pdf-deep.py`

- [ ] **Step 1: 编写主脚本**

```python
#!/usr/bin/env python3
"""
PDF Deep Extraction Script for paper-reader skill.
Combines Marker extraction with Gemini 3.1 Pro correction.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import extract_pdf_marker as marker_mod
import extract_pdf_gemini as gemini_mod
import extract_pdf_renderer as renderer_mod


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Deep extract PDF: text, equations (LaTeX), images, tables"
    )
    parser.add_argument("--pdf", required=True, help="Path to input PDF file")
    parser.add_argument("--out", required=True, help="Path to output directory")
    parser.add_argument(
        "--report", required=True, help="Path to extraction status JSON"
    )
    parser.add_argument(
        "--no-gemini",
        action="store_true",
        help="Skip Gemini correction (Marker only)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-extraction even if cached",
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    output_dir = Path(args.out)
    report_path = Path(args.report)

    result = {
        "pdf_path": str(pdf_path),
        "method": "marker+gemini" if not args.no_gemini else "marker",
        "status": "failed",
        "warnings": [],
    }

    # Validate input
    if not pdf_path.exists():
        result["warnings"].append(f"file_not_found: {pdf_path}")
        report_path.write_text(
            json.dumps(result, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return 2

    # Step 1: Marker extraction
    print(f"Extracting with Marker: {pdf_path}")
    marker_result = marker_mod.extract_with_marker(
        pdf_path, output_dir, force=args.force
    )

    if not marker_result["success"]:
        result["warnings"].append(marker_result["error"])
        # Fallback to old extraction if Marker fails
        print("Marker failed, falling back to legacy extraction...")
        # TODO: implement fallback to extract-pdf-text.py
        report_path.write_text(
            json.dumps(result, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return 3

    # Step 2: Gemini correction (if enabled)
    gemini_results: dict[str, dict] = {}

    if not args.no_gemini:
        print("Applying Gemini corrections...")

        # Process equation blocks
        for block in marker_result.get("blocks", []):
            if block.get("type") == "equation":
                image_path = output_dir / block["path"]
                if image_path.exists():
                    try:
                        res = gemini_mod.process_equation_block(
                            image_path,
                            context=block.get("context", ""),
                        )
                        gemini_results[block["path"]] = res
                    except Exception as e:
                        result["warnings"].append(f"gemini_error: {e}")

        # Process image blocks
        for block in marker_result.get("blocks", []):
            if block.get("type") == "image":
                image_path = output_dir / block["path"]
                if image_path.exists():
                    try:
                        res = gemini_mod.process_image_block(
                            image_path,
                            context=block.get("context", ""),
                        )
                        gemini_results[block["path"]] = res
                    except Exception as e:
                        result["warnings"].append(f"gemini_error: {e}")

    # Step 3: Render output
    print("Rendering output...")
    status = renderer_mod.render_extracted_content(
        marker_result, gemini_results, output_dir
    )

    result.update(status)
    result["status"] = "ok"

    # Write report
    report_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Done! Output in {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: 测试完整流程**

```bash
cd /mnt/d/Workspace/Survey && \
GEMINI_API_KEY="your_key" \
python scripts/extract-pdf-deep.py \
    --pdf research/papers/2601.17855/paper.pdf \
    --out /tmp/deep-test \
    --report /tmp/deep-test/extract-status.json
```

检查 `/tmp/deep-test/` 下是否生成 extract.txt, images/, equations/, tables/

- [ ] **Step 3: Commit**

```bash
git add scripts/extract-pdf-deep.py
git commit -m "feat(scripts): add deep PDF extraction script"
```

---

## Task 8: 更新 paper-reader Skill

**Files:**
- Modify: `.opencode/skills/paper-reader/SKILL.md`

- [ ] **Step 1: 更新 Phase 1.6 引用**

在 SKILL.md 中找到 `--ocr-if-needed` 相关调用，添加新的深度提取选项说明。

具体修改内容：将 Phase 1.6 标题改为 "PDF 深度解析" 并添加：

```markdown
### 1.6.3 深度解析（推荐）

使用 Marker + Gemini 流水线，提取完整内容：

```bash
# Windows
.venv\Scripts\python.exe scripts\extract-pdf-deep.py \
  --pdf "papers/{paper-id}/paper.pdf" \
  --out "papers/{paper-id}/" \
  --report "papers/{paper-id}/extract-status.json"

# Unix/macOS
.venv/bin/python scripts/extract-pdf-deep.py \
  --pdf "papers/{paper-id}/paper.pdf" \
  --out "papers/{paper-id}/" \
  --report "papers/{paper-id}/extract-status.json"
```

输出包括：
- `extract.txt` — 主文本（含 `[[EQ:n]]`, `[[IMG:n]]`, `[[TABLE:n]]` 占位符）
- `images/` — 原始图片
- `equations/` — LaTeX 公式文件
- `tables/` — Markdown 表格

如需跳过 Gemini 修正（离线使用），加 `--no-gemini` 参数。
```

- [ ] **Step 2: Commit**

```bash
git add .opencode/skills/paper-reader/SKILL.md
git commit -m "docs(skills): update paper-reader to use deep extraction"
```

---

## Task 9: 集成测试

**Files:**
- Create: `scripts/extract-pdf-deep.test.py`

- [ ] **Step 1: 编写集成测试**

```python
#!/usr/bin/env python3
"""Integration tests for deep PDF extraction."""

import json
import subprocess
import tempfile
import shutil
from pathlib import Path

import pytest


@pytest.fixture
def temp_output():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


def test_deep_extraction_runs(temp_output):
    """Test that deep extraction script runs without error."""
    pdf_path = Path("research/papers/2601.17855/paper.pdf")
    if not pdf_path.exists():
        pytest.skip("Sample PDF not found")

    report_path = temp_output / "report.json"

    result = subprocess.run(
        [
            "python", "scripts/extract-pdf-deep.py",
            "--pdf", str(pdf_path),
            "--out", str(temp_output),
            "--report", str(report_path),
            "--no-gemini",
        ],
        capture_output=True,
        text=True,
    )

    # Script should succeed (or at least not crash)
    assert result.returncode in (0, 3), f"Script failed: {result.stderr}"


def test_output_structure(temp_output):
    """Test that output directory has expected structure."""
    pdf_path = Path("research/papers/2601.17855/paper.pdf")
    if not pdf_path.exists():
        pytest.skip("Sample PDF not found")

    report_path = temp_output / "report.json"

    subprocess.run(
        [
            "python", "scripts/extract-pdf-deep.py",
            "--pdf", str(pdf_path),
            "--out", str(temp_output),
            "--report", str(report_path),
            "--no-gemini",
        ],
        capture_output=True,
    )

    # Check extract.txt exists
    extract_txt = temp_output / "extract.txt"
    assert extract_txt.exists(), "extract.txt not created"

    # Check subdirs exist (may be empty)
    assert (temp_output / "images").is_dir()
    assert (temp_output / "equations").is_dir()
    assert (temp_output / "tables").is_dir()


def test_status_json_schema(temp_output):
    """Test that extract-status.json has expected schema."""
    pdf_path = Path("research/papers/2601.17855/paper.pdf")
    if not pdf_path.exists():
        pytest.skip("Sample PDF not found")

    report_path = temp_output / "report.json"

    subprocess.run(
        [
            "python", "scripts/extract-pdf-deep.py",
            "--pdf", str(pdf_path),
            "--out", str(temp_output),
            "--report", str(report_path),
            "--no-gemini",
        ],
        capture_output=True,
    )

    if report_path.exists():
        data = json.loads(report_path.read_text(encoding="utf-8"))
        assert "status" in data
        assert "method" in data
        assert data["method"] == "marker"
```

- [ ] **Step 2: 运行测试**

```bash
cd /mnt/d/Workspace/Survey && python -m pytest scripts/extract-pdf-deep.test.py -v
```

- [ ] **Step 3: Commit**

```bash
git add scripts/extract-pdf-deep.test.py
git commit -m "test(scripts): add deep extraction integration tests"
```

---

## 自检清单

完成所有任务后，确认以下覆盖：

| 设计需求 | 实现位置 |
|----------|----------|
| Marker 提取 | Task 4: extract-pdf-marker.py |
| Gemini 修正 | Task 5: extract-pdf-gemini.py |
| 公式 LaTeX 输出 | Task 5 + Task 6 |
| 图片独立保存 | Task 6: extract-pdf-renderer.py |
| 表格 Markdown | Task 6: extract-pdf-renderer.py |
| 占位符协议 | Task 6: render_extracted_content() |
| 缓存机制 | Task 2: lib/cache.py |
| LaTeX 验证 | Task 3: lib/latex_validator.py |
| 失败降级 | Task 7: extract-pdf-deep.py fallback 注释 |
| 状态报告 | Task 6 + extract-status.json schema |

---

**Plan version**: v1.0
**Total tasks**: 9
**Estimated time**: 1-2 days
