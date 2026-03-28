#!/usr/bin/env python3
"""LaTeX syntax validation without full compilation."""

from __future__ import annotations

import re
from typing import Tuple


class LaTeXValidator:
    """Validates LaTeX syntax for common errors."""

    # Track opening vs closing braces
    BRACE_PATTERN = re.compile(r"\\\{|\\\}|\{|\}")
    # Track opening vs closing brackets  
    BRACKET_PATTERN = re.compile(r"\\\[|\\\]|\[|\]")
    # Math delimiters
    MATH_PATTERN = re.compile(r"\$\$?|\$")
    # Environments
    ENV_PATTERN = re.compile(r"\\begin\{(\w+)\}|\\end\{(\w+)\}")

    def __init__(self):
        self._env_stack: list[str] = []

    def validate(self, latex: str) -> Tuple[bool, list[str]]:
        """
        Validate LaTeX string.
        Returns (is_valid, list_of_errors).
        """
        errors: list[str] = []

        # Check brace balance
        brace_errors = self._check_braces(latex)
        errors.extend(brace_errors)

        # Check bracket balance
        bracket_errors = self._check_brackets(latex)
        errors.extend(bracket_errors)

        # Check environment matching
        env_errors = self._check_environments(latex)
        errors.extend(env_errors)

        return len(errors) == 0, errors

    def _check_braces(self, latex: str) -> list[str]:
        errors = []
        count = 0
        for match in self.BRACE_PATTERN.finditer(latex):
            if match.group() in ("\\{", "\\}"):
                continue  # escaped
            if match.group() == "{":
                count += 1
            else:
                count -= 1
                if count < 0:
                    errors.append("Unmatched closing brace '}'")
        if count > 0:
            errors.append(f"Unclosed {count} opening brace(s) '{{'")
        return errors

    def _check_brackets(self, latex: str) -> list[str]:
        errors = []
        count = 0
        for match in self.BRACKET_PATTERN.finditer(latex):
            if match.group() in ("\\[", "\\]", r"\["):
                continue  # escaped or display math
            if match.group() == "[":
                count += 1
            else:
                count -= 1
                if count < 0:
                    errors.append("Unmatched closing bracket ']'")
        if count > 0:
            errors.append(f"Unclosed {count} opening bracket(s) '['")
        return errors

    def _check_environments(self, latex: str) -> list[str]:
        errors = []
        stack: list[str] = []

        for match in self.ENV_PATTERN.finditer(latex):
            if match.group().startswith("\\begin"):
                env_name = match.group(1)
                stack.append(env_name)
            else:
                env_name = match.group(2)
                if not stack:
                    errors.append(f"\\end{{{env_name}}} without matching \\begin{{{env_name}}}")
                elif stack[-1] != env_name:
                    errors.append(f"\\end{{{env_name}}} does not match \\begin{{{stack[-1]}}}")
                else:
                    stack.pop()

        for env in stack:
            errors.append(f"\\begin{{{env}}} without matching \\end{{{env}}}")
        return errors


def is_latex_valid(latex: str) -> Tuple[bool, list[str]]:
    """Convenience function for one-shot validation."""
    validator = LaTeXValidator()
    return validator.validate(latex)
