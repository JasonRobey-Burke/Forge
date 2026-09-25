import { Link } from 'react-router-dom';
type Spec = BaseSpec & {source: import('@shared/types/source').SourceMeta};
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import GapCheckBadge from '@/components/GapCheckBadge';
import { PHASE_COLORS, PHASE_LABELS } from '@/lib/phaseColors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Spec as BaseSpec } from '@shared/types';

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
  outcomes?: {id:string;title:string}[];
  gate?: {message:string;href:string;label:string};
  onClick?: () => void;
  stale?: boolean;
  onMoveToPhase?: (spec: Spec, phase: string) => void;
}

const PHASES = ['Draft', 'Ready', 'InProgress', 'Review', 'Validating', 'Done'] as const;

export default function SpecCard({ spec, onClick, stale, onMoveToPhase, outcomes, gate }: SpecCardProps) {
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
          <button type="button" className="mb-2 text-left text-sm font-medium line-clamp-2">{spec.title}</button>
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant={complexityVariant[spec.complexity] ?? 'outline'} className="text-xs">
                {spec.complexity}
              </Badge>
              {(spec.gap_check || ['Ready', 'InProgress', 'Review', 'Validating', 'Done'].includes(spec.phase)) && (
                <GapCheckBadge gapCheck={spec.gap_check} />
              )}
              {stale && <AlertTriangle className="h-3 w-3 text-amber-500" aria-label="Expectations changed since gate" />}
            </div>
            <span className="text-muted-foreground">{Number.isFinite(days)?`${days}d`:'Age unknown'}</span>
          </div>
        </div>
        {onMoveToPhase && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="shrink-0 mt-0.5 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label={`Move ${spec.title} to another phase`}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PHASES.filter((phase) => phase !== spec.phase).map((phase) => (
                <DropdownMenuItem
                  key={phase}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveToPhase(spec, phase);
                  }}
                >
                  Move to {PHASE_LABELS[phase] ?? phase}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {outcomes && outcomes.length > 0 && <ul aria-label="Related outcomes" className="space-y-1 border-t px-3 py-2 text-xs">{outcomes.map(outcome=><li key={outcome.id}><Link className="text-emerald-800 underline" to={`/products/${spec.product_id}/board?outcome=${encodeURIComponent(outcome.id)}`}>{outcome.title}</Link></li>)}</ul>}
      {gate && <div className="space-y-1 border-t bg-amber-50/70 px-3 py-2 text-xs"><p>{gate.message}</p><Link className="text-emerald-900 underline" to={gate.href}>{gate.label}</Link></div>}
    </div>
  );
}
