import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return <div className={cn('skeleton', className)} {...props} />;
}

/** Ready-made skeleton block matching the shape of a feed card. */
export function CardSkeleton({ lines = 3, className }) {
  return (
    <div className={cn('glass rounded-2xl p-5 space-y-3', className)}>
      <Skeleton className="h-4 w-3/4" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-1/2' : 'w-full')} />
      ))}
    </div>
  );
}
