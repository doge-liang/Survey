#!/usr/bin/env python3
"""
PDF Text Extraction Script for paper-reader skill.
Extracts text from PDF using PyMuPDF and generates quality report.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

import fitz

MIN_TOTAL_CHARS = 4000
MIN_AVG_CHARS_PER_PAGE = 200
MIN_NON_EMPTY_RATIO = 0.7


def extract_plain(doc: fitz.Document) -> list[str]:
    return [page.get_text("text") for page in doc]


def _find_tesseract() -> str | None:
    """Find tesseract binary, checking TESSERACT_CMD env var first."""
    cmd = os.environ.get("TESSERACT_CMD")
    if cmd and shutil.which(cmd):
        return cmd
    for name in ["tesseract", "tesseract.exe"]:
        if shutil.which(name):
            return name
    return None


def extract_ocr(doc: fitz.Document, dpi: int = 300) -> list[str]:
    pages: list[str] = []
    for page in doc:
        try:
            textpage = page.get_textpage_ocr(dpi=dpi, full=True)
            pages.append(page.get_text("text", textpage=textpage))
        except Exception:
            pages.append("")  # placeholder so page count stays consistent
    return pages


def assess(pages: list[str], ocr_attempted: bool = False) -> dict:
    total_pages = len(pages)
    non_empty_pages = sum(1 for page in pages if page.strip())
    total_chars = sum(len(page) for page in pages)
    avg_chars = total_chars / total_pages if total_pages else 0
    non_empty_ratio = non_empty_pages / total_pages if total_pages else 0

    status = "ok"
    warnings: list[str] = []

    if total_chars < MIN_TOTAL_CHARS:
        warnings.append(f"total_chars_below_threshold:{total_chars}<{MIN_TOTAL_CHARS}")
    if avg_chars < MIN_AVG_CHARS_PER_PAGE:
        warnings.append(f"avg_chars_per_page_below_threshold:{avg_chars}<{MIN_AVG_CHARS_PER_PAGE}")
    if non_empty_ratio < MIN_NON_EMPTY_RATIO:
        warnings.append(f"non_empty_ratio_below_threshold:{non_empty_ratio}<{MIN_NON_EMPTY_RATIO}")

    # Determine actual status: only low/no_text when extraction produced nothing useful
    if total_chars == 0:
        status = "no_text"
    elif not any(p.strip() for p in pages):
        status = "no_text"
    elif ocr_attempted and status == "ok":
        status = "ocr_ok"

    return {
        "status": status,
        "pages_total": total_pages,
        "pages_with_text": non_empty_pages,
        "total_chars": total_chars,
        "avg_chars_per_page": round(avg_chars, 2),
        "non_empty_ratio": round(non_empty_ratio, 3),
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract text from PDF using PyMuPDF")
    parser.add_argument("--pdf", required=True, help="Path to input PDF file")
    parser.add_argument("--out", required=True, help="Path to output text file")
    parser.add_argument(
        "--report", required=True, help="Path to extraction status JSON"
    )
    parser.add_argument(
        "--ocr-if-needed",
        action="store_true",
        help="Attempt OCR extraction if plain text extraction yields low quality",
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    out_path = Path(args.out)
    report_path = Path(args.report)

    result = {
        "pdf_path": str(pdf_path),
        "method": "pymupdf",
        "status": "failed",
        "warnings": [],
    }

    # Validate input file exists
    if not pdf_path.exists():
        result["warnings"].append(f"file_not_found: {pdf_path}")
        report_path.write_text(
            json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        return 2

    try:
        doc = fitz.open(pdf_path)
    except Exception as error:
        result["warnings"].append(f"open_failed: {error}")
        report_path.write_text(
            json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        return 2

    try:
        pages = extract_plain(doc)
        quality = assess(pages, ocr_attempted=False)

        low_quality = (
            quality["status"] in ("no_text",)
            or bool(quality["warnings"])
        )
        if low_quality and args.ocr_if_needed:
            tesseract = _find_tesseract()
            if tesseract:
                try:
                    pages = extract_ocr(doc)
                    quality = assess(pages, ocr_attempted=True)
                    result["method"] = "pymupdf-ocr"
                except Exception as ocr_error:
                    quality["warnings"].append(f"ocr_failed: {ocr_error}")
            else:
                quality["warnings"].append("tesseract_not_available")

        # Join pages with double newline separator
        text = "\n\n".join(pages).strip()

        if text:
            out_path.write_text(text, encoding="utf-8")
        else:
            result["warnings"].append("no_text_extracted")

        result.update(quality)
        result["status"] = quality["status"]
        report_path.write_text(
            json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        # Return codes: 0 = success, 2 = open failed, 3 = no/low text
        if result["status"] in {"ok", "ocr_ok"}:
            return 0
        return 3

    finally:
        doc.close()


if __name__ == "__main__":
    raise SystemExit(main())
