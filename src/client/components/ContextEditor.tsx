import DynamicListEditor from '@/components/DynamicListEditor';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ProductContext } from '@shared/types';
import { compareContext } from '@/lib/contextDiff';

interface ContextEditorProps {
  productContext?: ProductContext;
}

export default function ContextEditor({ productContext }: ContextEditorProps) {
  const { register } = useFormContext();
  const watchedContext = useWatch({ name: 'context' });

  const diff = productContext && watchedContext
    ? compareContext(productContext, {
        stack: (watchedContext.stack ?? []).map((s: { value: string }) => s.value).filter(Boolean),
        patterns: (watchedContext.patterns ?? []).map((p: { value: string }) => p.value).filter(Boolean),
        conventions: (watchedContext.conventions ?? []).map((c: { value: string }) => c.value).filter(Boolean),
        auth: watchedContext.auth ?? '',
      })
    : null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Context</h3>
      <div>
        {diff?.stack === 'modified' && <Badge variant="secondary" className="text-xs mb-1">Modified</Badge>}
        <DynamicListEditor name="context.stack" label="Stack" />
      </div>
      <div>
        {diff?.patterns === 'modified' && <Badge variant="secondary" className="text-xs mb-1">Modified</Badge>}
        <DynamicListEditor name="context.patterns" label="Patterns" />
      </div>
      <div>
        {diff?.conventions === 'modified' && <Badge variant="secondary" className="text-xs mb-1">Modified</Badge>}
        <DynamicListEditor name="context.conventions" label="Conventions" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Auth</Label>
          {diff?.auth === 'modified' && <Badge variant="secondary" className="text-xs">Modified</Badge>}
        </div>
        <Textarea {...register('context.auth')} placeholder="Authentication approach" />
      </div>
    </div>
  );
}
