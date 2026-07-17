# Design Tokens — template

> Fill `<FILL>` from the project's theme file. Delete rows that don't apply.
> Rule: JSX references token names, never raw hex/oklch.

## Where tokens live

`<FILL: e.g. src/index.css @theme (Tailwind v4) | tailwind.config.js theme.extend | app.css :root>`

## Brand palette

The small set of raw brand colors everything else maps onto.

| Token | Meaning | Example class |
|-------|---------|---------------|
| `<FILL primary-brand>` | Main brand color | `bg-<name>` |
| `<FILL accent>` | Accent / highlight | `text-<name>` |
| `<FILL ...>` | | |

## Semantic tokens (use these daily)

The layer you touch in components. Map onto brand; flip under dark mode.

| Token | Used for |
|-------|----------|
| `background` / `foreground` | App background / main text |
| `primary` / `on-primary` | Primary action / text on it |
| `secondary` / `secondary-foreground` | Secondary surfaces |
| `muted` / `muted-foreground` | Dimmed areas, secondary text |
| `card` / `card-foreground` | Card surface |
| `border` / `ring` | Borders / focus ring |
| `success` / `error` / `warning` | Status colors (+ `*-container` tints) |

> Prefer `bg-primary text-on-primary` over hand-picked pairs — the `*/on-*`
> pairing guarantees contrast in both themes.

## Fonts

| Token | Font | Used for |
|-------|------|----------|
| `<FILL display>` | | Headings |
| `<FILL body>` | | Body (default) |
| `<FILL mono>` | | Code / technical labels |

## Shadows / spacing / radius

- Shadows: `<FILL: soft / medium / large scale>`
- Spacing tokens: `<FILL>`
- Radius convention: inputs/buttons `<FILL>`, cards `<FILL>`, pills `rounded-full`

## Dark mode mechanism

Pick ONE and document it:

- **Class-based (recommended):** a `.dark` class on `<html>`, toggled by the
  settings/theme context — NOT the OS by default. Dark mode works by
  **overriding the semantic tokens** inside `.dark { … }`. Bind Tailwind's
  `dark:` variant to that class (`@custom-variant dark (&:where(.dark, .dark *))`
  in Tailwind v4). Result: token-based components get dark for free; you rarely
  write `dark:` by hand.
- OS-based: `@media (prefers-color-scheme: dark)`. Simpler, but no in-app toggle.

Theme values: `<FILL: light | dark | system>`. Persistence: `<FILL localStorage key / server>`.

## Animation

Keep micro-animations ≤250ms and gate everything behind
`@media (prefers-reduced-motion: reduce)` (collapse durations to ~0).
Named animations: `<FILL>`.
