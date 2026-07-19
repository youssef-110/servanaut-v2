import { MarketChart } from '@/components/market/MarketChart';
import { MarketSummary } from '@/components/market/MarketSummary';
import { useQuotes } from '@/hooks/useMarket';

export default function MarketPage() {
  const quotes = useQuotes();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-secondary">
          Public Competitor Stocks — 30-Day Trend
        </h2>
        <MarketChart
          quotes={quotes.data?.quotes}
          isLoading={quotes.isLoading}
          error={quotes.error}
          stale={quotes.data?.stale}
        />
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-secondary">
          Sentiment & Trends
        </h2>
        <MarketSummary />
      </div>
    </div>
  );
}
