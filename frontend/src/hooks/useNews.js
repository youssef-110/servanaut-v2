import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/utils';

/**
 * @param {{topics?: string[], q?: string, from?: string, to?: string,
 *          sentiment?: string, sort?: 'date'|'relevance'}} filters
 */
export function useNews(filters = {}) {
  const params = new URLSearchParams();
  if (filters.topics?.length) params.set('topics', filters.topics.join(','));
  if (filters.q) params.set('q', filters.q);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.sentiment) params.set('sentiment', filters.sentiment);
  if (filters.sort) params.set('sort', filters.sort);
  const qs = params.toString();

  return useQuery({
    queryKey: ['news', qs],
    queryFn: () => api.get(`/news${qs ? `?${qs}` : ''}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSavedArticles() {
  return useQuery({
    queryKey: ['news', 'saved'],
    queryFn: () => api.get('/news/saved'),
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isRead = true }) => api.post(`/news/${id}/read`, { is_read: isRead }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news'] }),
  });
}

export function useSaveArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isSaved }) => api.post(`/news/${id}/save`, { is_saved: isSaved }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news'] }),
  });
}

export function useDeepDive() {
  return useMutation({
    mutationFn: (article) =>
      api.post('/summarize', {
        article_id: article.id,
        title: article.title,
        content: article.content_snippet,
        source: article.source,
        url: article.url,
      }),
  });
}
