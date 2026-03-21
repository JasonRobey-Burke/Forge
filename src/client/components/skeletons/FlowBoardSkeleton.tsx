import { Skeleton } from '@/components/ui/skeleton';

export default function FlowBoardSkeleton() {
  return (
    <div className="grid grid-cols-6 gap-3" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex flex-col rounded-lg border bg-muted/30 min-w-[200px]">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="p-2 space-y-2">
            {Array.from({ length: 2 }, (_, j) => (
              <div key={j} className="rounded-lg border bg-card p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
