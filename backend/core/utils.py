from __future__ import annotations

import re


_SAFE_TABLE_NAME_PATTERN = re.compile(r"[^A-Za-z0-9_]")


def sanitize_table_name(name: str) -> str:
    """
    Strip any characters that are not alphanumeric or underscores from a
    potential SQL table name to prevent SQL injection via dynamic table names.

    Args:
        name: Raw string to sanitize.

    Returns:
        Sanitized string containing only [A-Za-z0-9_].

    Raises:
        ValueError: If the sanitized name is empty.
    """
    sanitized = _SAFE_TABLE_NAME_PATTERN.sub("", name)
    if not sanitized:
        raise ValueError(f"Table name {name!r} is invalid after sanitization.")
    return sanitized
