"""Policy-as-code engine — self-contained copy for the policy microservice.

Mirrors apps/api/src/policy/loader.py. A service owns its own code; it does not
import the monolith. Keep the two in sync until the monolith calls this service.
No LLM, no eval() — table-driven comparison over versioned YAML rules.
"""

from __future__ import annotations

import operator
from collections.abc import Callable
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field

RULES_DIR = Path(__file__).resolve().parent.parent / "rules"

Severity = Literal["blocking", "warning"]

_OPERATORS: dict[str, Callable[[float, float], bool]] = {
    "<=": operator.le,
    "<": operator.lt,
    ">=": operator.ge,
    ">": operator.gt,
    "==": operator.eq,
    "!=": operator.ne,
}


class PolicyLoadError(RuntimeError):
    """Raised when the policy files are missing or malformed."""


class PolicyRule(BaseModel):
    id: str
    description: str
    legal_basis: str
    metric: str
    operator: str
    threshold: float
    unit: str
    effective_from: str
    effective_to: str | None = None
    severity: Severity
    veto_agent: str
    verified: bool = Field(default=False)

    def check(self, actual: float) -> bool:
        return _OPERATORS[self.operator](actual, self.threshold)


class PolicyViolation(BaseModel):
    rule_id: str
    description: str
    legal_basis: str
    metric: str
    actual: float
    threshold: float
    operator: str
    unit: str
    severity: Severity
    raised_by: str
    effective_from: str
    effective_to: str | None = None
    unverified: bool = False

    @property
    def is_blocking(self) -> bool:
        return self.severity == "blocking"


@lru_cache
def load_rules() -> tuple[PolicyRule, ...]:
    if not RULES_DIR.is_dir():
        raise PolicyLoadError(f"Policy rules directory not found: {RULES_DIR}")

    rules: list[PolicyRule] = []
    seen: dict[str, Path] = {}
    for path in sorted(RULES_DIR.glob("*.yaml")):
        try:
            raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        except yaml.YAMLError as exc:
            raise PolicyLoadError(f"{path.name} is not valid YAML: {exc}") from exc
        for item in raw.get("rules", []):
            rule = PolicyRule(**item)
            if rule.operator not in _OPERATORS:
                raise PolicyLoadError(f"{path.name}: rule '{rule.id}' unknown operator '{rule.operator}'")
            if rule.id in seen:
                raise PolicyLoadError(f"Duplicate rule id '{rule.id}' in {path.name} and {seen[rule.id].name}")
            seen[rule.id] = path
            rules.append(rule)
    if not rules:
        raise PolicyLoadError(f"No rules found in {RULES_DIR}")
    return tuple(rules)


def evaluate(metrics: dict[str, float], as_of: date | None = None) -> list[PolicyViolation]:
    active_on = as_of or date.today()
    violations: list[PolicyViolation] = []
    for rule in load_rules():
        effective_from = date.fromisoformat(rule.effective_from)
        effective_to = date.fromisoformat(rule.effective_to) if rule.effective_to else None
        if effective_from > active_on:
            continue
        if effective_to is not None and effective_to < active_on:
            continue
        if rule.metric not in metrics:
            continue
        actual = float(metrics[rule.metric])
        if rule.check(actual):
            continue
        violations.append(
            PolicyViolation(
                rule_id=rule.id,
                description=rule.description,
                legal_basis=rule.legal_basis,
                metric=rule.metric,
                actual=actual,
                threshold=rule.threshold,
                operator=rule.operator,
                unit=rule.unit,
                severity=rule.severity,
                raised_by=rule.veto_agent,
                effective_from=rule.effective_from,
                effective_to=rule.effective_to,
                unverified=not rule.verified,
            )
        )
    violations.sort(key=lambda v: (v.severity != "blocking", v.rule_id))
    return violations


def unverified_rules() -> list[PolicyRule]:
    return [r for r in load_rules() if not r.verified]
