"""Add avatar (eKYC enrolled face path) to KYC customer profiles."""

from __future__ import annotations

import json
from pathlib import Path

KYC_PATH = Path(__file__).resolve().parent / "kyc_records.json"

# Real demo CCCD assets already in apps/web/public/aulacys/
DEMO_AVATARS = {
    "074300004128": "/aulacys/cccd-be-hoa.png",
    "091185013867": "/aulacys/cccd-tran-vui.png",
    "054301008970": "/aulacys/cccd-huyen-tran.png",
}


def main() -> None:
    data = json.loads(KYC_PATH.read_text(encoding="utf-8"))
    for key, rec in data.items():
        if key.startswith("_"):
            continue
        cust = rec["customer_id"]
        rec["avatar"] = DEMO_AVATARS.get(key, f"/aulacys/avatars/{cust}.jpg")
    meta = data["_meta"]
    meta["schema_version"] = "2.1"
    meta["version"] = "2026.2"
    meta["updated_at"] = "2026-07-19"
    meta["description"] = "Synthetic KYC profiles including enrolled eKYC avatar path"
    KYC_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote avatar onto {meta['record_count']} KYC records → {KYC_PATH}")


if __name__ == "__main__":
    main()
