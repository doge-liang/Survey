#!/usr/bin/env python3
"""
PDF Deep Extraction Script for paper-reader skill.
Combines Marker extraction with Gemini 3.1 Pro correction.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
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

    start_time = time.time()

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
        result["status"] = "fallback_needed"
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
        marker_result, gemini_results, output_dir, 
        gemini_enabled=not args.no_gemini,
        start_time=start_time
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
