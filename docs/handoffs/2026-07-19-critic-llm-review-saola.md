# Handoff — Critic independent LLM review + SaoLa model

- **Date:** 2026-07-19
- **Author:** Claude Code (agent)
- **Branch / PR:** feat/agents-llm-real → develop
- **Status:** 🔄 WIP (Critic slice done; Planner-DAG and Credit tool-loop still to come)

## What changed & why
First slice of "make the 5 agents genuinely LLM-driven" (task 3). Critic now writes an
**independent adversarial `review`** field (LLM reads the deterministic memo — which already
carries all tool/policy numbers — and critiques whether the agents' conclusions hang together),
instead of only polishing remediation prose. `passed`/`rejections`/`memo` stay deterministic, so
the LLM can only raise concerns, never approve or invent numbers/veto. Also fixed two things that
made the LLM output useless: the harness was feeding the deterministic prose back to the model
(weak models echoed it), and **Llama-3.3-70B-Instruct produces garbled Vietnamese** — switched
the FPT model to **SaoLa3.1-medium** (FPT's own Vietnamese model), which returns clean, correct
Vietnamese with the right figures.

## Files touched
- `packages/shared/aulacys/agents/state.py` — `CriticVerdict.review: str = ""` (new field).
- `packages/shared/aulacys/agents/nodes/critic.py` — deterministic `_deterministic_review()` base + adversarial prompt; `prose_fields = ["review", "remediation_plan"]`.
- `packages/shared/aulacys/agents/harness/runner.py` — pop `spec.prose_fields` out of the base sent to the LLM so it generates fresh prose instead of echoing the deterministic text.
- `packages/shared/tests/test_agents/test_critic.py` — assert prose_fields + memo/passed stay locked; assert `review` is non-empty deterministically.
- `apps/web/lib/api.ts` — mirror the contract: `critic.review?: string`.
- `render.yaml` — `MODEL_NAME`/`STRONG_MODEL`/`MINI_MODEL` → `SaoLa3.1-medium`.
- (config, not committed) `services/orchestrator-svc/.env` — same three model ids → SaoLa3.1-medium.

## How to run / verify
```bash
cd packages/shared && ruff check aulacys/ tests/ && pytest tests/          # 135 passed
# live (needs services/orchestrator-svc/.env with FPT key + SaoLa model):
cd services/orchestrator-svc && PYTHONIOENCODING=utf-8 python -c "import sys,asyncio; sys.path.insert(0,'../../packages/shared'); from aulacys.agents.graph import process_application; s=asyncio.run(process_application({'query':'mortgage'})); print(s['critic'].review)"
```
Expected: 135 tests pass; a mortgage run returns clean Vietnamese in `credit.rationale`,
`compliance.rationale`, and `critic.review` with correct figures (DTI, limit, rate) and all
trace rows `fallback=False`.

## Contract impact
`CriticVerdict` gained `review: str = ""` (additive, backward-compatible). Mirrored in
`apps/web/lib/api.ts` (`critic.review?: string`). No other schema changed.

## Follow-ups / TODO
- [ ] **Planner** — let the LLM build the DAG (nodes/edges/replan strategy); validate output ⊆ configured agents and Compliance-present, else deterministic fallback.
- [ ] **Credit/Operations** — LLM tool-calling loop (LLM chooses cic/income/calc), with a post-validator that every number traces to a tool.
- [ ] Consider a cheaper `MINI_MODEL` if SaoLa3.1-medium latency/cost is high — but it MUST keep clean Vietnamese + structured output.

## Gotchas
- **Llama-3.3-70B-Instruct on FPT = garbled Vietnamese** (e.g. "vày ứng dượng tái chính"). Do not use it for Vietnamese prose. **SaoLa3.1-medium** is the working choice (clean VN + function-calling structured output).
- Many marketplace model ids (`Qwen2.5-7B-instruct`, `Qwen2.5-Coder-32B-Instruct`, `Llama-4-Scout-17B-16E`) return **404 — not served** on this FPT endpoint even though they're listed in the repo. Verify a model with a live call before wiring it.
- SaoLa can drift on non-numeric details (observed: rewrote a customer name "Thị"→"Thế"). The invariant still holds — numbers/veto/rule_ids are deterministic — but do not trust LLM prose for identifiers.
- `review` is intentionally NOT a gate: `passed` stays deterministic so a hallucinated concern can't block a clean STP case, and the LLM can never approve what the evidence audit rejected.
- On a clean happy case the review reads more like a summary (little to attack); the adversarial value shows on veto/tension cases (verified: on the mortgage-veto run the review correctly identifies the declared-purpose vs evidence contradiction that drives the veto).
- **SaoLa surface quality degrades on longer/complex Vietnamese** (observed spelling drift + word repetition like "mặc định" on the veto review) even at temperature 0. The *content* stays correct; the prose surface does not. This is an FPT model ceiling — deterministic prose remains the demo-safe floor. If display quality matters, prefer shorter constrained review prompts or a better VN model when one becomes available.
