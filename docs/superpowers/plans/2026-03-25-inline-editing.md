# Inline Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "swap left column with form card" edit pattern with true inline editing across Product, Intention, and Expectation detail pages.

**Architecture:** A thin `InlineField` visual wrapper adds edit affordances (blue border + pencil icon) around any child content. Each detail page distributes its existing form fields inline at their natural positions instead of grouping them in a single card. A `StickyEditBar` provides Save/Cancel at the viewport bottom when the action bar scrolls out of view.

**Tech Stack:** React 19, TypeScript, React Hook Form, Zod, shadcn/ui, Tailwind CSS 3

**Spec:** `docs/superpowers/specs/2026-03-25-inline-editing-design.md`

---

## File Structure

**New files:**
- `src/client/components/InlineField.tsx` — visual wrapper for editable areas
- `src/client/components/StickyEditBar.tsx` — fixed-bottom Save/Cancel bar

**Modified files:**
- `src/client/pages/ProductDetailPage.tsx` — distribute form fields inline
- `src/client/pages/IntentionDetailPage.tsx` — distribute form fields inline
- `src/client/pages/ExpectationDetailPage.tsx` — distribute form fields inline
- `src/client/components/ProductForm.tsx` — remove default wrapper export
- `src/client/components/IntentionForm.tsx` — remove default wrapper export
- `src/client/components/ExpectationForm.tsx` — remove default wrapper export
- `src/client/App.tsx` — remove dead edit routes

**Deleted files:**
- `src/client/pages/ProductEditPage.tsx`
- `src/client/pages/IntentionEditPage.tsx`
- `src/client/pages/ExpectationEditPage.tsx`

---

### Task 1: Create InlineField Component

**Files:**
- Create: `src/client/components/InlineField.tsx`

- [ ] **Step 1: Create InlineField component**

```tsx
// src/client/components/InlineField.tsx
import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineFieldProps {
  editing: boolean;
  children: ReactNode;
  className?: string;
}

export default function InlineField({ editing, children, className }: InlineFieldProps) {
  if (!editing) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative rounded-md border border-blue-300 bg-blue-50/50 px-3 py-2', className)}>
      <Pencil className="absolute top-2 right-2 h-3.5 w-3.5 text-blue-400 pointer-events-none" />
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/client/components/InlineField.tsx
git commit -m "feat: add InlineField visual wrapper for inline editing"
```

---

### Task 2: Create StickyEditBar Component

**Files:**
- Create: `src/client/components/StickyEditBar.tsx`

- [ ] **Step 1: Create StickyEditBar component**

```tsx
// src/client/components/StickyEditBar.tsx
import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';

interface StickyEditBarProps {
  editing: boolean;
  actionBarRef: RefObject<HTMLDivElement | null>;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export default function StickyEditBar({ editing, actionBarRef, onSave, onCancel, isPending }: StickyEditBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = actionBarRef.current;
    if (!editing || !el) {
      setVisible(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [editing, actionBarRef]);

  if (!editing || !visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between bg-zinc-900 px-6 py-3 shadow-lg">
      <span className="text-sm text-zinc-400">Unsaved changes</span>
      <div className="flex gap-2">
        <Button size="sm" variant="default" onClick={onSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-zinc-200" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/client/components/StickyEditBar.tsx
git commit -m "feat: add StickyEditBar for inline editing save/cancel"
```

---

### Task 3: Convert ProductDetailPage to Inline Editing

**Files:**
- Modify: `src/client/pages/ProductDetailPage.tsx`

This is the most complex conversion — it has hero fields (name, problem_statement), left column fields (vision, target_audience, context), and right column fields (wip_limits).

- [ ] **Step 1: Add imports and ref**

Add to existing imports:
```tsx
import { useRef } from 'react';
import InlineField from '@/components/InlineField';
import StickyEditBar from '@/components/StickyEditBar';
import ContextEditor from '@/components/ContextEditor';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
```

Inside the component, add:
```tsx
const actionBarRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 2: Replace hero section**

Replace the static hero `<div className="mb-6">` block. When `editing` is true, name becomes an Input and problem_statement becomes a Textarea, wrapped in `InlineField`. When `editing` is false, display as before.

```tsx
{/* Hero */}
<div className="mb-6">
  <div className="flex items-center gap-3 mb-2">
    <span className="text-sm text-muted-foreground font-mono">{product.id}</span>
    {editing ? (
      <InlineField editing={editing}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} className="text-xl font-semibold h-auto py-1 border-0 shadow-none bg-transparent p-0 focus-visible:ring-0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </InlineField>
    ) : (
      <h1 className="text-xl font-semibold">{product.name}</h1>
    )}
    <InlineStatusSelect
      value={product.status}
      labels={PRODUCT_STATUS_LABELS}
      disabled={updateProduct.isPending}
      onChange={(newStatus) => {
        updateProduct.mutate(
          { id: id!, status: newStatus as any },
          { onSuccess: () => toast.success(`Status changed to ${PRODUCT_STATUS_LABELS[newStatus] ?? newStatus}`) },
        );
      }}
    />
  </div>
  {editing ? (
    <InlineField editing={editing}>
      <FormField
        control={form.control}
        name="problem_statement"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea {...field} className="text-muted-foreground border-0 shadow-none bg-transparent p-0 resize-none focus-visible:ring-0" rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </InlineField>
  ) : (
    <p className="text-muted-foreground">{product.problem_statement}</p>
  )}
</div>
```

- [ ] **Step 3: Add ref to action bar and wrap with FormProvider**

Attach `ref={actionBarRef}` to the action bar div. **Critical:** Wrap everything from the hero through the grid and StickyEditBar in `<FormProvider {...form}>`. The hero fields, WIP limit fields, and `ContextEditor` all use `FormField` or `useFormContext`, which require `FormProvider` as an ancestor. The wrapping structure should be:

```tsx
<FormProvider {...form}>
  {/* Hero */}
  <div className="mb-6">...</div>

  {/* Action bar */}
  <div ref={actionBarRef} className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b">...</div>

  {/* 2-column grid */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">...</div>

  <StickyEditBar ... />
</FormProvider>
```

Note: `FormProvider` renders no DOM element, so layout is unaffected.

- [ ] **Step 4: Replace left column**

Remove the `editing ? <Card>...</Card> : <>...</>` ternary. Instead, always show Vision, Target Audience, and Context — just toggle between display and form controls:

```tsx
<div className="space-y-4">
  <div>
    <p className="text-sm font-medium text-muted-foreground mb-1">Vision</p>
    <InlineField editing={editing}>
      {editing ? (
        <FormField control={form.control} name="vision" render={({ field }) => (
          <FormItem>
            <FormControl><Textarea {...field} className="border-0 shadow-none bg-transparent p-0 resize-none focus-visible:ring-0" rows={2} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      ) : (
        <p className="text-sm">{product.vision}</p>
      )}
    </InlineField>
  </div>

  <div>
    <p className="text-sm font-medium text-muted-foreground mb-1">Target Audience</p>
    <InlineField editing={editing}>
      {editing ? (
        <FormField control={form.control} name="target_audience" render={({ field }) => (
          <FormItem>
            <FormControl><Textarea {...field} className="border-0 shadow-none bg-transparent p-0 resize-none focus-visible:ring-0" rows={2} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      ) : (
        <p className="text-sm">{product.target_audience}</p>
      )}
    </InlineField>
  </div>

  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-base">Context</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      {editing ? (
        <ContextEditor />
      ) : (
        <>
          {/* existing read-only context display (stack, patterns, conventions, auth badges) */}
        </>
      )}
    </CardContent>
  </Card>
</div>
```

Keep the existing read-only context rendering (the Badge lists for stack/patterns/conventions/auth) in the non-editing branch.

- [ ] **Step 5: Make WIP limits inline-editable**

In the right column WIP Limits card, wrap the grid in `InlineField` and toggle between display and number inputs:

```tsx
<Card>
  <CardHeader className="pb-2"><CardTitle className="text-base">WIP Limits</CardTitle></CardHeader>
  <CardContent>
    <InlineField editing={editing}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {(['draft', 'ready', 'in_progress', 'review', 'validating'] as const).map((key) => (
          <div key={key} className="text-center p-2 rounded-md bg-muted">
            <p className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
            {editing ? (
              <FormField control={form.control} name={`wip_limits.${key}`} render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="number" min={0} {...field} className="text-lg font-semibold text-center border-0 shadow-none bg-transparent p-0 h-auto focus-visible:ring-0" />
                  </FormControl>
                </FormItem>
              )} />
            ) : (
              <p className="text-lg font-semibold">{product.wip_limits[key]}</p>
            )}
          </div>
        ))}
      </div>
    </InlineField>
  </CardContent>
</Card>
```

- [ ] **Step 6: Add StickyEditBar**

At the end of the component's return, before the closing `</div>`, add:

```tsx
<StickyEditBar
  editing={editing}
  actionBarRef={actionBarRef}
  onSave={form.handleSubmit(handleSave)}
  onCancel={handleCancel}
  isPending={updateProduct.isPending}
/>
```

- [ ] **Step 7: Verify typecheck and test in browser**

Run: `npx tsc --noEmit`
Then manually verify in browser: click Edit on a product detail page, confirm all fields are editable in-place, Save and Cancel work, sticky bar appears on scroll.

- [ ] **Step 8: Commit**

```bash
git add src/client/pages/ProductDetailPage.tsx
git commit -m "feat: convert ProductDetailPage to inline editing"
```

---

### Task 4: Convert IntentionDetailPage to Inline Editing

**Files:**
- Modify: `src/client/pages/IntentionDetailPage.tsx`

The intention page has: hero (title + priority badge), and a description card.

- [ ] **Step 1: Add imports and ref**

Add:
```tsx
import { useRef } from 'react';
import InlineField from '@/components/InlineField';
import StickyEditBar from '@/components/StickyEditBar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
```

Add ref: `const actionBarRef = useRef<HTMLDivElement>(null);`

- [ ] **Step 2: Replace hero section**

Currently the hero section has a ternary that hides the title when editing. Replace with always-visible title, inline-editable when editing:

```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3 flex-1 mr-4">
    <span className="text-sm text-muted-foreground font-mono">{intention.id}</span>
    {editing ? (
      <InlineField editing={editing} className="flex-1">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} className="text-xl font-semibold h-auto py-1 border-0 shadow-none bg-transparent p-0 focus-visible:ring-0" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </InlineField>
    ) : (
      <h1 className="text-xl font-semibold">{intention.title}</h1>
    )}
    {editing ? (
      <InlineField editing={editing}>
        <FormField control={form.control} name="priority" render={({ field }) => (
          <FormItem>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="h-7 w-auto"><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(Priority).map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )} />
      </InlineField>
    ) : (
      <Badge variant={priorityVariant[intention.priority as PriorityType]}>
        {intention.priority}
      </Badge>
    )}
    <InlineStatusSelect
      value={intention.status}
      labels={INTENTION_STATUS_LABELS}
      disabled={updateIntention.isPending}
      onChange={(newStatus) => {
        updateIntention.mutate(
          { id: id!, product_id: intention.product_id, status: newStatus as any },
          { onSuccess: () => toast.success(`Status changed to ${INTENTION_STATUS_LABELS[newStatus] ?? newStatus}`) },
        );
      }}
    />
  </div>
  <div ref={actionBarRef} className="flex gap-2">
    {/* existing Save/Cancel/Edit buttons — no changes */}
  </div>
</div>
```

- [ ] **Step 3: Replace description card**

Wrap the `<FormProvider>` around the grid content. Replace the left column editing ternary — always show the description card, toggle content:

```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-base">Description</CardTitle>
  </CardHeader>
  <CardContent>
    <InlineField editing={editing}>
      {editing ? (
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea {...field} className="border-0 shadow-none bg-transparent p-0 resize-none focus-visible:ring-0" rows={4} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      ) : (
        <p className="text-sm">{intention.description}</p>
      )}
    </InlineField>
  </CardContent>
</Card>
```

- [ ] **Step 4: Add StickyEditBar and wrap with FormProvider**

**Critical:** Wrap everything from the hero row through the grid and StickyEditBar in `<FormProvider {...form}>`. The hero section contains `FormField` components for title and priority, which require `FormProvider` context. Structure:

```tsx
<FormProvider {...form}>
  {/* Hero row (flex items-center justify-between) */}
  ...
  {/* Grid */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">...</div>
  {/* Timestamps */}
  ...
  <StickyEditBar
    editing={editing}
    actionBarRef={actionBarRef}
    onSave={form.handleSubmit(handleSave)}
    onCancel={handleCancel}
    isPending={updateIntention.isPending}
  />
</FormProvider>
```

- [ ] **Step 5: Verify typecheck and test in browser**

Run: `npx tsc --noEmit`
Verify in browser: inline title editing, priority select, description textarea, save/cancel, sticky bar.

- [ ] **Step 6: Commit**

```bash
git add src/client/pages/IntentionDetailPage.tsx
git commit -m "feat: convert IntentionDetailPage to inline editing"
```

---

### Task 5: Convert ExpectationDetailPage to Inline Editing

**Files:**
- Modify: `src/client/pages/ExpectationDetailPage.tsx`

Expectations have: hero (title), description card, edge cases card. Edge cases use `useFieldArray`.

- [ ] **Step 1: Add imports and ref**

Add:
```tsx
import { useRef } from 'react';
import InlineField from '@/components/InlineField';
import StickyEditBar from '@/components/StickyEditBar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { useFieldArray } from 'react-hook-form';
```

Add ref: `const actionBarRef = useRef<HTMLDivElement>(null);`

- [ ] **Step 2: Replace hero section**

Same pattern as IntentionDetailPage — always show the title, wrap in InlineField when editing:

```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3 flex-1 mr-4">
    <span className="text-sm text-muted-foreground font-mono">{expectation.id}</span>
    {editing ? (
      <InlineField editing={editing} className="flex-1">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} className="text-xl font-semibold h-auto py-1 border-0 shadow-none bg-transparent p-0 focus-visible:ring-0" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </InlineField>
    ) : (
      <h1 className="text-xl font-semibold">{expectation.title}</h1>
    )}
    <InlineStatusSelect
      value={expectation.status}
      labels={EXPECTATION_STATUS_LABELS}
      disabled={updateExpectation.isPending}
      onChange={(newStatus) => {
        updateExpectation.mutate(
          { id: id!, intention_id: expectation.intention_id, status: newStatus as any },
          { onSuccess: () => toast.success(`Status changed to ${EXPECTATION_STATUS_LABELS[newStatus] ?? newStatus}`) },
        );
      }}
    />
  </div>
  <div ref={actionBarRef} className="flex gap-2">
    {/* existing Save/Cancel/Edit buttons — no changes */}
  </div>
</div>
```

- [ ] **Step 3: Replace body section**

Remove the top-level `editing ? <FormProvider>...</FormProvider> : <div>...</div>` ternary. Always show Description and Edge Cases cards, toggle between display and form controls. Wrap in `<FormProvider {...form}>`:

```tsx
<FormProvider {...form}>
  <div className="space-y-4">
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Description</CardTitle></CardHeader>
      <CardContent>
        <InlineField editing={editing}>
          {editing ? (
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea {...field} className="border-0 shadow-none bg-transparent p-0 resize-none focus-visible:ring-0" rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          ) : (
            <p className="text-sm">{expectation.description}</p>
          )}
        </InlineField>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Edge Cases</CardTitle></CardHeader>
      <CardContent>
        <InlineField editing={editing}>
          {editing ? (
            <EdgeCaseEditor control={form.control} formState={form.formState} />
          ) : (
            <ol className="space-y-1 list-decimal list-inside">
              {expectation.edge_cases.map((ec, i) => (
                <li key={i} className="text-sm">{ec}</li>
              ))}
            </ol>
          )}
        </InlineField>
      </CardContent>
    </Card>

    {/* CopyCommand and timestamps stay as-is */}
  </div>

  <StickyEditBar
    editing={editing}
    actionBarRef={actionBarRef}
    onSave={form.handleSubmit(handleSave)}
    onCancel={handleCancel}
    isPending={updateExpectation.isPending}
  />
</FormProvider>
```

Extract the edge case editing into a small local component to keep the JSX clean. Note: this duplicates the edge case UI from `ExpectationFormFields`, but keeping it local is intentional — the `ExpectationFormFields` component bundles title, description, status, and edge cases together, and we only need the edge cases here. Extracting a shared edge case component would be premature since this is the only consumer:

```tsx
function EdgeCaseEditor({ control, formState }: { control: Control<any>; formState: FormState<any> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'edge_cases' });
  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Input {...control.register(`edge_cases.${index}.value`)} placeholder={`Edge case ${index + 1}`} />
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length <= 2}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}>
        + Add Edge Case
      </Button>
      {formState.errors.edge_cases && (
        <p className="text-sm text-destructive">
          {(formState.errors.edge_cases as { message?: string }).message}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck and test in browser**

Run: `npx tsc --noEmit`
Verify in browser: inline title editing, description textarea, edge case list editing, save/cancel, sticky bar.

- [ ] **Step 5: Commit**

```bash
git add src/client/pages/ExpectationDetailPage.tsx
git commit -m "feat: convert ExpectationDetailPage to inline editing"
```

---

### Task 6: Clean Up Dead Code

**Files:**
- Delete: `src/client/pages/ProductEditPage.tsx`
- Delete: `src/client/pages/IntentionEditPage.tsx`
- Delete: `src/client/pages/ExpectationEditPage.tsx`
- Modify: `src/client/App.tsx`
- Modify: `src/client/components/ProductForm.tsx`
- Modify: `src/client/components/IntentionForm.tsx`
- Modify: `src/client/components/ExpectationForm.tsx`

- [ ] **Step 1: Remove dead edit page files**

```bash
git rm src/client/pages/ProductEditPage.tsx
git rm src/client/pages/IntentionEditPage.tsx
git rm src/client/pages/ExpectationEditPage.tsx
```

- [ ] **Step 2: Remove redirect routes from App.tsx**

In `src/client/App.tsx`, remove these three route lines:
```tsx
<Route path="products/:id/edit" element={<RedirectToDetail />} />
<Route path="intentions/:id/edit" element={<RedirectToDetail />} />
<Route path="expectations/:id/edit" element={<RedirectToDetail />} />
```

If `RedirectToDetail` is no longer used by any remaining route, remove its definition and the `useLocation` import.

Check: `RedirectToDetail` was only used by these three routes (the spec route uses `<SpecEditPage />` directly). So remove `RedirectToDetail` and the `useLocation` import.

- [ ] **Step 3: Remove default wrapper exports from form components**

In `src/client/components/ProductForm.tsx`:
- Remove the `export default function ProductForm(...)` component (lines 214-242)
- Remove the `useNavigate` import (only used by the wrapper)
- Keep `ProductFormFields`, `productToFormValues`, `productToApiValues` exports

In `src/client/components/IntentionForm.tsx`:
- Remove `export default function IntentionForm(...)` (lines 125-170)
- Remove `useNavigate` import
- Keep `IntentionFormFields` export

In `src/client/components/ExpectationForm.tsx`:
- Remove `export default function ExpectationForm(...)` (lines 154-188)
- Remove `useNavigate` import
- Keep `ExpectationFormFields` export
- Keep the re-export line at the bottom: `export { toFormValues as expectationToFormValues, toApiValues as expectationToApiValues }` — these helpers are part of the module's public API

- [ ] **Step 4: Verify no remaining imports of deleted code**

Run:
```bash
npx tsc --noEmit
```

Also search for any remaining references:
```bash
grep -r "ProductEditPage\|IntentionEditPage\|ExpectationEditPage\|RedirectToDetail" src/
grep -r "from.*ProductForm'" src/ --include="*.tsx" --include="*.ts"
grep -r "from.*IntentionForm'" src/ --include="*.tsx" --include="*.ts"
grep -r "from.*ExpectationForm'" src/ --include="*.tsx" --include="*.ts"
```

The detail pages should only import `{ ProductFormFields, ... }`, `{ IntentionFormFields }`, `{ ExpectationFormFields }` — not default imports.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead edit pages, routes, and form wrappers"
```

---

### Task 7: Update E2E Tests

**Files:**
- Modify: `e2e/intention.spec.ts`
- Modify: `e2e/expectation.spec.ts`

Two E2E tests navigate to the now-removed `/edit` routes and interact with the old form UI. They must be rewritten to use inline editing on the detail page.

- [ ] **Step 1: Update intention edit test**

In `e2e/intention.spec.ts`, replace the `'edit an intention'` test (lines 31-37):

```ts
test('edit an intention', async ({ page }) => {
  const intention = await createIntention(productId, { title: 'Intention to Edit' });
  await page.goto(`/intentions/${intention.id}`);
  await page.getByRole('button', { name: 'Edit' }).click();
  // Title field should now be an inline input
  const titleInput = page.locator('input[name="title"]');
  await titleInput.fill('Edited Intention');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Edited Intention')).toBeVisible();
});
```

- [ ] **Step 2: Update expectation edit test**

In `e2e/expectation.spec.ts`, replace the `'edit an expectation'` test (lines 29-35):

```ts
test('edit an expectation', async ({ page }) => {
  const expectation = await createExpectation(intentionId, { title: 'Expectation to Edit' });
  await page.goto(`/expectations/${expectation.id}`);
  await page.getByRole('button', { name: 'Edit' }).click();
  // Title field should now be an inline input
  const titleInput = page.locator('input[name="title"]');
  await titleInput.fill('Edited Expectation');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Edited Expectation')).toBeVisible();
});
```

- [ ] **Step 3: Commit**

```bash
git add e2e/intention.spec.ts e2e/expectation.spec.ts
git commit -m "test: update E2E tests for inline editing"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run unit tests**

Run: `npm test`
Expected: All pass

- [ ] **Step 3: Start dev server and manual verification**

Run: `npm run dev`

Test each detail page:
1. **Product detail** — Click Edit. Verify: name, problem statement, vision, target audience are editable in-place. WIP limit tiles become number inputs. Context section shows tag editors. Save works. Cancel reverts. Sticky bar appears on scroll.
2. **Intention detail** — Click Edit. Verify: title editable in-place, priority dropdown, description textarea. Save/Cancel work. Sticky bar appears.
3. **Expectation detail** — Click Edit. Verify: title editable in-place, description textarea, edge cases with add/remove. Save/Cancel work. Sticky bar appears.
4. **Spec detail** — Edit button still links to `/specs/:id/edit`. SpecEditPage works as before.
5. **Dead routes** — Navigate to `/products/PROD-001/edit` — should show no match. Same for `/intentions/:id/edit` and `/expectations/:id/edit`.

- [ ] **Step 4: Run E2E tests**

Run: `npm run test:e2e`
Expected: All pass

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address test failures from inline editing conversion"
```
