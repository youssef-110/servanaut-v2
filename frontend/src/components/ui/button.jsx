import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-accent text-white hover:bg-accent-hover shadow-[0_0_20px_rgba(99,102,241,0.25)]',
  secondary: 'bg-surface-2 text-ink hover:bg-edge border border-edge',
  ghost: 'text-ink-secondary hover:text-ink hover:bg-surface-2',
  outline: 'border border-edge text-ink hover:border-accent/50 hover:bg-accent-muted',
  destructive: 'bg-negative/15 text-negative border border-negative/30 hover:bg-negative/25',
};

const sizes = {
  default: 'h-9 px-4 text-sm',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-11 px-6 text-sm',
  icon: 'h-9 w-9',
};

export const Button = forwardRef(function Button(
  { className, variant = 'default', size = 'default', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
