import { useState } from 'react';
import { Search } from 'lucide-react';
import { NewsFeed } from '@/components/news/NewsFeed';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNews, useSavedArticles } from '@/hooks/useNews';
import { useSettings } from '@/hooks/useSettings';

export default function NewsFeedPage() {
  const { data: settings } = useSettings();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('date');
  const [sentiment, setSentiment] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activeTopic, setActiveTopic] = useState('');

  const topics = settings?.profile?.topics_json || [];

  const news = useNews({
    q,
    sort,
    sentiment,
    from,
    to,
    topics: activeTopic ? [activeTopic] : [],
  });
  const saved = useSavedArticles();

  return (
    <div className="mx-auto max-w-4xl">
      <Tabs defaultValue="all">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">All News</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all">
          {/* Filter row */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                <Input
                  className="pl-8"
                  placeholder="Search headlines and summaries…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-40" aria-label="Sort by">
                <option value="date">Newest first</option>
                <option value="relevance">Most relevant</option>
              </Select>
              <Select value={sentiment} onChange={(e) => setSentiment(e.target.value)} className="w-36" aria-label="Sentiment filter">
                <option value="">All sentiment</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </Select>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" aria-label="From date" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" aria-label="To date" />
            </div>

            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setActiveTopic('')}>
                  <Badge className={cn('cursor-pointer', !activeTopic ? 'border-accent/40 bg-accent-muted text-accent-hover' : 'border-edge bg-surface-2 text-ink-secondary hover:text-ink')}>
                    All topics
                  </Badge>
                </button>
                {topics.map((topic) => (
                  <button key={topic} onClick={() => setActiveTopic(activeTopic === topic ? '' : topic)}>
                    <Badge className={cn('cursor-pointer', activeTopic === topic ? 'border-accent/40 bg-accent-muted text-accent-hover' : 'border-edge bg-surface-2 text-ink-secondary hover:text-ink')}>
                      {topic}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <NewsFeed
            articles={news.data?.articles}
            isLoading={news.isLoading}
            error={news.error}
            stale={news.data?.stale}
          />
        </TabsContent>

        <TabsContent value="saved">
          <NewsFeed
            articles={saved.data?.articles}
            isLoading={saved.isLoading}
            error={saved.error}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
