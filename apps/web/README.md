# web — Next.js frontend

Next.js (App Router) + TypeScript + Tailwind. Talks to the FastAPI backend in `../api`.

## Quick start

```bash
npm install
cp .env.example .env.local     # Windows: Copy-Item .env.example .env.local
# .env.local -> NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                    # http://localhost:3000
```

The backend must be running (`../api`, port 8000) for chat to work.
Its `CORS_ORIGINS` must include this app's URL (`http://localhost:3000` in dev).

## Structure

```
app/
  layout.tsx     # root layout (+ no-flash theme script)
  page.tsx       # chat page (client component)
  globals.css    # Tailwind v4 entry + DESIGN TOKENS (one place to change the look)
components/ui/    # design-system primitives (Button, Card, Input) — import from here
lib/
  api.ts         # backend client — types MIRROR apps/api/src/models/schemas.py
  cn.ts          # class-merge helper (clsx + tailwind-merge)
```

## Design system

Follows the `ui-ux-system` skill (`.claude/skills/ui-ux-system/`, rules in `AGENTS.md` §8):

- **Tokens over raw values.** Colors/radii are semantic tokens in `app/globals.css` (`@theme`).
  Use `bg-primary`, `text-foreground`, `border-border` — never raw hex or `bg-blue-600`.
  Change the palette in that one file and the whole UI follows.
- **Primitives.** Import `Button`/`Card`/`Input` from `components/ui`; tweak via `className`
  (merged by `cn()`). Don't re-style raw HTML controls.
- **Dark mode by class.** `.dark` on `<html>` overrides the tokens (toggle in the header).

## Contract

Request/response types in `lib/api.ts` must match the backend Pydantic schemas
(`apps/api/src/models/schemas.py`). Keep them in sync — see `AGENTS.md` §1.
