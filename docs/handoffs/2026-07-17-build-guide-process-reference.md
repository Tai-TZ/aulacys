# Handoff — build guide process reference wording

- **Date:** 2026-07-17
- **Author:** Codex
- **Branch / PR:** local working tree
- **Status:** ✅ Done

## What changed & why

Updated `docs/BUILD-GUIDE.md` §5.0 after reading the provided image of the 9-stage retail lending process. The table was already present, but the document called the workflow/SLA "thật"; the image labels SLA as "tham chiếu", so the wording now treats it as a general Vietnamese commercial-bank reference process, not SHB internal procedure.

## Files touched

- `docs/BUILD-GUIDE.md` — changed §5.0 heading, intro, table SLA header, and the three takeaways to say "quy trình/SLA tham chiếu" and avoid claiming this is SHB internal.
- `docs/handoffs/2026-07-17-build-guide-process-reference.md` — this handoff.

## How to run / verify

```bash
git status --short
# docs/BUILD-GUIDE.md and this handoff should appear as untracked/modified docs.

powershell -NoProfile -Command "$i=1; Get-Content -Encoding utf8 docs/BUILD-GUIDE.md | ForEach-Object { if ($i -ge 170 -and $i -le 194) { '{0,4}: {1}' -f $i, $_ }; $i++ }"
# §5.0 should say "Quy trình tham chiếu", "SLA tham chiếu", and "không gọi đây là quy trình nội bộ SHB".
```

No backend/frontend test was run because this is documentation-only.

## Contract impact

None. `apps/api/src/models/schemas.py` and `apps/web/lib/api.ts` were not changed.

## Follow-ups / TODO

- [ ] If the team later gets a verified SHB-specific process/SLA source, update §5.0 and cite that source explicitly.

## Gotchas

`docs/BUILD-GUIDE.md` is currently untracked in this working tree, so a plain `git diff` does not show this change. Use `git status --short` or stage the doc before reviewing the diff.
