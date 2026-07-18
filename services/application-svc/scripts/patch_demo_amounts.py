"""Align demo_happy/veto/hitl loan amounts in application DB with SOP-safe demos."""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

# CCCD → total_amount (VND) — identity stays; amounts tuned for demo branches
DEMO_AMOUNTS = {
    "074300004128": 150_000_000,  # happy
    "091185013867": 160_000_000,  # veto (purpose only)
    "054301008970": 180_000_000,  # hitl (≤12× income)
}


async def main() -> None:
    env = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(env)
    raw = os.environ["DIRECT_URL"].split("?")[0]
    conn = await asyncpg.connect(raw)
    try:
        await conn.execute("SET search_path TO application")
        for cccd, amount in DEMO_AMOUNTS.items():
            updated = await conn.execute(
                """
                UPDATE loan_application a
                SET total_amount = $1
                FROM applicant ap
                WHERE ap.application_id = a.id AND ap.id_number = $2
                """,
                amount,
                cccd,
            )
            print(f"{cccd} → {amount}: {updated}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
