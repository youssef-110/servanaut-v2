import { useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import { WatchlistItem } from './WatchlistItem';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { parseCsv } from '@/lib/utils';
import { useWatchlist, useAddWatchlistItem } from '@/hooks/useWatchlist';

function AddWatchForm() {
  const addItem = useAddWatchlistItem();
  const [label, setLabel] = useState('');
  const [keywords, setKeywords] = useState('');
  const [priority, setPriority] = useState('medium');

  const submit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    addItem.mutate(
      {
        label: label.trim(),
        keywords_json: parseCsv(keywords).length ? parseCsv(keywords) : [label.trim()],
        priority,
      },
      {
        onSuccess: () => {
          setLabel('');
          setKeywords('');
          setPriority('medium');
        },
      }
    );
  };

  return (
    <Card>
      <CardContent className="p-4 pt-4">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1.4fr_120px_auto] md:items-end">
          <div>
            <Label htmlFor="watch-label">Watch label</Label>
            <Input
              id="watch-label"
              placeholder="e.g. Figure AI, humanoid robots…"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="watch-keywords">Match keywords (comma-separated, optional)</Label>
            <Input
              id="watch-keywords"
              placeholder="figure ai, figure robotics"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="watch-priority">Priority</Label>
            <Select id="watch-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
          <Button type="submit" disabled={addItem.isPending || !label.trim()}>
            <Plus className="h-4 w-4" /> Watch
          </Button>
        </form>
        {addItem.isError && (
          <p className="mt-2 text-xs text-negative">{addItem.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function WatchlistPanel() {
  const { data, isLoading, error } = useWatchlist();

  return (
    <div className="space-y-4">
      <AddWatchForm />
      {isLoading && (
        <div className="space-y-3">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
      )}
      {error && <EmptyState icon={Eye} title="Couldn't load watchlist" hint={error.message} />}
      {data &&
        (data.items?.length ? (
          <div className="space-y-3">
            {data.items.map((item, i) => (
              <WatchlistItem key={item.id} item={item} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Eye}
            title="Nothing on your watchlist"
            hint="Watch companies, people, technologies, or topics. SERVANAUT scans every news article and research paper for matches and alerts you the moment something hits."
          />
        ))}
    </div>
  );
}
