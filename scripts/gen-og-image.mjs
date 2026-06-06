/**
 * Generate web/public/og-image.png and web/public/favicon.ico
 * from SVG source files using Puppeteer (loaded from backend/node_modules).
 *
 * Usage (from project root):
 *   node scripts/gen-og-image.mjs
 *
 * Requires backend dependencies to be installed:
 *   pnpm install
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load puppeteer from backend/node_modules
const puppeteerEntry = resolve(ROOT, 'backend/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
const { default: puppeteer } = await import(pathToFileURL(puppeteerEntry).href);

async function generate() {
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    await generateOgImage(browser);
    await generateFavicon(browser);
    console.log('\nFile ditulis ke web/public/');
  } finally {
    await browser.close();
  }
}

async function generateOgImage(browser) {
  const svgContent = readFileSync(resolve(ROOT, 'web/public/og-image.svg'), 'utf-8');
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>* { margin:0; padding:0; } body { width:1200px; height:630px; overflow:hidden; background:#0f172a; }</style>
</head>
<body>${svgContent}</body>
</html>`;

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await page.close();

  writeFileSync(resolve(ROOT, 'web/public/og-image.png'), png);
  console.log('✓ og-image.png  (1200×630)');
}

async function generateFavicon(browser) {
  const svgContent = readFileSync(resolve(ROOT, 'web/public/favicon.svg'), 'utf-8');
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>* { margin:0; padding:0; } body { width:32px; height:32px; overflow:hidden; background:transparent; } svg { display:block; width:32px; height:32px; }</style>
</head>
<body>${svgContent}</body>
</html>`;

  const page = await browser.newPage();
  await page.setViewport({ width: 32, height: 32, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 32, height: 32 }, omitBackground: true });
  await page.close();

  writeFileSync(resolve(ROOT, 'web/public/favicon.ico'), pngToIco(png));
  console.log('✓ favicon.ico   (32×32)');
}

/**
 * Wrap a PNG buffer in a minimal single-image ICO container.
 * ICO format: 6-byte header + 16-byte dir entry + PNG data.
 */
function pngToIco(pngBuffer) {
  const IMAGE_OFFSET = 22; // 6 + 16
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(1, 4); // count: 1 image

  const dir = Buffer.alloc(16);
  dir.writeUInt8(32, 0);                   // width
  dir.writeUInt8(32, 1);                   // height
  dir.writeUInt8(0, 2);                    // color count
  dir.writeUInt8(0, 3);                    // reserved
  dir.writeUInt16LE(1, 4);                 // planes
  dir.writeUInt16LE(32, 6);               // bits per pixel
  dir.writeUInt32LE(pngBuffer.length, 8); // size of PNG data
  dir.writeUInt32LE(IMAGE_OFFSET, 12);    // offset to PNG data

  return Buffer.concat([header, dir, pngBuffer]);
}

generate().catch((err) => { console.error(err); process.exit(1); });
