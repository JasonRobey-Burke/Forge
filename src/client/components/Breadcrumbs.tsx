import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span>/</span>}
          {item.href ? (
            <Link to={item.href} className="hover:text-foreground hover:underline max-w-[200px] truncate inline-block align-bottom">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground max-w-[200px] truncate inline-block align-bottom">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
