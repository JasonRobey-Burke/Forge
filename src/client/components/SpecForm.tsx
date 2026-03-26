import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import ContextEditor from '@/components/ContextEditor';
import DynamicListEditor from '@/components/DynamicListEditor';
import CollapsibleSection from '@/components/CollapsibleSection';
import { Badge } from '@/components/ui/badge';
import { SpecPhase, Complexity } from '@shared/types/enums';
import { PHASE_LABELS, EXPECTATION_STATUS_LABELS } from '@/lib/phaseColors';
import type { CreateSpecInput, ProductContext, Spec } from '@shared/types';
import type { ChecklistExpectation } from '@shared/checklist/types';
import CompletenessChecklist from '@/components/CompletenessChecklist';
import { compareContext } from '@/lib/contextDiff';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  phase: z.string(),
  complexity: z.string(),
  context: z.object({
    stack: z.array(z.object({ value: z.string() })),
    patterns: z.array(z.object({ value: z.string() })),
    conventions: z.array(z.object({ value: z.string() })),
    auth: z.string(),
  }),
  boundaries: z.array(z.object({ value: z.string() })),
  deliverables: z.array(z.object({ value: z.string() })),
  validation_automated: z.array(z.object({ value: z.string() })),
  validation_human: z.array(z.object({ value: z.string() })),
  peer_reviewed: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function toWrapped(arr?: string[]): { value: string }[] {
  return arr?.map((v) => ({ value: v })) ?? [];
}

function toFormValues(input?: Partial<CreateSpecInput>): FormValues {
  const ctx = input?.context;
  return {
    title: input?.title ?? '',
    description: input?.description ?? '',
    phase: (input?.phase ?? 'Draft') as string,
    complexity: (input?.complexity ?? 'Medium') as string,
    context: {
      stack: toWrapped(ctx?.stack),
      patterns: toWrapped(ctx?.patterns),
      conventions: toWrapped(ctx?.conventions),
      auth: ctx?.auth ?? '',
    },
    boundaries: toWrapped(input?.boundaries),
    deliverables: toWrapped(input?.deliverables),
    validation_automated: toWrapped(input?.validation_automated),
    validation_human: toWrapped(input?.validation_human),
    peer_reviewed: (input as any)?.peer_reviewed ?? false,
  };
}

function toApiValues(values: FormValues, productId: string): CreateSpecInput {
  return {
    product_id: productId,
    title: values.title,
    description: values.description,
    phase: values.phase as CreateSpecInput['phase'],
    complexity: values.complexity as CreateSpecInput['complexity'],
    context: {
      stack: values.context.stack.map((s) => s.value).filter(Boolean),
      patterns: values.context.patterns.map((p) => p.value).filter(Boolean),
      conventions: values.context.conventions.map((c) => c.value).filter(Boolean),
      auth: values.context.auth,
    } as ProductContext,
    boundaries: values.boundaries.map((b) => b.value).filter(Boolean),
    deliverables: values.deliverables.map((d) => d.value).filter(Boolean),
    validation_automated: values.validation_automated.map((v) => v.value).filter(Boolean),
    validation_human: values.validation_human.map((v) => v.value).filter(Boolean),
    peer_reviewed: values.peer_reviewed,
  } as any;
}

// Inner component that computes context diff badge via useWatch
function ContextDiffBadge({ productContext }: { productContext: ProductContext }) {
  const { watch } = useFormContext();
  const watchedContext = watch('context');
  const diff = watchedContext
    ? compareContext(productContext, {
        stack: (watchedContext.stack ?? []).map((s: { value: string }) => s.value).filter(Boolean),
        patterns: (watchedContext.patterns ?? []).map((p: { value: string }) => p.value).filter(Boolean),
        conventions: (watchedContext.conventions ?? []).map((c: { value: string }) => c.value).filter(Boolean),
        auth: watchedContext.auth ?? '',
      })
    : null;
  if (!diff?.anyModified) return null;
  return <Badge variant="secondary" className="text-xs">Modified</Badge>;
}

// Inner component that has access to form context via useWatch
interface ChecklistSidebarProps {
  defaultSpec: Partial<Spec>;
  expectations: ChecklistExpectation[];
}

function ChecklistSidebar({ defaultSpec, expectations }: ChecklistSidebarProps) {
  const values = useWatch<FormValues>();

  // Build a Spec-shaped object from form values for the evaluator
  const liveSpec: Spec = {
    id: defaultSpec.id ?? '',
    product_id: defaultSpec.product_id ?? '',
    title: (values.title as string | undefined) ?? '',
    description: (values.description as string | undefined) ?? '',
    phase: (values.phase as Spec['phase'] | undefined) ?? 'Draft',
    complexity: (values.complexity as Spec['complexity'] | undefined) ?? 'Medium',
    context: {
      stack: ((values.context as FormValues['context'] | undefined)?.stack ?? [])
        .map((s: { value: string }) => s.value).filter(Boolean),
      patterns: ((values.context as FormValues['context'] | undefined)?.patterns ?? [])
        .map((p: { value: string }) => p.value).filter(Boolean),
      conventions: ((values.context as FormValues['context'] | undefined)?.conventions ?? [])
        .map((c: { value: string }) => c.value).filter(Boolean),
      auth: (values.context as FormValues['context'] | undefined)?.auth ?? '',
    },
    boundaries: ((values.boundaries as { value: string }[] | undefined) ?? [])
      .map((b) => b.value).filter(Boolean),
    deliverables: ((values.deliverables as { value: string }[] | undefined) ?? [])
      .map((d) => d.value).filter(Boolean),
    validation_automated: ((values.validation_automated as { value: string }[] | undefined) ?? [])
      .map((v) => v.value).filter(Boolean),
    validation_human: ((values.validation_human as { value: string }[] | undefined) ?? [])
      .map((v) => v.value).filter(Boolean),
    peer_reviewed: (values.peer_reviewed as boolean | undefined) ?? defaultSpec.peer_reviewed ?? false,
    phase_changed_at: defaultSpec.phase_changed_at ?? '',
    created_at: defaultSpec.created_at ?? '',
    updated_at: defaultSpec.updated_at ?? '',
    archived_at: defaultSpec.archived_at ?? null,
    extras: defaultSpec.extras ?? {},
  };

  return <CompletenessChecklist spec={liveSpec} expectations={expectations} />;
}

// Summary badge components using useWatch for live counts
function BoundariesBadge() {
  const boundaries = useWatch<FormValues, 'boundaries'>({ name: 'boundaries' });
  const count = (boundaries ?? []).filter((b) => b.value.trim()).length;
  return <Badge variant="secondary" className="text-xs">{count}</Badge>;
}

function DeliverablesBadge() {
  const deliverables = useWatch<FormValues, 'deliverables'>({ name: 'deliverables' });
  const count = (deliverables ?? []).filter((d) => d.value.trim()).length;
  return <Badge variant="secondary" className="text-xs">{count}</Badge>;
}

function ValidationBadge() {
  const automated = useWatch<FormValues, 'validation_automated'>({ name: 'validation_automated' });
  const human = useWatch<FormValues, 'validation_human'>({ name: 'validation_human' });
  const autoCount = (automated ?? []).filter((v) => v.value.trim()).length;
  const humanCount = (human ?? []).filter((v) => v.value.trim()).length;
  return (
    <Badge variant="secondary" className="text-xs">
      {autoCount} auto, {humanCount} human
    </Badge>
  );
}

// Sidebar metadata fields (Phase, Complexity, Peer Reviewed) that live inside FormProvider
function MetadataSidebar({
  defaultSpec,
  checklistExpectations,
}: {
  defaultSpec?: Partial<Spec>;
  checklistExpectations?: ChecklistExpectation[];
}) {
  const form = useFormContext<FormValues>();
  const showChecklist = !!defaultSpec && !!checklistExpectations;

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="phase"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phase</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(SpecPhase).map((p) => (
                  <SelectItem key={p} value={p}>{PHASE_LABELS[p] ?? p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="complexity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Complexity</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select complexity" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(Complexity).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="peer_reviewed"
          {...form.register('peer_reviewed')}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="peer_reviewed">Peer Reviewed</Label>
      </div>

      {showChecklist && (
        <>
          <Separator />
          <ChecklistSidebar
            defaultSpec={defaultSpec!}
            expectations={checklistExpectations!}
          />
        </>
      )}
    </div>
  );
}

interface SpecFormProps {
  productId: string;
  productContext?: ProductContext;
  defaultValues?: Partial<CreateSpecInput>;
  defaultSpec?: Partial<Spec>;
  checklistExpectations?: ChecklistExpectation[];
  linkedExpectations?: Array<{ id: string; title: string; description: string; status: string; edge_cases: string[] }>;
  onSubmit: (values: CreateSpecInput) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export default function SpecForm({
  productId,
  productContext,
  defaultValues,
  defaultSpec,
  checklistExpectations,
  linkedExpectations,
  onSubmit,
  isSubmitting,
  submitLabel,
}: SpecFormProps) {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: toFormValues(defaultValues),
  });

  function handleSubmit(values: FormValues) {
    onSubmit(toApiValues(values, productId));
  }

  const leftColumn = (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Spec title" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="Describe what this spec covers" rows={4} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>

      <CollapsibleSection
        title="Context"
        defaultOpen={true}
        badge={productContext ? <ContextDiffBadge productContext={productContext} /> : undefined}
      >
        <ContextEditor productContext={productContext} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Expectations"
        defaultOpen={false}
        badge={<Badge variant="secondary">{linkedExpectations?.length ?? 0}</Badge>}
      >
        {linkedExpectations && linkedExpectations.length > 0 ? (
          <ul className="space-y-3">
            {linkedExpectations.map((exp) => (
              <li key={exp.id} className="text-sm border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{exp.title}</span>
                  <Badge variant="outline">{EXPECTATION_STATUS_LABELS[exp.status] ?? exp.status}</Badge>
                </div>
                {exp.description && <p className="text-muted-foreground mb-1">{exp.description}</p>}
                {exp.edge_cases?.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-muted-foreground">
                    {exp.edge_cases.map((ec, i) => <li key={i}>{ec}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No expectations linked. Link expectations from the spec detail page after creating.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Boundaries"
        defaultOpen={false}
        badge={<BoundariesBadge />}
      >
        <DynamicListEditor name="boundaries" label="Boundaries" />
      </CollapsibleSection>

      <CollapsibleSection
        title="Deliverables"
        defaultOpen={false}
        badge={<DeliverablesBadge />}
      >
        <DynamicListEditor name="deliverables" label="Deliverables" />
      </CollapsibleSection>

      <CollapsibleSection
        title="Validation"
        defaultOpen={false}
        badge={<ValidationBadge />}
      >
        <DynamicListEditor name="validation_automated" label="Automated Validation" />
        <DynamicListEditor name="validation_human" label="Human Validation" />
      </CollapsibleSection>

    </form>
  );

  return (
    <FormProvider {...form}>
      {/* Mobile: sidebar content above form; lg+: two-column grid */}
      <div className="lg:hidden space-y-6 mb-6">
        <MetadataSidebar
          defaultSpec={defaultSpec}
          checklistExpectations={checklistExpectations}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {leftColumn}
        </div>
        <div className="hidden lg:block lg:col-span-1">
          <div className="lg:sticky lg:top-4 self-start">
            <MetadataSidebar
              defaultSpec={defaultSpec}
              checklistExpectations={checklistExpectations}
            />
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
