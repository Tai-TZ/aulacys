from __future__ import annotations

from src.policy.loader import rules_for_profile
from src.policy.metrics import METRIC_REGISTRY, MetricCollector


def test_registry_covers_every_profile_rule_metric() -> None:
    for profile in ("secured", "unsecured"):
        required = {rule.metric for rule in rules_for_profile(profile)}
        assert required <= METRIC_REGISTRY.keys()


def test_collector_reports_missing_and_invalid_metrics() -> None:
    collector = MetricCollector()
    collector.record("cic_group", 6, source="cic_lookup")

    report = collector.report("unsecured", {"cic_group", "dti"})

    assert report.complete is False
    assert report.missing == ["dti"]
    assert report.invalid == ["cic_group"]
    assert report.policy_values() == {}


def test_collector_keeps_provenance_for_valid_metric() -> None:
    collector = MetricCollector()
    collector.record("dti", 0.42, source="compute_dti", evidence="trace:credit-1")

    report = collector.report("unsecured", {"dti"})

    assert report.complete is True
    assert report.policy_values() == {"dti": 0.42}
    assert report.facts["dti"].source == "compute_dti"
    assert report.facts["dti"].evidence == "trace:credit-1"
