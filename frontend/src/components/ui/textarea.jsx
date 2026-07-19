import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[90px] w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink',
        'placeholder:text-ink-muted',
        'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50',
        'disabled:opacity-50 resize-y',
        className
      )}
      {...props}
    />
  );
});
