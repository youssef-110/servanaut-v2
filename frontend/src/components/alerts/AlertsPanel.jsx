import { BellOff, CheckCheck } from 'lucide-react';
import { AlertItem } from './AlertItem';
import { Button } from '@/components/ui/button';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAlerts, useMarkAllAlertsRead } from '@/hooks/useAlerts';

/**
 * Alert list with optional filters. Used compact on the Dashboard
 * (limit) and full-size on the Alerts page.
 */
export function AlertsPanel({ type, unread, limit, showMarkAll = true }) {
  const { data, isLoading, error } = useAlerts({ type, unread });
  const markAll = useMarkAllAlertsRead();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} lines={2} />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={BellOff} title="Couldn't load alerts" hint={error.message} />;
  }

  const alerts = limit ? (data?.alerts || []).slice(0, limit) : data?.alerts || [];
  const hasUnread = (data?.alerts || []).some((a) => !a.is_read);

  if (!alerts.length) {
    return (
      <EmptyState
        icon={BellOff}
        title="All quiet on the intelligence front"
        hint="Alerts fire automatically on watchlist hits, competitor threat changes, news spikes, and research matches."
      />
    );
  }

  return (
    <div className="space-y-3">
      {showMarkAll && hasUnread && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
      )}
      {alerts.map((alert, i) => (
        <AlertItem key={alert.id} alert={alert} index={i} />
      ))}
    </div>
  );
}
