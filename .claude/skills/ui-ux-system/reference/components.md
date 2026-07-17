# Component Catalog — template

> Primitives live in `<FILL: e.g. src/components/ui/>`. One source of truth per
> element. Screens import from here; nobody re-styles raw HTML controls.

## The `cva` primitive pattern

Every variant-bearing primitive follows this shape. Variants are data, not
copy-pasted classNames:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva('BASE classes shared by all', {
  variants: {
    variant: { primary: '…', secondary: '…', ghost: '…' },
    size: { sm: '…', md: '…', lg: '…' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
```

Key: `cn()` (clsx + tailwind-merge) merges caller `className` so overrides win
without duplicating utilities. Base class holds focus-ring + transition once.

## Catalog

Fill one row per primitive. Delete what the project lacks.

| Primitive | Variants / props | Notes |
|-----------|------------------|-------|
| `Button` | `variant`: `<FILL>` · `size`: `<FILL>` · `loading` | One primary per area |
| `Badge` | `variant`: `<FILL>` | Status pill |
| `Input` / `Textarea` | native props + ref | Visible focus ring, ≥14px text |
| `Select` | wraps `<FILL Radix/native>` | |
| `Heading` / `Text` | `level` / `size` × `tone` | Encode the type scale here |
| `PageHeader` | `title` `description` `eyebrow` `actions` | Start every view with it |
| `Section` / `Card` | header slots | Group content |
| `EmptyState` | `icon` `title` `description` `action` | Every empty collection |
| `Skeleton` / `Progress` | | Loading states |
| `Dialog` | `<FILL Radix?>` | Modal for decisions/short forms |
| `<FILL>` | | |

## Convention checklist

- [ ] Need chrome → import a primitive, don't write `<button className="bg-…">`.
- [ ] Tweak → pass `className`; `cn()` merges it.
- [ ] Icons from one lib (`<FILL: lucide-react?>`), consistent sizes.
- [ ] Type scale lives in `Heading`/`Text`, not ad-hoc `text-2xl font-bold` per screen.
- [ ] Base a11y (focus ring, `aria-label` on icon buttons) baked into the primitive.
