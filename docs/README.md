# Documentation

Dokumentasi lengkap untuk Video Summary & Auto-Notes.

## Contents

- **Architecture** — Arsitektur sistem dan komponen utama
- **API Reference** — Dokumentasi API endpoints
- **Development Guide** — Panduan development dan best practices
- **Deployment** — Panduan deployment ke production

## Quick Links

- [Design Document](../.kiro/specs/video-summary-notes/design.md)
- [Requirements](../.kiro/specs/video-summary-notes/requirements.md)
- [Tasks](../.kiro/specs/video-summary-notes/tasks.md)

## Architecture Overview

Aplikasi ini menggunakan arsitektur hybrid:

1. **Desktop App (Electron)** — berjalan di laptop pengguna
   - Screen detection menggunakan `desktopCapturer`
   - Audio capture via Python subprocess
   - Local cache dengan SQLite
   - State management: XState (main) + TanStack Query + Zustand (renderer)

2. **Cloud Backend (Node.js)** — berjalan di cloud
   - REST API dengan Express
   - Transcription via Gemini API
   - AI processing untuk summary dan auto-notes
   - MongoDB Atlas untuk persistent storage

3. **Web App (React, opsional)** — akses dari browser
   - View riwayat sesi
   - Akses catatan dan rangkuman
   - State management: TanStack Query + Zustand

## Development Workflow

1. Setup environment (lihat [Setup Guide](./setup.md))
2. Buat feature branch dari `main`
3. Implement changes dengan mengikuti conventions
4. Write tests (unit + property-based)
5. Run linter dan formatter
6. Submit PR dengan deskripsi lengkap

## Conventions

- TypeScript everywhere — no plain JS
- Interfaces over types untuk object shapes
- IPC event names sebagai constants (no magic strings)
- All HTTP responses menggunakan `BaseResponse` / `BaseErrorResponse`
- Domain services tidak import dari integrations (use DI)
- Job state disimpan di MongoDB (not in memory)

## Testing

- Unit tests untuk semua functions/classes
- Property-based tests untuk core logic
- Integration tests untuk pipelines
- E2E tests untuk user flows

Run tests:
```bash
npm test                # All tests
npm run test:pbt        # Property-based tests only
```

## API Documentation

Backend API menggunakan Swagger untuk auto-generated documentation.

Akses di: `http://localhost:3000/api-docs` (saat server berjalan)

## Contributing

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md) untuk guidelines.
