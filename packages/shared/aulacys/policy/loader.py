"""Policy-as-code: hard limits as versioned data, evaluated by plain Python.

No LLM is involved anywhere in this module. A rule either fires or it does not, and
the same inputs always give the same answer. That determinism is the point: it is what
lets `Compliance` veto a proposal in a way a bank can audit and a model cannot talk
its way around.

Rules live in `rules/*.yaml`. See `rules/credit_limits.yaml` for why they are data.
"""

from __future__ import annotations

import math
import operator
import os
import threading
from collections.abc import Callable
from datetime import UTC, date
from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field

from aulacys.policy.profiles import (
    PROFILE_RULE_IDS,
    PolicyProfile,
    label_vi,
    profile_from_secured_type,
)

RULES_DIR = Path(__file__).parent / "rules"
OVERRIDES_PATH = Path(__file__).parent / "appetite_overrides.yaml"
_OVERRIDE_WRITE_LOCK = threading.Lock()

Severity = Literal["blocking", "warning"]
RuleKind = Literal["legal", "appetite"]

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
    version: str = Field(description="Rule revision recorded on the audit ledger (not a stand-in date).")
    verified: bool = Field(
        description="False = the figure is a placeholder a human has not checked against the law yet."
    )
    kind: RuleKind = Field(
        default="appetite",
        description="legal = statutory/hard limit (read-only in Rule Engineer); appetite = tunable.",
    )

    def check(self, actual: float) -> bool:
        """True = compliant."""
        return _OPERATORS[self.operator](actual, self.threshold)

    def with_threshold(self, threshold: float) -> PolicyRule:
        return self.model_copy(update={"threshold": threshold})


class PolicyViolation(BaseModel):
    rule_id: str
    description: str
    legal_basis: str
    metric: str
    actual: float | None
    threshold: float
    operator: str
    unit: str
    severity: Severity
    raised_by: str
    effective_from: str
    effective_to: str | None = None
    version: str = Field(default="", description="Copied from PolicyRule.version for the audit ledger.")
    unverified: bool = Field(
        default=False,
        description="True = this fired on a threshold nobody has verified. Say so in the UI.",
    )
    missing_metric: bool = Field(
        default=False,
        description="True when a profile-required metric was not supplied; assessment must fail closed.",
    )

    @property
    def is_blocking(self) -> bool:
        return self.severity == "blocking"

    def to_message(self) -> str:
        if self.missing_metric:
            return f"Missing required metric '{self.metric}' for policy rule {self.rule_id}."
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


def evaluate(
    metrics: dict[str, float],
    as_of: date | None = None,
    *,
    profile: PolicyProfile | None = None,
    product_code: str | None = None,
) -> list[PolicyViolation]:
    """Check metrics against every rule whose metric is present.

    A metric that is absent is skipped, not assumed compliant — the caller decides
    whether a missing input is itself a problem. Silence here means "not measured",
    never "passed".

    When ``profile`` is set, only that package's rules run (with appetite overrides).
    ``product_code`` further scopes appetite overrides to one catalog product.
    """
    active_on = as_of or date.today()
    violations: list[PolicyViolation] = []
    rules = rules_for_profile(profile, product_code=product_code) if profile else _rules_with_global_appetite()

    for rule in rules:
        effective_from = date.fromisoformat(rule.effective_from)
        effective_to = date.fromisoformat(rule.effective_to) if rule.effective_to else None
        if effective_from > active_on:
            continue
        if effective_to is not None and effective_to < active_on:
            continue
        if rule.metric not in metrics:
            if profile is not None:
                violations.append(
                    PolicyViolation(
                        rule_id=rule.id,
                        description=f"Missing required metric: {rule.description}",
                        legal_basis=rule.legal_basis,
                        metric=rule.metric,
                        actual=None,
                        threshold=rule.threshold,
                        operator=rule.operator,
                        unit=rule.unit,
                        severity="blocking",
                        raised_by=rule.veto_agent,
                        effective_from=rule.effective_from,
                        effective_to=rule.effective_to,
                        version=rule.version,
                        unverified=not rule.verified,
                        missing_metric=True,
                    )
                )
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
                severity=rule.severity if rule.verified or rule.kind == "appetite" else "warning",
                raised_by=rule.veto_agent,
                effective_from=rule.effective_from,
                effective_to=rule.effective_to,
                version=rule.version,
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


@lru_cache
def _load_overrides_cached(mtime_ns: int) -> dict:
    del mtime_ns  # cache key only
    if not OVERRIDES_PATH.is_file():
        return {"overrides": {}, "products": {}, "change_log": []}
    try:
        raw = yaml.safe_load(OVERRIDES_PATH.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError:
        return {"overrides": {}, "products": {}, "change_log": []}
    profile_map: dict[str, dict[str, float]] = {}
    for profile, mapping in (raw.get("overrides") or {}).items():
        if profile == "products" or not isinstance(mapping, dict):
            continue
        # skip nested products key if mistakenly under overrides
        if all(isinstance(v, (int, float)) for v in mapping.values()):
            profile_map[str(profile)] = {str(k): float(v) for k, v in mapping.items()}
    products_raw = raw.get("products") or (raw.get("overrides") or {}).get("products") or {}
    products: dict[str, dict[str, float]] = {}
    if isinstance(products_raw, dict):
        for code, mapping in products_raw.items():
            if isinstance(mapping, dict):
                products[str(code)] = {str(k): float(v) for k, v in mapping.items()}
    change_log = list(raw.get("change_log") or [])
    return {"overrides": profile_map, "products": products, "change_log": change_log}


def load_appetite_store() -> dict:
    mtime = OVERRIDES_PATH.stat().st_mtime_ns if OVERRIDES_PATH.is_file() else 0
    return _load_overrides_cached(mtime)


def load_appetite_overrides() -> dict[str, dict[str, float]]:
    """Profile-level overrides only (legacy callers)."""
    return dict(load_appetite_store().get("overrides") or {})


def _clear_override_cache() -> None:
    _load_overrides_cached.cache_clear()


def _merged_appetite_map(profile: PolicyProfile, product_code: str | None) -> dict[str, float]:
    store = load_appetite_store()
    merged = dict((store.get("overrides") or {}).get(profile) or {})
    if product_code:
        merged.update((store.get("products") or {}).get(product_code) or {})
    return merged


def _rules_with_global_appetite() -> list[PolicyRule]:
    """Base rules; no profile filter — used by legacy evaluate callers."""
    return list(load_rules())


def rules_for_profile(profile: PolicyProfile, product_code: str | None = None) -> list[PolicyRule]:
    """Rules attached to a package family, with appetite overrides applied."""
    by_id = {r.id: r for r in load_rules()}
    overrides = _merged_appetite_map(profile, product_code)
    result: list[PolicyRule] = []
    for rule_id in PROFILE_RULE_IDS[profile]:
        rule = by_id.get(rule_id)
        if rule is None:
            continue
        if rule_id in overrides and rule.kind == "appetite":
            rule = rule.with_threshold(overrides[rule_id])
        result.append(rule)
    return result


def list_rules_for_profile(profile: PolicyProfile, product_code: str | None = None) -> list[dict]:
    """Serialize rules for the Rule Engineer admin UI."""
    rows: list[dict] = []
    for rule in rules_for_profile(profile, product_code=product_code):
        rows.append(
            {
                "id": rule.id,
                "label_vi": label_vi(rule.id),
                "description": rule.description,
                "kind": rule.kind,
                "metric": rule.metric,
                "operator": rule.operator,
                "threshold": rule.threshold,
                "unit": rule.unit,
                "severity": rule.severity,
                "editable": rule.kind == "appetite" and rule.unit not in {"boolean_flag"},
                "verified": rule.verified,
                "version": rule.version,
                "legal_basis": rule.legal_basis,
                "effective_from": rule.effective_from,
                "effective_to": rule.effective_to,
            }
        )
    return rows


class AppetitePatchError(ValueError):
    """Raised when Rule Engineer refuses an appetite edit."""


def _validate_appetite_threshold(rule: PolicyRule, threshold: float) -> float:
    value = float(threshold)
    if not math.isfinite(value):
        raise AppetitePatchError("Threshold must be a finite number")
    if rule.unit in {"ratio", "ratio_of_own_capital"} and not 0 <= value <= 1:
        raise AppetitePatchError(f"Rule '{rule.id}' ratio threshold must be between 0 and 1")
    if rule.unit == "cic_group" and not (1 <= value <= 5 and value.is_integer()):
        raise AppetitePatchError(f"Rule '{rule.id}' CIC threshold must be an integer from 1 to 5")
    if rule.unit in {"count", "months", "years", "vnd"} and value < 0:
        raise AppetitePatchError(f"Rule '{rule.id}' threshold cannot be negative")
    return value


def patch_appetite_threshold(
    profile: PolicyProfile,
    rule_id: str,
    threshold: float,
    *,
    product_code: str | None = None,
) -> PolicyRule:
    """Persist an appetite threshold. Legal rules are rejected.

    When ``product_code`` is set, the override is scoped to that package code;
    otherwise it applies to the whole secured/unsecured profile.
    """
    from datetime import datetime

    by_id = {r.id: r for r in load_rules()}
    rule = by_id.get(rule_id)
    if rule is None:
        raise AppetitePatchError(f"Unknown rule '{rule_id}'")
    if rule_id not in PROFILE_RULE_IDS[profile]:
        raise AppetitePatchError(f"Rule '{rule_id}' is not on profile '{profile}'")
    if rule.kind != "appetite":
        raise AppetitePatchError(f"Rule '{rule_id}' is legal — threshold is not editable")
    if rule.unit in {"boolean_flag"}:
        raise AppetitePatchError(
            f"Rule '{rule_id}' is gated by product limits — edit LTV/ceiling on the package, not here"
        )
    threshold = _validate_appetite_threshold(rule, threshold)

    store = load_appetite_store()
    overrides = dict(store.get("overrides") or {})
    products = dict(store.get("products") or {})
    change_log = list(store.get("change_log") or [])

    if product_code:
        pmap = dict(products.get(product_code) or {})
        pmap[rule_id] = float(threshold)
        products[product_code] = pmap
    else:
        profile_map = dict(overrides.get(profile) or {})
        profile_map[rule_id] = float(threshold)
        overrides[profile] = profile_map

    change_log.append(
        {
            "at": datetime.now(UTC).isoformat(),
            "profile": profile,
            "product_code": product_code or "",
            "rule_id": rule_id,
            "threshold": float(threshold),
        }
    )
    change_log = change_log[-50:]

    content = yaml.safe_dump(
        {"overrides": overrides, "products": products, "change_log": change_log},
        allow_unicode=True,
        sort_keys=True,
    )
    with _OVERRIDE_WRITE_LOCK:
        OVERRIDES_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = OVERRIDES_PATH.with_suffix(f"{OVERRIDES_PATH.suffix}.tmp")
        tmp_path.write_text(content, encoding="utf-8")
        os.replace(tmp_path, OVERRIDES_PATH)
    _clear_override_cache()
    return rule.with_threshold(float(threshold))


def delete_appetite_override(
    profile: PolicyProfile,
    rule_id: str,
    *,
    product_code: str | None = None,
) -> PolicyRule:
    """Delete/revert an appetite threshold override back to default."""
    from datetime import datetime

    by_id = {r.id: r for r in load_rules()}
    rule = by_id.get(rule_id)
    if rule is None:
        raise AppetitePatchError(f"Unknown rule '{rule_id}'")
    if rule_id not in PROFILE_RULE_IDS[profile]:
        raise AppetitePatchError(f"Rule '{rule_id}' is not on profile '{profile}'")
    if rule.kind != "appetite":
        raise AppetitePatchError(f"Rule '{rule_id}' is legal — threshold is not editable")
    if rule.unit in {"boolean_flag"}:
        raise AppetitePatchError(
            f"Rule '{rule_id}' is gated by product limits — cannot edit or delete"
        )

    store = load_appetite_store()
    overrides = dict(store.get("overrides") or {})
    products = dict(store.get("products") or {})
    change_log = list(store.get("change_log") or [])

    removed = False
    if product_code:
        if product_code in products and rule_id in products[product_code]:
            del products[product_code][rule_id]
            if not products[product_code]:
                del products[product_code]
            removed = True
    else:
        if profile in overrides and rule_id in overrides[profile]:
            del overrides[profile][rule_id]
            if not overrides[profile]:
                del overrides[profile]
            removed = True

    if not removed:
        # No override to remove, just return default rule
        updated_rules = {r.id: r for r in rules_for_profile(profile, product_code=product_code)}
        return updated_rules[rule_id]

    change_log.append(
        {
            "at": datetime.now(UTC).isoformat(),
            "profile": profile,
            "product_code": product_code or "",
            "rule_id": rule_id,
            "action": "delete_override",
        }
    )
    change_log = change_log[-50:]

    content = yaml.safe_dump(
        {"overrides": overrides, "products": products, "change_log": change_log},
        allow_unicode=True,
        sort_keys=True,
    )
    with _OVERRIDE_WRITE_LOCK:
        OVERRIDES_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = OVERRIDES_PATH.with_suffix(f"{OVERRIDES_PATH.suffix}.tmp")
        tmp_path.write_text(content, encoding="utf-8")
        os.replace(tmp_path, OVERRIDES_PATH)
    _clear_override_cache()

    updated_rules = {r.id: r for r in rules_for_profile(profile, product_code=product_code)}
    return updated_rules[rule_id]


# Re-export helpers used by routes.
__all__ = [
    "AppetitePatchError",
    "PolicyLoadError",
    "PolicyRule",
    "PolicyViolation",
    "covered_metrics",
    "delete_appetite_override",
    "evaluate",
    "label_vi",
    "list_rules_for_profile",
    "load_appetite_overrides",
    "load_rules",
    "patch_appetite_threshold",
    "profile_from_secured_type",
    "rules_for_profile",
    "unverified_rules",
]
