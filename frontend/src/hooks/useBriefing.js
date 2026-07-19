import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/utils';

export function useBriefing() {
  return useQuery({
    queryKey: ['briefing'],
    queryFn: () => api.get('/briefing'),
    staleTime: 30 * 60 * 1000,
  });
}

export function useRegenerateBriefing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/briefing/regenerate'),
    onSuccess: (data) => queryClient.setQueryData(['briefing'], data),
  });
}
