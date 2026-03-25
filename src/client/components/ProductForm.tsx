import { z } from 'zod';
import type { Control, FormState } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import ContextEditor from '@/components/ContextEditor';
import { ProductStatus } from '@shared/types/enums';
import type { CreateProductInput, ProductContext, WipLimits } from '@shared/types';

// Form schema uses {value}[] for arrays (useFieldArray requirement)
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  problem_statement: z.string().min(1, 'Problem statement is required'),
  vision: z.string().min(1, 'Vision is required'),
  target_audience: z.string().min(1, 'Target audience is required'),
  status: z.enum(Object.values(ProductStatus) as [string, ...string[]]),
  context: z.object({
    stack: z.array(z.object({ value: z.string() })),
    patterns: z.array(z.object({ value: z.string() })),
    conventions: z.array(z.object({ value: z.string() })),
    auth: z.string(),
  }),
  wip_limits: z.object({
    draft: z.coerce.number().int().min(0),
    ready: z.coerce.number().int().min(0),
    in_progress: z.coerce.number().int().min(0),
    review: z.coerce.number().int().min(0),
    validating: z.coerce.number().int().min(0),
  }),
});

type FormValues = z.infer<typeof formSchema>;

// Convert API shape (string[]) to form shape ({value}[])
function toFormValues(input?: Partial<CreateProductInput>): FormValues {
  const ctx = input?.context;
  const wip = input?.wip_limits;
  return {
    name: input?.name ?? '',
    problem_statement: input?.problem_statement ?? '',
    vision: input?.vision ?? '',
    target_audience: input?.target_audience ?? '',
    status: (input?.status ?? 'Discovery') as string,
    context: {
      stack: ctx?.stack?.map((v) => ({ value: v })) ?? [],
      patterns: ctx?.patterns?.map((v) => ({ value: v })) ?? [],
      conventions: ctx?.conventions?.map((v) => ({ value: v })) ?? [],
      auth: ctx?.auth ?? '',
    },
    wip_limits: {
      draft: wip?.draft ?? 5,
      ready: wip?.ready ?? 3,
      in_progress: wip?.in_progress ?? 3,
      review: wip?.review ?? 3,
      validating: wip?.validating ?? 2,
    },
  };
}

// Convert form shape ({value}[]) to API shape (string[])
function toApiValues(values: FormValues): CreateProductInput {
  return {
    name: values.name,
    problem_statement: values.problem_statement,
    vision: values.vision,
    target_audience: values.target_audience,
    status: values.status as CreateProductInput['status'],
    context: {
      stack: values.context.stack.map((s) => s.value).filter(Boolean),
      patterns: values.context.patterns.map((p) => p.value).filter(Boolean),
      conventions: values.context.conventions.map((c) => c.value).filter(Boolean),
      auth: values.context.auth,
    } as ProductContext,
    wip_limits: values.wip_limits as WipLimits,
  };
}

interface ProductFormFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formState: FormState<any>;
}

export function ProductFormFields({ control }: ProductFormFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Product name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="problem_statement"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Problem Statement</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="What problem does this product solve?" rows={3} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="vision"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Vision</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="What is the product's vision?" rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="target_audience"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Target Audience</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="Who is this product for?" rows={2} />
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
                {Object.values(ProductStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <ContextEditor />

      <div className="space-y-4">
        <h3 className="text-sm font-medium">WIP Limits</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(['draft', 'ready', 'in_progress', 'review', 'validating'] as const).map((key) => (
            <FormField
              key={key}
              control={control}
              name={`wip_limits.${key}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="capitalize">{key.replace('_', ' ')}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export { toFormValues as productToFormValues, toApiValues as productToApiValues };
