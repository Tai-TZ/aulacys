# Branching Policy

Model: **`develop` + `production` (two long-lived branches)**. Feature work branches off
`develop`, integrates there (staging), and is promoted to `main` (production) via a release
PR. `main` is always the live/deployed state; `develop` is always the next release.

> Trade-off we accepted: this adds a staging gate (`develop`) over plain trunk-based flow.
> More ceremony, but a protected pre-prod branch means `main`/production only ever sees
> reviewed, integration-tested code. (Decision logged in `TEAM_RULES.md` §6.)

## Long-lived branches

| Branch    | Role                | Deploys to        | Receives merges from            |
|-----------|---------------------|-------------------|---------------------------------|
| `main`    | **production**      | prod (Render/Vercel) | `develop` (release), `hotfix/*` |
| `develop` | **integration/staging** (default branch) | staging/preview | `feat/* fix/* chore/* …`        |

- Both are protected: **no direct pushes**, every change lands via PR + green CI.
- `develop` is the **default branch** on GitHub — new PRs target it automatically.

## Short-lived branches

- Branch off the **latest** `develop`.
- Name: `type/short-kebab-desc`. Types: `feat fix chore docs refactor test`.
  - e.g. `feat/contract-risk-flags`, `fix/chat-500-on-empty`, `chore/ci-cache`.
- **Short-lived: < 1 day.** One slice / task per branch.
- Stay in sync: `git pull --rebase origin develop` often.
- `hotfix/*` is the exception — it branches off **`main`** (see below).

## Everyday flow (feature / fix)

```bash
git switch develop && git pull          # start from fresh develop
git switch -c feat/my-slice             # new branch off develop
# ... commit small, Conventional Commits ...
git push -u origin feat/my-slice
# open PR into develop -> CI green + 1 review -> squash-merge -> delete branch
```

## Release: `develop` → `main` (ship to production)

```bash
# when develop is green and demo-ready:
# open a PR:  base = main,  compare = develop   (title: "release: <what>")
# CI green + owner approval -> "Create a merge commit" -> main auto-deploys to prod
```
Use a **merge commit** (not squash) for release PRs so `main` records each release; every
other PR (into `develop`) is **squash-merged** to keep `develop` linear.

## Hotfix: urgent production bug

```bash
git switch main && git pull
git switch -c hotfix/broken-thing        # branch off main, NOT develop
# fix + commit
# PR into main -> review -> merge -> prod deploys
# THEN back-merge so develop doesn't regress:
git switch develop && git pull
git merge origin/main && git push        # or open a PR main -> develop
```

## Pull Requests

- Small. Fill the PR template checklist (`.github/PULL_REQUEST_TEMPLATE.md`).
- Green CI + one reviewer (the area owner — `TEAM_RULES.md` §1).
- Feature/fix PRs → **squash-merge** into `develop`, then **delete** the branch.
- Release PRs (`develop` → `main`) → **merge commit**.

## Never

- Force-push a shared branch (`main`, `develop`, or a teammate's).
- Commit `.env` / secrets / `node_modules` / build output.
- Disable CI or merge red "to save time".
- Commit straight to `main` or `develop` (PR-only).
- Long-lived personal branches that drift from `develop`.

## GitHub setup (do once)

**Settings → General → Default branch:** set to **`develop`**.
**Settings → General → Pull Requests:** enable *Automatically delete head branches*.

**Settings → Branches → protection rule for `main`:**
- [ ] Require a pull request before merging (1 approval)
- [ ] Require status checks to pass — select CI jobs `api` and `web`
- [ ] Require branches to be up to date before merging
- [ ] (leave *Require linear history* OFF — release PRs use merge commits)

**Settings → Branches → protection rule for `develop`:**
- [ ] Require a pull request before merging (1 approval)
- [ ] Require status checks to pass — `api` and `web`
- [ ] Require linear history (feature PRs squash-merge)

Commit message rules: `AGENTS.md` §5.
