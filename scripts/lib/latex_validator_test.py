#!/usr/bin/env python3
"""Tests for LaTeX validator module."""

import sys
sys.path.insert(0, str(__file__).rsplit("/", 1)[0])

from latex_validator import LaTeXValidator, is_latex_valid


def test_valid_simple():
    valid, errors = is_latex_valid(r"\alpha + \beta = \gamma")
    assert valid
    assert len(errors) == 0


def test_valid_with_braces():
    valid, errors = is_latex_valid(r"f(x) = \frac{1}{2}")
    assert valid


def test_valid_equation():
    valid, errors = is_latex_valid(r"\int_{0}^{1} x^2 dx = \frac{1}{3}")
    assert valid


def test_unclosed_brace():
    valid, errors = is_latex_valid(r"\frac{1}{2")
    assert not valid
    assert any("Unclosed" in e for e in errors)


def test_unmatched_brace():
    valid, errors = is_latex_valid(r"\frac{1}{2}}")
    assert not valid


def test_environment_mismatch():
    valid, errors = is_latex_valid(r"\begin{matrix} 1 & 2 \\ \end{pmatrix}")
    assert not valid


def test_environment_unclosed():
    valid, errors = is_latex_valid(r"\begin{align} 1 &= 2")
    assert not valid


def test_escaped_braces():
    """Esaped braces should not affect balance."""
    valid, errors = is_latex_valid(r"\{1, 2, 3\}")
    assert valid


def test_display_math():
    """Display math delimiters should be ignored."""
    valid, errors = is_latex_valid(r"\[ \int_0^1 x dx \]")
    assert valid


if __name__ == "__main__":
    test_valid_simple()
    test_valid_with_braces()
    test_valid_equation()
    test_unclosed_brace()
    test_unmatched_brace()
    test_environment_mismatch()
    test_environment_unclosed()
    test_escaped_braces()
    test_display_math()
    print("All tests passed!")
