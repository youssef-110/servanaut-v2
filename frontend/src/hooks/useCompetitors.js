import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/utils';

export function useCompetitors() {
  return useQuery({
    queryKey: ['competitors'],
    queryFn: () => api.get('/competitors'),
  });
}

export function useCompetitorIntel(id, enabled = true) {
  return useQuery({
    queryKey: ['competitors', id, 'intel'],
    queryFn: () => api.get(`/competitors/${id}/intel`),
    enabled: Boolean(id) && enabled,
    staleTime: 15 * 60 * 1000,
  });
}

export function useAddCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields) => api.post('/competitors', fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitors'] }),
  });
}

export function useUpdateCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }) => api.put(`/competitors/${id}`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitors'] }),
  });
}

export function useDeleteCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/competitors/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitors'] }),
  });
}

export function useRefreshIntel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/competitors/${id}/summary`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
