import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useToast } from '../stores/toast.store';
import type { LengthPreference } from '@vsnotes/shared-types';

export const summaryKeys = {
  all: ['summary'] as const,
  detail: (sessionId: string) => [...summaryKeys.all, sessionId] as const,
};

export function useSummary(sessionId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: summaryKeys.detail(sessionId ?? ''),
    queryFn: () => {
      if (!sessionId) throw new Error('Session ID diperlukan');
      return apiClient.getSummary(sessionId);
    },
    enabled: !!sessionId && enabled,
    staleTime: 1000 * 60 * 5, // 5 menit â€” summary jarang berubah
    retry: false, // 404 berarti belum ada summary, jangan retry
  });
}

export function useGenerateSummary() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ sessionId, lengthPref }: { sessionId: string; lengthPref: LengthPreference }) =>
      apiClient.generateSummary({ sessionId, lengthPref }),
    onSuccess: (summary) => {
      queryClient.setQueryData(summaryKeys.detail(summary.sessionId), summary);
      toast.success('Rangkuman berhasil dibuat.');
    },
    onError: () => {
      toast.error('Gagal membuat rangkuman. Silakan coba lagi.');
    },
  });
}
