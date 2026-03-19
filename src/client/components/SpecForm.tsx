import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
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
import ContextEditor from '@/components/ContextEditor';
import { SpecPhase, Complexity } from '@shared/types/enums';
import type { CreateSpecInput, ProductContext } from '@shared/types';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  phase: z.enum(Object.values(SpecPhase) as [string, ...string[]]),
  complexity: z.enum(Object.values(Complexity) as [string, ...string[]]),
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
  };
}

interface ArrayFieldProps {
  name: 'boundaries' | 'deliverables' | 'validation_automated' | 'validation_human';
  label: string;
  form: ReturnType<typeof useForm<FormValues>>;
}

function ArrayField({ name, label, form }: ArrayFieldProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name });

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Input {...form.register(`${name}.${index}.value`)} placeholder={`${label} item`} />
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}>
        + Add {label}
      </Button>
    </div>
  );
}

interface SpecFormProps {
  productId: string;
  defaultValues?: Partial<CreateSpecInput>;
  onSubmit: (values: CreateSpecInput) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export default function SpecForm({
  productId,
  defaultValues,
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

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-2xl">
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

        <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem key={p} value={p}>{p}</SelectItem>
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
        </div>

        <ContextEditor />

        <ArrayField name="boundaries" label="Boundaries" form={form} />
        <ArrayField name="deliverables" label="Deliverables" form={form} />
        <ArrayField name="validation_automated" label="Automated Validation" form={form} />
        <ArrayField name="validation_human" label="Human Validation" form={form} />

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
