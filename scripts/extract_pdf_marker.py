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


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extract PDF using Marker")
    parser.add_argument("pdf_path", type=Path, help="Path to PDF file")
    parser.add_argument("output_dir", type=Path, help="Output directory")
    parser.add_argument("--force", action="store_true", help="Overwrite existing output")

    args = parser.parse_args()

    result = extract_with_marker(args.pdf_path, args.output_dir, args.force)
    print(json.dumps(result, indent=2, default=str))

    sys.exit(0 if result["success"] else 1)
