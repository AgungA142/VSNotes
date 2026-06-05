import { useEffect } from 'react';

/**
 * Subscribe ke shortcut keyboard Ctrl/Cmd+Shift+N dari main process via IPC.
 * Callback hanya dipanggil saat sesi aktif.
 */
export function useNoteShortcut(onShortcut: () => void, isSessionActive: boolean) {
  useEffect(() => {
    if (!isSessionActive) return;
    if (!window.electronAPI?.notes?.onShortcut) return;

    const cleanup = window.electronAPI.notes.onShortcut(onShortcut);
    return cleanup;
  }, [onShortcut, isSessionActive]);
}
