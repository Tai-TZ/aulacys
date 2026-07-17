# AI Logs — hackathon submission

Normalized JSONL event logs grouped by member and tool. The enabled Cursor
project hook appends prompt and stop events automatically.

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
  cursor/ai-log.jsonl
  codex/ai-log.jsonl
  claude/ai-log.jsonl
```

Each line is one JSON object:

```json
{"ts":"2026-07-10T15:02:20.965316+07:00","tool":"cursor","event":"stop","session_id":"04af623a-7113-4bde-86db-1a9129b826d7","model":"default","repo":"aulacys","branch":"develop","commit":"065f986","student":"name@example.com","prompt":"","files_context":[]}
```

## One-time setup (Windows / PowerShell)

After cloning, each teammate runs this once with their own slug:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-ai-logs.ps1 -Member nguyen-thanh-tai
```

The selected member is stored locally in `.git/ai-log-member`; it is never
committed. Restart the AI tools after setup so their project hooks reload.

Cursor logging is enabled via `.cursor/hooks.json` → `scripts/log_ai_event.py`
(repo, branch, commit, and student email come from Git).

Codex / Claude hooks are not enabled in this repo by default. Add them later
only if a teammate actually uses those tools.

## Online tools & screenshots

- **Online/web AI tools:** paste the shared chat-session link in your folder's
  `LINKS.md` (create it) instead of a session file.
- **Screenshots:** drop them under your folder (e.g. `screenshots/`).

> Prompts can contain sensitive values. Never paste secrets into an AI prompt,
> and review JSONL files before pushing.
