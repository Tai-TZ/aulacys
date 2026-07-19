"""Proxy application-svc list/get — returns None when unreachable."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from aulacys.agents.graph import seed_application
from aulacys.config import get_settings

logger = logging.getLogger(__name__)


_FALLBACK_SCENARIOS = [
    ("demo_happy", "retail salary happy"),
    ("demo_veto", "retail salary veto"),
    ("demo_hitl", "retail salary hitl"),
    ("mortgage_veto", "retail mortgage"),
    ("mortgage_clean", "retail mortgage clean"),
]


def _base_url() -> str | None:
    url = (get_settings().application_svc_url or "").strip()
    return url.rstrip("/") if url else None


def list_applications(*, limit: int = 100) -> list[dict[str, Any]] | None:
    """Return dossiers from application-svc, or None if the service is unreachable."""
    base = _base_url()
    if not base:
        return None
    url = f"{base}/applications?limit={limit}"
    last_exc: Exception | None = None
    # Cold Supabase / local wake can flake once — one retry keeps the demo path alive.
    for attempt in range(2):
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=40) as resp:  # noqa: S310
                data = json.loads(resp.read().decode("utf-8"))
                return data if isinstance(data, list) else []
        except Exception as exc:
            last_exc = exc
            logger.warning("list_applications attempt %s failed: %s", attempt + 1, exc)
    logger.exception("list_applications: application-svc unreachable", exc_info=last_exc)
    return None


def fetch_application(application_id: str) -> dict[str, Any] | None:
    base = _base_url()
    if not base:
        return None
    try:
        req = urllib.request.Request(f"{base}/applications/{application_id}")
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        logger.warning("fetch_application HTTP error: %s", exc)
        return None
    except Exception as exc:
        logger.warning("fetch_application failed: %s", exc)
        return None


def fallback_applications(*, limit: int = 100) -> list[dict[str, Any]]:
    """Demo dossiers shaped like application-svc rows when application-svc is down."""
    rows = [_to_application_row(scenario, query) for scenario, query in _FALLBACK_SCENARIOS]
    return rows[: max(0, limit)]


def _to_application_row(scenario: str, query: str) -> dict[str, Any]:
    application = seed_application(query)
    declared = application.declared
    return {
        "id": scenario,
        "scenario": scenario,
        "source": "seeded-fallback",
        "product": application.product,
        "total_amount": declared.amount,
        "term_months": declared.term_months,
        "status": "submitted",
        "applicant": {
            "full_name": declared.customer_name,
            "dob": _date_vi_to_iso(declared.dob),
            "gender": declared.gender,
            "id_number": declared.id_number or declared.national_id,
            "id_issue_date": _date_vi_to_iso(declared.national_id_issue_date),
            "id_issue_place": declared.national_id_issue_place,
            "old_id_number": declared.old_national_id,
            "email": declared.email,
        },
        "phone": {
            "mobile_1": declared.phone,
            "mobile_2": declared.phone_2,
            "zalo_phone": declared.zalo_phone,
        },
        "addresses": [
            _address("permanent", declared.permanent_address),
            _address("current", declared.current_address or declared.permanent_address),
        ],
        "employment": {
            "occupation": declared.occupation,
            "employer_name": declared.company_name,
            "position": declared.position,
            "work_address": declared.company_address,
            "salary_day": declared.salary_payday,
        },
        "financial": {
            "total_income": declared.monthly_income,
            "personal_expense": declared.personal_expense,
        },
        "consent": {
            "data_processing_consent": declared.consent_data_processing,
            "marketing_consent": declared.consent_advertising,
        },
        "purposes": [{"category": "consumer", "purpose_detail": declared.declared_purpose}],
        "references": [
            {
                "seq": 1,
                "full_name": declared.ref1_name,
                "relationship": declared.ref1_relationship,
                "phone": declared.ref1_phone,
                "same_address": declared.ref1_same_address,
            },
            {
                "seq": 2,
                "full_name": declared.ref2_name,
                "relationship": declared.ref2_relationship,
                "phone": declared.ref2_phone,
                "same_address": declared.ref2_same_address,
            },
        ],
        "spouse": {
            "full_name": declared.spouse_name,
            "phone": declared.spouse_phone,
            "id_number": declared.spouse_national_id,
            "income": declared.spouse_income,
            "employer_name": declared.spouse_company,
            "employer_phone": declared.spouse_workplace_phone,
        },
        "disbursements": [
            {
                "method": declared.disbursement_method,
                "bank": declared.disbursement_bank,
                "branch": declared.disbursement_branch,
                "account_no": declared.disbursement_account,
                "account_name": declared.disbursement_account_name,
            }
        ],
    }


def _address(kind: str, raw: str | None) -> dict[str, Any]:
    parts = [part.strip() for part in (raw or "").split(",") if part.strip()]
    street = ", ".join(parts[:-3]) if len(parts) >= 4 else (parts[0] if parts else None)
    return {
        "kind": kind,
        "street": street,
        "ward": parts[-3] if len(parts) >= 3 else None,
        "district": parts[-2] if len(parts) >= 2 else None,
        "province": parts[-1] if parts else None,
    }


def _date_vi_to_iso(raw: str | None) -> str | None:
    if not raw:
        return None
    parts = raw.split("/")
    if len(parts) != 3:
        return raw
    day, month, year = parts
    return f"{year.zfill(4)}-{month.zfill(2)}-{day.zfill(2)}"
