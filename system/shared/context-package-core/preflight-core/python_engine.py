"""Small rule registry shared by document validators."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable, Sequence


IssueLevel = str
Rule = Callable[[object], None]


@dataclass
class Issue:
    check_id: str
    level: IssueLevel
    location: str
    matched: str
    suggestion: str

    def to_dict(self) -> dict[str, str]:
        return {
            "check_id": self.check_id,
            "level": self.level,
            "location": self.location,
            "matched": self.matched,
            "suggestion": self.suggestion,
        }


class RuleRegistry:
    def __init__(self) -> None:
        self._groups: dict[str, list[Rule]] = {}

    def register(self, group: str, rules: Iterable[Rule]) -> "RuleRegistry":
        self._groups.setdefault(group, []).extend(rules)
        return self

    def rules_for(self, mode: str) -> list[Rule]:
        return [
            *self._groups.get("common", []),
            *self._groups.get(mode, []),
            *self._groups.get("brand", []),
        ]


def add_issue(
    issues: list[Issue],
    check_id: str,
    level: IssueLevel,
    location: str,
    matched: str,
    suggestion: str,
) -> None:
    issues.append(Issue(check_id, level, location, matched, suggestion))


def exit_code(issues: Sequence[Issue]) -> int:
    if any(issue.level == "error" for issue in issues):
        return 2
    if any(issue.level == "warn" for issue in issues):
        return 1
    return 0

