# AI Logs — hackathon submission

Normalized event indexes and raw desktop transcripts, grouped by member and
tool. Each teammate enables only the tools they actually use.

## Folder ↔ member

| Folder | Member | Tools |
|--------|--------|-------|
| `nguyen-thanh-tai`   | Nguyễn Thành Tài | Cursor only |
| `nguyen-thanh-toan`  | Nguyễn Thanh Toàn | as needed |
| `hoang-kim-tuan-anh` | Hoàng Kim Tuấn Anh | as needed |
| `nguyen-minh-anh`    | Nguyễn Minh Anh | as needed |
| `vu-huyen-dieu`      | Vũ Huyền Diệu | as needed |

Folder names use ASCII slugs (no diacritics) to stay safe across Git/Windows.

Each member folder has one subfolder per tool:

```
ai-logs/<member>/
  <tool>/
    ai-log.jsonl                   # normalized event index (when available)
    sessions/<session-id>.jsonl    # raw desktop transcripts
    screenshots/                   # screenshots requested by organizers
```

Each line is one JSON object:

```json
{"ts":"2026-07-10T15:02:20.965316+07:00","tool":"cursor","event":"stop","session_id":"04af623a-7113-4bde-86db-1a9129b826d7","model":"default","repo":"aulacys","branch":"develop","commit":"065f986","student":"name@example.com","prompt":"","files_context":[]}
```

## One-time setup (Windows / PowerShell)

After cloning, each teammate runs one command with their own slug and tools:

```powershell
# Cursor only
powershell -ExecutionPolicy Bypass -File scripts/setup-ai-logs.ps1 `
  -Member nguyen-thanh-tai -Tools cursor

# Multiple tools (comma-separated, no spaces)
powershell -ExecutionPolicy Bypass -File scripts/setup-ai-logs.ps1 `
  -Member nguyen-thanh-toan -Tools cursor,claude,codex,antigravity
```

Valid tools: `cursor`, `claude`, `codex`, `antigravity`.

The selection is stored locally in `.git/ai-log-member` and `.git/ai-log-tools`;
neither file is committed. Hooks for non-selected tools exit without writing.
Setup creates the member folders and exports existing raw sessions for this repo.
Restart the selected desktop tools afterward so project hooks reload.

| Tool | Hook / source |
|------|---------------|
| Cursor | `.cursor/hooks.json`; `~/.cursor/projects/<project>/agent-transcripts/` |
| Claude Code | `.claude/settings.json`; `~/.claude/projects/<project>/` |
| Codex | `.codex/hooks.json`; `~/.codex/sessions/` |
| Antigravity | `.gemini/settings.json` plus transcript scan under `~/.gemini/antigravity-ide/brain/` |

Before submitting, rerun the same setup command to refresh every raw session.
Alternatively run the exporter directly:

```powershell
py -3 scripts/export-ai-sessions.py
```

The direct exporter reads the member and selected tools from `.git/`.

## Online tools & screenshots

- **Online/web AI tools:** paste the shared chat-session link in your folder's
  `LINKS.md` (create it) instead of a session file.
- **Screenshots:** add them under `ai-logs/<member>/<tool>/screenshots/`.

> Prompts can contain sensitive values. Never paste secrets into an AI prompt,
> and review normalized logs, raw transcripts, and screenshots before pushing.
