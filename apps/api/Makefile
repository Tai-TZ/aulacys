.PHONY: run test lint format typecheck check clean migrate revision downgrade

run:
	uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# --- DB migrations (Alembic, uses DIRECT_URL / session pooler :5432) ---
migrate:            ## apply all migrations
	alembic upgrade head

revision:           ## autogenerate a migration: make revision m="add users table"
	alembic revision --autogenerate -m "$(m)"

downgrade:          ## roll back one migration
	alembic downgrade -1

test:
	pytest tests/ -v

lint:
	ruff check src/ tests/

format:
	ruff format src/ tests/

typecheck:
	mypy src/

check: lint format test

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name .pytest_cache -exec rm -rf {} +
	find . -type d -name .ruff_cache -exec rm -rf {} +
