import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
      {icon && <div className="mb-3 flex justify-center text-muted-foreground">{icon}</div>}
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button type="button" variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
