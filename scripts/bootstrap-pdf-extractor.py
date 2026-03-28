#!/usr/bin/env python3
"""
Bootstrap script for PDF text extraction environment.
Ensures Python, venv, and dependencies are properly installed.
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
        try:
            subprocess.run(
                [str(venv_python), "-c", "import fitz"],
                capture_output=True,
                check=True,
            )
            return venv_python
        except subprocess.CalledProcessError:
            pass

    print(f"Creating .venv with {python_cmd}...")
    result = subprocess.run(
        [python_cmd, "-m", "venv", str(VENV_DIR)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Failed to create venv: {result.stderr}")

    # Bootstrap pip if missing
    try:
        subprocess.run(
            [str(venv_python), "-m", "pip", "--version"],
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError:
        print("Bootstrapping pip...")
        result = subprocess.run(
            [python_cmd, "-m", "ensurepip"],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print("Trying alternative pip bootstrap...")
            get_pip = subprocess.run(
                [python_cmd, "-c",
                 "import urllib.request; urllib.request.urlretrieve('https://bootstrap.pypa.io/get-pip.py', '/tmp/get-pip.py')"],
                capture_output=True, text=True,
            )
            if get_pip.returncode == 0:
                subprocess.run(
                    [python_cmd, "/tmp/get-pip.py"],
                    capture_output=True, text=True,
                )

    return venv_python


def install_pymupdf(venv_python: Path) -> bool:
    """Install or verify PyMuPDF."""
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
            print("google-generativeai already installed")
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


def main() -> int:
    """Main bootstrap entry point."""
    result = {
        "python_found": False,
        "python_version": None,
        "venv_created": False,
        "venv_python": None,
        "pymupdf_installed": False,
        "marker_installed": False,
        "gemini_installed": False,
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

    # Step 5: Install marker-pdf
    if not install_marker(venv_python):
        result["errors"].append("marker_install_failed")
        print("ERROR: Failed to install marker-pdf")
        print(json.dumps(result, indent=2))
        return 1

    result["marker_installed"] = True

    # Step 6: Install google-generativeai
    if not install_gemini(venv_python):
        result["errors"].append("gemini_install_failed")
        print("ERROR: Failed to install google-generativeai")
        print(json.dumps(result, indent=2))
        return 1

    result["gemini_installed"] = True
    result["status"] = "ready"

    print(f"\nBootstrap successful!")
    print(f"Python: {python_cmd}")
    print(f"Venv: {VENV_DIR}")
    print(f"PyMuPDF: {PYMUPDF_VERSION}")
    print(f"marker-pdf: installed")
    print(f"google-generativeai: installed")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
