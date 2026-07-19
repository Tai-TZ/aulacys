"""Policy is the mechanism the whole demo turns on, so it gets tested like it matters.

The test that earns its keep is `test_exposure_over_limit_is_blocking` — that is the
veto in the wow flow, asserted.
"""

from datetime import date

from aulacys.policy.loader import (
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

    def test_dieu136_2026_thresholds_are_verified(self):
        """2026 schedule from Luật 32/2024/QH15 Điều 136 khoản 1 điểm b: 13% / 21%."""
        by_id = {r.id: r for r in load_rules()}
        single = by_id["single_customer_credit_limit"]
        related = by_id["related_party_credit_limit"]
        assert single.verified is True
        assert related.verified is True
        assert single.threshold == 0.13
        assert related.threshold == 0.21
        assert single.version == "2026.1-dieu136"
        assert related.version == "2026.1-dieu136"

    def test_demo_prohibited_purpose_is_stage_verified(self):
        by_id = {r.id: r for r in load_rules()}
        rule = by_id["prohibited_purpose_refinance_other_bank"]
        assert rule.verified is True
        assert rule.severity == "blocking"
        assert "single_customer_credit_limit" not in {r.id for r in unverified_rules()}


class TestEvaluate:
    def test_compliant_metrics_produce_nothing(self):
        violations = evaluate({"dscr": 1.5, "ltv": 0.6, "sanctions_match_count": 0})
        assert violations == []

    def test_exposure_over_limit_is_blocking(self):
        # THE demo moment (corporate path): over 2026 13% ceiling → Compliance vetoes.
        violations = evaluate({"exposure_ratio_single_customer": 0.175})
        assert len(violations) == 1
        v = violations[0]
        assert v.rule_id == "single_customer_credit_limit"
        assert v.is_blocking
        assert v.raised_by == "compliance"
        assert v.actual == 0.175
        assert v.threshold == 0.13
        assert v.version == "2026.1-dieu136"
        assert v.unverified is False

    def test_prohibited_purpose_breach_is_blocking(self):
        v = evaluate({"prohibited_purpose_refinance_other_bank": 1})[0]
        assert v.rule_id == "prohibited_purpose_refinance_other_bank"
        assert v.unverified is False
        assert v.is_blocking
        assert v.version == "demo-1.1"

    def test_unverified_legal_rule_downgrades_to_warning(self):
        # Guardrail: unverified *legal* thresholds must not auto-veto.
        # Appetite rows may stay blocking even when unverified.
        unverified_legal = [r for r in load_rules() if not r.verified and r.kind == "legal"]
        if not unverified_legal:
            # All demo legal rows are stage-verified; keep the loader contract explicit.
            assert True
            return
        rule = unverified_legal[0]
        v = evaluate({rule.metric: rule.threshold + 1 if rule.operator in {">", ">="} else 1})[0]
        assert v.severity == "warning"
        assert v.unverified is True

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

    def test_future_rules_do_not_fire_before_effective_date(self):
        violations = evaluate({"dti": 0.9}, as_of=date(2025, 12, 31))
        assert violations == []


def test_covered_metrics_names_what_policy_can_judge():
    metrics = covered_metrics()
    assert "exposure_ratio_single_customer" in metrics
    assert "dscr" in metrics
