import { useFieldArray, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface DynamicListEditorProps {
  name: string;
  label: string;
  placeholder?: string;
}

export default function DynamicListEditor({ name, label, placeholder }: DynamicListEditorProps) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Input {...register(`${name}.${index}.value`)} placeholder={placeholder ?? `${label} item`} />
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
