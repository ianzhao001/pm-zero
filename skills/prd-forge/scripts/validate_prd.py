#!/usr/bin/env python3
"""Validate PRD Forge docx output."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path
from typing import Sequence


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
REPO_ROOT = SKILL_DIR.parents[1]
SHARED_CORE = REPO_ROOT / "system" / "shared" / "context-package-core" / "preflight-core"
RULES_DIR = SCRIPT_DIR / "rules"
sys.path.insert(0, str(SHARED_CORE))
sys.path.insert(0, str(RULES_DIR))

from python_engine import exit_code  # noqa: E402
from common import validate_docx  # noqa: E402


def load_context_module(path_text: str | None):
    if not path_text:
        return None
    path = Path(path_text).expanduser()
    if not path.is_absolute():
        path = Path.cwd() / path
    spec = importlib.util.spec_from_file_location("context_prd_rules", path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Cannot load context rules: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def print_report(issues, meta: dict[str, int | str | bool]) -> None:
    status = "pass" if not issues else "fail"
    payload = {
        "status": status,
        "meta": meta,
        "issues": [issue.to_dict() for issue in issues],
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    print()
    print("Summary")
    print(f"- file: {meta['path']}")
    print(f"- strict: {meta['strict']}")
    print(f"- tables/images: {meta['tables']}/{meta['images']}")
    print(f"- errors/warnings: {meta['errors']}/{meta['warnings']}")
    if issues:
        for issue in issues:
            print(f"- [{issue.level}] {issue.check_id} {issue.location}: {issue.matched}")
    else:
        print("- all checks passed")


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate PRD Forge docx output.")
    parser.add_argument("docx", type=Path, help="Path to .docx file")
    parser.add_argument("--strict", action="store_true", help="Use formal review/archive validation")
    parser.add_argument("--manifest", type=Path, help="Optional screenshot manifest YAML path")
    parser.add_argument("--brand-rules", type=str, help="Optional context-pack PRD rule module")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if not args.docx.exists():
        print(f"File not found: {args.docx}", file=sys.stderr)
        return 2
    context_module = load_context_module(args.brand_rules)
    issues, meta = validate_docx(args.docx, args.strict, args.manifest, {})
    if context_module and hasattr(context_module, "validate"):
        context_module.validate(args.docx, issues, meta)
        meta["issues"] = len(issues)
        meta["errors"] = sum(1 for issue in issues if issue.level == "error")
        meta["warnings"] = sum(1 for issue in issues if issue.level == "warn")
    print_report(issues, meta)
    return exit_code(issues)


if __name__ == "__main__":
    sys.exit(main())
