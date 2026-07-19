import { motion } from 'framer-motion';
import { Gauge, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useMarketSentiment, useHotTopics } from '@/hooks/useMarket';

/**
 * Semicircular sentiment gauge. The value is always shown as a number +
 * word label — the arc color reinforces but never solely carries meaning.
 */
function SentimentGauge({ score, label, counts, total }) {
  const clamped = Math.max(0, Math.min(100, score));
  // Semicircle from 180° to 0°; radius 80, center (100, 95).
  const angle = Math.PI * (1 - clamped / 100);
  const needleX = 100 + 80 * Math.cos(angle);
  const needleY = 95 - 80 * Math.sin(angle);
  const arcLength = Math.PI * 80;
  const filled = (clamped / 100) * arcLength;

  const tone = clamped >= 60 ? '#34d399' : clamped <= 40 ? '#f87171' : '#8b5cf6';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-full max-w-[240px]" role="img" aria-label={`Market sentiment ${clamped} out of 100, ${label}`}>
        <path
          d="M 20 95 A 80 80 0 0 1 180 95"
          fill="none"
          stroke="#1e1e2e"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 20 95 A 80 80 0 0 1 180 95"
          fill="none"
          stroke={tone}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${arcLength}`}
        />
        <circle cx={needleX} cy={needleY} r="6" fill={tone} stroke="#13131a" strokeWidth="2.5" />
      </svg>
      <div className="-mt-8 text-center">
        <div className="font-mono text-3xl font-bold text-ink">{clamped}</div>
        <div className={cn('text-xs font-semibold uppercase tracking-widest')} style={{ color: tone }}>
          {label}
        </div>
      </div>
      <div className="mt-3 flex gap-4 font-mono text-[11px] text-ink-muted">
        <span>▲ {counts?.positive ?? 0} positive</span>
        <span>— {counts?.neutral ?? 0} neutral</span>
        <span>▼ {counts?.negative ?? 0} negative</span>
      </div>
      <p className="mt-1 text-[10px] text-ink-muted">across {total} recent articles in your topics</p>
    </div>
  );
}

/** Tag-frequency list — each term carries its count, sized by frequency. */
function HotTopicsCloud({ topics }) {
  if (!topics?.length) {
    return (
      <p className="py-6 text-center text-xs text-ink-muted">
        Not enough headline volume yet to detect trending terms.
      </p>
    );
  }
  const max = topics[0]?.count || 1;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {topics.map(({ term, count }) => {
        const weight = count / max;
        return (
          <span
            key={term}
            className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface-2 px-2.5 py-1 transition-colors hover:border-accent/40"
            style={{ fontSize: `${11 + weight * 6}px` }}
          >
            <span className="text-ink">{term}</span>
            <span className="font-mono text-[10px] text-violet">{count}</span>
          </span>
        );
      })}
    </div>
  );
}

export function MarketSummary() {
  const sentiment = useMarketSentiment();
  const hotTopics = useHotTopics();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-accent-hover" /> Market Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sentiment.isLoading && (
              <div className="space-y-3 py-4">
                <Skeleton className="mx-auto h-24 w-48 rounded-full" />
                <Skeleton className="mx-auto h-4 w-32" />
              </div>
            )}
            {sentiment.error && (
              <EmptyState icon={Gauge} title="Sentiment unavailable" hint={sentiment.error.message} />
            )}
            {sentiment.data?.sentiment && (
              <SentimentGauge
                score={sentiment.data.sentiment.score}
                label={sentiment.data.sentiment.label}
                counts={sentiment.data.sentiment.counts}
                total={sentiment.data.sentiment.total}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-violet" /> Hot Topics This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hotTopics.isLoading && (
              <div className="flex flex-wrap gap-2 py-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
            )}
            {hotTopics.error && (
              <EmptyState icon={Flame} title="Hot topics unavailable" hint={hotTopics.error.message} />
            )}
            {hotTopics.data && <HotTopicsCloud topics={hotTopics.data.topics} />}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
