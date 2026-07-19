import { cn } from '@/lib/utils';

export function Separator({ className, vertical = false }) {
  return (
    <div
      role="separator"
      className={cn(vertical ? 'w-px self-stretch bg-edge' : 'h-px w-full bg-edge', className)}
    />
  );
}
