import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[#1a1a2e]',
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
      <Skeleton className="h-6 w-32 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="p-4 flex items-start gap-4">
      <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function InsightCardSkeleton() {
  return (
    <div className="p-4 border-b border-[#2d2d44]">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3 mt-1" />
    </div>
  );
}
