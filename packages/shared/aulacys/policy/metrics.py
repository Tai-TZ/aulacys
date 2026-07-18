"""Typed underwriting metric registry and provenance-aware collector.

Tools measure facts; policy rules judge them. This module is the contract between
those two stages so an arbitrary ``dict[str, float]`` cannot silently become a
credit decision without a known type, range, source, and completeness check.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

from aulacys.policy.profiles import PolicyProfile

MetricKind = Literal["flag", "ratio", "integer", "count", "money"]


class MetricDefinition(BaseModel):
    name: str
    label_vi: str
    kind: MetricKind
    unit: str
    stage: str
    source: str
    minimum: float | None = None
    maximum: float | None = None


class MetricFact(BaseModel):
    name: str
    label_vi: str
    unit: str
    stage: str
    value: float | None
    source: str
    evidence: str = ""
    measured_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    valid: bool = True
    error: str | None = None


class MetricReport(BaseModel):
    profile: PolicyProfile
    complete: bool
    required: list[str]
    missing: list[str]
    invalid: list[str]
    facts: dict[str, MetricFact]

    def policy_values(self) -> dict[str, float]:
        return {name: float(fact.value) for name, fact in self.facts.items() if fact.valid and fact.value is not None}


def _d(
    name: str,
    label_vi: str,
    kind: MetricKind,
    unit: str,
    stage: str,
    source: str,
    minimum: float | None = None,
    maximum: float | None = None,
) -> MetricDefinition:
    return MetricDefinition(
        name=name,
        label_vi=label_vi,
        kind=kind,
        unit=unit,
        stage=stage,
        source=source,
        minimum=minimum,
        maximum=maximum,
    )


METRIC_REGISTRY: dict[str, MetricDefinition] = {
    item.name: item
    for item in (
        _d("kyc_verified", "Định danh khách hàng đã xác minh", "flag", "boolean_flag", "intake", "kyc_check", 0, 1),
        _d("ubo_clear", "Thông tin chủ sở hữu hưởng lợi đạt", "flag", "boolean_flag", "intake", "ubo_check", 0, 1),
        _d("dti", "Tỷ lệ nghĩa vụ trả nợ trên thu nhập", "ratio", "ratio", "credit", "compute_dti", 0),
        _d("cic_group", "Nhóm nợ CIC", "integer", "cic_group", "credit", "cic_lookup", 1, 5),
        _d("has_bad_debt", "Có nợ xấu", "flag", "boolean_flag", "credit", "cic_lookup", 0, 1),
        _d("income_verified", "Thu nhập đã xác minh", "flag", "boolean_flag", "credit", "income_verify", 0, 1),
        _d("docs_complete", "Đủ chứng từ bắt buộc", "flag", "boolean_flag", "operations", "document_checklist", 0, 1),
        _d(
            "term_within_product_max",
            "Kỳ hạn trong giới hạn sản phẩm",
            "flag",
            "boolean_flag",
            "compliance",
            "product_config",
            0,
            1,
        ),
        _d("ltv", "Tỷ lệ khoản vay trên giá trị tài sản", "ratio", "ratio", "operations", "compute_ltv", 0),
        _d(
            "ltv_within_product_cap",
            "LTV trong giới hạn sản phẩm",
            "flag",
            "boolean_flag",
            "compliance",
            "compute_ltv+product_config",
            0,
            1,
        ),
        _d(
            "amount_within_product_ceiling",
            "Số tiền vay trong giới hạn sản phẩm",
            "flag",
            "boolean_flag",
            "compliance",
            "application+product_config",
            0,
            1,
        ),
        _d("land_registry_ok", "Pháp lý tài sản đạt", "flag", "boolean_flag", "operations", "land_registry", 0, 1),
        _d("sanctions_match_count", "Số kết quả trùng danh sách cấm", "count", "count", "intake", "aml_screen", 0),
        _d("pep_match_count", "Số kết quả PEP", "count", "count", "intake", "aml_screen", 0),
        _d(
            "prohibited_purpose_refinance_other_bank",
            "Dấu hiệu tất toán khoản vay tại TCTD khác",
            "flag",
            "boolean_flag",
            "compliance",
            "purpose_evidence",
            0,
            1,
        ),
        _d(
            "exposure_ratio_related_group",
            "Tỷ lệ dư nợ nhóm liên quan",
            "ratio",
            "ratio_of_own_capital",
            "compliance",
            "related_party",
            0,
        ),
    )
}


class MetricCollector:
    def __init__(self) -> None:
        self._facts: dict[str, MetricFact] = {}

    def record(self, name: str, value: float | int | bool | None, *, source: str, evidence: str = "") -> None:
        definition = METRIC_REGISTRY.get(name)
        if definition is None:
            raise ValueError(f"Unknown underwriting metric '{name}'")
        if value is None:
            return
        numeric = float(value)
        error: str | None = None
        if not math.isfinite(numeric):
            error = "value must be finite"
        elif definition.kind in {"flag", "integer", "count"} and not numeric.is_integer():
            error = f"{definition.kind} metric must be an integer"
        elif definition.minimum is not None and numeric < definition.minimum:
            error = f"value must be >= {definition.minimum:g}"
        elif definition.maximum is not None and numeric > definition.maximum:
            error = f"value must be <= {definition.maximum:g}"
        self._facts[name] = MetricFact(
            name=name,
            label_vi=definition.label_vi,
            unit=definition.unit,
            stage=definition.stage,
            value=numeric,
            source=source,
            evidence=evidence,
            valid=error is None,
            error=error,
        )

    def report(self, profile: PolicyProfile, required: set[str]) -> MetricReport:
        missing = sorted(name for name in required if name not in self._facts)
        invalid = sorted(name for name in required if name in self._facts and not self._facts[name].valid)
        return MetricReport(
            profile=profile,
            complete=not missing and not invalid,
            required=sorted(required),
            missing=missing,
            invalid=invalid,
            facts=dict(self._facts),
        )


def metric_catalog() -> list[MetricDefinition]:
    return sorted(METRIC_REGISTRY.values(), key=lambda item: (item.stage, item.name))
