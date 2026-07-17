"""Policy is the mechanism the whole demo turns on, so it gets tested like it matters.

The test that earns its keep is `test_exposure_over_limit_is_blocking` — that is the
veto in the wow flow, asserted.
"""

from src.policy.loader import (
    PolicyRule,
    covered_metrics,
    evaluate,
    load_rules,
    unverified_rules,
)


class TestLoadRules:
    def test_loads(self):
        rules = load_rules()
        assert len(rules) > 0
        assert all(isinstance(r, PolicyRule) for r in rules)

    def test_rule_ids_unique(self):
        ids = [r.id for r in load_rules()]
        assert len(ids) == len(set(ids))

    def test_every_rule_cites_a_basis(self):
        # A rule nobody can trace to a source is a rule a compliance officer cannot
        # defend in an audit.
        for rule in load_rules():
            assert rule.legal_basis.strip()

    def test_the_statutory_limits_are_still_flagged_unverified(self):
        """Guards the biggest own-goal available to us: shipping the pre-2024 figure.

        This test is SUPPOSED to fail once a human verifies the thresholds against
        Luật Các TCTD 2024 Điều 136 and flips `verified: true`. When it fails, delete it
        — that failure is the good news. Until then it keeps the placeholder visible.
        """
        unverified = {r.id for r in unverified_rules()}
        assert "single_customer_credit_limit" in unverified, (
            "If someone flipped this to verified: confirm the threshold really came from "
            "the current law's step-down schedule and not from an LLM's memory, then "
            "delete this test."
        )


class TestEvaluate:
    def test_compliant_metrics_produce_nothing(self):
        violations = evaluate({"dscr": 1.5, "ltv": 0.6, "sanctions_match_count": 0})
        assert violations == []

    def test_exposure_over_limit_is_blocking(self):
        # THE demo moment: 17.5% of own capital against a 15% ceiling → Compliance vetoes.
        violations = evaluate({"exposure_ratio_single_customer": 0.175})
        assert len(violations) == 1
        v = violations[0]
        assert v.rule_id == "single_customer_credit_limit"
        assert v.is_blocking
        assert v.raised_by == "compliance"
        assert v.actual == 0.175

    def test_unverified_threshold_is_marked_in_the_violation(self):
        # A violation raised on an unchecked number must say so, all the way to the UI.
        v = evaluate({"exposure_ratio_single_customer": 0.175})[0]
        assert v.unverified is True
        assert "CHƯA ĐƯỢC VERIFY" in v.to_message()

    def test_sanctions_hit_is_blocking(self):
        violations = evaluate({"sanctions_match_count": 1})
        assert violations[0].is_blocking

    def test_pep_warns_but_does_not_block(self):
        # PEP escalates to enhanced due diligence; it does not refuse the loan.
        violations = evaluate({"pep_match_count": 1})
        assert len(violations) == 1
        assert violations[0].severity == "warning"
        assert not violations[0].is_blocking

    def test_low_dscr_warns(self):
        violations = evaluate({"dscr": 0.9})
        assert violations[0].rule_id == "min_dscr"
        assert violations[0].severity == "warning"

    def test_missing_metric_is_not_a_pass(self):
        # Silence means "not measured", never "compliant".
        assert evaluate({}) == []

    def test_blocking_sorts_before_warning(self):
        violations = evaluate({"exposure_ratio_single_customer": 0.175, "dscr": 0.9})
        assert [v.severity for v in violations] == ["blocking", "warning"]

    def test_reports_every_breach_not_just_the_first(self):
        violations = evaluate({"exposure_ratio_single_customer": 0.175, "dscr": 0.9, "ltv": 0.95})
        assert len(violations) == 3


def test_covered_metrics_names_what_policy_can_judge():
    metrics = covered_metrics()
    assert "exposure_ratio_single_customer" in metrics
    assert "dscr" in metrics
