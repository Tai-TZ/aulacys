"""Product catalog ORM — table metadata (no live DB required)."""

from aulacys.db.models import LoanProduct, ProductGroup
from aulacys.db.models.product import LoanProduct as LoanProductDirect


def test_product_group_tablename():
    assert ProductGroup.__tablename__ == "product_group"


def test_loan_product_tablename():
    assert LoanProduct.__tablename__ == "loan_product"
    assert LoanProductDirect is LoanProduct


def test_loan_product_columns_match_admin_mock():
    cols = set(LoanProduct.__table__.columns.keys())
    for name in (
        "product_code",
        "product_name",
        "product_group_id",
        "secured_type",
        "min_amount",
        "max_amount",
        "min_term",
        "max_term",
        "status",
        "interest_rate",
        "segments",
        "loan_structure",
        "interest_config",
        "repayment_config",
        "collateral_config",
        "eligibility",
        "document_groups",
        "channels",
        "agent_product_id",
    ):
        assert name in cols


def test_fk_product_group():
    fk = list(LoanProduct.__table__.c.product_group_id.foreign_keys)[0]
    assert fk.column.table.name == "product_group"
