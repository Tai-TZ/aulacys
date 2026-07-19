"""One-shot enricher: add Credit History fields + Vietnamese identity to CIC seed."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KYC_PATH = ROOT / "packages/shared/aulacys/agents/resources/compliance/kyc_records.json"
CIC_PATH = Path(__file__).resolve().parents[1] / "seed/cic_records.json"

CREDIT_TYPE_VI = {
    "secured": "Vay có tài sản bảo đảm",
    "unsecured": "Vay tín chấp",
    "card": "Thẻ tín dụng",
}

VN_BANKS = [
    "SHB",
    "Vietcombank",
    "VietinBank",
    "BIDV",
    "Agribank",
    "Techcombank",
    "MB Bank",
    "ACB",
    "VPBank",
    "TPBank",
]

SURNAMES = ["NGUYỄN", "TRẦN", "LÊ", "PHẠM", "HOÀNG", "HUỲNH", "VŨ", "VÕ", "ĐẶNG", "BÙI"]
MIDDLES = ["VĂN", "THỊ", "MINH", "ĐỨC", "THANH", "HOÀNG", "QUỐC", "HỮU"]
GIVEN = ["AN", "BÌNH", "CƯỜNG", "DUNG", "EM", "PHÚC", "GIANG", "HÀ", "KHOA", "LAN"]


def debt_group_from_overdue(days: int) -> int:
    days = max(0, int(days))
    if days == 0:
        return 1
    if days <= 90:
        return 2
    if days <= 180:
        return 3
    if days <= 360:
        return 4
    return 5


def overdue_count_for(group: int, max_days: int) -> int:
    if group == 1 or max_days == 0:
        return 0
    if group == 2:
        return 1 if max_days <= 30 else 2
    if group == 3:
        return 3
    if group == 4:
        return 4
    return 6


def number_of_institutions(num_active_loans: int, debt_group: int) -> int:
    n = int(num_active_loans or 0)
    if n <= 0:
        return 0
    if debt_group == 1:
        return 1 if n == 1 else min(n, 2)
    if debt_group == 2:
        return min(n, 3)
    if debt_group == 3:
        return min(max(n, 2), 4)
    if debt_group == 4:
        return min(max(n, 3), 5)
    return min(max(n, 4), 6)


def synthetic_vn_name(cccd: str) -> str:
    idx = int(cccd[-3:])
    return f"{SURNAMES[idx % len(SURNAMES)]} {MIDDLES[idx % len(MIDDLES)]} {GIVEN[idx % len(GIVEN)]}"


def main() -> None:
    kyc = json.loads(KYC_PATH.read_text(encoding="utf-8"))
    cic = json.loads(CIC_PATH.read_text(encoding="utf-8"))
    kyc_by_cccd = {k: v for k, v in kyc.items() if not k.startswith("_")}

    used_cust = {v["customer_id"] for v in kyc_by_cccd.values()}
    max_n = 0
    for cid in used_cust:
        try:
            max_n = max(max_n, int(str(cid).split("-")[-1]))
        except ValueError:
            pass
    next_n = max_n + 1
    cic_only_ids: dict[str, str] = {}

    records: dict[str, dict] = {}
    for cccd, rec in cic.items():
        if cccd.startswith("_"):
            continue

        days = int(rec.get("max_overdue_days", 0))
        group = debt_group_from_overdue(days)
        loans = int(rec.get("num_active_loans", 0))
        outstanding = int(rec.get("total_outstanding_vnd", 0))
        overdue_amt = int(rec.get("overdue_amount_vnd", 0))
        count = overdue_count_for(group, days)
        n_inst = number_of_institutions(loans, group)

        if cccd in kyc_by_cccd:
            customer_id = kyc_by_cccd[cccd]["customer_id"]
            full_name = kyc_by_cccd[cccd]["full_name"]
        else:
            if cccd not in cic_only_ids:
                cic_only_ids[cccd] = f"CUST-{next_n:06d}"
                next_n += 1
            customer_id = cic_only_ids[cccd]
            full_name = synthetic_vn_name(cccd)

        credit_types = list(rec.get("credit_types") or [])
        records[cccd] = {
            "customer_id": customer_id,
            "full_name": full_name,
            "debt_group": group,
            "outstanding_debt": outstanding,
            "total_outstanding_vnd": outstanding,
            "overdue_history": {
                "count": count,
                "max_days": days,
                "amount_vnd": overdue_amt,
            },
            "number_of_institutions": n_inst,
            "institutions": VN_BANKS[:n_inst],
            "credit_limit_total_vnd": int(rec.get("credit_limit_total_vnd", 0)),
            "num_active_loans": loans,
            "monthly_debt_obligation_vnd": int(rec.get("monthly_debt_obligation_vnd") or 0),
            "max_overdue_days": days,
            "overdue_amount_vnd": overdue_amt,
            "credit_history_months": int(rec.get("credit_history_months", 0)),
            "credit_types": credit_types,
            "credit_types_vi": [CREDIT_TYPE_VI.get(t, t) for t in credit_types],
            "inquiries_last_6m": int(rec.get("inquiries_last_6m", 0)),
        }

    d = cic["_default"]
    days = int(d.get("max_overdue_days", 0))
    group = debt_group_from_overdue(days)
    outstanding = int(d.get("total_outstanding_vnd", 0))
    credit_types = list(d.get("credit_types") or ["unsecured"])
    default = {
        "customer_id": None,
        "full_name": "Khách hàng mặc định (dữ liệu tổng hợp)",
        "debt_group": group,
        "outstanding_debt": outstanding,
        "total_outstanding_vnd": outstanding,
        "overdue_history": {"count": 0, "max_days": days, "amount_vnd": 0},
        "number_of_institutions": 0,
        "institutions": [],
        "credit_limit_total_vnd": int(d.get("credit_limit_total_vnd", 0)),
        "num_active_loans": int(d.get("num_active_loans", 0)),
        "monthly_debt_obligation_vnd": int(d.get("monthly_debt_obligation_vnd") or 0),
        "max_overdue_days": days,
        "overdue_amount_vnd": 0,
        "credit_history_months": int(d.get("credit_history_months", 0)),
        "credit_types": credit_types,
        "credit_types_vi": [CREDIT_TYPE_VI.get(t, t) for t in credit_types],
        "inquiries_last_6m": int(d.get("inquiries_last_6m", 1)),
    }

    out: dict = {
        "_meta": {
            **cic["_meta"],
            "version": "2026.2",
            "schema_version": "2.0",
            "description": (
                "Lịch sử tín dụng giả lập (CIC): customer_id, nhóm nợ, dư nợ, quá hạn, số TCTD"
            ),
            "fields": [
                "customer_id",
                "debt_group",
                "outstanding_debt",
                "overdue_history",
                "number_of_institutions",
            ],
            "updated_at": "2026-07-19",
        },
        "_default": default,
    }
    for cccd in sorted(records.keys()):
        out[cccd] = records[cccd]

    CIC_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("groups", dict(sorted(Counter(r["debt_group"] for r in records.values()).items())))
    print("linked_from_kyc", sum(1 for k in records if k in kyc_by_cccd))
    print("cic_only", len(cic_only_ids))
    print("written", CIC_PATH)


if __name__ == "__main__":
    main()
