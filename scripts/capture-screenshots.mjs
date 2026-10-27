// scripts/capture-screenshots.mjs
// Captures the PWA install screenshots referenced by the manifests (public/screenshots/).
// Usage: run `npm run build && npm run preview` in one terminal, then `npm run screenshots` in another.
//   BASE_URL  site to capture (default http://localhost:4321)
//   BROWSER   path to a Chromium-based browser (defaults to Edge or Chrome on Windows, chromium elsewhere)
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const base = process.env.BASE_URL ?? 'http://localhost:4321';
const browser =
  process.env.BROWSER ??
  [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find(existsSync);

if (!browser) throw new Error('No Chromium browser found; set BROWSER=/path/to/browser');

const outDir = new URL('../public/screenshots/', import.meta.url);
await mkdir(outDir, { recursive: true });

// Sizes must match the `sizes` declared in src/pwa/manifest.ts
const shots = [
  { lang: 'en', path: '/', form: 'wide', width: 1280, height: 720 },
  { lang: 'en', path: '/', form: 'narrow', width: 540, height: 1170 },
  { lang: 'fa', path: '/fa/', form: 'narrow', width: 540, height: 1170 },
  { lang: 'fa', path: '/fa/', form: 'wide', width: 1280, height: 720 },
];

for (const shot of shots) {
  const tmp = path.join(tmpdir(), `gj-${shot.lang}-${shot.form}.png`);
  await run(browser, [
    '--headless=new',
    '--hide-scrollbars',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    `--window-size=${shot.width},${shot.height}`,
    '--virtual-time-budget=5000',
    `--screenshot=${tmp}`,
    new URL(shot.path, base).href,
  ]);
  // Headless windows can have a minimum size, so crop/resize to the exact declared dimensions
  await sharp(tmp)
    .resize(shot.width, shot.height, { fit: 'cover', position: 'top' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir.pathname.replace(/^\/([A-Za-z]:)/, '$1'), `${shot.lang}-${shot.form}.png`));
  await rm(tmp, { force: true });
  console.log(`✓ ${shot.lang}-${shot.form}.png`);
}
