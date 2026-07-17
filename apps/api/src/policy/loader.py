"""Policy-as-code: hard limits as versioned data, evaluated by plain Python.

No LLM is involved anywhere in this module. A rule either fires or it does not, and
the same inputs always give the same answer. That determinism is the point: it is what
lets `Compliance` veto a proposal in a way a bank can audit and a model cannot talk
its way around.

Rules live in `rules/*.yaml`. See `rules/credit_limits.yaml` for why they are data.
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

RULES_DIR = Path(__file__).parent / "rules"

Severity = Literal["blocking", "warning"]

# Comparison is table-driven, never `eval()`. A policy file is trusted input today,
# but the whole point of this module is that it stays trustworthy when someone less
# careful edits it at 3am on day two.
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
    verified: bool = Field(
        description="False = the figure is a placeholder a human has not checked against the law yet."
    )

    def check(self, actual: float) -> bool:
        """True = compliant."""
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
    unverified: bool = Field(
        default=False,
        description="True = this fired on a threshold nobody has verified. Say so in the UI.",
    )

    @property
    def is_blocking(self) -> bool:
        return self.severity == "blocking"

    def to_message(self) -> str:
        head = (
            f"{self.description.strip()} — {self.metric} = {self.actual:g}, "
            f"limit {self.operator} {self.threshold:g} ({self.unit}). "
            f"Cơ sở: {self.legal_basis}."
        )
        if self.unverified:
            head += " ⚠️ NGƯỠNG CHƯA ĐƯỢC VERIFY — không trích dẫn con số này ra ngoài."
        return head


@lru_cache
def load_rules() -> tuple[PolicyRule, ...]:
    """Load and validate every rule file.

    Raises rather than degrading: these files ship inside the image, so a failure here
    is a bug we want to see the moment the app boots, not a silent hole where the veto
    used to be. (`AGENTS.md` §6's fallback rule covers *external* calls — LLM, DB,
    network — not our own packaged data.)
    """
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
                raise PolicyLoadError(f"{path.name}: rule '{rule.id}' uses unknown operator '{rule.operator}'")
            if rule.id in seen:
                raise PolicyLoadError(f"Duplicate rule id '{rule.id}' in {path.name} and {seen[rule.id].name}")
            seen[rule.id] = path
            rules.append(rule)

    if not rules:
        raise PolicyLoadError(f"No rules found in {RULES_DIR}")

    return tuple(rules)


def evaluate(metrics: dict[str, float], as_of: date | None = None) -> list[PolicyViolation]:
    """Check metrics against every rule whose metric is present.

    A metric that is absent is skipped, not assumed compliant — the caller decides
    whether a missing input is itself a problem. Silence here means "not measured",
    never "passed".
    """
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

    # Blocking first — a caller that reads only the head of this list must not miss a wall.
    violations.sort(key=lambda v: (v.severity != "blocking", v.rule_id))
    return violations


def unverified_rules() -> list[PolicyRule]:
    """Rules still running on an unchecked figure. Surface these in the UI and the pitch."""
    return [r for r in load_rules() if not r.verified]


def covered_metrics() -> set[str]:
    """Metric names policy knows how to judge. Useful for asserting an agent measured enough."""
    return {r.metric for r in load_rules()}
