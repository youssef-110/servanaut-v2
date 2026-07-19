import { cn } from '@/lib/utils';

/**
 * Meaningful empty state: icon, headline, hint, and optional action button.
 * Every section uses this instead of showing a blank card.
 */
export function EmptyState({ icon: Icon, title, hint, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 px-6 text-center', className)}>
      {Icon && (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted">
          <Icon className="h-6 w-6 text-accent-hover" />
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-5 text-ink-muted">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
