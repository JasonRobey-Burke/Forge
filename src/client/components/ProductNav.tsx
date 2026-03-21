import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ProductNavProps {
  productId: string;
  productName: string | null;
}

const tabs = [
  { label: 'Overview', path: '' },
  { label: 'Intentions', path: '/intentions' },
  { label: 'Specs', path: '/specs' },
  { label: 'Board', path: '/board' },
];

export default function ProductNav({ productId }: ProductNavProps) {
  const location = useLocation();
  const basePath = `/products/${productId}`;

  return (
    <div className="border-b bg-muted/30">
      <div className="container mx-auto px-4">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => {
            const tabPath = `${basePath}${tab.path}`;
            // Overview: exact match on basePath or basePath/edit; others: startsWith
            const isActive =
              tab.path === ''
                ? location.pathname === basePath ||
                  location.pathname === `${basePath}/edit`
                : location.pathname.startsWith(tabPath);

            return (
              <Link
                key={tab.label}
                to={tabPath}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
