"""Back-compat shim."""

from app.repositories.tickets import init_db, tickets_for, upsert_ticket

__all__ = ["init_db", "tickets_for", "upsert_ticket"]
