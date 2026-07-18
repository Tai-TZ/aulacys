"""Policy access with a service seam.

`evaluate_policy` calls the `policy-svc` microservice when `POLICY_SVC_URL` is set,
and falls back to the in-process `loader.evaluate` when it is not (or when the call
fails). That fallback is the demo-proof rule (`AGENTS.md` §6): a dead policy service
must never 500 the veto path.

Uses urllib (stdlib) — no new dependency (`AGENTS.md` §1).
"""

from __future__ import annotations

import json
import os
import urllib.request
from datetime import date

from aulacys.policy.loader import PolicyViolation
from aulacys.policy.loader import evaluate as _local_evaluate
from aulacys.policy.profiles import PolicyProfile


def evaluate_policy(
    metrics: dict[str, float],
    as_of: date | None = None,
    *,
    profile: PolicyProfile | None = None,
    product_code: str | None = None,
    rule_sets: list[str] | None = None,
) -> list[PolicyViolation]:
    # Profile-scoped evaluate stays in-process (overrides live on the API host).
    if profile is not None:
        return _local_evaluate(
            metrics,
            as_of=as_of,
            profile=profile,
            product_code=product_code,
            rule_sets=rule_sets,
        )

    url = os.getenv("POLICY_SVC_URL")
    if not url:
        return _local_evaluate(metrics, as_of=as_of)
    try:
        payload = json.dumps({"metrics": metrics, "as_of": as_of.isoformat() if as_of else None}).encode("utf-8")
        req = urllib.request.Request(
            f"{url.rstrip('/')}/evaluate",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310 (trusted internal URL)
            data = json.loads(resp.read().decode("utf-8"))
        return [PolicyViolation(**v) for v in data["violations"]]
    except Exception:
        # Service down/unreachable -> in-process fallback. Veto must not break.
        return _local_evaluate(metrics, as_of=as_of)
