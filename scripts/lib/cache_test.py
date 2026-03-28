#!/usr/bin/env python3
"""Tests for cache module."""

import sys
sys.path.insert(0, str(__file__).rsplit("/", 1)[0])

import tempfile
from pathlib import Path

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
        assert cached["confidence"] == 0.95


def test_cache_different_params():
    with tempfile.TemporaryDirectory() as tmpdir:
        cache = ExtractionCache(Path(tmpdir))
        image_bytes = b"fake image data"

        cache.set(image_bytes, {"latex": "v1"}, prompt_version="v1")
        
        # Same params - hit
        assert cache.get(image_bytes, prompt_version="v1") is not None
        
        # Different params - miss
        assert cache.get(image_bytes, prompt_version="v2") is None


def test_cache_clear():
    with tempfile.TemporaryDirectory() as tmpdir:
        cache = ExtractionCache(Path(tmpdir))
        cache.set(b"img1", {"result": "1"})
        cache.set(b"img2", {"result": "2"})

        assert len(list(cache.cache_dir.glob("*.json"))) == 2
        count = cache.clear()
        assert count == 2
        assert len(list(cache.cache_dir.glob("*.json"))) == 0


if __name__ == "__main__":
    test_cache_roundtrip()
    test_cache_different_params()
    test_cache_clear()
    print("All tests passed!")
