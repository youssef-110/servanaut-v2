import { Building2 } from 'lucide-react';
import { CompetitorCard } from './CompetitorCard';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export function CompetitorGrid({ competitors, isLoading, error, emptyAction }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} lines={4} />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={Building2} title="Couldn't load competitors" hint={error.message} />;
  }

  if (!competitors?.length) {
    return (
      <EmptyState
        icon={Building2}
        title="No competitors tracked yet"
        hint="Add the companies you're up against — SERVANAUT will monitor their news mentions, GitHub activity, hiring signals, and funding rounds."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {competitors.map((competitor, i) => (
        <CompetitorCard key={competitor.id} competitor={competitor} index={i} />
      ))}
    </div>
  );
}
