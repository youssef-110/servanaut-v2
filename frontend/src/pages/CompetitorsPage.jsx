import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { CompetitorGrid } from '@/components/competitors/CompetitorGrid';
import { useCompetitors } from '@/hooks/useCompetitors';

const linkButtonClasses =
  'inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-edge bg-surface-2 px-3 text-xs font-medium text-ink transition-colors hover:bg-edge';

export default function CompetitorsPage() {
  const { data, isLoading, error } = useCompetitors();

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-secondary">
          {data?.competitors?.length
            ? `Tracking ${data.competitors.length} competitor${data.competitors.length === 1 ? '' : 's'} across news, GitHub, hiring, and funding.`
            : 'Competitor intelligence, auto-gathered.'}
        </p>
        <Link to="/settings" className={linkButtonClasses}>
          <Plus className="h-3.5 w-3.5" /> Manage competitors
        </Link>
      </div>
      <CompetitorGrid
        competitors={data?.competitors}
        isLoading={isLoading}
        error={error}
        emptyAction={
          <Link
            to="/settings"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" /> Add your first competitor
          </Link>
        }
      />
    </div>
  );
}
