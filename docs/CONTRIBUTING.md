# Contributing Guide

Terima kasih telah berkontribusi pada Video Summary & Auto-Notes!

## Development Setup

1. Fork repository
2. Clone fork Anda:
   ```bash
   git clone <your-fork-url>
   cd learn-kiro
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build shared packages:
   ```bash
   npm run build --workspace=packages/shared-types
   npm run build --workspace=packages/validation
   npm run build --workspace=packages/api-client
   ```
5. Setup environment variables:
   ```bash
   cp .env.example .env
   # Edit .env dengan credentials Anda
   ```

## Coding Standards

### TypeScript

- Gunakan TypeScript untuk semua code (no plain JS)
- Prefer `interface` over `type` untuk object shapes
- Use `type` hanya untuk unions/aliases
- Enable strict mode

### Naming Conventions

- Files/folders: `kebab-case`
- React components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Interfaces: `PascalCase` (no `I` prefix kecuali perlu disambiguasi)

### Code Organization

**Backend:**
- Controllers: request/response handling only
- Services (domain): pure business logic
- Services (integrations): third-party API calls
- Jobs: background async processing
- Utils: shared utilities

**Desktop:**
- Main process: XState session machine, screen monitor, audio capture
- Preload: minimal IPC bridge (security boundary)
- Renderer: React UI, TanStack Query, Zustand

### State Management

**Desktop Main Process:**
- Use XState untuk session lifecycle
- Never use boolean flags (`isRecording`, etc.)
- Main process = single source of truth

**Desktop Renderer:**
- TanStack Query untuk server state
- Zustand untuk UI state
- Never mutate session state directly

**Backend:**
- Stateless per-request
- Job state di MongoDB (not memory)

### IPC Communication

- Use constants dari `desktop/src/shared/events/ipc-events.ts`
- Never use magic strings
- Type all IPC payloads

### Error Handling

- Desktop: fallback ke SQLite local cache
- Backend: return `BaseErrorResponse` dengan proper status codes
- Never expose internal errors ke client

## Testing

### Unit Tests

- Test all functions/classes
- Mock external dependencies
- Use descriptive test names

### Property-Based Tests

- Test core logic dengan random inputs
- Validate invariants
- Use fast-check atau similar library

### Running Tests

```bash
npm test                # All tests
npm run test:pbt        # Property-based tests
npm run test:watch      # Watch mode
```

## Commit Messages

Format: `<type>(<scope>): <subject>`

Types:
- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation
- `style`: formatting
- `refactor`: code restructuring
- `test`: adding tests
- `chore`: maintenance

Examples:
```
feat(desktop): add screen detection polling
fix(backend): handle Gemini API timeout
docs(readme): update setup instructions
```

## Pull Request Process

1. Create feature branch: `git checkout -b feat/your-feature`
2. Make changes dengan mengikuti conventions
3. Write tests
4. Run linter: `npm run lint`
5. Run formatter: `npm run format`
6. Run tests: `npm test`
7. Commit changes dengan descriptive messages
8. Push ke fork: `git push origin feat/your-feature`
9. Create PR dengan deskripsi lengkap:
   - What changed
   - Why it changed
   - How to test
   - Screenshots (jika UI changes)

## Code Review

- Be respectful dan constructive
- Focus on code, not person
- Explain reasoning
- Suggest alternatives
- Approve when ready

## Questions?

Open an issue atau contact maintainers.
