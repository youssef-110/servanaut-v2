import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Tags, Mail, Plus, Trash2, Send, Save, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { parseCsv, timeAgo } from '@/lib/utils';
import { useSettings, useUpdateSettings, useSendDigest, useDigestHistory } from '@/hooks/useSettings';
import { useCompetitors, useAddCompetitor, useDeleteCompetitor } from '@/hooks/useCompetitors';

const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth', 'Public'];

function SectionCard({ icon: Icon, title, description, children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-accent-hover" /> {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function CompetitorManager() {
  const { data } = useCompetitors();
  const addCompetitor = useAddCompetitor();
  const deleteCompetitor = useDeleteCompetitor();
  const [form, setForm] = useState({ name: '', website: '', github_org: '', ticker: '', keywords: '' });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addCompetitor.mutate(
      {
        name: form.name.trim(),
        website: form.website.trim(),
        github_org: form.github_org.trim(),
        ticker: form.ticker.trim().toUpperCase(),
        keywords_json: parseCsv(form.keywords),
      },
      { onSuccess: () => setForm({ name: '', website: '', github_org: '', ticker: '', keywords: '' }) }
    );
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="comp-name">Name *</Label>
          <Input id="comp-name" value={form.name} placeholder="Acme Robotics" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="comp-website">Website</Label>
          <Input id="comp-website" value={form.website} placeholder="acme.com" onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="comp-gh">GitHub org</Label>
          <Input id="comp-gh" value={form.github_org} placeholder="acme-robotics" onChange={(e) => setForm({ ...form, github_org: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="comp-ticker">Stock ticker (if public)</Label>
          <Input id="comp-ticker" value={form.ticker} placeholder="ACME" onChange={(e) => setForm({ ...form, ticker: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="comp-keywords">Extra match keywords</Label>
          <Input id="comp-keywords" value={form.keywords} placeholder="acme bot, acme labs" onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={addCompetitor.isPending || !form.name.trim()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Add competitor
          </Button>
        </div>
      </form>
      {addCompetitor.isError && <p className="text-xs text-negative">{addCompetitor.error.message}</p>}

      {data?.competitors?.length > 0 && (
        <div className="space-y-2">
          {data.competitors.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-edge bg-surface-2/50 px-3 py-2">
              <div className="min-w-0">
                <span className="text-sm font-medium text-ink">{c.name}</span>
                <span className="ml-2 text-xs text-ink-muted">
                  {[c.website, c.github_org && `gh:${c.github_org}`, c.ticker].filter(Boolean).join(' · ')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-ink-muted hover:text-negative"
                onClick={() => deleteCompetitor.mutate(c.id)}
                aria-label={`Remove ${c.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DigestHistory() {
  const { data, isLoading } = useDigestHistory();
  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!data?.history?.length) {
    return <p className="text-xs text-ink-muted">No digests sent yet.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {data.history.slice(0, 8).map((d) => (
        <li key={d.id} className="flex items-center justify-between rounded-lg border border-edge bg-surface-2/50 px-3 py-2 text-xs">
          <span className="truncate text-ink-secondary">{d.subject}</span>
          <span className="ml-3 shrink-0 text-ink-muted">
            {d.recipient_email} · {timeAgo(d.sent_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SettingsForm() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const sendDigest = useSendDigest();

  const [form, setForm] = useState(null);

  useEffect(() => {
    const p = data?.profile;
    if (p && !form) {
      setForm({
        company_name: p.company_name || '',
        description: p.description || '',
        stage: p.stage || 'Seed',
        industry: p.industry || '',
        topics: (p.topics_json || []).join(', '),
        research_keywords: (p.research_keywords_json || []).join(', '),
        github_topics: (p.github_topics_json || []).join(', '),
        tracked_tickers: (p.tracked_tickers_json || []).join(', '),
        digest_email: p.digest_email || '',
        digest_frequency: p.digest_frequency || 'daily',
        digest_time: p.digest_time || '07:00',
        refresh_interval_minutes: p.refresh_interval_minutes || 15,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = () => {
    updateSettings.mutate({
      company_name: form.company_name,
      description: form.description,
      stage: form.stage,
      industry: form.industry,
      topics_json: parseCsv(form.topics),
      research_keywords_json: parseCsv(form.research_keywords),
      github_topics_json: parseCsv(form.github_topics),
      tracked_tickers_json: parseCsv(form.tracked_tickers).map((t) => t.toUpperCase()),
      digest_email: form.digest_email,
      digest_frequency: form.digest_frequency,
      digest_time: form.digest_time,
      refresh_interval_minutes: Number(form.refresh_interval_minutes) || 15,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <SectionCard
        icon={Building2}
        title="Business Profile"
        description="Used as context in every AI prompt — the sharper this is, the sharper your intelligence gets."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="company">Company name</Label>
            <Input id="company" value={form.company_name} onChange={set('company_name')} />
          </div>
          <div>
            <Label htmlFor="industry">Industry / domain</Label>
            <Input id="industry" value={form.industry} placeholder="e.g. Robotics, Fintech" onChange={set('industry')} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">What does your company do?</Label>
            <Textarea
              id="description"
              value={form.description}
              placeholder="One or two sentences describing your product, customers, and edge."
              onChange={set('description')}
            />
          </div>
          <div>
            <Label htmlFor="stage">Stage</Label>
            <Select id="stage" value={form.stage} onChange={set('stage')}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="refresh">Data refresh interval (minutes)</Label>
            <Input
              id="refresh"
              type="number"
              min="5"
              max="120"
              value={form.refresh_interval_minutes}
              onChange={set('refresh_interval_minutes')}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={Tags}
        title="Tracked Topics & Keywords"
        description="Comma-separated. These drive your news feed, research tracker, GitHub trending, and market tickers."
        delay={0.05}
      >
        <div className="grid gap-3">
          <div>
            <Label htmlFor="topics">News topics</Label>
            <Input id="topics" value={form.topics} placeholder="robotics, AI, Series A funding" onChange={set('topics')} />
          </div>
          <div>
            <Label htmlFor="research">Research keywords (ArXiv)</Label>
            <Input
              id="research"
              value={form.research_keywords}
              placeholder="robotic manipulation, foundation models"
              onChange={set('research_keywords')}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="gh-topics">GitHub topics</Label>
              <Input id="gh-topics" value={form.github_topics} placeholder="robotics, llm" onChange={set('github_topics')} />
            </div>
            <div>
              <Label htmlFor="tickers">Tracked stock tickers</Label>
              <Input id="tickers" value={form.tracked_tickers} placeholder="NVDA, TSLA" onChange={set('tracked_tickers')} />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={Building2}
        title="Competitors"
        description="Tracked across news, GitHub, hiring pages, and funding announcements."
        delay={0.1}
      >
        <CompetitorManager />
      </SectionCard>

      <SectionCard
        icon={Mail}
        title="Email Digest"
        description="A daily or weekly intelligence email with your briefing, top stories, alerts, and research pick."
        delay={0.15}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="digest-email">Recipient email</Label>
            <Input
              id="digest-email"
              type="email"
              value={form.digest_email}
              placeholder="founder@startup.com"
              onChange={set('digest_email')}
            />
          </div>
          <div>
            <Label htmlFor="digest-freq">Frequency</Label>
            <Select id="digest-freq" value={form.digest_frequency} onChange={set('digest_frequency')}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Mondays)</option>
              <option value="off">Off</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="digest-time">Send time</Label>
            <Input id="digest-time" type="time" value={form.digest_time} onChange={set('digest_time')} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => sendDigest.mutate(form.digest_email || undefined)}
            disabled={sendDigest.isPending}
          >
            <Send className="h-3.5 w-3.5" />
            {sendDigest.isPending ? 'Sending…' : 'Send Now'}
          </Button>
          {sendDigest.isSuccess && (
            <span className="text-xs text-positive">
              {sendDigest.data?.digest?.sent ? 'Digest sent!' : 'Digest built (preview mode — add RESEND_API_KEY to actually send).'}
            </span>
          )}
          {sendDigest.isError && <span className="text-xs text-negative">{sendDigest.error.message}</span>}
        </div>
        <Separator className="my-4" />
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          <History className="h-3.5 w-3.5" /> Digest history
        </div>
        <div className="mt-2">
          <DigestHistory />
        </div>
      </SectionCard>

      <div className="sticky bottom-20 flex justify-end md:bottom-4">
        <Button size="lg" onClick={save} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4" />
          {updateSettings.isPending ? 'Saving…' : updateSettings.isSuccess ? 'Saved ✓' : 'Save Settings'}
        </Button>
      </div>
      {updateSettings.isError && (
        <p className="text-right text-xs text-negative">{updateSettings.error.message}</p>
      )}
    </div>
  );
}
