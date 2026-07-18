"""application_document model — metadata only (no live DB)."""

from app.db.models import ApplicationDocument, LoanApplication


def test_application_document_tablename():
    assert ApplicationDocument.__tablename__ == "application_document"


def test_application_document_fk():
    fk = list(ApplicationDocument.__table__.c.application_id.foreign_keys)[0]
    assert fk.column.table.name == "loan_application"


def test_loan_application_has_documents_relationship():
    assert "documents" in LoanApplication.__mapper__.relationships
