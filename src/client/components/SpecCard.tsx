import { useDraggable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
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
}

export default function SpecCard({ spec, onClick }: SpecCardProps) {
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
      {...listeners}
      {...attributes}
      style={style}
      onClick={onClick}
      className={`rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${isDragging ? 'opacity-50' : ''}`}
    >
      <p className="text-sm font-medium line-clamp-2 mb-2">{spec.title}</p>
      <div className="flex items-center justify-between text-xs">
        <Badge variant={complexityVariant[spec.complexity] ?? 'outline'} className="text-xs">
          {spec.complexity}
        </Badge>
        <span className="text-muted-foreground">{days}d</span>
      </div>
    </div>
  );
}
