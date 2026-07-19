import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full appearance-none rounded-lg border border-edge bg-surface-2 px-3 pr-8 text-sm text-ink',
        'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50',
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%239d9db3%27%20stroke-width%3D%272%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[position:right_10px_center] bg-no-repeat',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
