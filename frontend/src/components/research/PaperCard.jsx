import { motion } from 'framer-motion';
import { ExternalLink, FileText, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, timeAgo } from '@/lib/utils';

function relevanceTone(score) {
  if (score >= 8) return 'border-accent/40 bg-accent-muted text-accent-hover';
  if (score >= 5) return 'border-violet/30 bg-violet-muted text-violet';
  return 'border-edge bg-surface-2 text-ink-secondary';
}

export function PaperCard({ paper, index = 0 }) {
  const score = Number(paper.relevance_score || 5);
  const authors = paper.authors_json || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Card hover className="p-4">
        <div className="flex items-start justify-between gap-3">
          <a href={paper.arxiv_url} target="_blank" rel="noreferrer" className="group flex-1">
            <h4 className="text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-accent-hover">
              <FileText className="mr-1.5 inline h-3.5 w-3.5 text-ink-muted" />
              {paper.title}
              <ExternalLink className="ml-1.5 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-70" />
            </h4>
          </a>
          <Badge className={cn('shrink-0 font-mono', relevanceTone(score))} title="Founder relevance, AI-rated 1-10">
            {score.toFixed(0)}/10
          </Badge>
        </div>

        <p className="mt-1 text-[11px] text-ink-muted">
          {authors.slice(0, 4).join(', ')}
          {authors.length > 4 ? ` +${authors.length - 4} more` : ''}
          {paper.published_at ? ` · ${timeAgo(paper.published_at)}` : ''}
        </p>

        {paper.ai_summary && (
          <div className="mt-2.5 rounded-lg border border-edge bg-surface-2/50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet">
              <Sparkles className="h-3 w-3" /> Plain-English Summary
            </div>
            <p className="text-[13px] leading-relaxed text-ink-secondary">{paper.ai_summary}</p>
          </div>
        )}

        {paper.abstract && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink-secondary">
              Original abstract
            </summary>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{paper.abstract}</p>
          </details>
        )}
      </Card>
    </motion.div>
  );
}
