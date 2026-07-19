import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Trash2, ChevronDown, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, timeAgo, priorityStyles } from '@/lib/utils';
import {
  useWatchlistMatches,
  useUpdateWatchlistItem,
  useDeleteWatchlistItem,
} from '@/hooks/useWatchlist';

export function WatchlistItem({ item, index = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const matches = useWatchlistMatches(item.id, expanded);
  const updateItem = useUpdateWatchlistItem();
  const deleteItem = useDeleteWatchlistItem();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Card hover>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-muted">
              <Eye className="h-4 w-4 text-violet" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-ink">{item.label}</h4>
              <p className="text-[11px] text-ink-muted">
                {(item.keywords_json || []).join(', ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn('capitalize', priorityStyles[item.priority] || priorityStyles.medium)}>
              {item.priority}
            </Badge>
            <Select
              value={item.priority}
              onChange={(e) => updateItem.mutate({ id: item.id, priority: e.target.value })}
              className="h-7 w-24 text-xs"
              aria-label="Change priority"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-4 text-xs text-ink-muted">
            <span>
              <span className="font-mono font-semibold text-ink">{item.hit_count_week || 0}</span> hits this week
            </span>
            <span>
              Last hit:{' '}
              <span className="text-ink-secondary">
                {item.last_hit_at ? timeAgo(item.last_hit_at) : 'never'}
              </span>
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
                Matches
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-ink-muted hover:text-negative"
                onClick={() => {
                  if (window.confirm(`Remove "${item.label}" from your watchlist?`)) {
                    deleteItem.mutate(item.id);
                  }
                }}
                aria-label={`Delete ${item.label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 border-t border-edge pt-3">
                  {matches.isLoading && (
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  )}
                  {matches.data &&
                    (matches.data.matches?.length ? (
                      <ul className="space-y-2">
                        {matches.data.matches.map((m) => (
                          <li key={m.id} className="flex items-start gap-2 text-xs text-ink-secondary">
                            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-50" />
                            {m.source_url ? (
                              <a href={m.source_url} target="_blank" rel="noreferrer" className="leading-snug hover:text-accent-hover">
                                {m.title}
                              </a>
                            ) : (
                              <span className="leading-snug">{m.title}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-ink-muted">
                        No matches yet — the monitor scans news every 15 minutes and research hourly.
                      </p>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
