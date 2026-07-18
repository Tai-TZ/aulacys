from pydantic import BaseModel

class VerifyRequest(BaseModel):
    declared_monthly_income: float
    statement_monthly_income: float | None = None

class StatementParseRequest(BaseModel):
    monthly_income: float
    purpose_from_transactions: str | None = None
