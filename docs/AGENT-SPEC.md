# AGENT-SPEC - Five Agent Contract

> Binding role contract for the current multi-agent system. This file defines what each
> existing agent does, what it may read/call, and what it must output. It does **not**
> add new agents for every lifecycle stage.

## 0. Positioning

The system is a **loan lifecycle workflow powered by a five-agent decision core**.

The lifecycle is:

1. Intake - receive application data and documents.
2. Proposal - create or edit the proposed loan plan.
3. Agent review - five agents assess the proposal, documents, legal/compliance, and evidence.
4. Approval - route clean cases to STP and risky cases to HITL.
5. Disbursement - execute only when approval and final checks pass.

Important distinction:

```text
Lifecycle stage != one new agent.
```

The five agents remain:

`Planner`, `Credit`, `Operations`, `Compliance`, `Critic`.

They should be widened to support the full lifecycle, not multiplied into extra agents
unless a future requirement proves that a separate agent is necessary.

## 1. Non-Negotiable Invariants

| Rule | Meaning |
|---|---|
| LLM never produces numbers | DTI, LTV, payment, limit, rate, risk metrics come from deterministic tools. |
| LLM never produces veto | Blocking decisions come from policy-as-code and graph edges. |
| Planner coordinates, not underwrites | Planner creates DAG, routes work, receives veto, and replans. |
| Tool whitelist is enforced by harness | Permission lives in code (`dispatch` / facade map), not prompt text. |
| Flow lives in config | Product differences are YAML/config, not `if product == ...` branches. |
| Critic verifies, not mutates | Critic checks evidence and writes memo/remediation; it does not edit agent outputs. |

## 2. The Five Agents

| Agent | Model tier | Responsibility | Tool permissions | KB | Veto |
|---|---|---|---|---|---|
| Planner | strong | Break the request into a DAG, route work, receive veto, replan. | none | none | no |
| Credit | mini | Check whether the proposed loan plan is financially reasonable: CIC, income, DTI, payment, limit, rate, term, pricing risk. | `core_banking_read`, `loan_calculator` | Credit KB | no |
| Operations | mini | Check operational readiness: documents, missing items, valuation scheduling, collateral/registry checks, workflow ticket. | `core_banking_read`, `workflow_write` | Ops KB | no |
| Compliance | mini | Check KYC/UBO, AML, legal/policy limits, prohibited purpose, LTV/ceiling policy metrics. | `core_banking_read`, `aml_screening` | Compliance KB | yes |
| Critic | strong | Verify every number/finding has evidence, synthesize memo, list remediation actions. | none | read-all KB | no |

## 3. Agent Inputs And Outputs

### Planner

**Reads**

- application
- product config
- current run state
- veto/replan state

**Outputs**

```text
DAG
- nodes: ordered agent nodes
- edges: dependencies between agents
- rationale: prose explanation of the plan
```

Planner does **not** compute DTI, choose rate, approve, veto, or write tickets.

### Credit

Credit answers:

> "Is the proposed loan plan financially reasonable for this customer?"

It is not only checking the customer; it checks the **proposal**:

- requested amount
- proposed limit
- proposed annual rate
- term months
- monthly payment
- DTI
- CIC group/score
- risk premium from CIC/term/DTI
- repayment capacity

**Reads**

- application and declared customer data
- documents such as salary statement / bank statement
- product pricing config
- current proposal fields when present

**Calls**

- `cic_lookup`
- `income_verify` / `salary_verify`
- `compute_annual_debt_service`
- `compute_dti`
- `price_loan`

**Outputs**

```text
CreditAssessment
- dti
- income
- proposed_limit
- proposed_rate
- recommendation: support | manual_review | review
- rationale
- evidence[]
- tool_results{}
```

Credit does **not** approve the loan and does **not** veto for legal reasons.

### Operations

Operations answers:

> "Can this file move operationally, and what work item must be created?"

**Reads**

- application
- document list
- product required documents
- collateral data when present

**Calls**

- `doc_checklist`
- `schedule_valuation`
- `property_valuation`
- `land_registry`
- `write_approval_ticket`

**Outputs**

```text
OperationsReport
- valuation
- valuation_task
- doc_status
- missing[]
- legal_flags[]
- rationale
- evidence[]
- tool_results{}
```

Operations does **not** decide repayment capacity and does **not** issue legal veto. `rationale` may be LLM-polished; valuation and flags stay tool-backed.

### Compliance

Compliance answers:

> "Is there a hard compliance/legal reason this proposal must stop?"

**Reads**

- application
- Credit output
- Operations output
- policy rules
- KYC/UBO/AML inputs

**Calls**

- `kyc_check`
- `ubo_check`
- `aml_screen`
- `related_party`
- `compute_ltv` as a metric feeding policy
- `policy.evaluate`

**Outputs**

```text
ComplianceVerdict
- violations[]
- veto
- rule_ids[]
- kyc_status
- ubo_status
- rationale
- citations[]
- tool_results{}
```

Compliance is the only current agent with veto power. `rationale` may be LLM-polished; veto and rule_ids stay deterministic.

### Critic

Critic answers:

> "Can the bank trust this result, and what should the human read or fix?"

**Reads**

- application
- Credit output
- Operations output
- Compliance output
- trace/tool evidence
- all KB namespaces when knowledge service exists

**Calls**

- none

**Outputs**

```text
CriticVerdict
- passed
- rejections[]
- memo
- remediation_plan[]
```

Critic does **not** call external tools and does **not** mutate agent outputs.

## 4. Lifecycle Mapping Without Adding Agents

| Lifecycle stage | Current owner | Notes |
|---|---|---|
| Intake | `application-svc`, UI, Operations checks | Structured sample data exists. OCR is out of scope. |
| Proposal | Credit + deterministic proposal/pricing tools | Do this as `LoanProposal` object/stage, not a new RM agent yet. |
| Agent review | Planner, Credit, Operations, Compliance, Critic | This is the current multi-agent core. |
| Approval | policy/config gate + human approval endpoint | Do not let an LLM approve a loan. |
| Disbursement | future deterministic service/action | Do not make disbursement an LLM decision. |

Recommended next implementation is **objects/stages**, not more agents:

1. Add `LoanProposal` to represent RM/proposal input.
2. Let Credit validate that proposal and return accepted/revised terms.
3. Add `ApprovalGate` as deterministic policy/config routing.
4. Add `DisbursementAction` as deterministic booking with audit.

## 5. Permission Facades

Agent specs expose logical permission facades. The harness expands facades at dispatch
time, while trace records the physical tool calls for audit.

| Facade | Physical tools / services |
|---|---|
| `core_banking_read` | `cic_lookup`, `income_verify`, `salary_verify`, `sao_ke_parse`, `kyc_check`, `ubo_check`, `compute_ltv`, `doc_checklist`, `property_valuation`, `land_registry` |
| `loan_calculator` | `compute_annual_debt_service`, `compute_dti`, `price_loan` |
| `aml_screening` | `aml_screen`, `related_party` |
| `workflow_write` | `schedule_valuation`, `write_approval_ticket` |

Current implementation file:

`packages/shared/aulacys/agents/harness/permissions.py`

## 6. Model Tier Policy

| Tier | Intended agents | Default |
|---|---|---|
| strong | Planner, Critic | Gemini strong/prose model when configured |
| mini | Credit, Operations, Compliance | `gemini-3.1-flash-lite` default |
| deterministic | tools, policy, graph decisions, approval/disbursement gates | no LLM |

OpenAI remains a fallback provider. Model tier never changes the deterministic source
of numbers or veto.

## 7. Current vs Next

| Area | Current | Better next step |
|---|---|---|
| Proposal | Folded into Credit pricing fields | Add `LoanProposal` input/output object. |
| Credit | Computes/verifies DTI, pricing, limit/rate | Make it explicitly validate proposal reasonableness. |
| Approval | Outcome + HITL ticket | Add deterministic `ApprovalGate` config. |
| Disbursement | Not implemented as action | Add deterministic disbursement service/action after approval. |
| KB/RAG | Planned, not real | Add `knowledge-svc` for citations only; policy remains source of veto. |

## 8. Boundary Notes

- Do not add `RM Proposal Agent`, `Approval Agent`, or `Disbursement Agent` yet.
- Do add proposal/approval/disbursement **schemas and deterministic stages**.
- Real core-banking integration remains out of scope for the hackathon.
- OCR remains out of scope; structured sample data or `application-svc` payloads are accepted input.
- Keep the current veto/replan branch green before adding lifecycle stages.
