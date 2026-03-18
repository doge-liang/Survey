#!/usr/bin/env python3
"""
PDF Text Extraction Script for paper-reader skill.
Extracts text from PDF using PyMuPDF and generates quality report.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import fitz

MIN_TOTAL_CHARS = 4000
MIN_AVG_CHARS_PER_PAGE = 200
MIN_NON_EMPTY_RATIO = 0.7


def extract_plain(doc: fitz.Document) -> list[str]:
    return [page.get_text("text") for page in doc]


def extract_ocr(doc: fitz.Document, dpi: int = 300) -> list[str]:
    pages: list[str] = []
    for page in doc:
        textpage = page.get_textpage_ocr(dpi=dpi, full=True)
        pages.append(page.get_text("text", textpage=textpage))
    return pages


def assess(pages: list[str]) -> dict:
    total_pages = len(pages)
    non_empty_pages = sum(1 for page in pages if page.strip())
    total_chars = sum(len(page) for page in pages)
    avg_chars = total_chars / total_pages if total_pages else 0
    non_empty_ratio = non_empty_pages / total_pages if total_pages else 0

    status = "ok"
    warnings: list[str] = []

    if total_chars < MIN_TOTAL_CHARS:
        status = "low_text"
        warnings.append("total_chars_below_threshold")
    elif avg_chars < MIN_AVG_CHARS_PER_PAGE:
        status = "low_text"
        warnings.append("avg_chars_per_page_below_threshold")
    elif non_empty_ratio < MIN_NON_EMPTY_RATIO:
        status = "low_text"
        warnings.append("non_empty_ratio_below_threshold")

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
        quality = assess(pages)

        if quality["status"] == "low_text" and args.ocr_if_needed:
            if shutil.which("tesseract"):
                pages = extract_ocr(doc)
                quality = assess(pages)
                result["method"] = "pymupdf-ocr"
                if quality["status"] == "ok":
                    quality["status"] = "ocr_ok"
            else:
                quality["warnings"].append("tesseract_not_found")

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

        # Return codes: 0 = success, 2 = open failed, 3 = low quality
        if result["status"] in {"ok", "ocr_ok"}:
            return 0
        return 3

    finally:
        doc.close()


if __name__ == "__main__":
    raise SystemExit(main())
