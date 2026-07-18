from fastapi import APIRouter
from app.schemas.income import StatementParseRequest, VerifyRequest
from app.services import income as income_service

router = APIRouter()

@router.get("/health")
def health() -> dict:
    return {"status": "ok"}

@router.post("/verify")
def verify(req: VerifyRequest) -> dict:
    return income_service.verify(req.declared_monthly_income, req.statement_monthly_income)

@router.post("/statement-parse")
def statement_parse(req: StatementParseRequest) -> dict:
    return income_service.statement_parse(req.monthly_income, req.purpose_from_transactions)
