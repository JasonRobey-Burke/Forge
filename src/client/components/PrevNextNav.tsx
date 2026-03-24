import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavItem {
  id: string;
  title: string;
}

interface PrevNextNavProps {
  prev: NavItem | null;
  next: NavItem | null;
  buildUrl: (id: string) => string;
}

export default function PrevNextNav({ prev, next, buildUrl }: PrevNextNavProps) {
  if (!prev && !next) return null;

  return (
    <nav className="flex items-stretch gap-3 mt-6 pt-4 border-t">
      {/* Prev */}
      <div className="flex-1 min-w-0">
        {prev ? (
          <Link
            to={buildUrl(prev.id)}
            className="group flex items-center gap-2 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 p-3 transition-colors h-full"
          >
            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Previous</p>
              <p className="text-xs font-mono text-muted-foreground">{prev.id}</p>
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{prev.title}</p>
            </div>
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* Next */}
      <div className="flex-1 min-w-0">
        {next ? (
          <Link
            to={buildUrl(next.id)}
            className="group flex items-center justify-end gap-2 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 p-3 transition-colors text-right h-full"
          >
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Next</p>
              <p className="text-xs font-mono text-muted-foreground">{next.id}</p>
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{next.title}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </nav>
  );
}
