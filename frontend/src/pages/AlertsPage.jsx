import { useState } from 'react';
import { AlertsPanel } from '@/components/alerts/AlertsPanel';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { alertTypeLabels } from '@/lib/utils';

export default function AlertsPage() {
  const [type, setType] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-44" aria-label="Alert type filter">
          <option value="">All types</option>
          {Object.entries(alertTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
          Unread only
        </label>
      </div>
      <AlertsPanel type={type || undefined} unread={unreadOnly || undefined} />
    </div>
  );
}
