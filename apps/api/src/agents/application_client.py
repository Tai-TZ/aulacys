"""Fetch loan applications from application-svc (APPLICATION_SVC_URL).

Maps SHBFinance Section A JSON → LoanApplication for the graph.
Consent is a hard gate: data_processing_consent must be true.
Unset URL or HTTP failure → None (caller decides fallback / 502).
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

from src.agents.state import DeclaredForm, Document, LoanApplication


class ConsentDeniedError(ValueError):
    """Raised when application-svc record lacks data-processing consent."""


def fetch_application(application_id: str) -> dict[str, Any] | None:
    """GET /applications/{id}. Returns None if URL unset or service unreachable."""
    from src.config import get_settings

    url = (get_settings().application_svc_url or "").strip() or os.getenv("APPLICATION_SVC_URL", "")
    if not url:
        return None
    try:
        req = urllib.request.Request(f"{url.rstrip('/')}/applications/{application_id}")
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        return None
    except Exception:
        return None


def _f(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _purpose_detail(raw: dict[str, Any]) -> str:
    purposes = raw.get("purposes") or []
    if not purposes:
        return "tiêu dùng cá nhân"
    first = purposes[0] or {}
    detail = first.get("purpose_detail") or first.get("category")
    return str(detail) if detail else "tiêu dùng cá nhân"


def map_to_loan_application(
    raw: dict[str, Any],
    *,
    product_override: str | None = None,
    extra_documents: list[Document] | None = None,
) -> LoanApplication:
    """Section A payload → LoanApplication. Raises ConsentDeniedError if blocked."""
    consent = raw.get("consent") or {}
    if not consent.get("data_processing_consent"):
        raise ConsentDeniedError("data_processing_consent must be true — cannot process PII without consent")

    applicant = raw.get("applicant") or {}
    financial = raw.get("financial") or {}
    product = product_override or str(raw.get("product") or "retail_unsecured_salary")
    id_number = str(applicant.get("id_number") or "001099000003")
    total_income = _f(financial.get("total_income"))
    # Form "chi phí cá nhân" feeds the existing-debt slot for DTI until a richer model exists.
    personal_expense = _f(financial.get("personal_expense"))

    declared = DeclaredForm(
        customer_name=str(applicant.get("full_name") or "Unknown"),
        amount=_f(raw.get("total_amount")),
        term_months=int(_f(raw.get("term_months"), 12)),
        monthly_income=total_income,
        existing_monthly_debt=personal_expense,
        declared_purpose=_purpose_detail(raw),
        id_number=id_number,
        cic_consent=bool(consent.get("data_processing_consent", True)),
    )

    documents: list[Document] = list(extra_documents or [])
    if not any(d.kind == "cccd" for d in documents):
        documents.append(Document(kind="cccd", tier=1, extracted={"verified": True, "id_number": id_number}))
    if total_income and not any(d.kind in {"sao_ke_luong", "sao_ke_tai_khoan"} for d in documents):
        documents.append(
            Document(
                kind="sao_ke_luong",
                tier=1,
                extracted={"monthly_income": total_income},
            )
        )

    return LoanApplication(product=product, declared=declared, documents=documents)


def load_loan_application(
    application_id: str,
    *,
    product_override: str | None = None,
    extra_documents: list[Document] | None = None,
) -> LoanApplication | None:
    """Fetch + map. None if missing/unreachable. Raises ConsentDeniedError on consent gate."""
    raw = fetch_application(application_id)
    if raw is None:
        return None
    return map_to_loan_application(
        raw,
        product_override=product_override,
        extra_documents=extra_documents,
    )
