# Formatted Markdown Rendering — Design

**Date:** 2026-07-21
**Branch:** Feature/MD-Formatting
**Status:** Approved for implementation

## Problem

Forge displays artifact content as raw, unformatted text. Users writing markdown
(`**bold**`, `# headings`, `- lists`, `` `code` ``, tables) in IDD YAML fields see
the literal source instead of rendered output.

There are two independent causes:

1. **Typography plugin missing.** The existing `MarkdownRenderer`
   (`src/client/components/MarkdownRenderer.tsx`) uses `prose` classes from
   `@tailwindcss/typography`, but the plugin is not installed and
   `tailwind.config.ts` has `plugins: []`. Because Tailwind's preflight resets
   default heading/list styling, even the fields that *do* go through the renderer
   (review content, plan content) come out visually flat.
2. **Prose fields bypass the renderer.** Most descriptive fields render as plain
   `<p>{value}</p>` / `<li>{item}</li>`, so any markdown shows literally.

## Goal

All artifact prose renders as formatted markdown, consistently, while preserving
the current card-based layout. Short fields gain inline formatting without
disrupting their size/spacing; long-form documents get full document typography.

## Non-Goals

- No markdown editing/preview in edit forms (view-only rendering for now).
- No raw HTML support in markdown (keep react-markdown's safe default).
- No changes to how YAML is parsed or stored.

## Approach

### 1. Install and register the typography plugin

- Add `@tailwindcss/typography` as a devDependency.
- Register it in `tailwind.config.ts` `plugins: [require('@tailwindcss/typography')]`
  (or the ESM `import` equivalent consistent with the file's current style).

This alone fixes the flat appearance of the existing block renderer (review/plan
content).

### 2. Extend `MarkdownRenderer` with a `variant` prop

```
interface MarkdownRendererProps {
  content: string;
  variant?: 'block' | 'inline'; // default 'block'
}
```

- **`block`** (default): existing behavior — full `prose prose-sm dark:prose-invert`
  treatment. Used for long-form review/plan/review content.
- **`inline`**: renders the same GFM markdown (bold, italic, `code`, links, lists)
  but resets block margins and heading scaling and inherits the parent element's
  font-size and color, so it drops cleanly into small cards and list items.
  Implemented with prose margin/color resets (e.g. `prose-p:my-0`, tight leading,
  `text-inherit`) rather than a separate renderer.

Both variants keep `remarkPlugins={[remarkGfm]}` and react-markdown's default
(no raw HTML) — so untrusted YAML content cannot inject HTML/scripts.

### 3. Route prose fields through the renderer

Replace plain-text render sites with `<MarkdownRenderer variant="inline">`:

| Page | Fields |
|------|--------|
| `ProductDetailPage` | `problem_statement`, `vision` |
| `IntentionDetailPage` | `description` (and `rationale` if rendered) |
| `ExpectationDetailPage` | `description`, edge cases, validation criteria |
| `SpecDetailPage` | `description`, `context.auth`, and list items in `context.stack`, `context.patterns`, `context.conventions`, `boundaries`, `deliverables`, `validation_automated`, `validation_human` |
| `AdditionalFields.tsx` | the `whitespace-pre-wrap` string value (line ~55) |
| `ReviewDetailPage`, `PlanDetailPage` | already use `MarkdownRenderer` (block) — no change beyond the plugin fix |

For array fields, render each item's markdown inline inside its existing `<li>`.

## Testing

- **Vitest (client):** `MarkdownRenderer`
  - `block` variant emits `<h1>`, `<ul>`, `<strong>` for the corresponding markdown.
  - `inline` variant renders `<strong>`/`<code>` but does not apply block heading
    sizing / paragraph block margins.
- `npm run typecheck` passes.
- Manual UI pass across Product / Intention / Expectation / Spec / Review / Plan
  detail pages confirming formatting renders and card layouts are intact.

## Risks

- **Layout shift:** applying prose to short fields could change sizing. Mitigated by
  the `inline` variant's margin/size resets; verified in the manual UI pass.
- **Plugin/version compatibility:** `@tailwindcss/typography` must match the
  installed Tailwind 3 major. Pin a compatible version.
