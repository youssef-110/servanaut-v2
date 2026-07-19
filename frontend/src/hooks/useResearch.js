import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/utils';

export function usePapers(keywords = []) {
  const qs = keywords.length ? `?keywords=${encodeURIComponent(keywords.join(','))}` : '';
  return useQuery({
    queryKey: ['research', 'papers', qs],
    queryFn: () => api.get(`/research/papers${qs}`),
    staleTime: 30 * 60 * 1000,
  });
}

export function useTrendingRepos({ topics = [], language = '' } = {}) {
  const params = new URLSearchParams();
  if (topics.length) params.set('topics', topics.join(','));
  if (language) params.set('language', language);
  const qs = params.toString();
  return useQuery({
    queryKey: ['research', 'github', qs],
    queryFn: () => api.get(`/research/github${qs ? `?${qs}` : ''}`),
    staleTime: 30 * 60 * 1000,
  });
}
