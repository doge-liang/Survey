#!/usr/bin/env python3
"""
Bootstrap script for PDF text extraction environment.
Ensures Python, venv, and PyMuPDF are properly installed.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

PYMUPDF_VERSION = "1.27.2"
VENV_DIR = Path(".venv")
REQUIRED_PYTHON_VERSION = (3, 8)


def find_python() -> str | None:
    """Find Python interpreter."""
    for cmd in ["python", "python3", "py"]:
        if shutil.which(cmd):
            return cmd
    return None


def check_python_version(python_cmd: str) -> bool:
    """Check if Python version meets requirements."""
    try:
        result = subprocess.run(
            [python_cmd, "--version"],
            capture_output=True,
            text=True,
        )
        version_str = result.stdout.strip() or result.stderr.strip()
        if version_str.startswith("Python "):
            version = tuple(map(int, version_str.split()[1].split(".")[:2]))
            return version >= REQUIRED_PYTHON_VERSION
    except Exception:
        pass
    return False


def ensure_venv(python_cmd: str) -> Path:
    """Create venv if it doesn't exist, return venv python path."""
    venv_python = (
        VENV_DIR / "Scripts" / "python.exe"
        if sys.platform == "win32"
        else VENV_DIR / "bin" / "python"
    )

    if VENV_DIR.exists() and venv_python.exists():
        # Verify fitz is importable
        try:
            subprocess.run(
                [str(venv_python), "-c", "import fitz"],
                capture_output=True,
                check=True,
            )
            return venv_python
        except subprocess.CalledProcessError:
            # fitz not installed, need to reinstall
            pass

    # Create fresh venv
    print(f"Creating .venv with {python_cmd}...")
    result = subprocess.run(
        [python_cmd, "-m", "venv", str(VENV_DIR)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Failed to create venv: {result.stderr}")

    return venv_python


def install_pymupdf(venv_python: Path) -> bool:
    """Install or verify PyMuPDF."""
    # Check if already installed with correct version
    try:
        result = subprocess.run(
            [str(venv_python), "-c", "import fitz; print(fitz.__version__)"],
            capture_output=True,
            text=True,
            check=True,
        )
        if PYMUPDF_VERSION in result.stdout:
            print(f"PyMuPDF {result.stdout.strip()} already installed")
            return True
    except subprocess.CalledProcessError:
        pass

    # Install specific version
    print(f"Installing PyMuPDF=={PYMUPDF_VERSION}...")
    result = subprocess.run(
        [str(venv_python), "-m", "pip", "install", f"pymupdf=={PYMUPDF_VERSION}"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"pip install failed: {result.stderr}", file=sys.stderr)
        return False

    print(f"PyMuPDF {PYMUPDF_VERSION} installed successfully")
    return True


def main() -> int:
    """Main bootstrap entry point."""
    result = {
        "python_found": False,
        "python_version": None,
        "venv_created": False,
        "venv_python": None,
        "pymupdf_installed": False,
        "status": "bootstrap_failed",
        "errors": [],
    }

    # Step 1: Find Python
    python_cmd = find_python()
    if not python_cmd:
        result["errors"].append("python_not_found: Install Python 3.8+ from python.org")
        print("ERROR: Python not found. Install Python 3.8+ from https://python.org")
        print(json.dumps(result, indent=2))
        return 1

    result["python_found"] = True
    result["python_version"] = python_cmd

    # Step 2: Check Python version
    if not check_python_version(python_cmd):
        result["errors"].append(
            f"python_version_too_old: Need Python {'.'.join(map(str, REQUIRED_PYTHON_VERSION))}+"
        )
        print(
            f"ERROR: Python version too old. Need Python {'.'.join(map(str, REQUIRED_PYTHON_VERSION))}+"
        )
        print(json.dumps(result, indent=2))
        return 1

    # Step 3: Ensure venv
    try:
        venv_python = ensure_venv(python_cmd)
        result["venv_created"] = True
        result["venv_python"] = str(venv_python)
    except Exception as e:
        result["errors"].append(f"venv_creation_failed: {str(e)}")
        print(f"ERROR: Failed to create .venv: {e}")
        print(json.dumps(result, indent=2))
        return 1

    # Step 4: Install PyMuPDF
    if not install_pymupdf(venv_python):
        result["errors"].append(
            "pymupdf_install_failed: Check network connection and try manually: pip install pymupdf==1.27.2"
        )
        print("ERROR: Failed to install PyMuPDF")
        print(json.dumps(result, indent=2))
        return 1

    result["pymupdf_installed"] = True
    result["status"] = "ready"

    print(f"\nBootstrap successful!")
    print(f"Python: {python_cmd}")
    print(f"Venv: {VENV_DIR}")
    print(f"PyMuPDF: {PYMUPDF_VERSION}")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
