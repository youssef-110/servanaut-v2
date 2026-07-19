import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  TrendingUp,
  Building2,
  Eye,
  FlaskConical,
  Sparkles,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, timeAgo, alertTypeLabels } from '@/lib/utils';
import { useMarkAlertRead, useExplainAlert } from '@/hooks/useAlerts';

const TYPE_ICONS = {
  news_spike: TrendingUp,
  competitor: Building2,
  watchlist: Eye,
  research: FlaskConical,
  system: Bell,
};

const TYPE_TONES = {
  news_spike: 'text-caution bg-caution/10',
  competitor: 'text-negative bg-negative/10',
  watchlist: 'text-violet bg-violet-muted',
  research: 'text-accent-hover bg-accent-muted',
  system: 'text-ink-secondary bg-surface-2',
};

export function AlertItem({ alert, index = 0 }) {
  const markRead = useMarkAlertRead();
  const explain = useExplainAlert();
  const [explanation, setExplanation] = useState(null);

  const Icon = TYPE_ICONS[alert.type] || Bell;

  const handleExplain = () => {
    if (explanation) {
      setExplanation(null);
      return;
    }
    explain.mutate(alert.id, {
      onSuccess: (data) => setExplanation(data.explanation),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card hover className={cn('p-3.5', alert.is_read && 'opacity-55')}>
        <div className="flex items-start gap-3">
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TYPE_TONES[alert.type] || TYPE_TONES.system)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {!alert.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
              <p className="truncate text-[13px] font-semibold leading-snug text-ink" title={alert.title}>
                {alert.title}
              </p>
            </div>
            {alert.content && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-secondary">{alert.content}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge className="border-edge bg-surface-2 text-ink-muted">{alertTypeLabels[alert.type] || alert.type}</Badge>
              <span className="text-[10px] text-ink-muted">{timeAgo(alert.created_at)}</span>
              {alert.source_url && (
                <a
                  href={alert.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-[10px] text-accent-hover hover:underline"
                >
                  source <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              <span className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleExplain} disabled={explain.isPending}>
                  <Sparkles className={cn('h-3 w-3', explain.isPending && 'animate-pulse')} />
                  {explain.isPending ? 'Thinking…' : explanation ? 'Hide' : 'AI Explain This'}
                </Button>
                {!alert.is_read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead.mutate(alert.id)} title="Mark read">
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </span>
            </div>

            <AnimatePresence>
              {explain.isPending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </motion.div>
              )}
              {explanation && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 overflow-hidden rounded-lg border border-accent/20 bg-accent-muted/40 px-3 py-2 text-xs leading-relaxed text-ink-secondary"
                >
                  {explanation}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
