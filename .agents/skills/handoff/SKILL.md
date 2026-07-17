---
name: handoff
description: Write the handoff note required after finishing any feature, fix, or notable change in this repo (AGENTS.md §2). Produces docs/handoffs/YYYY-MM-DD-<slug>.md from the team template so the next person/agent can pick up the area cold. Use when a task is done / about to commit / open a PR, or when the user says "handoff", "/handoff", "write a handoff", or "wrap up".
---

# Handoff workflow

A handoff is the note the **next person or agent** reads before touching your area.
It is **required** after every finished feature / fix / notable change (`AGENTS.md` §2, §7).
No handoff = task not done. Keep it short and honest — a page, not an essay.

## Step 1 — Gather (don't guess)

1. `git diff --stat` (and `git log --oneline` for your branch) — the real list of files + commits.
2. Recall the goal and the shape of the solution (why, not just what).
3. Note how you verified it (exact commands + result) and anything still open.
4. Check contract impact: did `apps/api/src/models/schemas.py` change? If so, `apps/web/lib/api.ts` must have too — say so.

## Step 2 — Write the file

1. Copy `docs/handoffs/TEMPLATE.md` → `docs/handoffs/YYYY-MM-DD-<slug>.md`
   (today's date; `<slug>` = short kebab of the feature, e.g. `2026-07-15-supabase-db`).
2. Fill every section. Leave none as placeholder:
   - **What changed & why** — 2–4 sentences.
   - **Files touched** — path → what/why (from `git diff --stat`).
   - **How to run / verify** — exact commands + expected result (e.g. `make check` count, `/health` output).
   - **Contract impact** — `none` or what changed in `schemas.py` + `apps/web/lib/api.ts`.
   - **Follow-ups / TODO** — known gaps, next steps, tech debt.
   - **Gotchas** — traps + non-obvious decisions that will bite the next person.
3. Set **Status**: ✅ Done | 🔄 WIP | ⛔ Blocked (with the blocker).

## Step 3 — Land it

1. Commit the handoff **with** the change it documents (same PR), Conventional Commit.
2. In the PR description, link the handoff file.

## Rules

- One handoff per finished slice, not per commit.
- Written for someone with **zero context** on your change — assume they weren't watching.
- Honest > flattering: record what's broken/unfinished, not just wins.
- Day-by-day time log still goes in `WORKLOG.md`; locked decisions in `docs/TEAM_RULES.md`. The handoff is the *technical pickup note*, not a status report.
