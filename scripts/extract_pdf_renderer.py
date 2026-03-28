#!/usr/bin/env python3
"""Output rendering module for PDF extraction results."""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

from extract_pdf_marker import find_marker_venv


PLACEHOLDER_PATTERNS = {
    "equation": re.compile(r"\[\[EQ:(\d+)\]\]"),
    "image": re.compile(r"\[\[IMG:(\d+)\]\]"),
    "table": re.compile(r"\[\[TABLE:(\d+)\]\]"),
}


def render_extracted_content(
    marker_result: dict,
    gemini_results: dict,
    output_dir: Path,
    gemini_enabled: bool = True,
    start_time: float | None = None,
) -> dict[str, Any]:
    """
    Render extraction results. Creates extract.txt, images/, equations/, tables/.
    Returns status dict matching extract-status.json schema (spec section 3.3).
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create subdirs
    images_dir = output_dir / "images"
    equations_dir = output_dir / "equations"
    tables_dir = output_dir / "tables"

    for d in [images_dir, equations_dir, tables_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # Get marker version
    marker_version = "unknown"
    venv_python = find_marker_venv()
    if venv_python:
        try:
            import subprocess
            result = subprocess.run(
                [str(venv_python), "-c", "import marker_pdf; print(marker_pdf.__version__)"],
                capture_output=True, text=True, check=True,
            )
            marker_version = result.stdout.strip()
        except:
            pass

    # Complete status schema per spec section 3.3
    status = {
        "marker_version": marker_version,
        "gemini_enabled": gemini_enabled,
        "total_blocks": 0,
        "text_blocks": 0,
        "equation_blocks": 0,
        "image_blocks": 0,
        "table_blocks": 0,
        "ocr_pages": marker_result.get("ocr_pages", 0),
        "cache_hits": 0,
        "gemini_requests": 0,
        "gemini_cost_estimate_usd": 0.0,
        "processing_time_seconds": time.time() - start_time if start_time else 0,
        "status": "ok",
        "warnings": [],
    }

    # Process blocks
    text_parts: list[str] = []
    eq_counter = 0
    img_counter = 0
    table_counter = 0

    blocks = marker_result.get("blocks", [])
    status["total_blocks"] = len(blocks)

    for block in blocks:
        block_type = block.get("type", "text")

        if block_type == "text":
            content = (output_dir / block["path"]).read_text(encoding="utf-8")
            text_parts.append(content)
            status["text_blocks"] += 1

        elif block_type == "equation":
            eq_counter += 1
            gemini_data = gemini_results.get(block["path"], {})
            latex = gemini_data.get("latex", "")
            if latex:
                eq_file = equations_dir / f"eq-{eq_counter:03d}.tex"
                eq_file.write_text(latex, encoding="utf-8")
                text_parts.append(f"[[EQ:{eq_counter}]]")
            else:
                text_parts.append(f"[[EQ:{eq_counter}]]")
            status["equation_blocks"] += 1
            source = gemini_data.get("source", "")
            if source == "gemini":
                status["gemini_requests"] += 1
            elif source == "cache":
                status["cache_hits"] += 1

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
            if gemini_results.get(block["path"], {}).get("source") == "gemini":
                status["gemini_requests"] += 1

        elif block_type == "table":
            table_counter += 1
            text_parts.append(f"[[TABLE:{table_counter}]]")
            status["table_blocks"] += 1

    # Estimate cost
    status["gemini_cost_estimate_usd"] = (
        status["equation_blocks"] * 0.001 + status["image_blocks"] * 0.0005
    )

    # Write extract.txt
    extract_txt = output_dir / "extract.txt"
    extract_txt.write_text("\n\n".join(text_parts), encoding="utf-8")

    status["total_chars"] = sum(len(p) for p in text_parts)
    status["status"] = "ok"

    return status
