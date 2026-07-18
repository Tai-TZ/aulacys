# Handoff — AI event logging

- **Date:** 2026-07-17
- **Author:** Cursor agent
- **Branch / PR:** `chore/ai-event-logging` → `develop`
- **Status:** ✅ Done

## What changed & why
Added opt-in project hooks and raw-session export for Cursor, Claude Code, Codex,
and Antigravity. Each teammate runs one setup command with their member slug and
selected tools; non-selected hooks skip logging. Screenshots have a dedicated
folder under each selected tool.

## Files touched
- `scripts/log_ai_event.py` — normalizes hook payloads and appends JSONL.
- `scripts/export-ai-sessions.py` — exports repository-matched raw transcripts.
- `scripts/setup-ai-logs.ps1` — stores member/tool selection and runs the export.
- `.cursor/hooks.json` — captures prompt and stop events for Cursor.
- `.claude/settings.json` — captures Claude Code prompt and stop events.
- `.codex/hooks.json` — captures Codex prompt and stop events.
- `.gemini/settings.json` — best-effort Antigravity/Gemini hook; exporter scans raw transcripts.
- `ai-logs/` — team folder structure, instructions, and generated logs.
  Nguyễn Thành Tài enables Cursor only.

## How to run / verify
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-ai-logs.ps1 `
  -Member nguyen-thanh-tai -Tools cursor
'{"hook_event_name":"stop","session_id":"test","model":"default"}' |
  py -3 scripts/log_ai_event.py --tool=cursor
```
Expected: setup reports the selected tools and exported session count. The hook
test returns `{"status": "logged", "tool": "cursor"}` and one valid JSON object
appended to `ai-logs/nguyen-thanh-tai/cursor/ai-log.jsonl`; raw sessions appear
as flat files under `cursor/sessions/<session-id>.jsonl`.

## Contract impact
None. Backend and frontend API contracts are unchanged.

## Follow-ups / TODO
- [ ] Each teammate runs setup with their member slug and actual desktop tools.
- [ ] Add screenshots and review transcripts for sensitive values before submission.

## Gotchas
Restart each AI tool after cloning or changing hook files. Prompts are intentionally
logged for submission, so secrets must never be pasted into prompts.
