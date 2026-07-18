# Control And Knowledge Plane

Full microservice means three planes, not only many HTTP services:

1. **Execution plane** — orchestrator + specialist agents + tool services.
2. **Control plane** — users, roles, service identities, permissions, approval scopes.
3. **Knowledge plane** — policy text, product manuals, regulatory corpus, vector search, graph RAG.

The execution plane must not own control or knowledge persistence directly. It calls
the owning service over HTTP and records the result in audit.

## Control plane

### `identity-svc` / `authz-svc`

Owns user and permission state. For demo, this can start as one service; in
production it can split into identity provider integration and authorization.

Suggested database:

| Table | Purpose |
|---|---|
| `user_account` | internal user profile mapped to IdP subject (`sub`) |
| `role` | business roles: RM, credit officer, operations, compliance, approver, admin |
| `permission` | atomic actions: `application.read`, `credit.run`, `compliance.veto`, `ticket.write` |
| `user_role` | user to role mapping, scoped by branch/team if needed |
| `role_permission` | role to permission mapping |
| `service_account` | service identity mapping for Cloud Run callers |
| `approval_delegation` | temporary approval authority / acting role |
| `access_decision_log` | why access was allowed/denied |

Runtime rule:

- External users authenticate through the frontend/IdP.
- Service-to-service calls use Cloud Run IAM/service identity.
- Business authorization stays in `identity-svc`/`authz-svc`, not in prompts.
- Agent tool whitelist still exists; RBAC decides who can trigger the workflow,
  while the harness decides what each agent can call.

Minimum demo roles:

| Role | Can do |
|---|---|
| `rm` | create/read assigned application |
| `credit_officer` | run Credit, read income/CIC findings |
| `operations_officer` | run Operations, write LOS ticket |
| `compliance_officer` | run Compliance, veto |
| `approver` | approve/reject HITL gate |
| `auditor` | read audit trail only |
| `admin` | manage users/roles |

## Knowledge plane

### `knowledge-svc`

Owns retrieval and citations. Agents ask it for relevant passages; agents do not
read vector/graph tables directly.

Suggested data stores:

| Store | GCP option | Owns |
|---|---|---|
| Vector store | AlloyDB AI vector search, or Postgres + pgvector for a cheaper demo | embeddings for policy/manual chunks |
| Graph store | Spanner Graph when relationship traversal matters | regulation/product/process entity graph |
| Object store | Cloud Storage | source PDFs, manuals, scanned references |
| Metadata store | Cloud SQL / AlloyDB tables | document version, chunk provenance, effective date |

Suggested tables / entities:

| Object | Purpose |
|---|---|
| `knowledge_document` | source document metadata, version, jurisdiction, effective dates |
| `knowledge_chunk` | chunk text + citation range + hash |
| `embedding` | vector representation linked to chunk |
| `kg_node` | entity: regulation, clause, product, condition, process step |
| `kg_edge` | relationship: amends, cites, blocks, requires, supersedes |
| `retrieval_trace` | query, returned chunks, scores, request id |

Hard boundary:

- Vector/graph RAG may retrieve text and citations.
- Numeric thresholds and veto rules still live in `policy-svc` / policy-as-code.
- Compliance decisions must cite both: policy rule id for the decision, knowledge
  citation for explanation.

## Deployment note

Do not put vector and graph DBs in the same critical path until the veto demo is
stable. Phase order:

1. `identity-svc`/RBAC for user governance.
2. `knowledge-svc` with vector retrieval for citations.
3. Graph RAG for relationship traversal and regulatory lineage.

