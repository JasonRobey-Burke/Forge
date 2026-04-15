import { Info } from 'lucide-react';

interface TermHintProps {
  term: string;
  description: string;
}

export default function TermHint({ term, description }: TermHintProps) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{term}</span>
      <span title={description} aria-label={`${term}: ${description}`}>
        <Info className="h-3.5 w-3.5" />
      </span>
    </span>
  );
}
