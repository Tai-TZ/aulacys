"""Product-scoped rule profiles for the Rule Engineer.

Policy is attached to the loan package shape (secured vs unsecured), not a global
bag of every YAML row. Appetite overrides are keyed by profile and optionally
by product_code (per-package fine-tuning).
"""

from __future__ import annotations

from typing import Literal

PolicyProfile = Literal["secured", "unsecured"]

# Shared retail controls (both package families).
_COMMON: tuple[str, ...] = (
    "kyc_identity_verified",
    "ubo_related_control_clear",
    "ekyc_face_match_pass",
    "geo_within_branch_radius",
    "age_at_maturity_ok",
    "max_retail_dti",
    "max_cic_group",
    "no_bad_debt",
    "docs_complete",
    "term_within_product_max",
    "income_verified",
    "income_meets_regional_minimum",
    "sanctions_hit",
    "pep_requires_enhanced_dd",
    "aml_screening_complete",
)

# Rules that apply when underwriting each package family.
PROFILE_RULE_IDS: dict[PolicyProfile, tuple[str, ...]] = {
    "secured": (
        "prohibited_purpose_refinance_other_bank",
        "max_ltv_product_cap",
        "land_title_clear",
        *_COMMON,
    ),
    "unsecured": (
        "prohibited_purpose_refinance_other_bank",
        "max_amount_product_ceiling",
        "amount_within_income_multiple",
        "term_matches_purpose_ok",
        "dti_within_income_band",
        "disposable_buffer_ok",
        *_COMMON,
    ),
}

RULE_SET_RULE_IDS: dict[str, tuple[str, ...]] = {
    "retail_common": _COMMON,
    "unsecured_term": (
        "prohibited_purpose_refinance_other_bank",
        "max_amount_product_ceiling",
        "amount_within_income_multiple",
        "term_matches_purpose_ok",
        "dti_within_income_band",
        "disposable_buffer_ok",
    ),
    "secured_mortgage": (
        "prohibited_purpose_refinance_other_bank",
        "max_ltv_product_cap",
        "land_title_clear",
    ),
}

# Vietnamese labels for admin Rule Engineer UI.
RULE_LABELS_VI: dict[str, str] = {
    "prohibited_purpose_refinance_other_bank": "Cấm mục đích tất toán nợ ngân hàng khác",
    "ekyc_face_match_pass": "eKYC Face Match ≥ 85%",
    "geo_within_branch_radius": "Trong bán kính 50 km CN/PGD",
    "age_at_maturity_ok": "Tuổi tại đáo hạn trong khung 22–60",
    "amount_within_income_multiple": "Hạn mức ≤ 12× thu nhập tháng",
    "term_matches_purpose_ok": "Kỳ hạn khớp mục đích vay",
    "dti_within_income_band": "DTI trong band theo thu nhập",
    "disposable_buffer_ok": "Đủ số dư sinh hoạt tối thiểu",
    "max_ltv_product_cap": "Trần LTV theo sản phẩm",
    "max_retail_dti": "Trần DTI tuyệt đối (khả năng trả nợ)",
    "max_amount_product_ceiling": "Trần số tiền vay theo sản phẩm",
    "max_cic_group": "Nhóm nợ CIC chấp nhận được",
    "no_bad_debt": "Không nợ xấu",
    "docs_complete": "Đủ chứng từ bắt buộc",
    "term_within_product_max": "Kỳ hạn trong khung sản phẩm",
    "income_verified": "Thu nhập đã xác minh",
    "income_meets_regional_minimum": "Thu nhập tối thiểu theo vùng",
    "land_title_clear": "Sổ đỏ / TSBĐ pháp lý ổn",
    "sanctions_hit": "Cấm danh sách trừng phạt (AML)",
    "pep_requires_enhanced_dd": "Cảnh báo PEP (người có ảnh hưởng chính trị)",
    "single_customer_credit_limit": "Trần cấp tín dụng một khách hàng (Điều 136)",
    "related_party_credit_limit": "Trần cấp tín dụng nhóm liên quan",
    "min_dscr": "DSCR tối thiểu",
    "max_ltv_real_estate": "Trần LTV BĐS (cố định)",
}


def profile_from_secured_type(secured_type: str | None) -> PolicyProfile:
    if (secured_type or "").upper() == "UNSECURED":
        return "unsecured"
    return "secured"


def label_vi(rule_id: str) -> str:
    return RULE_LABELS_VI.get(rule_id, rule_id)
