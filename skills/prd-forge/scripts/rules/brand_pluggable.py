"""Optional context-pack extension point for PRD validation.

Context packs may expose a `configure(options)` function and/or
`validate(doc, blocks, issues, options)` function. The generic validator keeps
this file as the documented adapter surface.
"""

from __future__ import annotations


def configure(options: dict) -> dict:
    return options

