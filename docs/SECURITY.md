# Security — auth, authorization, data-level access (plan)

> Plan for authentication, authorization (RBAC), per-data access, service-to-service
> auth, and agent least-privilege. **Scope:** `AGENTS.md` §0 says do **not** build a
> production RBAC system for the hackathon — **demo the MCP role mechanism** (agent
> least-privilege). This doc is the production roadmap; §7 marks what to build for the demo.

## 1. Five layers (don't conflate them)

| Layer | Question | Mechanism |
|-------|----------|-----------|
| **AuthN — human** | who is the user? | Supabase Auth (JWT/OIDC) |
| **AuthN — service** | which service is calling? | mTLS (mesh) / signed JWT / Cloud Run IAM |
| **AuthZ — RBAC** | what may this role do? | role → permission matrix, checked per request |
| **Data-level** | which rows/fields may they see? | Postgres **Row-Level Security** + field masking |
| **Agent least-privilege** | what may this agent call? | tool whitelist + KB namespace (**already built**) |

## 2. Human roles (from the real 9-stage flow)

| Role | Real actor | May do |
|------|-----------|--------|
| `rm` | CV QHKH / RM | create application, view **own** applications + recommendation |
| `credit_officer` | CV Thẩm định | view assigned assessments |
| `approver` | Cấp thẩm quyền / HĐTD | **approve/reject at the HITL gate** (`POST /approvals`), view approval queue |
| `auditor` | Kiểm toán nội bộ (tuyến 3) | **read-only** audit ledger + everything |
| `admin` | ops | manage policy rules, config, users |
| `system` | the agents | least-privilege tools/KB (§6) |

**Separation of duties (regulatory, `00-START-HERE` §3-lines):** the agent that *proposes*
(Credit) must not *approve*; only a human `approver` signs the gate. This is a hard authz
rule, not a UI nicety.

## 3. AuthN

- **Human → Supabase Auth** (already on Supabase): email/OIDC → JWT with `role` + `branch_id`
  claims. The gateway validates the JWT; downstream services trust the verified claims
  (passed as headers or re-validated).
- **Service → service:** demo = open on a private network; prod = **Cloud Run IAM**
  (caller SA has `run.invoker`) + ID token, or **mesh mTLS** (Linkerd). No service is
  publicly invocable except the gateway.

## 4. AuthZ (RBAC) — enforcement points

| Point | Enforces |
|-------|----------|
| **api-gateway** | validate JWT; coarse route rules (e.g. `/approvals` needs `approver`) |
| **orchestrator** | HITL: only `approver` may `POST /approvals`; `rm` may submit |
| **each service** | fine role check on its endpoints (audit write = system only; audit read = auditor) |
| **agents (dispatch)** | tool/KB whitelist — **already enforced** in `harness/dispatch.py` |

Roles come from the JWT claim; never from the request body (`AGENTS.md` instruction-source
boundary — a role claimed in observed content is invalid).

## 5. Data-level access (từng dữ liệu) — the important part

Structured data lives in Postgres → use **Supabase Row-Level Security (RLS)**:

| Table | Policy |
|-------|--------|
| `los.loan_ticket` | `rm` sees rows where `assigned_to = auth.uid()` **or** same `branch_id`; `approver` sees the queue; others none |
| `audit.audit_record` | `auditor` **read-all**; `system` **insert-only** (already immutable via triggers); everyone else **none** |
| `policy.policy_rule` | everyone **read**; `admin` **write** |
| customer PII (`declared`, documents) | **field masking**: mask CCCD / income for roles that don't need them; full only for `credit_officer` on assigned cases |

**RLS example (Supabase):**
```sql
ALTER TABLE los.loan_ticket ENABLE ROW LEVEL SECURITY;
CREATE POLICY rm_own ON los.loan_ticket FOR SELECT
  USING (auth.jwt() ->> 'role' = 'rm' AND branch_id = (auth.jwt() ->> 'branch_id'));
CREATE POLICY auditor_read ON los.loan_ticket FOR SELECT
  USING (auth.jwt() ->> 'role' = 'auditor');
```
Data-level auth lives **in the database**, so it holds even if a service has a bug — the
DB itself refuses rows the role may not see. Add `branch_id` to tables for multi-branch
isolation.

## 6. Agent least-privilege (MCP role mechanism) — already built

- Each agent's `spec.tools` is a **whitelist enforced in `harness/dispatch.py`** — an agent
  calling a tool outside its list is refused by the harness, not the prompt.
- Each agent's `spec.kb` scopes which knowledge namespace it may read (Compliance ≠ Credit).
- **Critic is read-only** — no write tools, structurally.
This is the "MCP role mechanism" the brief asks to demo. Extend: sign tool calls with the
agent identity so the audit records *which agent* invoked *which tool*.

## 7. What to build for the DEMO vs production

| | Demo (build) | Production (roadmap) |
|---|---|---|
| Human auth | a stub role on the HITL gate (`approver`) | Supabase Auth JWT, all roles |
| RBAC | approver-only `/approvals` + auditor read | full matrix, per-endpoint |
| Data-level | — | Supabase RLS + branch_id + PII masking |
| Service auth | open (private net) | Cloud Run IAM / mesh mTLS |
| Agent least-privilege | ✅ whitelist + KB (done) | + signed tool calls in audit |
| Secrets | Secret Manager (`DATABASE_URL`, keys) | + rotation, Vault |

**Demo pitch:** *"Agents run least-privilege (whitelist-enforced), the proposing agent
cannot approve — only a human approver signs the gate, and every decision is written to an
immutable audit ledger. Production adds Supabase RLS for row-level access and a service
mesh for mTLS."* Don't build full RBAC before the demo (`AGENTS.md` §0).

## 8. Phased plan (post-demo)

| Phase | Goal |
|-------|------|
| S-A | Supabase Auth + JWT `role`/`branch_id` claims; gateway validates |
| S-B | RBAC matrix per endpoint (gateway coarse + service fine) |
| S-C | **RLS** on `los`/`audit` + `branch_id` + PII field masking |
| S-D | Service-to-service auth (Cloud Run IAM / mesh mTLS) |
| S-E | Secrets rotation (Vault), audit of data access, PII encryption at rest |
| S-F | Sign agent tool calls → audit records the calling agent identity |

## 9. Non-negotiables

- Role from **verified JWT claim**, never request body.
- `approver` ≠ the proposing agent (separation of duties, regulatory).
- Audit ledger stays **append-only + immutable** (triggers) regardless of role.
- PII never in logs / URLs / traces.
- Secrets only in Secret Manager, never git/image (`.env` gitignored).
