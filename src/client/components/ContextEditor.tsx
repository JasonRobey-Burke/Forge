import DynamicListEditor from '@/components/DynamicListEditor';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFormContext } from 'react-hook-form';

export default function ContextEditor() {
  const { register } = useFormContext();
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Context</h3>
      <DynamicListEditor name="context.stack" label="Stack" />
      <DynamicListEditor name="context.patterns" label="Patterns" />
      <DynamicListEditor name="context.conventions" label="Conventions" />
      <div className="space-y-2">
        <Label>Auth</Label>
        <Textarea {...register('context.auth')} placeholder="Authentication approach" />
      </div>
    </div>
  );
}
