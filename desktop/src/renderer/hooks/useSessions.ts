import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useToast } from '../stores/toast.store';
import * as IPC from '@shared/events/ipc-events';
import type { Session } from '@vsnotes/shared-types';

export const sessionKeys = {
  all: ['sessions'] as const,
  list: () => [...sessionKeys.all, 'list'] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
};

export function useSessions() {
  return useQuery<Session[]>({
    queryKey: sessionKeys.list(),
    queryFn: () => apiClient.getSessions(),
    staleTime: 1000 * 60, // 1 menit
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.updateSession(sessionId, { status: 'dismissed' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (sessionId: string) => apiClient.deleteSession(sessionId),

    onMutate: async (sessionId) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.list() });
      const previous = queryClient.getQueryData<Session[]>(sessionKeys.list());
      // Optimistic: hapus dari list langsung
      queryClient.setQueryData<Session[]>(sessionKeys.list(), (old) =>
        old ? old.filter((s) => s._id !== sessionId) : []
      );
      return { previous };
    },

    onError: (_err, _sessionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(sessionKeys.list(), context.previous);
      }
      toast.error('Gagal menghapus sesi. Coba lagi.');
    },

    onSuccess: (_data, sessionId) => {
      // Bersihkan SQLite cache di main process
      window.electronAPI.ipc.sendCommand(IPC.SESSION_DELETE_CACHE, sessionId);
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
      toast.success('Sesi berhasil dihapus');
    },
  });
}

export function useSession(sessionId: string | null) {
  return useQuery<Session>({
    queryKey: sessionKeys.detail(sessionId ?? ''),
    queryFn: () => {
      if (!sessionId) throw new Error('Session ID diperlukan');
      return apiClient.getSession(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5,
  });
}
