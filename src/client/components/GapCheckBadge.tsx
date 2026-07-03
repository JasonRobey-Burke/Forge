import { ShieldCheck, ShieldAlert, ShieldX, Shield } from 'lucide-react';
import { gapCheckBadge, type GapCheckTone } from '@shared/lib/gapCheck';
import type { GapCheck } from '@shared/types';
import { cn } from '@/lib/utils';

const TONE_STYLES: Record<GapCheckTone, string> = {
  passed: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  warnings: 'border-amber-300 bg-amber-50 text-amber-700',
  blocked: 'border-red-300 bg-red-50 text-red-700',
  ungated: 'border-slate-200 bg-slate-50 text-slate-500',
};

const TONE_ICONS: Record<GapCheckTone, typeof Shield> = {
  passed: ShieldCheck,
  warnings: ShieldAlert,
  blocked: ShieldX,
  ungated: Shield,
};

interface GapCheckBadgeProps {
  gapCheck?: GapCheck;
  /** compact = icon + short label for cards; full adds the detail sentence for headers */
  variant?: 'compact' | 'full';
  className?: string;
}

/** Gate-state badge for the IDD gap-check annotation. */
export default function GapCheckBadge({ gapCheck, variant = 'compact', className }: GapCheckBadgeProps) {
  const descriptor = gapCheckBadge(gapCheck);
  const Icon = TONE_ICONS[descriptor.tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        TONE_STYLES[descriptor.tone],
        className,
      )}
      title={descriptor.detail}
      aria-label={descriptor.detail}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{descriptor.label}</span>
      {variant === 'full' && (
        <span className="font-normal opacity-80">· {descriptor.detail}</span>
      )}
    </span>
  );
}
