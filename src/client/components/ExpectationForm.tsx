import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Control, FormState } from 'react-hook-form';
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
import { ExpectationStatus } from '@shared/types/enums';
import { EXPECTATION_STATUS_LABELS } from '@/lib/phaseColors';
import type { CreateExpectationInput } from '@shared/types';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  status: z.enum(Object.values(ExpectationStatus) as [string, ...string[]]),
  edge_cases: z.array(z.object({ value: z.string() })).min(2, 'At least 2 edge cases required'),
});

type FormValues = z.infer<typeof formSchema>;

function toFormValues(input?: Partial<CreateExpectationInput>): FormValues {
  const edgeCases = input?.edge_cases?.map((v) => ({ value: v })) ?? [{ value: '' }, { value: '' }];
  return {
    title: input?.title ?? '',
    description: input?.description ?? '',
    status: (input?.status ?? 'Draft') as string,
    edge_cases: edgeCases.length < 2 ? [...edgeCases, ...Array(2 - edgeCases.length).fill({ value: '' })] : edgeCases,
  };
}

function toApiValues(values: FormValues, intentionId: string): CreateExpectationInput {
  return {
    intention_id: intentionId,
    title: values.title,
    description: values.description,
    status: values.status as CreateExpectationInput['status'],
    edge_cases: values.edge_cases.map((ec) => ec.value).filter(Boolean),
  };
}

interface ExpectationFormFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formState: FormState<any>;
}

export function ExpectationFormFields({ control, formState }: ExpectationFormFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'edge_cases' });

  return (
    <>
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Expected outcome" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="Describe the testable outcome" rows={4} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(ExpectationStatus).map((s) => (
                  <SelectItem key={s} value={s}>{EXPECTATION_STATUS_LABELS[s] ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <Label>Edge Cases (minimum 2)</Label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input
              {...control.register(`edge_cases.${index}.value`)}
              placeholder={`Edge case ${index + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              disabled={fields.length <= 2}
            >
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
    </>
  );
}

interface ExpectationFormProps {
  intentionId: string;
  defaultValues?: Partial<CreateExpectationInput>;
  onSubmit: (values: CreateExpectationInput) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export default function ExpectationForm({
  intentionId,
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: ExpectationFormProps) {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: toFormValues(defaultValues),
  });

  function handleSubmit(values: FormValues) {
    onSubmit(toApiValues(values, intentionId));
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-2xl">
        <ExpectationFormFields control={form.control} formState={form.formState} />

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

export { toFormValues as expectationToFormValues, toApiValues as expectationToApiValues };
