import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sunrise,
  RefreshCw,
  TrendingUp,
  Swords,
  FlaskConical,
  Rocket,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useBriefing, useRegenerateBriefing } from '@/hooks/useBriefing';

const SECTIONS = [
  { key: 'market_pulse', label: 'Market Pulse', icon: TrendingUp },
  { key: 'competitor_moves', label: 'Competitor Moves', icon: Swords },
  { key: 'research_highlights', label: 'Research Highlights', icon: FlaskConical },
  { key: 'opportunities', label: 'Opportunities', icon: Rocket },
  { key: 'risks', label: 'Risks', icon: ShieldAlert },
];

function BriefingSection({ icon: Icon, label, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-edge bg-surface-2/50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-muted">
          <Icon className="h-3.5 w-3.5 text-accent-hover" />
        </div>
        <span className="flex-1 text-[13px] font-semibold text-ink">{label}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-ink-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 pl-14 text-[13px] leading-relaxed text-ink-secondary">
              {content || 'No data for this section today.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DailyBriefing() {
  const { data, isLoading, error } = useBriefing();
  const regenerate = useRegenerateBriefing();

  const briefing = data?.briefing;
  const content = briefing?.content_json || {};

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-accent via-violet to-transparent" />
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-violet/30">
              <Sunrise className="h-4.5 w-4.5 h-[18px] w-[18px] text-accent-hover" />
            </div>
            <div>
              <CardTitle className="text-base">Daily Briefing</CardTitle>
              <p className="text-xs text-ink-muted">
                {briefing?.generated_at
                  ? `Generated ${new Date(briefing.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                  : 'Your AI-generated morning intelligence'}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', regenerate.isPending && 'animate-spin')} />
            Regenerate
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {(isLoading || regenerate.isPending) && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {error && !isLoading && (
            <p className="text-sm text-negative">Briefing unavailable: {error.message}</p>
          )}

          {!isLoading && !regenerate.isPending && briefing && (
            <>
              {content.tldr && (
                <p className="rounded-xl border border-accent/20 bg-accent-muted/50 px-4 py-3 text-[13px] font-medium leading-relaxed text-ink">
                  {content.tldr}
                </p>
              )}
              <div className="grid gap-2">
                {SECTIONS.map((section, i) => (
                  <BriefingSection
                    key={section.key}
                    icon={section.icon}
                    label={section.label}
                    content={content[section.key]}
                    defaultOpen={i === 0}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
