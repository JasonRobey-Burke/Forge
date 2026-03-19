import { useFieldArray, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ArraySectionProps {
  name: string;
  label: string;
}

function ArraySection({ name, label }: ArraySectionProps) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Input {...register(`${name}.${index}.value`)} placeholder={`${label} item`} />
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

export default function ContextEditor() {
  const { register } = useFormContext();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Context</h3>
      <ArraySection name="context.stack" label="Stack" />
      <ArraySection name="context.patterns" label="Patterns" />
      <ArraySection name="context.conventions" label="Conventions" />
      <div className="space-y-2">
        <Label>Auth</Label>
        <Textarea {...register('context.auth')} placeholder="Authentication approach" />
      </div>
    </div>
  );
}
