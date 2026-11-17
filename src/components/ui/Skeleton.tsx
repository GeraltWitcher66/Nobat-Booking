import { cn } from '@/lib/cn';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-xl bg-line/60', className)} />
);

export const SkeletonCard = () => (
  <div className="card space-y-3 p-5">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-3 w-2/3" />
    <Skeleton className="h-24 w-full" />
  </div>
);
