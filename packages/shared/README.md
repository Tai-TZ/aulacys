# packages/shared — cross-app contract

The API request/response **contract** is defined once, on the backend:
`apps/api/src/models/schemas.py` (Pydantic).

The frontend must speak the exact same shapes. Today they are mirrored by hand in
`apps/web/lib/api.ts`. **When a schema changes, update both** (see `AGENTS.md` §1 "One contract").

## Optional: auto-generate types (removes drift)

Instead of hand-mirroring, generate TypeScript from the API's OpenAPI schema:

```bash
# with the API running on :8000
npx openapi-typescript http://localhost:8000/openapi.json -o apps/web/lib/api-types.ts
```

Wire it as an npm script in `apps/web/package.json` so any agent can regenerate.
Until that's set up, keep `apps/web/lib/api.ts` in sync manually.
