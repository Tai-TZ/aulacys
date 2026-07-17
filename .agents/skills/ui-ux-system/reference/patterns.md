# Patterns & Conventions — template

How primitives compose into screens. Fill `<FILL>` from the project.

## Layout shell

Document the app frame once so every view slots in:

```
<FILL: e.g. Sidebar (collapsible / mobile drawer) + HeaderBar + <main><Outlet/></main> + optional side panel>
```

- Sidebar: `<FILL collapse behavior, persistence key, desktop breakpoint>`
- Header: `<FILL page title source, actions>`
- Each view starts with `<PageHeader>`, then `<Section>`/`<Card>` groups.
- Separate consoles (admin/system) → separate layout: `<FILL>`.

## Feedback

- **Toast** — transient result, auto-dismiss. Position `<FILL>`, variants
  `success | error | warning | info`. `aria-live="assertive"`, each toast
  `role="alert"`. Hook: `<FILL useToast>`.
- **Dialog** — modal for a decision or short form. Overlay + focus trap (use
  Radix, don't hand-roll). Footer actions right-aligned.
- Rule: **toast** for fleeting results; **dialog** when the user must decide/input.

## Form

- Fields: `Input` / `Textarea` / `Select` primitives.
- Label above (`Text size="sm"`); error below (`text-error text-xs`).
- Submit: `Button variant="primary" loading={…}`.
- Long forms: draft/autosave via `<FILL hook>`.

## i18n

- Languages: `<FILL: e.g. vi (default) / en>`, strings in `<FILL locales/*.json>`.
- Access via `<FILL: const { t } = useSettings()>` → `t.section.key`.
- **No hard-coded display strings in JSX.** Add every key to ALL locale files.

## Accessibility floor

- Readable text **≥12px** (`text-xs` is the floor).
- Visible focus ring — keep `focus-visible` in primitives.
- Icon-only buttons need `aria-label` / `title`.
- Use `*/on-*` color pairs for contrast; don't invent color combos.
- Respect `prefers-reduced-motion` (global rule; no long custom animations).

## Responsive

- Mobile-first. Main breakpoint `<FILL: e.g. md / 768px>`.
- Wide content (tables, previews) scrolls inside `overflow-x-auto`; `<body>`
  never scrolls horizontally.

## Merge checklist (copy into PR template)

- [ ] View opens with `<PageHeader>`; content grouped in `<Section>`/`<Card>`.
- [ ] No hard-coded hex/oklch — token classes only.
- [ ] Tested in dark mode — no broken text/surface pairs.
- [ ] All strings via i18n, added to every locale file.
- [ ] Empty list → `<EmptyState>`; loading → `<Skeleton>`.
- [ ] Icon-only buttons have `aria-label`.
