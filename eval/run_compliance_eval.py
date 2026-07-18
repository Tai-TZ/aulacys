"""Evaluate versioned Compliance golden cases against policy-as-code."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "shared"))

from aulacys.policy.loader import evaluate  # noqa: E402

GOLDEN_DIR = ROOT / "eval" / "golden" / "compliance"
STANDARD_VERSION = "2026.1"


def evaluate_case(path: Path) -> dict:
    case = json.loads(path.read_text(encoding="utf-8"))
    violations = evaluate(
        case["metrics"],
        profile=case["profile"],
        product_code=case.get("product_code"),
    )
    rule_ids = [violation.rule_id for violation in violations]
    veto = any(violation.is_blocking for violation in violations)
    decision = "veto" if veto else "warning" if violations else "clean"
    expected = case["expected"]
    passed = (
        case["standard_version"] == STANDARD_VERSION
        and rule_ids == expected["rule_ids"]
        and veto == expected["veto"]
        and decision == expected["decision"]
    )
    return {
        "case_id": case["case_id"],
        "passed": passed,
        "actual": {"rule_ids": rule_ids, "veto": veto, "decision": decision},
        "expected": expected,
    }


def run() -> dict:
    cases = [evaluate_case(path) for path in sorted(GOLDEN_DIR.glob("*.json"))]
    passed = sum(case["passed"] for case in cases)
    return {
        "standard_version": STANDARD_VERSION,
        "total": len(cases),
        "passed": passed,
        "failed": len(cases) - passed,
        "accuracy": passed / len(cases) if cases else 0,
        "cases": cases,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = run()
    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0 if report["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
