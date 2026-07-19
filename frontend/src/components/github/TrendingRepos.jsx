import { motion } from 'framer-motion';
import { Github, Star, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StaleBanner } from '@/components/ui/stale-banner';
import { formatNumber, timeAgo } from '@/lib/utils';
import { useTrendingRepos } from '@/hooks/useResearch';

export function TrendingRepos({ topics = [], language = '', limit = 10 }) {
  const { data, isLoading, error } = useTrendingRepos({ topics, language });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={2} />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={Github} title="Couldn't load trending repos" hint={error.message} />;
  }

  const repos = (data?.repos || []).slice(0, limit);

  if (!repos.length) {
    return (
      <EmptyState
        icon={Github}
        title="No trending repos found"
        hint="Set GitHub topics in Settings (e.g. “robotics”, “llm”) to surface the fastest-growing new repositories in your domain each week."
      />
    );
  }

  return (
    <>
      <StaleBanner visible={data?.stale} />
      <div className="space-y-3">
        {repos.map((repo, i) => (
          <motion.div
            key={repo.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
          >
            <Card hover className="p-4">
              <div className="flex items-start justify-between gap-3">
                <a href={repo.url} target="_blank" rel="noreferrer" className="group min-w-0 flex-1">
                  <h4 className="truncate font-mono text-sm font-semibold text-ink transition-colors group-hover:text-accent-hover">
                    <Github className="mr-1.5 inline h-3.5 w-3.5 text-ink-muted" />
                    {repo.name}
                    <ExternalLink className="ml-1.5 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-70" />
                  </h4>
                </a>
                <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-caution">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {formatNumber(repo.stars)}
                </span>
              </div>
              {repo.description && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">{repo.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {repo.language && (
                  <Badge className="border-edge bg-surface-2 text-ink-secondary">{repo.language}</Badge>
                )}
                {(repo.topics || []).slice(0, 4).map((topic) => (
                  <Badge key={topic} className="border-violet/20 bg-violet-muted text-violet">
                    {topic}
                  </Badge>
                ))}
                <span className="ml-auto text-[10px] text-ink-muted">created {timeAgo(repo.created_at)}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </>
  );
}
