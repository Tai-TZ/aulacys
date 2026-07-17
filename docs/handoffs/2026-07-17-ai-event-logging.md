# Handoff — AI event logging

- **Date:** 2026-07-17
- **Author:** Cursor agent
- **Branch / PR:** `chore/ai-event-logging` → `develop`
- **Status:** ✅ Done

## What changed & why
Added a Cursor project hook that normalizes events into JSONL instead of copying
raw session folders. The logger can normalize Cursor, Codex, and Claude payloads,
but only Cursor is enabled by default. Each teammate configures a local member
slug once; events then append under that member and tool.

## Files touched
- `scripts/log_ai_event.py` — normalizes hook payloads and appends JSONL.
- `scripts/setup-ai-logs.ps1` — stores the local member slug in `.git/`.
- `.cursor/hooks.json` — captures prompt and stop events for Cursor.
- `ai-logs/` — team folder structure, instructions, and generated logs.
  Nguyễn Thành Tài keeps Cursor only (no Claude/Codex folders).

## How to run / verify
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-ai-logs.ps1 -Member nguyen-thanh-tai
'{"hook_event_name":"stop","session_id":"test","model":"default"}' |
  py -3 scripts/log_ai_event.py --tool=cursor
```
Expected: `{"status": "logged", "tool": "cursor"}` and one valid JSON object
appended to `ai-logs/nguyen-thanh-tai/cursor/ai-log.jsonl`.

## Contract impact
None. Backend and frontend API contracts are unchanged.

## Follow-ups / TODO
- [ ] Each teammate runs setup once with their own member slug.
- [ ] Smoke-test Codex and Claude hooks on machines where those tools are installed.

## Gotchas
Restart each AI tool after cloning or changing hook files. Prompts are intentionally
logged for submission, so secrets must never be pasted into prompts.
