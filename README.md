# Video Summary & Auto-Notes

Aplikasi desktop yang secara otomatis mendeteksi video yang sedang diputar di laptop dan menghasilkan rangkuman serta catatan otomatis menggunakan AI.

## Arsitektur

Monorepo dengan struktur:
- **Desktop App** (Electron) — deteksi layar, capture audio, UI
- **Cloud Backend** (Node.js + Express) — transkripsi, AI processing, penyimpanan
- **Web App** (React, opsional) — akses riwayat dari browser
- **Shared Packages** — types, validation, API client

## Struktur Folder

```
learn-kiro/
├── packages/           # Shared code
│   ├── shared-types/   # TypeScript interfaces
│   ├── validation/     # Zod schemas
│   └── api-client/     # HTTP client
├── desktop/            # Electron app
├── backend/            # Node.js API server
├── web/                # React web app (opsional)
├── scripts/            # Setup & deployment scripts
└── docs/               # Dokumentasi
```

## Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Python 3.8+ (untuk audio capture)
- MongoDB Atlas account

### Installation

1. Clone repository:
```bash
git clone <repository-url>
cd learn-kiro
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env
# Edit .env dengan credentials Anda
```

4. Build shared packages:
```bash
npm run build --workspace=packages/shared-types
npm run build --workspace=packages/validation
npm run build --workspace=packages/api-client
```

### Development

**Desktop App:**
```bash
npm run dev
```

**Backend Server:**
```bash
npm run server:dev
```

**Web App:**
```bash
npm run web:dev
```

### Build

```bash
npm run build
```

## Tech Stack

- **Desktop:** Electron 28+, React 18, TypeScript, XState, TanStack Query, Zustand
- **Backend:** Node.js, Express, MongoDB Atlas, Gemini API
- **Styling:** Tailwind CSS
- **Audio:** Python sounddevice + WASAPI/BlackHole
- **Auth:** JWT + bcrypt

## Scripts

- `npm run dev` — Run desktop app in development mode
- `npm run build` — Build desktop app for production
- `npm run server:dev` — Run backend server in development mode
- `npm run server:start` — Run backend server in production mode
- `npm run web:dev` — Run web app in development mode
- `npm test` — Run all tests
- `npm run test:pbt` — Run property-based tests
- `npm run lint` — Lint all code
- `npm run format` — Format all code with Prettier

## Environment Variables

Lihat `.env.example` untuk daftar lengkap environment variables yang diperlukan.

## Documentation

Dokumentasi lengkap tersedia di folder `docs/`:
- Architecture Decision Records (ADRs)
- API Documentation
- Development Guides

## License

MIT
