import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/utils';

export function useAlerts({ type, unread } = {}) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (unread) params.set('unread', 'true');
  const qs = params.toString();
  return useQuery({
    queryKey: ['alerts', qs],
    queryFn: () => api.get(`/alerts${qs ? `?${qs}` : ''}`),
    refetchInterval: 60 * 1000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['alerts', 'unread-count'],
    queryFn: () => api.get('/alerts/unread-count'),
    refetchInterval: 60 * 1000,
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/alerts/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/alerts/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useExplainAlert() {
  return useMutation({
    mutationFn: (id) => api.post(`/alerts/${id}/explain`),
  });
}
