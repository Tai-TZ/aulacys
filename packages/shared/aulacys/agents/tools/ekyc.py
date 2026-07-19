"""eKYC Face Match — compare enrolled customer avatar vs verification input.

Demo path: no real CV model. Match is path-equality against the KYC-enrolled
avatar plus a seeded Face Match score. Missing/mismatched avatar fail-closed.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

from langchain_core.tools import tool

PASS_THRESHOLD = 85


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _norm_path(value: str | None) -> str:
    return (value or "").strip().replace("\\", "/")


@lru_cache
def _load_ekyc() -> dict:
    path = Path(__file__).resolve().parents[1] / "resources" / "compliance" / "ekyc_face_match.json"
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache
def _load_kyc() -> dict:
    path = Path(__file__).resolve().parents[1] / "resources" / "compliance" / "kyc_records.json"
    return json.loads(path.read_text(encoding="utf-8"))


@tool
def ekyc_face_match(id_number: str, avatar: str | None = None) -> dict:
    """Compare verification avatar to the eKYC-enrolled face on the customer profile.

    ``avatar`` should be the face image path/URL captured for this verification.
    If omitted, the enrolled KYC avatar is used (re-check of stored enrollment).
    """
    normalized = (id_number or "").strip()
    dataset = _load_ekyc()
    kyc = _load_kyc()
    threshold = int(dataset.get("_meta", {}).get("pass_threshold", PASS_THRESHOLD))
    profile = kyc.get(normalized) or {}
    enrolled_avatar = _norm_path(profile.get("avatar"))
    presented_avatar = _norm_path(avatar) or enrolled_avatar
    score_record = dataset.get(normalized)

    if not enrolled_avatar:
        return {
            "status": "missing",
            "id_number": normalized,
            "customer_id": profile.get("customer_id"),
            "avatar": None,
            "enrolled_avatar": None,
            "avatar_matched": False,
            "face_match_score": 0,
            "liveness_passed": False,
            "passed": False,
            "threshold": threshold,
            "reason": "missing_enrolled_avatar",
            "source": "synthetic-ekyc-dataset",
            "dataset_version": dataset["_meta"]["version"],
            "evidence_id": "EKYC-MISSING-AVATAR",
            "record_found": False,
            "inputs": {"id_number": id_number, "avatar": avatar},
            "computed_at": _now(),
        }

    if not presented_avatar:
        return {
            "status": "missing",
            "id_number": normalized,
            "customer_id": profile.get("customer_id"),
            "avatar": None,
            "enrolled_avatar": enrolled_avatar,
            "avatar_matched": False,
            "face_match_score": 0,
            "liveness_passed": False,
            "passed": False,
            "threshold": threshold,
            "reason": "missing_verification_avatar",
            "source": "synthetic-ekyc-dataset",
            "dataset_version": dataset["_meta"]["version"],
            "evidence_id": "EKYC-MISSING-AVATAR",
            "record_found": bool(score_record),
            "inputs": {"id_number": id_number, "avatar": avatar},
            "computed_at": _now(),
        }

    avatar_matched = presented_avatar == enrolled_avatar
    if not avatar_matched:
        return {
            "status": "checked",
            "id_number": normalized,
            "customer_id": profile.get("customer_id"),
            "avatar": presented_avatar,
            "enrolled_avatar": enrolled_avatar,
            "avatar_matched": False,
            "face_match_score": 0,
            "liveness_passed": False,
            "passed": False,
            "threshold": threshold,
            "reason": "avatar_mismatch",
            "source": "synthetic-ekyc-dataset",
            "dataset_version": dataset["_meta"]["version"],
            "evidence_id": f"EKYC-{normalized}-MISMATCH",
            "record_found": bool(score_record),
            "inputs": {"id_number": id_number, "avatar": avatar},
            "computed_at": _now(),
        }

    if not score_record:
        default = dataset.get("_default") or {}
        score = int(default.get("face_match_score", 0))
        return {
            "status": "missing",
            "id_number": normalized,
            "customer_id": profile.get("customer_id"),
            "avatar": presented_avatar,
            "enrolled_avatar": enrolled_avatar,
            "avatar_matched": True,
            "face_match_score": score,
            "liveness_passed": False,
            "passed": False,
            "threshold": threshold,
            "reason": "missing_face_match_score",
            "source": "synthetic-ekyc-dataset",
            "dataset_version": dataset["_meta"]["version"],
            "evidence_id": "EKYC-MISSING",
            "record_found": False,
            "inputs": {"id_number": id_number, "avatar": avatar},
            "computed_at": _now(),
        }

    score = int(score_record.get("face_match_score", 0))
    passed = score >= threshold and bool(score_record.get("liveness_passed", score >= threshold))
    return {
        "status": "checked",
        "id_number": normalized,
        "customer_id": score_record.get("customer_id") or profile.get("customer_id"),
        "avatar": presented_avatar,
        "enrolled_avatar": enrolled_avatar,
        "avatar_matched": True,
        "face_match_score": score,
        "liveness_passed": bool(score_record.get("liveness_passed", False)),
        "passed": passed,
        "threshold": threshold,
        "reason": None if passed else "score_below_threshold",
        "provider": score_record.get("provider", "synthetic-ekyc"),
        "source": "synthetic-ekyc-dataset",
        "dataset_version": dataset["_meta"]["version"],
        "evidence_id": f"EKYC-{normalized}",
        "record_found": True,
        "inputs": {"id_number": id_number, "avatar": avatar},
        "computed_at": _now(),
    }
