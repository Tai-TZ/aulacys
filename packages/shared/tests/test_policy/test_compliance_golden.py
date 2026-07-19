from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_evaluator():
    root = Path(__file__).resolve().parents[4]
    path = root / "eval" / "run_compliance_eval.py"
    spec = importlib.util.spec_from_file_location("compliance_eval", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_compliance_golden_cases_match_versioned_standard() -> None:
    report = _load_evaluator().run()

    assert report["standard_version"] == "2026.1"
    assert report["total"] >= 5
    assert report["failed"] == 0
    assert report["accuracy"] == 1.0
