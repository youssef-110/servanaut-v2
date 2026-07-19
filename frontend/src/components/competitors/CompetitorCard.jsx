import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Globe,
  Github,
  BriefcaseBusiness,
  Sparkles,
  Trash2,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, timeAgo, threatStyles } from '@/lib/utils';
import { useCompetitorIntel, useRefreshIntel, useDeleteCompetitor } from '@/hooks/useCompetitors';

export function CompetitorCard({ competitor, index = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const intel = useCompetitorIntel(competitor.id, expanded);
  const refreshIntel = useRefreshIntel();
  const deleteCompetitor = useDeleteCompetitor();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Card hover className="flex h-full flex-col">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2">
              <Building2 className="h-4 w-4 text-ink-secondary" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-ink">{competitor.name}</h4>
              {competitor.website && (
                <a
                  href={/^https?:/.test(competitor.website) ? competitor.website : `https://${competitor.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-accent-hover"
                >
                  <Globe className="h-3 w-3" />
                  {competitor.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
          <Badge className={cn('uppercase', threatStyles[competitor.threat_level] || threatStyles.low)}>
            {competitor.threat_level} threat
          </Badge>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3">
          {/* AI intel summary */}
          <div className="rounded-xl border border-edge bg-surface-2/50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet">
              <Sparkles className="h-3 w-3" /> AI Intel Summary
            </div>
            <p className="text-[13px] leading-relaxed text-ink-secondary">
              {competitor.last_intel_summary ||
                'No intel yet — hit "Refresh Intel" to generate an AI assessment from news, GitHub, and hiring signals.'}
            </p>
            <p className="mt-1.5 text-[10px] text-ink-muted">
              Updated {timeAgo(competitor.last_updated)}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              <span className="font-mono">{competitor.jobs_signal_count || 0}</span> hiring signals
            </span>
            {competitor.github_org && (
              <span className="inline-flex items-center gap-1">
                <Github className="h-3.5 w-3.5" /> {competitor.github_org}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center gap-1.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshIntel.mutate(competitor.id)}
              disabled={refreshIntel.isPending}
            >
              <Sparkles className={cn('h-3 w-3', refreshIntel.isPending && 'animate-pulse')} />
              {refreshIntel.isPending ? 'Analyzing…' : 'Refresh Intel'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
              {expanded ? 'Hide activity' : 'Show activity'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto text-ink-muted hover:text-negative"
              onClick={() => {
                if (window.confirm(`Stop tracking ${competitor.name}?`)) {
                  deleteCompetitor.mutate(competitor.id);
                }
              }}
              aria-label={`Delete ${competitor.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {intel.isLoading && (
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                )}
                {intel.data && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                        Latest mentions
                      </p>
                      {intel.data.news?.length ? (
                        <ul className="space-y-1.5">
                          {intel.data.news.slice(0, 4).map((n) => (
                            <li key={n.url}>
                              <a
                                href={n.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-start gap-1.5 text-xs text-ink-secondary hover:text-accent-hover"
                              >
                                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-50" />
                                <span className="leading-snug">{n.title}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-ink-muted">No recent news mentions.</p>
                      )}
                    </div>
                    {intel.data.github_activity?.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                          GitHub activity
                        </p>
                        <ul className="space-y-1">
                          {intel.data.github_activity.slice(0, 4).map((e, i) => (
                            <li key={i} className="font-mono text-[11px] text-ink-secondary">
                              {e.type} → {e.repo}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {intel.data.funding_news?.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                          Funding signals
                        </p>
                        <ul className="space-y-1.5">
                          {intel.data.funding_news.slice(0, 2).map((n) => (
                            <li key={n.url}>
                              <a
                                href={n.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-positive hover:underline"
                              >
                                {n.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
