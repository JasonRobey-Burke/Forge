import { Badge } from '@/components/ui/badge';
import type { Intention } from '@shared/types';
import { IntentionStatus } from '@shared/types/enums';
import { INTENTION_STATUS_LABELS } from '@/lib/phaseColors';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Draft: 'outline',
  Defined: 'secondary',
  InProgress: 'default',
  Fulfilled: 'default',
  Deferred: 'secondary',
};

interface IntentionProgressProps {
  intentions: Intention[];
}

export default function IntentionProgress({ intentions }: IntentionProgressProps) {
  const total = intentions.length;
  if (total === 0) return <p className="text-sm text-muted-foreground">No intentions yet.</p>;

  const statusCounts = intentions.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});

  const fulfilled = statusCounts['Fulfilled'] ?? 0;
  const pct = Math.round((fulfilled / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Fulfillment</span>
        <span className="font-medium">{fulfilled}/{total} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(IntentionStatus).map(([key]) => (
          <Badge key={key} variant={STATUS_VARIANTS[key] ?? 'outline'} className="text-xs">
            {INTENTION_STATUS_LABELS[key] ?? key}: {statusCounts[key] ?? 0}
          </Badge>
        ))}
      </div>
    </div>
  );
}
