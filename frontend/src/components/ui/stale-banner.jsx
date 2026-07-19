import { CloudOff } from 'lucide-react';

/** Shown when the backend served cached data because an upstream API failed. */
export function StaleBanner({ visible }) {
  if (!visible) return null;
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-caution/30 bg-caution/10 px-3 py-2 text-xs text-caution">
      <CloudOff className="h-3.5 w-3.5 shrink-0" />
      Showing cached data — a live source is temporarily unavailable.
    </div>
  );
}
