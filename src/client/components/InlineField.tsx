import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineFieldProps {
  editing: boolean;
  children: ReactNode;
  className?: string;
}

export default function InlineField({ editing, children, className }: InlineFieldProps) {
  if (!editing) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative rounded-md border border-blue-300 bg-blue-50/50 px-3 py-2', className)}>
      <Pencil className="absolute top-2 right-2 h-3.5 w-3.5 text-blue-400 pointer-events-none" />
      {children}
    </div>
  );
}
