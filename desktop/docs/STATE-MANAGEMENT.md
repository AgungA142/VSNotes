# State Management Guide

## Overview

The desktop app uses a three-tier state management approach:

1. **XState** (Main Process) - Session lifecycle state machine
2. **TanStack Query** (Renderer) - Server state with caching
3. **Zustand** (Renderer) - UI state and session state mirror

---

## Quick Start

### Using Session State

```typescript
import { useSession } from '@/hooks';

function MyComponent() {
  const {
    status,           // Current session status
    sessionId,        // Active session ID
    videoTitle,       // Detected video title
    isRecording,      // Boolean: is recording?
    isActive,         // Boolean: is session active?
    start,            // Command: start session
    pause,            // Command: pause session
    resume,           // Command: resume session
    end,              // Command: end session
  } = useSession();

  return (
    <div>
      <p>Status: {status}</p>
      {isActive && <button onClick={pause}>Pause</button>}
    </div>
  );
}
```

### Using Notes (Server State)

```typescript
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks';

function NotesComponent({ sessionId }: { sessionId: string }) {
  // Query
  const { data: notes, isLoading, error } = useNotes(sessionId);

  // Mutations
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const handleCreate = () => {
    createNote.mutate({
      sessionId,
      data: {
        timestampSec: 120,
        text: 'Important moment',
        type: 'manual',
      },
    });
  };

  const handleUpdate = (id: string) => {
    updateNote.mutate({
      id,
      data: { text: 'Updated text' },
    });
  };

  const handleDelete = (id: string) => {
    deleteNote.mutate(id);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {notes?.map((note) => (
        <div key={note.id}>
          <p>{note.text}</p>
          <button onClick={() => handleUpdate(note.id)}>Edit</button>
          <button onClick={() => handleDelete(note.id)}>Delete</button>
        </div>
      ))}
      <button onClick={handleCreate}>Add Note</button>
    </div>
  );
}
```

### Using UI State

```typescript
import { useUIStore } from '@/stores';

function AppLayout() {
  const {
    // Theme
    theme,
    setTheme,

    // Sidebar
    isSidebarOpen,
    toggleSidebar,
    setSidebarOpen,

    // Modal
    modal,
    openModal,
    closeModal,

    // Notes Panel
    isNotesPanelOpen,
    toggleNotesPanel,
    setNotesPanelOpen,

    // Active Tab
    activeTab,
    setActiveTab,
  } = useUIStore();

  return (
    <div data-theme={theme}>
      <button onClick={toggleSidebar}>Toggle Sidebar</button>
      <button onClick={() => openModal('settings')}>Settings</button>
      <button onClick={() => setActiveTab('summary')}>Summary</button>
    </div>
  );
}
```

### Using Sync Status

```typescript
import { useSyncStatus } from '@/hooks';

function SyncIndicator() {
  const {
    isOnline,         // Boolean: online status
    queueSize,        // Number: pending operations
    isSyncing,        // Boolean: currently syncing?
    lastSyncAt,       // Date | null: last sync time
    hasOfflineQueue,  // Boolean: has pending ops?
    canSync,          // Boolean: can sync now?
    startSync,        // Command: start sync
  } = useSyncStatus();

  return (
    <div>
      <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
      {hasOfflineQueue && <span>Queue: {queueSize}</span>}
      {isSyncing && <span>Syncing...</span>}
      <button onClick={startSync} disabled={!canSync}>
        Sync Now
      </button>
    </div>
  );
}
```

---

## State Categories

### 1. Session State (Zustand Mirror)

**Store:** `session.store.ts`  
**Hook:** `useSession()`  
**Source:** Main process XState machine via IPC

**States:**
- `idle` - No active session
- `recording` - Recording in progress
- `paused` - Recording paused
- `processing` - Processing transcript/summary
- `syncing` - Syncing to cloud
- `completed` - Session completed successfully
- `dismissed` - Session dismissed by user

**Rules:**
- ❌ Never mutate directly in renderer
- ✅ Send commands via IPC (start, pause, resume, end)
- ✅ Subscribe to state changes via `useSession()`

### 2. Server State (TanStack Query)

**Hook:** `useNotes()`, `useCreateNote()`, etc.  
**Source:** Backend API via api-client

**Features:**
- Automatic caching (5-minute stale time)
- Automatic refetching on window focus
- Optimistic updates for mutations
- Automatic rollback on error
- 3 retry attempts on failure

**Available Queries:**
- `useNotes(sessionId)` - Fetch notes for session

**Available Mutations:**
- `useCreateNote()` - Create new note
- `useUpdateNote()` - Update existing note
- `useDeleteNote()` - Delete note

### 3. UI State (Zustand)

**Store:** `ui.store.ts`  
**Hook:** `useUIStore()`  
**Persistence:** localStorage (theme, sidebar, activeTab)

**State:**
- Theme: `light | dark | system`
- Sidebar: open/closed
- Modal: type and data
- Notes Panel: open/closed
- Active Tab: `notes | summary | transcript`

### 4. Sync State (Zustand)

**Store:** `sync.store.ts`  
**Hook:** `useSyncStatus()`  
**Source:** Main process sync manager via IPC

**State:**
- Online status (from browser events)
- Queue size (pending operations)
- Syncing status
- Last sync timestamp

---

## IPC Communication

### Event Flow

```
┌─────────────────┐
│  Main Process   │
│  (XState)       │
└────────┬────────┘
         │ IPC: session:state-changed
         ▼
┌─────────────────┐
│  Preload Script │ ← Security Boundary
│  (contextBridge)│
└────────┬────────┘
         │ window.electronAPI
         ▼
┌─────────────────┐
│  Renderer       │
│  (useSession)   │
│  (Zustand)      │
└─────────────────┘
```

### Available IPC APIs

```typescript
// Session commands
window.electronAPI.session.start()
window.electronAPI.session.pause()
window.electronAPI.session.resume()
window.electronAPI.session.end()
window.electronAPI.session.onStateChanged(callback)

// Screen monitor
window.electronAPI.screenMonitor.start()
window.electronAPI.screenMonitor.stop()
window.electronAPI.screenMonitor.onVideoDetected(callback)

// Notes
window.electronAPI.notes.create(data)
window.electronAPI.notes.update(id, data)
window.electronAPI.notes.delete(id)

// Sync
window.electronAPI.sync.start()
window.electronAPI.sync.onComplete(callback)
window.electronAPI.sync.onError(callback)
```

---

## Best Practices

### ✅ DO

- Use `useSession()` hook for session state
- Use TanStack Query for server data
- Use Zustand for local UI state
- Send commands via IPC for session control
- Use optimistic updates for better UX
- Handle loading and error states

### ❌ DON'T

- Don't mutate session state directly in renderer
- Don't use magic strings for IPC events (use constants)
- Don't fetch server data manually (use TanStack Query)
- Don't store server data in Zustand
- Don't bypass the preload script security boundary

---

## Testing

### Store Tests

```typescript
import { useSessionStore } from '@/stores/session.store';

describe('Session Store', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('should update state', () => {
    const { updateState } = useSessionStore.getState();
    updateState({ status: 'recording' });
    expect(useSessionStore.getState().status).toBe('recording');
  });
});
```

### Hook Tests (with React Testing Library)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotes } from '@/hooks/useNotes';

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

it('should fetch notes', async () => {
  const { result } = renderHook(() => useNotes('session-123'), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});
```

---

## Troubleshooting

### Issue: State not updating

**Cause:** Not subscribing to IPC events  
**Solution:** Use `useSession()` hook which handles subscription

### Issue: Stale data from API

**Cause:** TanStack Query cache  
**Solution:** Adjust `staleTime` or manually invalidate queries

### Issue: localStorage warnings in tests

**Cause:** No browser environment in test  
**Solution:** Expected behavior, tests still pass

### Issue: IPC events not received

**Cause:** Listener not set up correctly  
**Solution:** Check preload script and global.d.ts types

---

## File Locations

```
desktop/src/
├── renderer/
│   ├── stores/
│   │   ├── session.store.ts    # Session state mirror
│   │   ├── ui.store.ts          # UI state + persistence
│   │   ├── sync.store.ts        # Sync status
│   │   └── index.ts             # Exports
│   ├── hooks/
│   │   ├── useSession.ts        # Session hook
│   │   ├── useNotes.ts          # Notes queries/mutations
│   │   ├── useSyncStatus.ts     # Sync status hook
│   │   └── index.ts             # Exports
│   └── index.tsx                # QueryClient setup
├── preload/
│   └── index.ts                 # IPC API exposure
└── shared/
    ├── types/index.ts           # Type definitions
    └── events/ipc-events.ts     # Event constants
```

---

## Additional Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [XState Docs](https://xstate.js.org/)
- [Electron IPC Docs](https://www.electronjs.org/docs/latest/tutorial/ipc)

---

**Last Updated:** Task 9.2 Completion  
**Version:** 1.0.0
