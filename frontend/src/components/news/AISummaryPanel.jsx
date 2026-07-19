import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Building2, ListChecks, Lightbulb, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useDeepDive } from '@/hooks/useNews';

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * Slide-in side panel with a full AI deep-dive of one article:
 * key claims, founder implications, related companies, action items.
 */
export function AISummaryPanel({ article, onClose }) {
  const deepDive = useDeepDive();

  useEffect(() => {
    if (article) deepDive.mutate(article);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id, article?.url]);

  const analysis = deepDive.data?.analysis;

  return (
    <AnimatePresence>
      {article && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-edge bg-surface shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-edge p-5">
              <div>
                <Badge className="mb-2 border-accent/30 bg-accent-muted text-accent-hover">
                  <Sparkles className="h-3 w-3" /> AI Deep Dive
                </Badge>
                <h3 className="text-sm font-semibold leading-snug text-ink">{article.title}</h3>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-accent-hover hover:underline"
                >
                  {article.source} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {deepDive.isPending && (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              )}

              {deepDive.isError && (
                <p className="text-sm text-negative">
                  Analysis failed: {deepDive.error.message}
                </p>
              )}

              {analysis && (
                <>
                  <Section icon={ListChecks} title="Key Claims">
                    <ul className="space-y-2">
                      {(analysis.key_claims || []).map((claim, i) => (
                        <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-secondary">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          {claim}
                        </li>
                      ))}
                    </ul>
                  </Section>
                  <Separator />
                  <Section icon={Lightbulb} title="Founder Implications">
                    <p className="text-[13px] leading-relaxed text-ink-secondary">
                      {analysis.founder_implications}
                    </p>
                  </Section>
                  {analysis.related_companies?.length > 0 && (
                    <>
                      <Separator />
                      <Section icon={Building2} title="Related Companies">
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.related_companies.map((company) => (
                            <Badge key={company} className="border-edge bg-surface-2 text-ink-secondary">
                              {company}
                            </Badge>
                          ))}
                        </div>
                      </Section>
                    </>
                  )}
                  {analysis.action_items?.length > 0 && (
                    <>
                      <Separator />
                      <Section icon={Sparkles} title="Suggested Actions">
                        <ul className="space-y-2">
                          {analysis.action_items.map((item, i) => (
                            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-secondary">
                              <span className="font-mono text-xs text-violet">{i + 1}.</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </Section>
                    </>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
