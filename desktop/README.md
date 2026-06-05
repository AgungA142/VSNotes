# Video Summary & Auto-Notes - Desktop App

Aplikasi desktop berbasis Electron untuk mendeteksi video yang sedang diputar dan membuat rangkuman otomatis dengan catatan berdasarkan timestamp.

## Tech Stack

- **Electron 28+** - Desktop framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool dan bundler untuk renderer process
- **Tailwind CSS** - Styling
- **XState** - Session lifecycle state machine (main process)
- **TanStack Query** - Server state management (renderer)
- **Zustand** - UI state management (renderer)
- **electron-store** - Encrypted local storage untuk API keys dan preferences
- **better-sqlite3** - Local cache untuk offline support

## Struktur Folder

```
desktop/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── config/              # Store configuration
│   │   │   └── store.ts         # electron-store dengan enkripsi
│   │   ├── screen-monitor/      # Screen detection (belum diimplementasi)
│   │   ├── audio-capture/       # Audio capture controller (belum diimplementasi)
│   │   ├── session/             # XState session machine (belum diimplementasi)
│   │   ├── sync/                # Offline sync manager (belum diimplementasi)
│   │   ├── permissions/         # Permission handler (belum diimplementasi)
│   │   └── index.ts             # Main process entry point
│   ├── preload/                 # Electron preload scripts
│   │   └── index.ts             # IPC bridge dengan typed API
│   ├── renderer/                # React UI (renderer process)
│   │   ├── components/          # Reusable components (belum diimplementasi)
│   │   ├── pages/               # Page components (belum diimplementasi)
│   │   ├── stores/              # Zustand stores (belum diimplementasi)
│   │   ├── hooks/               # Custom hooks (belum diimplementasi)
│   │   ├── App.tsx              # Root component
│   │   ├── index.tsx            # Renderer entry point
│   │   ├── index.css            # Tailwind imports
│   │   └── global.d.ts          # TypeScript declarations
│   └── shared/                  # Shared across main/preload/renderer
│       ├── types/               # TypeScript interfaces
│       │   └── index.ts         # IPC payload types
│       ├── events/              # IPC event constants
│       │   └── ipc-events.ts    # Event name constants
│       └── constants/           # App-wide constants
│           └── index.ts
├── python/                      # Python audio capture agent
│   ├── audio_agent.py           # sounddevice + WASAPI/BlackHole
│   └── requirements.txt
├── index.html                   # HTML entry point
├── electron.vite.config.ts      # Vite configuration
├── tailwind.config.js           # Tailwind configuration
├── postcss.config.js            # PostCSS configuration
├── tsconfig.json                # TypeScript configuration
└── package.json
```

## Setup

### Prerequisites

- Node.js 20+
- Python 3.9+ (untuk audio capture)
- Windows: WASAPI loopback support (built-in)
- macOS: BlackHole virtual audio device (install terpisah)

### Installation

```bash
# Install dependencies
npm install

# Install Python dependencies
cd python
pip install -r requirements.txt
cd ..
```

### Development

```bash
# Run in development mode
npm run dev
```

Ini akan:
1. Start Vite dev server untuk renderer process
2. Launch Electron dengan hot reload
3. Open DevTools secara otomatis

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Konfigurasi

### Electron Store

Aplikasi menggunakan `electron-store` dengan enkripsi AES untuk menyimpan data sensitif:

- **Gemini API Key** - Terenkripsi
- **Auth Token** - Terenkripsi
- **User Settings** - Tidak terenkripsi
- **Permissions** - Tidak terenkripsi

Store location:
- Windows: `%APPDATA%\video-summary-notes\config.json`
- macOS: `~/Library/Application Support/video-summary-notes/config.json`
- Linux: `~/.config/video-summary-notes/config.json`

### Environment Variables

Buat file `.env` di root folder desktop:

```env
# API Base URL
API_BASE_URL=http://localhost:3000

# Development mode
NODE_ENV=development
```

## IPC Communication

Semua komunikasi antara main dan renderer process menggunakan typed IPC events yang didefinisikan di `src/shared/events/ipc-events.ts`.

### Contoh Penggunaan di Renderer

```typescript
// Start session
window.electronAPI.session.start();

// Listen to state changes
window.electronAPI.session.onStateChanged((state) => {
  console.log('Session state:', state);
});

// Create manual note
window.electronAPI.notes.create({
  sessionId: 'session-123',
  timestampSec: 120,
  text: 'Catatan penting',
  type: 'manual',
});
```

## State Management

### Main Process
- **XState** untuk session lifecycle state machine
- States: `idle → recording → paused → processing → syncing → completed`
- Main process adalah single source of truth untuk session state

### Renderer Process
- **TanStack Query** untuk server state (data dari backend API)
- **Zustand** untuk UI state (modals, sidebar, theme)
- Renderer tidak boleh mutate session state langsung - hanya kirim command ke main process

## Testing

```bash
# Run tests
npm test

# Run type checking
npm run typecheck
```

## Next Steps

Task 9.1 telah menyelesaikan:
- ✅ Setup Electron 28+ dengan Vite sebagai bundler
- ✅ Struktur folder: `src/main/`, `src/preload/`, `src/renderer/`, `src/shared/`
- ✅ `src/shared/events/ipc-events.ts` - IPC event constants
- ✅ `src/shared/types/` - TypeScript interfaces untuk IPC payloads
- ✅ Setup Tailwind CSS
- ✅ Konfigurasi `electron-store` dengan enkripsi untuk Gemini API key

Task berikutnya:
- Implementasi Screen Monitor (task 9.2)
- Implementasi Audio Capture Agent (task 9.3)
- Implementasi XState Session Machine (task 9.4)
- Dan seterusnya...

## Troubleshooting

### Electron tidak start
- Pastikan semua dependencies terinstall: `npm install`
- Check Node.js version: `node --version` (harus 20+)

### Tailwind CSS tidak bekerja
- Pastikan PostCSS dan Tailwind terinstall
- Check `postcss.config.js` dan `tailwind.config.js`
- Restart dev server

### TypeScript errors
- Run type checking: `npm run typecheck`
- Check `tsconfig.json` configuration
- Pastikan semua path aliases terkonfigurasi dengan benar

## License

MIT
