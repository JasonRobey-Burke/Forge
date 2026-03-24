import { cn } from '@/lib/utils';

export const PHASE_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Ready: 'Ready',
  InProgress: 'In Progress',
  Review: 'Review',
  Validating: 'Validating',
  Done: 'Done',
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  Discovery: 'Discovery',
  Active: 'Active',
  Maintenance: 'Maintenance',
  Sunset: 'Sunset',
};

export const INTENTION_STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Defined: 'Defined',
  InProgress: 'In Progress',
  Fulfilled: 'Fulfilled',
  Deferred: 'Deferred',
};

export const EXPECTATION_STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Ready: 'Ready',
  Specced: 'Specced',
  Validated: 'Validated',
  Done: 'Done',
};

export const PHASE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Draft:      { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-400',  dot: 'bg-slate-400' },
  Ready:      { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-400',   dot: 'bg-blue-400' },
  InProgress: { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-400',  dot: 'bg-amber-400' },
  Review:     { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400', dot: 'bg-purple-400' },
  Validating: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400', dot: 'bg-orange-400' },
  Done:       { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-400',  dot: 'bg-green-400' },
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Active:      { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  Discovery:   { bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-400' },
  Maintenance: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  Sunset:      { bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-400' },
};

export function PhaseBadge({ phase }: { phase: string }) {
  const colors = PHASE_COLORS[phase] ?? PHASE_COLORS.Draft;
  const label = PHASE_LABELS[phase] ?? phase;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', colors.bg, colors.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.Active;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', colors.bg, colors.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
      {status}
    </span>
  );
}
