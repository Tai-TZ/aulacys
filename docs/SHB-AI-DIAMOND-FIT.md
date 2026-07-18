# SHB.AI Diamond — how this project fits

> Maps **SHB Digital Expert Agents** (multi-agent retail-lending assessment) onto SHB's
> official **SHB.AI Diamond** framework (5 slides). Use this as the pitch spine: judges know
> the framework — show the project speaks their language. Quoted phrases are SHB's own wording.

## TL;DR pitch line

> *"This is not a GenAI assistant (level 1). By SHB's own definition it is a **level-3 AI
> Agent** — it understands the goal, plans, and coordinates multiple systems to act on the
> user's behalf. Its edge is **AI Governance**: a Compliance agent can veto the Credit
> recommendation, a human approver signs the gate, and every decision lands in an immutable
> audit ledger."*

---

## Frame 1 — 7 steps to bring AI into the business

The pitch outline. Where the project stands on each step.

| # | Step (SHB) | Status | Evidence / gap |
|---|-----------|:--:|----------------|
| 1 | Shaping AI Strategy | ✅ | Core retail-credit use case, tied to business goal (faster, standardized underwriting) |
| 2 | Identify & Priority Use Case | ✅ | Individual loan assessment — high impact, measurable, clear value |
| 3 | Preparation Data | ⚠️ | `application-svc` schema derived from the **real SHBFinance form**; CIC/AML/property still seeded. Governance story: schema-per-service + immutable audit |
| 4 | Foundation Technology | ✅ | Microservices + LangGraph + Postgres/Supabase + Cloud Run |
| 5 | **Setup AI Governance** | ✅✅ | **Strongest point** — Compliance veto → replan, HITL approver, hash-chain audit ledger, agent least-privilege (`SECURITY.md`) |
| 6 | Implementation & Expand | ⚠️ | In-process fallback = demo-proof; not yet multi-branch |
| 7 | Measurement & Realizing Value | 🔴 | **Gap** — no ROI/metric surface yet. `NodeTrace.cost/latency` exists; surface it on the UI |

## Frame 2 — Buy ↔ Build spectrum (Consume / Embed / Extend / Build)

SHB's layers: Application · Data Retrieval & Prompt Engineering · Fine-Tuning · Foundation Model.
Yellow = vendor owns, blue = SHB owns.

- **Project sits at "Extend — GenAI Models retrieve SHB data" = RAG.** SHB owns Application +
  Data Retrieval; foundation model is bought (Claude / OpenAI). No training from scratch.
- Pitch: *"We don't train from zero (costly) — we Extend/RAG on SHB's regulatory data, exactly
  SHB's recommended posture."*
- 🔴 Gap: RAG not wired for real yet (LLM stubbed). Minimum: wire one regulatory KB for Compliance.

## Frame 3 — 5 stages of AI maturity

Awareness → Active → **Operational** → Systemic → Transformational.

- Project targets **Operational**: *"AI solution into production, measurable results."*
- Pitch the arc: hackathon = PoC (Active) → governance + audit make it **Operational-ready**.
- Do **not** claim Systemic/Transformational (not org-wide yet). Honesty scores.

## Frame 4 — 3 levels of AI deployment (GenAI / AI Built-in / **AI Agent**) ⭐

SHB's level-3 wording: *"AI Agent can understand goals, plan, and coordinate multiple systems
to complete complex tasks, acting on the human's behalf."*

- **Project = level 3, the top.** The definition describes this system verbatim:
  - Planner → **plans**
  - Multi-agent (Credit / Operations / Compliance / Critic) → **coordinates**
  - Tool-calling (CIC / AML / property / income / policy) → **multiple systems**
- "Unified AI Platform: AI Workflows + Real-Time Inference" → LangGraph workflow + `/assess` real-time.
- Pitch: *"Not a level-1 chatbot — a level-3 AI Agent by SHB's own definition."*

## Frame 5 — Defend / Extend / Upend (3 value models)

- Project = **Extend**: "do the old work differently", target = **process/department**,
  purpose = **beat competitors**, benefit = **real financial/revenue**.
- Pitch: *"We automate the underwriting process (Extend), not just a personal assistant (Defend)."*

---

## Takeaways → backlog

| Priority | Item | Why |
|:--:|------|-----|
| ⭐ pitch | Slide: "project = level-3 AI Agent + AI Governance", SHB's own words | framework alignment points |
| P2 | **Measurement** (Frame 1 step 7) — surface `NodeTrace.cost/latency` on UI | the one hard gap, easy win |
| P2 | Real RAG for Compliance (Frame 2 "Extend") | currently stubbed |
| — | Tell the data-governance story (schema-per-service + audit ledger) | already built, just narrate |

**Governance (Frame 1 step 5 + Frame 4) is the biggest differentiator** — veto / HITL / immutable
audit is rare among teams. Lead the demo with it.
