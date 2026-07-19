import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/utils';

export function useQuotes(symbols = []) {
  const qs = symbols.length ? `?symbols=${symbols.join(',')}` : '';
  return useQuery({
    queryKey: ['market', 'quotes', qs],
    queryFn: () => api.get(`/market/quotes${qs}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMarketSentiment() {
  return useQuery({
    queryKey: ['market', 'sentiment'],
    queryFn: () => api.get('/market/sentiment'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useHotTopics() {
  return useQuery({
    queryKey: ['market', 'hot-topics'],
    queryFn: () => api.get('/market/hot-topics'),
    staleTime: 15 * 60 * 1000,
  });
}
