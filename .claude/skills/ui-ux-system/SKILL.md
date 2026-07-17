---
name: ui-ux-system
description: Build or document a consistent UI/UX design system for a React + Tailwind frontend — design tokens, component primitives (cva), dark mode by class, i18n, and consistency conventions. Use when starting a new frontend, auditing an existing one for inconsistency, writing UI/UX docs, or deciding how a button/card/color/spacing should work. Framework-agnostic method with generic doc templates.
---

# UI/UX System

A reusable method for making a frontend feel designed instead of hand-assembled.
Two modes: **document** an existing app, or **build** a new design system.

## Core principles (the whole skill in 6 lines)

1. **Tokens, never raw values.** Every color/font/shadow is a named semantic
   token. JSX uses `bg-primary`, not `bg-[#4F7DF7]`.
2. **Primitives own the chrome.** One `Button`, one `Card`, one `Input`. Screens
   import them; nobody re-styles a raw `<button>`.
3. **Compose screens, don't hand-build them.** `PageHeader` → `Section`/`Card`.
   Same rhythm every screen.
4. **Dark mode by class + token override**, not per-element `dark:` soup.
5. **Every display string goes through i18n.** No hard-coded UI text.
6. **Accessibility floor is non-negotiable:** ≥12px text, visible focus ring,
   `aria-label` on icon buttons, `*/on-*` color pairs for contrast.

## When documenting an existing app

Read the code in this order, then write the docs:

1. **Token layer** — the Tailwind theme / global CSS (`index.css`, `theme.css`,
   or `tailwind.config`). Extract: color tokens, fonts, shadows, spacing, dark
   mode mechanism.
2. **Primitives** — the `components/ui/` (or equivalent) folder. List each
   primitive, its variants, its props.
3. **Shell + contexts** — the `Layout`, theme context, i18n context, toast/dialog.
4. Produce four docs (see structure below). Keep them tight — a doc longer than
   the code it describes is debt.

Output structure (drop into the target repo's `docs/ui-ux/`):

| File | Content |
|------|---------|
| `README.md` | Entry point: the 6 principles, index, stack |
| `design-tokens.md` | Colors, fonts, shadows, spacing, dark mode |
| `components.md` | Primitive catalog + usage |
| `patterns.md` | Layout, feedback, form, i18n, a11y, merge checklist |

See [`reference/`](reference/) for the generic template of each doc.

## When building a new system — the ladder

Climb in order; stop at the first rung that holds.

1. **Does a primitive already exist?** (in the repo, or a component lib you use)
   Reuse it before writing one.
2. **Define the token layer first.** Semantic tokens (`primary`, `background`,
   `text-secondary`, `border`) that map onto a small brand palette. Dark mode =
   override those tokens under a `.dark` class. → [reference/design-tokens.md](reference/design-tokens.md)
3. **Build primitives with `cva`** (class-variance-authority): one source of
   truth per element, variants as data. → [reference/components.md](reference/components.md)
4. **Merge classes with a `cn()` helper** (clsx + tailwind-merge) so `className`
   overrides don't duplicate.
5. **Wrap the screen in a shell** (sidebar + header + outlet) and start each view
   with a shared `PageHeader`. → [reference/patterns.md](reference/patterns.md)
6. **Wire feedback, i18n, a11y** as cross-cutting patterns, not per-screen code.

Don't build a component library from scratch if Radix / shadcn / your existing
deps cover it. Wrap them with your tokens; don't reinvent the accessibility.

## Applying to a new project

1. Copy `reference/*.md` into the project's `docs/ui-ux/`.
2. Fill each `<FILL>` placeholder from that project's actual theme/primitives.
3. Delete rows that don't apply. Keep it shorter than you think.
4. Add the merge checklist (bottom of `patterns.md`) to the PR template.

The `reference/*.md` templates show the shape to fill in for each doc.
