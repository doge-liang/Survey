#!/usr/bin/env python3
"""Cache management for PDF extraction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


class ExtractionCache:
    """Cache for extraction results to avoid redundant Gemini calls."""

    DEFAULT_MODEL = "gemini-3.1-pro"
    DEFAULT_PROMPT_VERSION = "v1"
    DEFAULT_RESOLUTION = "medium"

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
        prompt_version: str | None = None,
        model: str | None = None,
        media_resolution: str | None = None,
    ) -> dict | None:
        """Get cached result for image. Returns None if not cached."""
        pv = prompt_version or self.DEFAULT_PROMPT_VERSION
        m = model or self.DEFAULT_MODEL
        res = media_resolution or self.DEFAULT_RESOLUTION
        key = self._make_key(image_bytes, pv, m, res)
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
        prompt_version: str | None = None,
        model: str | None = None,
        media_resolution: str | None = None,
    ) -> None:
        """Cache result for image."""
        pv = prompt_version or self.DEFAULT_PROMPT_VERSION
        m = model or self.DEFAULT_MODEL
        res = media_resolution or self.DEFAULT_RESOLUTION
        key = self._make_key(image_bytes, pv, m, res)
        cache_file = self.cache_dir / f"{key}.json"
        cache_file.write_text(
            json.dumps(result, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

    def clear(self) -> int:
        """Clear all cache entries. Returns count of deleted files."""
        count = 0
        for f in self.cache_dir.glob("*.json"):
            f.unlink()
            count += 1
        return count
