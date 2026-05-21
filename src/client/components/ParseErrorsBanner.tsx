import { useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useHealth } from '@/hooks/useHealth';

function shortPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return normalized;
  return parts.slice(-2).join('/');
}

export default function ParseErrorsBanner() {
  const { data } = useHealth();
  const [open, setOpen] = useState(false);

  const errors = data?.store.parseErrors ?? [];
  if (errors.length === 0) return null;

  const count = errors.length;
  const noun = count === 1 ? 'file' : 'files';

  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-b border-destructive/30 bg-destructive/10"
    >
      <div className="container mx-auto px-4 py-2">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 text-left text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <span className="font-medium text-destructive">
              {count} YAML {noun} failed to parse
            </span>
            <span className="text-destructive/70">
              — Forge couldn't load {count === 1 ? 'it' : 'them'}.
            </span>
            <ChevronDown
              className={`ml-auto h-4 w-4 shrink-0 text-destructive transition-transform ${open ? '' : '-rotate-90'}`}
              aria-hidden="true"
            />
            <span className="sr-only">{open ? 'Collapse details' : 'Expand details'}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pb-1">
            <ul className="space-y-1 pl-6 text-xs">
              {errors.map((err) => (
                <li key={err.filePath} className="font-mono">
                  <span className="font-semibold text-destructive">{shortPath(err.filePath)}</span>
                  <span className="text-destructive/70"> — {err.message}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 pl-6 text-xs text-muted-foreground">
              Common cause: duplicate YAML keys (e.g. two <code className="font-mono">expectations:</code> blocks).
              Fix the file and Forge will reload automatically.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
