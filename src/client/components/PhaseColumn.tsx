import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import SpecCard from '@/components/SpecCard';
import type { Spec } from '@shared/types';

const PHASE_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Ready: 'Ready',
  InProgress: 'In Progress',
  Review: 'Review',
  Validating: 'Validating',
  Done: 'Done',
};

interface PhaseColumnProps {
  phase: string;
  specs: Spec[];
  limit: number;
  onCardClick?: (specId: string) => void;
}

export default function PhaseColumn({ phase, specs, limit, onCardClick }: PhaseColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: phase });
  const count = specs.length;
  const atLimit = limit > 0 && count >= limit;

  return (
    <div
      ref={setNodeRef}
      data-phase={phase}
      className={`flex flex-col rounded-lg border bg-muted/30 min-w-[200px] ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-medium">{PHASE_LABELS[phase] ?? phase}</span>
        <Badge variant={atLimit ? 'destructive' : 'secondary'} className="text-xs">
          {limit > 0 ? `${count}/${limit}` : count}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-200px)]">
        {specs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No specs in this phase</p>
        ) : (
          specs.map((spec) => (
            <SpecCard key={spec.id} spec={spec} onClick={() => onCardClick?.(spec.id)} />
          ))
        )}
      </div>
    </div>
  );
}
