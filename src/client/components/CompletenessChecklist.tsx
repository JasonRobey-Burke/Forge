import { evaluateChecklist } from '@shared/checklist/evaluator';
import type { ChecklistExpectation, ChecklistResult } from '@shared/checklist/types';
import type { Spec } from '@shared/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CompletenessChecklistProps {
  spec: Spec;
  expectations: ChecklistExpectation[];
  result?: ChecklistResult;
}

export default function CompletenessChecklist({ spec, expectations, result: precomputed }: CompletenessChecklistProps) {
  const result = precomputed ?? evaluateChecklist(spec, expectations);
  const passRate = result.total > 0 ? (result.passed / result.total) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Completeness Checklist</CardTitle>
          <Badge variant={result.ready ? 'default' : 'secondary'}>
            {result.passed}/{result.total}
          </Badge>
        </div>
        <div
          className="bg-muted rounded-full h-2 mt-2"
          role="progressbar"
          aria-label="Checklist completion"
          aria-valuemin={0}
          aria-valuemax={result.total}
          aria-valuenow={result.passed}
          aria-valuetext={`${result.passed} of ${result.total} checklist items complete`}
        >
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${passRate}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.items.map((item) => (
          <div key={item.id} className="text-sm">
            <div className="flex items-start gap-2">
              <span className={item.passed ? 'text-green-600 font-bold shrink-0' : 'text-red-500 font-bold shrink-0'}>
                {item.passed ? '✓' : '✗'}
              </span>
              <span className={item.passed ? '' : 'text-foreground'}>{item.criterion}</span>
            </div>
            {!item.passed && item.message && (
              <p className="text-xs text-muted-foreground ml-5 mt-0.5">{item.message}</p>
            )}
          </div>
        ))}

        <div className="pt-2 border-t mt-3">
          {result.ready ? (
            <p className="text-sm text-green-600 font-medium" aria-live="polite">Ready for transition</p>
          ) : (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {result.total - result.passed} item{result.total - result.passed !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
