import { useDraggable } from '@dnd-kit/core';
import { GripVertical, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PHASE_COLORS, PHASE_LABELS } from '@/lib/phaseColors';
import type { Spec } from '@shared/types';

export function daysInPhase(phaseChangedAt: string): number {
  const changed = new Date(phaseChangedAt);
  const now = new Date();
  return Math.floor((now.getTime() - changed.getTime()) / (1000 * 60 * 60 * 24));
}

const complexityVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  Low: 'secondary',
  Medium: 'outline',
  High: 'default',
};

interface SpecCardProps {
  spec: Spec;
  onClick?: () => void;
  stale?: boolean;
}

export default function SpecCard({ spec, onClick, stale }: SpecCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: spec.id,
    data: { spec },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const days = daysInPhase(spec.phase_changed_at);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md border-l-4 ${PHASE_COLORS[spec.phase]?.border ?? 'border-slate-400'} ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-1 p-3">
        <button
          {...listeners}
          {...attributes}
          className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          aria-roledescription="draggable spec"
          aria-label={`${spec.title}, ${PHASE_LABELS[spec.phase] ?? spec.phase}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <p className="text-sm font-medium line-clamp-2 mb-2">{spec.title}</p>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Badge variant={complexityVariant[spec.complexity] ?? 'outline'} className="text-xs">
                {spec.complexity}
              </Badge>
              {stale && <AlertTriangle className="h-3 w-3 text-amber-500" aria-label="Expectations changed since gate" />}
            </div>
            <span className="text-muted-foreground">{days}d</span>
          </div>
        </div>
      </div>
    </div>
  );
}
