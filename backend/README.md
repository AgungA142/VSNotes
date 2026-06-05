# Video Summary & Auto-Notes - Backend

Cloud backend untuk aplikasi Video Summary & Auto-Notes. Backend ini menangani transcription, AI processing, penyimpanan data, dan menyediakan REST API untuk desktop dan web app.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Authentication**: JWT + bcrypt
- **API Documentation**: Swagger (swagger-jsdoc + swagger-ui-express)
- **Logging**: Winston
- **Validation**: Zod
- **AI/Transcription**: Google Gemini API
- **Testing**: Vitest

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── env.ts        # Environment variable validation (zod)
│   │   ├── logger.ts     # Winston logger setup
│   │   ├── db.ts         # MongoDB connection
│   │   └── swagger.ts    # Swagger/OpenAPI configuration
│   ├── middleware/       # Express middleware
│   │   ├── error-handler.ts    # Global error handler
│   │   └── request-logger.ts   # HTTP request logger
│   ├── utils/
│   │   └── responses/    # Standardized response wrappers
│   │       ├── base-response.ts
│   │       └── base-error-response.ts
│   └── index.ts          # Application entry point
├── logs/                 # Log files (gitignored)
├── .env                  # Environment variables (gitignored)
└── package.json
```

## Setup

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- MongoDB Atlas account (or local MongoDB)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env` file (copy from `.env.example` in root):
```bash
cp ../.env.example .env
```

3. Update `.env` with your configuration:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/video-summary-notes
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_minimum_32_characters
```

### Running

**Development mode** (with hot reload):
```bash
pnpm dev
```

**Production mode**:
```bash
pnpm build
pnpm start
```

**Type checking**:
```bash
pnpm typecheck
```

**Tests**:
```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:pbt          # Property-based tests only
```

## API Documentation

Once the server is running, API documentation is available at:
- **Swagger UI**: http://localhost:3000/api-docs

## Endpoints

### Health Check
- `GET /health` - Server health status

### API Root
- `GET /v1` - API information

### Future Endpoints (TODO)
- `POST /v1/auth/login` - User login
- `POST /v1/auth/register` - User registration
- `POST /v1/sessions` - Create new session
- `GET /v1/sessions` - List user sessions
- `POST /v1/sessions/:id/audio` - Upload audio chunk
- `GET /v1/sessions/:id/notes` - Get session notes
- `POST /v1/sessions/:id/notes` - Add manual note
- `GET /v1/sessions/:id/summary` - Get session summary
- `GET /v1/sessions/:id/export` - Export session

## Response Format

All API responses use standardized wrappers:

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... }
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiration time |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment (development/production/test) |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `AUDIO_CHUNK_SIZE_SEC` | No | `30` | Audio chunk size in seconds |
| `AUDIO_SAMPLE_RATE` | No | `16000` | Audio sample rate in Hz |
| `LOG_LEVEL` | No | `info` | Winston log level (error/warn/info/http/debug) |

## Error Handling

The backend includes comprehensive error handling:

- **Zod validation errors** → 400 with validation details
- **Mongoose validation errors** → 400 with field details
- **JWT errors** → 401 Unauthorized
- **MongoDB connection errors** → 503 Service Unavailable
- **Custom AppError** → Configurable status code and error code
- **Uncaught errors** → 500 Internal Server Error

All errors are logged to `logs/error.log` and `logs/combined.log`.

## Logging

Winston logger with multiple transports:
- **Console**: Colored output in development
- **File**: `logs/combined.log` (all logs)
- **File**: `logs/error.log` (errors only)

HTTP requests are logged with method, path, status code, response time, and IP.

## Development

### Adding New Routes

1. Create route file in `src/routes/`
2. Create controller in `src/controllers/`
3. Create service in `src/services/domain/` or `src/services/integrations/`
4. Import and mount in `src/index.ts`

### Adding Swagger Documentation

Add JSDoc comments to route handlers:

```typescript
/**
 * @swagger
 * /v1/sessions:
 *   post:
 *     tags:
 *       - Sessions
 *     summary: Create new session
 *     responses:
 *       201:
 *         description: Session created
 */
```

## License

MIT
