import puppeteer from 'puppeteer';
import { Session } from '@models/Session';
import { Note } from '@models/Note';
import { Summary } from '@models/Summary';
import { AppError } from '@middleware/error-handler';
import { logger } from '@config/logger';

// ============================================================================
// Helpers
// ============================================================================

function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}`;
}

function formatDuration(secs?: number): string {
  if (!secs) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTimestamp(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 80);
}

// ============================================================================
// Markdown builder
// ============================================================================

function buildMarkdown(
  session: InstanceType<typeof Session>,
  notes: InstanceType<typeof Note>[],
  summary: InstanceType<typeof Summary> | null
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${session.videoTitle}`, '');
  lines.push(`**Sumber:** ${session.sourceApp}  `);
  lines.push(`**Tanggal:** ${formatDate(session.startedAt)}  `);
  lines.push(`**Durasi:** ${formatDuration(session.durationSec)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Rangkuman
  if (summary) {
    lines.push('## Rangkuman', '');
    lines.push(summary.content, '');

    if (summary.keyPoints.length > 0) {
      lines.push('## Poin Utama', '');
      for (const kp of summary.keyPoints) {
        lines.push(`- ${kp}`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  // Catatan
  if (notes.length > 0) {
    lines.push('## Catatan', '');

    const autoNotes = notes.filter((n) => n.type === 'auto');
    const manualNotes = notes.filter((n) => n.type === 'manual');

    if (autoNotes.length > 0) {
      lines.push('### Otomatis', '');
      for (const note of autoNotes) {
        lines.push(`- \`[${formatTimestamp(note.timestampSec)}]\` ${note.text}`);
      }
      lines.push('');
    }

    if (manualNotes.length > 0) {
      lines.push('### Manual', '');
      for (const note of manualNotes) {
        lines.push(`- \`[${formatTimestamp(note.timestampSec)}]\` ${note.text}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

// ============================================================================
// Plain text builder
// ============================================================================

function buildTxt(
  session: InstanceType<typeof Session>,
  notes: InstanceType<typeof Note>[],
  summary: InstanceType<typeof Summary> | null
): string {
  const lines: string[] = [];
  const sep = '='.repeat(60);
  const divider = '-'.repeat(60);

  // Header
  lines.push(session.videoTitle);
  lines.push(sep, '');
  lines.push(`Sumber : ${session.sourceApp}`);
  lines.push(`Tanggal: ${formatDate(session.startedAt)}`);
  lines.push(`Durasi : ${formatDuration(session.durationSec)}`);
  lines.push('');
  lines.push(divider);
  lines.push('');

  // Rangkuman
  if (summary) {
    lines.push('RANGKUMAN', '');
    lines.push(summary.content, '');

    if (summary.keyPoints.length > 0) {
      lines.push('POIN UTAMA', '');
      for (const kp of summary.keyPoints) {
        lines.push(`* ${kp}`);
      }
      lines.push('');
    }
    lines.push(divider);
    lines.push('');
  }

  // Catatan
  if (notes.length > 0) {
    lines.push('CATATAN', '');

    const autoNotes = notes.filter((n) => n.type === 'auto');
    const manualNotes = notes.filter((n) => n.type === 'manual');

    if (autoNotes.length > 0) {
      lines.push('[Otomatis]', '');
      for (const note of autoNotes) {
        lines.push(`[${formatTimestamp(note.timestampSec)}] ${note.text}`);
      }
      lines.push('');
    }

    if (manualNotes.length > 0) {
      lines.push('[Manual]', '');
      for (const note of manualNotes) {
        lines.push(`[${formatTimestamp(note.timestampSec)}] ${note.text}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

// ============================================================================
// HTML template for PDF
// ============================================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(
  session: InstanceType<typeof Session>,
  notes: InstanceType<typeof Note>[],
  summary: InstanceType<typeof Summary> | null
): string {
  const autoNotes = notes.filter((n) => n.type === 'auto');
  const manualNotes = notes.filter((n) => n.type === 'manual');

  const keyPointsHtml =
    summary && summary.keyPoints.length > 0
      ? `<ul class="key-points">${summary.keyPoints.map((kp) => `<li>${escapeHtml(kp)}</li>`).join('')}</ul>`
      : '';

  const notesHtml = notes.length > 0
    ? `
      <section class="section">
        <h2>Catatan</h2>
        ${autoNotes.length > 0 ? `
          <h3>Otomatis</h3>
          <ul class="notes-list">
            ${autoNotes.map((n) => `<li><span class="ts">[${formatTimestamp(n.timestampSec)}]</span> ${escapeHtml(n.text)}</li>`).join('')}
          </ul>` : ''}
        ${manualNotes.length > 0 ? `
          <h3>Manual</h3>
          <ul class="notes-list">
            ${manualNotes.map((n) => `<li><span class="ts">[${formatTimestamp(n.timestampSec)}]</span> ${escapeHtml(n.text)}</li>`).join('')}
          </ul>` : ''}
      </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(session.videoTitle)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
    }

    .page { max-width: 700px; margin: 0 auto; padding: 32px; }

    /* Header */
    .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #4f46e5; }
    .header h1 { font-size: 18pt; font-weight: 700; color: #1e1b4b; line-height: 1.3; margin-bottom: 8px; }
    .meta { display: flex; gap: 20px; flex-wrap: wrap; font-size: 9pt; color: #6b7280; }
    .meta span { display: flex; align-items: center; gap: 4px; }
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
      background: #ede9fe; color: #5b21b6;
    }

    /* Sections */
    .section { margin-bottom: 28px; page-break-inside: avoid; }
    .section h2 {
      font-size: 13pt; font-weight: 700; color: #1e1b4b;
      border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px;
    }
    .section h3 {
      font-size: 10pt; font-weight: 600; color: #4b5563;
      margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.06em;
    }

    /* Summary */
    .summary-content { color: #374151; line-height: 1.8; white-space: pre-line; }

    /* Key points */
    .key-points { padding-left: 0; list-style: none; margin-top: 12px; }
    .key-points li {
      padding: 6px 0 6px 20px; position: relative; color: #374151;
      border-bottom: 1px solid #f3f4f6;
    }
    .key-points li::before {
      content: '✓'; position: absolute; left: 0;
      color: #4f46e5; font-weight: 700;
    }

    /* Notes */
    .notes-list { padding-left: 0; list-style: none; }
    .notes-list li {
      padding: 5px 0; border-bottom: 1px solid #f3f4f6;
      font-size: 10pt; line-height: 1.6;
    }
    .ts {
      font-family: 'Courier New', monospace; font-size: 9pt;
      background: #f0f9ff; color: #0369a1;
      padding: 1px 5px; border-radius: 3px; margin-right: 6px;
      white-space: nowrap;
    }

    /* Divider */
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }

    /* Print */
    @media print {
      body { font-size: 10pt; }
      .page { padding: 0; max-width: 100%; }
      .section { page-break-inside: avoid; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>${escapeHtml(session.videoTitle)}</h1>
      <div class="meta">
        <span><strong>Sumber:</strong> ${escapeHtml(session.sourceApp)}</span>
        <span><strong>Tanggal:</strong> ${escapeHtml(formatDate(session.startedAt))}</span>
        <span><strong>Durasi:</strong> ${escapeHtml(formatDuration(session.durationSec))}</span>
        <span><span class="badge">${session.sourceType}</span></span>
      </div>
    </div>

    ${summary ? `
    <section class="section">
      <h2>Rangkuman</h2>
      <p class="summary-content">${escapeHtml(summary.content)}</p>
      ${summary.keyPoints.length > 0 ? `<h3>Poin Utama</h3>${keyPointsHtml}` : ''}
    </section>
    <hr>
    ` : ''}

    ${notesHtml}
  </div>
</body>
</html>`;
}

// ============================================================================
// PDF generator
// ============================================================================

function isRealChromiumBinary(p: string): boolean {
  // Stub snap di Ubuntu dimulai dengan "#!/bin/sh" — bukan binary ELF
  const { readFileSync } = require('fs') as typeof import('fs');
  try {
    const header = readFileSync(p, { flag: 'r' });
    // ELF magic: 0x7F 'E' 'L' 'F'
    return header[0] === 0x7f && header[1] === 0x45;
  } catch {
    return false;
  }
}

function findChromiumExecutable(): string | undefined {
  const { execSync } = require('child_process') as typeof import('child_process');

  // Prioritaskan path Nix (Railway nixpacks) — selalu binary nyata, bukan stub
  const nixCandidates = [
    '/nix/var/nix/profiles/default/bin/chromium',
    '/root/.nix-profile/bin/chromium',
  ];
  for (const p of nixCandidates) {
    try {
      execSync(`test -x ${p}`, { stdio: 'ignore' });
      if (isRealChromiumBinary(p)) {
        logger.info(`[Export] Nix chromium found: ${p}`);
        return p;
      }
    } catch { /* not found */ }
  }

  // Resolve PUPPETEER_EXECUTABLE_PATH — hanya pakai jika binary nyata
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv) {
    const absPath = fromEnv.startsWith('/')
      ? fromEnv
      : (() => {
          try {
            return execSync(`which ${fromEnv}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
          } catch { return ''; }
        })();
    if (absPath && isRealChromiumBinary(absPath)) return absPath;
    if (absPath) logger.warn(`[Export] PUPPETEER_EXECUTABLE_PATH "${absPath}" adalah stub snap, diabaikan`);
  }

  // Path absolut umum — skip /usr/bin/chromium-browser (selalu Ubuntu snap stub)
  const candidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  for (const p of candidates) {
    try {
      execSync(`test -x ${p}`, { stdio: 'ignore' });
      if (isRealChromiumBinary(p)) return p;
    } catch { /* not found */ }
  }

  return undefined;
}

async function generatePdf(html: string): Promise<Buffer> {
  logger.info('[Export] Launching Puppeteer for PDF generation');
  const systemPath = findChromiumExecutable();

  // Ketika tidak ada system chromium, gunakan bundled chromium dari paket puppeteer.
  // Hapus PUPPETEER_EXECUTABLE_PATH sementara agar puppeteer tidak pakai path yang salah.
  const envOverride = process.env.PUPPETEER_EXECUTABLE_PATH;
  const executablePath = systemPath ?? (() => {
    if (envOverride) delete process.env.PUPPETEER_EXECUTABLE_PATH;
    try {
      const bundled = puppeteer.executablePath();
      logger.info(`[Export] Bundled chromium path: ${bundled}`);
      return bundled;
    } catch {
      return undefined;
    }
  })();

  logger.info(`[Export] Chromium path: ${executablePath ?? 'unknown'}`);

  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
    });
    logger.info('[Export] PDF generated successfully');
    return Buffer.from(pdf);
  } catch (err) {
    logger.error('[Export] Puppeteer PDF generation failed:', err);
    throw new AppError(500, 'PDF_GENERATION_FAILED', 'Gagal membuat PDF. Pastikan Chromium tersedia.');
  } finally {
    await browser.close();
    // Restore env var jika sempat dihapus
    if (envOverride && !systemPath) {
      process.env.PUPPETEER_EXECUTABLE_PATH = envOverride;
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

export type ExportFormat = 'md' | 'txt' | 'pdf';

export interface ExportTextResult {
  kind: 'text';
  content: string;
  filename: string;
  mimeType: string;
}

export interface ExportBinaryResult {
  kind: 'binary';
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export type ExportResult = ExportTextResult | ExportBinaryResult;

export async function exportSession(
  sessionId: string,
  userId: string,
  format: ExportFormat
): Promise<ExportResult> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');

  const [notes, summary] = await Promise.all([
    Note.find({ sessionId, userId }).sort({ timestampSec: 1 }).lean(),
    Summary.findOne({ sessionId, userId }).lean(),
  ]);

  const dateStr = session.startedAt.toISOString().slice(0, 10);
  const baseName = sanitizeFilename(session.videoTitle);

  const noteInstances = notes as InstanceType<typeof Note>[];
  const summaryInstance = summary as InstanceType<typeof Summary> | null;

  if (format === 'pdf') {
    const html = buildHtml(session, noteInstances, summaryInstance);
    const buffer = await generatePdf(html);
    return {
      kind: 'binary',
      buffer,
      filename: `${baseName}-${dateStr}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  if (format === 'md') {
    return {
      kind: 'text',
      content: buildMarkdown(session, noteInstances, summaryInstance),
      filename: `${baseName}-${dateStr}.md`,
      mimeType: 'text/markdown; charset=utf-8',
    };
  }

  return {
    kind: 'text',
    content: buildTxt(session, noteInstances, summaryInstance),
    filename: `${baseName}-${dateStr}.txt`,
    mimeType: 'text/plain; charset=utf-8',
  };
}
