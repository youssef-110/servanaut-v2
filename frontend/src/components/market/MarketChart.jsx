import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, LineChart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StaleBanner } from '@/components/ui/stale-banner';
import { cn, formatPrice } from '@/lib/utils';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-edge bg-surface px-2.5 py-1.5 text-xs shadow-xl">
      <div className="text-ink-muted">{point.date}</div>
      <div className="font-mono font-semibold text-ink">${formatPrice(point.close)}</div>
    </div>
  );
}

/**
 * One public-competitor stock tile: price, signed % change, and a 30-day
 * single-series area sparkline (indigo, within-series gradient only —
 * direction is carried by the signed number + arrow, never color alone).
 */
export function StockTile({ quote, index = 0 }) {
  const up = (quote.change_percent || 0) >= 0;
  const gradientId = `spark-${quote.symbol}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Card hover className="h-full">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
          <div>
            <div className="font-mono text-sm font-semibold text-ink">{quote.symbol}</div>
            {quote.demo && <div className="text-[10px] text-caution">demo data — add ALPHA_VANTAGE_KEY</div>}
            {quote.error && <div className="text-[10px] text-negative">{quote.error}</div>}
          </div>
          <div className="text-right">
            <div className="font-mono text-base font-semibold text-ink">${formatPrice(quote.price)}</div>
            <div
              className={cn(
                'inline-flex items-center gap-0.5 font-mono text-xs font-medium',
                up ? 'text-positive' : 'text-negative'
              )}
            >
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {up ? '+' : ''}
              {Number(quote.change_percent || 0).toFixed(2)}%
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {quote.series?.length > 1 ? (
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={quote.series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 4, fill: '#6366f1', stroke: '#13131a', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-16 items-center justify-center text-xs text-ink-muted">
              No series data
            </div>
          )}
          <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-muted">
            <span>30d ago</span>
            <span>today</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Grid of stock tiles with loading/empty/stale states. */
export function MarketChart({ quotes, isLoading, error, stale }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={3} />
        ))}
      </div>
    );
  }
  if (error) {
    return <EmptyState icon={LineChart} title="Couldn't load market data" hint={error.message} />;
  }
  if (!quotes?.length) {
    return (
      <EmptyState
        icon={LineChart}
        title="No tickers tracked"
        hint="Add stock tickers in Settings (tracked tickers) or set a ticker on a public competitor to see live prices and 30-day trends."
      />
    );
  }
  return (
    <>
      <StaleBanner visible={stale} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quotes.map((quote, i) => (
          <StockTile key={quote.symbol} quote={quote} index={i} />
        ))}
      </div>
    </>
  );
}
