import { FlaskConical } from 'lucide-react';
import { PaperCard } from './PaperCard';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StaleBanner } from '@/components/ui/stale-banner';
import { usePapers } from '@/hooks/useResearch';

export function ResearchFeed({ keywords = [], limit }) {
  const { data, isLoading, error } = usePapers(keywords);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} lines={4} />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={FlaskConical} title="Couldn't load research papers" hint={error.message} />;
  }

  const papers = limit ? (data?.papers || []).slice(0, limit) : data?.papers || [];

  if (!papers.length) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No papers matched your research keywords"
        hint="Set research keywords in Settings (e.g. “robotic manipulation”, “foundation models”) to track the latest ArXiv publications in your field."
      />
    );
  }

  return (
    <>
      <StaleBanner visible={data?.stale} />
      <div className="space-y-3">
        {papers.map((paper, i) => (
          <PaperCard key={paper.id || paper.arxiv_url} paper={paper} index={i} />
        ))}
      </div>
    </>
  );
}
