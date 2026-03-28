#!/usr/bin/env python3
"""Gemini-based formula and image correction module."""

from __future__ import annotations

import base64
import os
import sys
from pathlib import Path
from typing import Any

from PIL import Image
from io import BytesIO

# Local modules - handle both direct execution and package import
_parent = Path(__file__).parent.parent
if str(_parent) not in sys.path:
    sys.path.insert(0, str(_parent))

from scripts.lib.cache import ExtractionCache
from scripts.lib.latex_validator import is_latex_valid


# Constants per spec
GEMINI_MODEL = "gemini-3.1-pro"
BATCH_SIZE = 4  # Micro-batch size (4-8 per spec section 4.1)
MAX_RESOLUTION = (2048, 2048)
MEDIUM_RESOLUTION = (1024, 1024)


def get_gemini_model():
    """Get configured Gemini model."""
    import google.generativeai as genai

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(GEMINI_MODEL)
    return model


def image_to_bytes(image_path: Path, max_size: tuple[int, int] | None = None) -> bytes:
    """Load image at native or specified resolution."""
    img = Image.open(image_path)
    if max_size:
        img.thumbnail(max_size, Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def latex_prompt(block_type: str, context: str = "", tight: bool = False) -> str:
    """Build prompt. tight=True uses simplified prompt for retry step 3."""
    if block_type == "equation":
        if tight:
            return "Convert image to LaTeX. Return ONLY LaTeX code."
        return f"""Convert this formula image to LaTeX.
Return ONLY the LaTeX code, no explanations.
If uncertain, start response with [[UNCERTAIN]] and provide best guess.
Context: {context or 'No surrounding context'}

Output: Clean LaTeX code"""

    elif block_type == "image":
        return f"""Describe this image briefly (1-2 sentences).
Context: {context or 'No surrounding context'}

Output: One sentence description"""

    elif block_type == "table":
        return "Validate table structure. Check headers, columns, errors. [[VALID]] if OK, else corrected Markdown."

    return "Process this content."


def _call_gemini_equation(
    image_bytes: bytes,
    context: str,
    prompt_version: str,
    resolution: tuple[int, int],
) -> dict[str, Any]:
    """Single Gemini API call for equation block."""
    model = get_gemini_model()
    tight = prompt_version.startswith("tight")
    prompt = latex_prompt("equation", context, tight=tight)

    # Resize image if needed for high-res retry
    if resolution != MEDIUM_RESOLUTION:
        img = Image.open(BytesIO(image_bytes) if isinstance(image_bytes, bytes) else image_bytes)
        img.thumbnail(resolution, Image.LANCZOS)
        buf = BytesIO()
        img.save(buf, format="PNG")
        image_bytes = buf.getvalue()

    try:
        response = model.generate_content([
            {"mime_type": "image/png", "data": base64.b64encode(image_bytes).decode()},
            prompt,
        ])
        text = response.text.strip()

        uncertain = text.startswith("[[UNCERTAIN]]")
        if uncertain:
            text = text.replace("[[UNCERTAIN]]", "").strip()

        # Syntax check (step 1 of failure ladder)
        valid, errors = is_latex_valid(text)

        return {
            "latex": text,
            "uncertain": uncertain,
            "valid": valid,
            "errors": errors if not valid else [],
            "step": "success" if valid else "syntax_check",
            "resolution": f"{resolution[0]}x{resolution[1]}",
            "prompt_version": prompt_version,
        }
    except Exception as e:
        return {
            "error": str(e),
            "latex": None,
            "uncertain": True,
            "step": "api_error",
            "resolution": f"{resolution[0]}x{resolution[1]}",
            "prompt_version": prompt_version,
        }


def process_equation_block(
    image_path: Path,
    context: str = "",
    cache: ExtractionCache | None = None,
) -> dict[str, Any]:
    """Process equation image with Gemini using failure ladder per spec 4.4."""
    img_bytes = image_path.read_bytes()
    resolution_str = f"{MEDIUM_RESOLUTION[0]}x{MEDIUM_RESOLUTION[1]}"

    # Check cache first
    if cache:
        cached = cache.get(img_bytes, prompt_version="v1", model=GEMINI_MODEL, media_resolution=resolution_str)
        if cached and cached.get("step") == "success":
            return {"source": "cache", **cached}

    # Step 1: Medium resolution, v1 prompt
    result = _call_gemini_equation(img_bytes, context, "v1", MEDIUM_RESOLUTION)
    if result.get("step") == "success":
        if cache:
            cache.set(img_bytes, result, model=GEMINI_MODEL, media_resolution=resolution_str)
        return {"source": "gemini", **result}

    # Step 2: High resolution retry (spec section 4.4)
    result = _call_gemini_equation(img_bytes, context, "v1", MAX_RESOLUTION)
    if result.get("step") == "success":
        high_res_str = f"{MAX_RESOLUTION[0]}x{MAX_RESOLUTION[1]}"
        if cache:
            cache.set(img_bytes, result, model=GEMINI_MODEL, media_resolution=high_res_str)
        return {"source": "gemini", **result}

    # Step 3: Tight prompt retry
    result = _call_gemini_equation(img_bytes, context, "tight_v1", MEDIUM_RESOLUTION)
    if result.get("step") == "success":
        if cache:
            cache.set(img_bytes, result, model=GEMINI_MODEL, media_resolution=resolution_str)
        return {"source": "gemini", **result}

    # Step 4: Mark needs_review (fallback to Marker output)
    return {
        "source": "needs_review",
        "latex": None,
        "uncertain": True,
        "valid": False,
        "errors": result.get("errors", ["max retries exceeded"]),
        "step": "needs_review",
        "resolution": resolution_str,
        "prompt_version": result.get("prompt_version", "v1"),
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
        return {"description": response.text.strip(), "success": True}
    except Exception as e:
        return {"description": None, "error": str(e), "success": False}


def process_batch(
    blocks: list[dict],
    block_type: str,
    output_dir: Path,
) -> list[dict]:
    """Process blocks in micro-batches of 4 per spec section 4.1."""
    results = []
    cache = ExtractionCache() if block_type == "equation" else None

    # Micro-batch loop (4-8 blocks per batch)
    for i in range(0, len(blocks), BATCH_SIZE):
        batch = blocks[i:i + BATCH_SIZE]
        for block in batch:
            image_path = output_dir / block["path"]
            if not image_path.exists():
                results.append({"index": blocks.index(block), "error": "file_not_found"})
                continue

            if block_type == "equation":
                result = process_equation_block(image_path, context=block.get("context", ""), cache=cache)
            elif block_type == "image":
                result = process_image_block(image_path, context=block.get("context", ""))
            else:
                result = {"error": "unsupported_block_type"}

            results.append({"index": blocks.index(block), **result})

    return results
