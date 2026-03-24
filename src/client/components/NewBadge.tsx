import { Badge } from '@/components/ui/badge';

const NEW_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function isRecentlyCreated(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_THRESHOLD_MS;
}

export default function NewBadge({ createdAt }: { createdAt: string }) {
  if (!isRecentlyCreated(createdAt)) return null;
  return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] px-1.5 py-0 leading-4 animate-pulse">
      New
    </Badge>
  );
}
