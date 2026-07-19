import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/news': 'News Feed',
  '/competitors': 'Competitor Intelligence',
  '/market': 'Market Intelligence',
  '/research': 'Research & Innovation',
  '/watchlist': 'Smart Watchlist',
  '/alerts': 'Alerts',
  '/settings': 'Settings',
};

export function TopBar() {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const { data } = useSettings();
  const [refreshing, setRefreshing] = useState(false);

  const title = PAGE_TITLES[pathname] || 'SERVANAUT';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const refreshAll = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-edge bg-background/80 px-5 py-3.5 backdrop-blur-xl md:px-8">
      <div>
        <h1 className="text-lg font-bold text-ink">{title}</h1>
        <p className="text-xs text-ink-muted">
          {today}
          {data?.profile?.company_name ? ` · ${data.profile.company_name}` : ''}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={refreshAll} disabled={refreshing}>
        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        Refresh
      </Button>
    </header>
  );
}
