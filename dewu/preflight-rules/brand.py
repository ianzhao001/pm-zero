"""Additive PRD validation rules for the Dewu context pack."""

from __future__ import annotations

import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


SHARED_CORE = Path(__file__).resolve().parents[3] / "system" / "shared" / "context-package-core" / "preflight-core"
sys.path.insert(0, str(SHARED_CORE))

from python_engine import add_issue  # noqa: E402


def _docx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as zf:
        xml = zf.read("word/document.xml")
    root = ET.fromstring(xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    parts = [node.text or "" for node in root.findall(".//w:t", ns)]
    return "\n".join(parts)


def _glossary_text(text: str) -> str:
    marker = "名词解释"
    idx = text.find(marker)
    return text[idx:] if idx >= 0 else ""


def validate(docx_path: Path, issues: list, meta: dict) -> None:
    text = _docx_text(Path(docx_path))

    # BR01: A Dewu PRD must show brand-relevant product substance.
    required_terms = ("品控", "积分流水", "业务安全", "内容安全")
    if not any(term in text for term in required_terms):
        add_issue(
            issues,
            "BR01",
            "error",
            "document",
            "missing Dewu business terms",
            "得物 PRD 至少应包含品控、积分流水、业务安全、内容安全之一。",
        )

    # BR02: Points/funds modules must include reconciliation, exception path, and owner.
    if "积分" in text or "资金" in text:
        missing = [term for term in ("对账", "异常路径", "owner") if term not in text]
        if missing:
            add_issue(
                issues,
                "BR02",
                "error",
                "积分/资金模块",
                "缺少：" + "、".join(missing),
                "涉及积分或资金时必须包含对账、异常路径、owner 三段式。",
            )

    # BR03: Legacy business terms in project materials must appear in glossary.
    glossary = _glossary_text(text)
    for term in ("毒币", "毒评", "鉴定"):
        if term in text and term not in glossary:
            add_issue(
                issues,
                "BR03",
                "error",
                "名词解释",
                term,
                "项目物料或正文出现得物业务术语时，名词解释必须包含对应条目。",
            )
