import { motion } from 'framer-motion';
import { Bookmark, BookmarkCheck, ExternalLink, Sparkles, CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, timeAgo, sentimentStyles } from '@/lib/utils';
import { useMarkRead, useSaveArticle } from '@/hooks/useNews';

export function NewsCard({ article, onDeepDive, index = 0 }) {
  const markRead = useMarkRead();
  const saveArticle = useSaveArticle();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Card hover className={cn('p-4', article.is_read && 'opacity-60')}>
        <div className="flex items-start justify-between gap-3">
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => !article.is_read && markRead.mutate({ id: article.id })}
            className="group flex-1"
          >
            <h4 className="text-sm font-semibold leading-snug text-ink group-hover:text-accent-hover transition-colors">
              {article.title}
              <ExternalLink className="ml-1.5 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-70" />
            </h4>
          </a>
          <Badge className={cn('shrink-0 capitalize', sentimentStyles[article.sentiment] || sentimentStyles.neutral)}>
            {article.sentiment || 'neutral'}
          </Badge>
        </div>

        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-muted">
          <span className="font-medium text-ink-secondary">{article.source}</span>
          <span>·</span>
          <span>{timeAgo(article.published_at)}</span>
          <span>·</span>
          <span className="font-mono">
            relevance {Number(article.relevance_score || 5).toFixed(0)}/10
          </span>
        </div>

        {article.ai_summary && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{article.ai_summary}</p>
        )}

        <div className="mt-3 flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => onDeepDive?.(article)}>
            <Sparkles className="h-3 w-3" />
            Deep Dive
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => saveArticle.mutate({ id: article.id, isSaved: !article.is_saved })}
            title={article.is_saved ? 'Remove from saved' : 'Save article'}
          >
            {article.is_saved ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-accent-hover" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
            {article.is_saved ? 'Saved' : 'Save'}
          </Button>
          {!article.is_read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markRead.mutate({ id: article.id })}
              title="Mark as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark read
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
