import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/utils';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch) => api.put('/settings', patch),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      // Profile changes affect nearly everything downstream.
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: ['research'] });
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['briefing'] });
    },
  });
}

export function useSendDigest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (to) => api.post('/digest/send', to ? { to } : {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['digest'] }),
  });
}

export function useDigestHistory() {
  return useQuery({
    queryKey: ['digest', 'history'],
    queryFn: () => api.get('/digest/history'),
  });
}
