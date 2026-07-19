import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Newspaper, TrendingUp, FlaskConical } from 'lucide-react';
import { DailyBriefing } from '@/components/briefing/DailyBriefing';
import { NewsFeed } from '@/components/news/NewsFeed';
import { AlertsPanel } from '@/components/alerts/AlertsPanel';
import { MarketChart } from '@/components/market/MarketChart';
import { ResearchFeed } from '@/components/research/ResearchFeed';
import { useNews } from '@/hooks/useNews';
import { useQuotes } from '@/hooks/useMarket';

function SectionHeader({ icon: Icon, title, to, linkLabel }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-secondary">
        <Icon className="h-4 w-4 text-accent-hover" /> {title}
      </h2>
      {to && (
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-xs text-accent-hover transition-colors hover:text-accent"
        >
          {linkLabel || 'View all'} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const news = useNews({ sort: 'relevance' });
  const quotes = useQuotes();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Full-width briefing at the top */}
      <DailyBriefing />

      {/* News 2/3 + Alerts 1/3 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader icon={Newspaper} title="Intelligence Feed" to="/news" />
          <NewsFeed
            articles={news.data?.articles}
            isLoading={news.isLoading}
            error={news.error}
            stale={news.data?.stale}
            limit={5}
          />
        </div>
        <div>
          <SectionHeader icon={Bell} title="Latest Alerts" to="/alerts" />
          <AlertsPanel limit={5} showMarkAll={false} />
        </div>
      </div>

      {/* Market row */}
      <div>
        <SectionHeader icon={TrendingUp} title="Market Watch" to="/market" />
        <MarketChart
          quotes={quotes.data?.quotes}
          isLoading={quotes.isLoading}
          error={quotes.error}
          stale={quotes.data?.stale}
        />
      </div>

      {/* Research row */}
      <div>
        <SectionHeader icon={FlaskConical} title="Fresh Research" to="/research" />
        <ResearchFeed limit={3} />
      </div>
    </div>
  );
}
