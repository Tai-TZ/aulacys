# Product catalog schema — from admin UI mock

> Source of truth for field names: `apps/web/components/admin/loan-products/mock-data.ts`.
> Owner: **`apps/api`** (Supabase Postgres via SQLAlchemy + Alembic).  
> Runtime agent graph still reads `apps/api/src/agents/products/*.yaml` — catalog rows
> link via `loan_product.agent_product_id`. Do **not** put agents/tools/gate in SQL.

`catalog-svc` (`seed/catalog.json`) remains the thin picker seed until it is pointed
at these tables (follow-up).

## Tables

| Table | Maps from mock |
|-------|----------------|
| `product_group` | `LoanProductGroup` / `INITIAL_GROUPS` |
| `loan_product` | `LoanProduct` / `INITIAL_PRODUCTS` |

Nested blocks (`loanStructure`, `interestConfig`, `repaymentConfig`,
`collateralConfig`, `eligibility`, `documentGroups`, `segments`, `channels`) are
**JSONB** on `loan_product` — same shape as the TypeScript interfaces, enough for
the admin CRUD demo without exploding into 8 child tables.

## DDL (Alembic `0002_product_catalog`)

```sql
CREATE TABLE product_group (
    id            text PRIMARY KEY,          -- e.g. vay-nha
    name          text NOT NULL,
    description   text NOT NULL DEFAULT '',
    icon_name     text NOT NULL DEFAULT 'Briefcase',
    is_active     boolean NOT NULL DEFAULT true,
    display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE loan_product (
    id                uuid PRIMARY KEY,
    product_group_id  text NOT NULL REFERENCES product_group(id),
    customer_type     text NOT NULL DEFAULT 'INDIVIDUAL',
    product_code      text NOT NULL UNIQUE,   -- e.g. IND_HOME_01
    product_name      text NOT NULL,
    short_name        text,
    loan_method       text NOT NULL DEFAULT '',
    secured_type      text NOT NULL DEFAULT 'SECURED',  -- SECURED|UNSECURED
    min_amount        numeric(18,0),
    max_amount        numeric(18,0),
    min_term          integer,                -- months
    max_term          integer,
    status            text NOT NULL DEFAULT 'DRAFT',    -- ACTIVE|DRAFT|SUSPENDED
    interest_rate     numeric(8,4),
    purpose           text NOT NULL DEFAULT '',
    currency          text NOT NULL DEFAULT 'VND',
    agent_product_id  text,                   -- → agents/products/<id>.yaml
    segments          jsonb NOT NULL DEFAULT '[]',
    loan_structure    jsonb,
    interest_config   jsonb,
    repayment_config  jsonb,
    collateral_config jsonb,
    eligibility       jsonb,
    document_groups   jsonb,
    channels          jsonb,
    effective_start   date,
    effective_end     date,
    updated_at        timestamptz NOT NULL DEFAULT now(),
    created_at        timestamptz NOT NULL DEFAULT now()
);
```

## Apply

```bash
cd apps/api
# requires DIRECT_URL / DATABASE_URL in .env
make migrate
```

Demo-proof: empty `DATABASE_URL` ⇒ DB disabled; models/migrations still ship;
admin UI keeps using in-memory mock until a product API is wired.
