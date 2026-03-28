#!/usr/bin/env python3
"""Tests for Gemini module."""

import sys
sys.path.insert(0, str(__file__).rsplit("/", 1)[0])

from extract_pdf_gemini import BATCH_SIZE, latex_prompt


def test_batch_size_is_4_to_8():
    """Per spec section 4.1, batch size should be 4-8."""
    assert 4 <= BATCH_SIZE <= 8


def test_latex_prompt_has_uncertain_flag():
    """Equation prompt should include [[UNCERTAIN]] flag."""
    prompt = latex_prompt("equation", "context")
    assert "[[UNCERTAIN]]" in prompt


def test_latex_prompt_tight_is_shorter():
    """Tight prompt should be shorter than normal prompt."""
    tight = latex_prompt("equation", "context", tight=True)
    normal = latex_prompt("equation", "context", tight=False)
    assert len(tight) < len(normal)


def test_image_prompt_returns_description():
    """Image prompt should ask for description."""
    prompt = latex_prompt("image", "context")
    assert "Describe" in prompt or "description" in prompt.lower()


def test_table_prompt_returns_validation():
    """Table prompt should ask for validation."""
    prompt = latex_prompt("table", "context")
    assert "Validate" in prompt or "VALID" in prompt


if __name__ == "__main__":
    test_batch_size_is_4_to_8()
    test_latex_prompt_has_uncertain_flag()
    test_latex_prompt_tight_is_shorter()
    test_image_prompt_returns_description()
    test_table_prompt_returns_validation()
    print("All tests passed!")
