/**
 * useNotes Hook
 * TanStack Query wrapper for notes API
 * 
 * Provides queries and mutations for note operations with automatic caching,
 * refetching, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useToast } from '../stores/toast.store';
import type { Note } from '@vsnotes/shared-types';
import type { CreateNoteInput, UpdateNoteInput } from '@vsnotes/validation';

// Query keys
const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (sessionId: string) => [...noteKeys.lists(), sessionId] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};

/**
 * Fetch notes for a session.
 * Polls every 10 seconds when session is active (recording/paused/processing).
 */
export function useNotes(sessionId: string | null, isSessionActive = false) {
  return useQuery({
    queryKey: noteKeys.list(sessionId || ''),
    queryFn: () => {
      if (!sessionId) throw new Error('Session ID is required');
      return apiClient.getNotes(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 1000 * 10,
    refetchInterval: isSessionActive ? 10_000 : false,
  });
}

/**
 * Create a new note
 */
export function useCreateNote() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: CreateNoteInput }) =>
      apiClient.createNote(sessionId, data),
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.list(newNote.sessionId) });
    },
    onError: () => {
      toast.error('Gagal menyimpan catatan. Silakan coba lagi.');
    },
  });
}

/**
 * Update an existing note
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteInput }) =>
      apiClient.updateNote(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.all });

      // Snapshot previous value
      const previousNotes = queryClient.getQueriesData({ queryKey: noteKeys.lists() });

      // Optimistically update
      queryClient.setQueriesData<Note[]>({ queryKey: noteKeys.lists() }, (old) => {
        if (!old) return old;
        return old.map((note) =>
          note._id === id ? { ...note, ...data, updatedAt: new Date() } : note
        );
      });

      return { previousNotes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotes) {
        context.previousNotes.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Gagal memperbarui catatan. Perubahan dibatalkan.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteNote(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.all });

      // Snapshot previous value
      const previousNotes = queryClient.getQueriesData({ queryKey: noteKeys.lists() });

      // Optimistically remove
      queryClient.setQueriesData<Note[]>({ queryKey: noteKeys.lists() }, (old) => {
        if (!old) return old;
        return old.filter((note) => note._id !== id);
      });

      return { previousNotes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotes) {
        context.previousNotes.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Gagal menghapus catatan. Silakan coba lagi.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
}

