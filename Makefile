# Repo-level helpers (Windows: prefer scripts\*.ps1)

.PHONY: db-up db-down test-db

db-up:
	docker compose -f docker-compose.db.yml up -d --wait

db-down:
	docker compose -f docker-compose.db.yml down

# Starts Postgres if needed, then pytest audit/los/application with REQUIRE_DB=1
test-db:
	@bash scripts/test-db.sh
