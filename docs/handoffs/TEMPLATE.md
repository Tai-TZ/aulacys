<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
Copy this file to docs/handoffs/YYYY-MM-DD-<slug>.md and fill it in.
-->
# Handoff — <title>

- **Date:** YYYY-MM-DD
- **Author:** <name / agent>
- **Branch / PR:** <feat/… → develop | #PR>
- **Status:** ✅ Done | 🔄 WIP | ⛔ Blocked

## What changed & why
<2–4 sentences. The goal, and the shape of the solution.>

## Files touched
- `path/to/file` — <what/why>

## How to run / verify
```bash
# exact commands the next person runs to see it work
```
<expected result — e.g. `/health` returns `db":"up"`; test count>

## Contract impact
<none | changed schemas.py + apps/web/lib/api.ts — say what>

## Follow-ups / TODO
- [ ] <known gap, next step, tech debt>

## Gotchas
<traps, non-obvious decisions, anything that will bite the next person>
