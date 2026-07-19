import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-edge bg-surface-2 px-3 text-sm text-ink',
        'placeholder:text-ink-muted',
        'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50',
        'disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
