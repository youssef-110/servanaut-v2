import { useState } from 'react';
import { Newspaper } from 'lucide-react';
import { NewsCard } from './NewsCard';
import { AISummaryPanel } from './AISummaryPanel';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StaleBanner } from '@/components/ui/stale-banner';

/**
 * Renders a list of news cards with skeleton loading, empty state,
 * stale-data banner, and the deep-dive side panel.
 */
export function NewsFeed({ articles, isLoading, error, stale, limit }) {
  const [deepDiveArticle, setDeepDiveArticle] = useState(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={3} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Newspaper}
        title="Couldn't load the news feed"
        hint={error.message}
      />
    );
  }

  const list = limit ? (articles || []).slice(0, limit) : articles || [];

  if (!list.length) {
    return (
      <EmptyState
        icon={Newspaper}
        title="No articles match your topics yet"
        hint="Add topic keywords in Settings (e.g. “robotics”, “Series A funding”) and the feed will populate within a refresh cycle."
      />
    );
  }

  return (
    <>
      <StaleBanner visible={stale} />
      <div className="space-y-3">
        {list.map((article, i) => (
          <NewsCard key={article.id || article.url} article={article} index={i} onDeepDive={setDeepDiveArticle} />
        ))}
      </div>
      <AISummaryPanel article={deepDiveArticle} onClose={() => setDeepDiveArticle(null)} />
    </>
  );
}
