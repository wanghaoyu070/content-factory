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
    <div className="bg-[#16162a] rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-[#2d2d44]">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
        <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl" />
      </div>
      <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-[#16162a] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#2d2d44]">
      <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 mb-3 sm:mb-4" />
      <Skeleton className="h-48 sm:h-64 w-full" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4">
      <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1.5 sm:space-y-2">
        <Skeleton className="h-3 sm:h-4 w-3/4" />
        <Skeleton className="h-2.5 sm:h-3 w-1/2" />
      </div>
    </div>
  );
}

export function InsightCardSkeleton() {
  return (
    <div className="p-3 sm:p-4 border-b border-[#2d2d44]">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
        <Skeleton className="h-4 sm:h-5 w-12 sm:w-16 rounded-full" />
        <Skeleton className="h-3 sm:h-4 w-16 sm:w-24" />
      </div>
      <Skeleton className="h-4 sm:h-5 w-3/4 mb-1.5 sm:mb-2" />
      <Skeleton className="h-3 sm:h-4 w-full" />
      <Skeleton className="h-3 sm:h-4 w-2/3 mt-1" />
    </div>
  );
}

// 移动端友好的搜索区域骨架屏
export function SearchAreaSkeleton() {
  return (
    <div className="bg-[#16162a] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#2d2d44]">
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 w-full sm:w-28 rounded-xl" />
      </div>
    </div>
  );
}
