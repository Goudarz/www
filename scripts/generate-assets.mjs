// scripts/generate-assets.mjs
// Builds the favicons, PWA icons and OG images from src/assets/gj-logo.svg. Run after changing the name, role or logo:
//   npm run assets
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const pub = new URL('../public/', import.meta.url);
const out = (name) => new URL(name, pub);
await mkdir(out('og/'), { recursive: true });

const NAVY = '#141c29';
const YELLOW = '#ffca08';

// Read the logo markup and its viewBox from the source SVG
const logoSvg = await readFile(new URL('../src/assets/gj-logo.svg', import.meta.url), 'utf8');
const [vx, vy, vw, vh] = logoSvg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const logoInner = logoSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

/** Place the logo at (x, y) with the given width */
const logoAt = (x, y, width) =>
  `<g transform="translate(${x} ${y}) scale(${width / vw}) translate(${-vx} ${-vy})">${logoInner}</g>`;

/** Square icon with the logo centred at `ratio` of the width */
const iconSvg = (size, ratio, radius) => {
  const w = size * ratio;
  const h = (w * vh) / vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${NAVY}"/>
  ${logoAt((size - w) / 2, (size - h) / 2, w)}
</svg>`;
};

// favicon.svg is generated from the same logo so they never drift apart
const faviconSvg = iconSvg(64, 0.8, 14);
await writeFile(out('favicon.svg'), faviconSvg + '\n');

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

await writeFile(out('icon-192.png'), await png(iconSvg(512, 0.72, 96), 192));
await writeFile(out('icon-512.png'), await png(iconSvg(512, 0.72, 96), 512));
// Maskable: square corners, logo inside the safe zone (central 80%)
await writeFile(out('icon-maskable-512.png'), await png(iconSvg(512, 0.56, 0), 512));
await writeFile(out('apple-touch-icon.png'), await png(iconSvg(180, 0.7, 0), 180));
// For Schema.org (Person image) and anywhere a square logo is needed
await writeFile(out('logo.png'), await png(iconSvg(512, 0.78, 0), 512));

// ICO wrapping a single PNG image (supported by all modern browsers)
const png32 = await png(faviconSvg, 32);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6);
header.writeUInt8(32, 7);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png32.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(out('favicon.ico'), Buffer.concat([header, png32]));

// Open Graph images (1200×630)
const og = ({ first, last, alt, role, url, dir }) => {
  const rtl = dir === 'rtl';
  const textX = rtl ? 1110 : 90;
  const anchor = rtl ? 'end' : 'start';
  const logoW = 300;
  const logoX = rtl ? 90 : 1200 - 90 - logoW;
  const logoY = 315 - (logoW * vh) / vw / 2 - 20;
  const glowX = rtl ? 0.24 : 0.76;
  // librsvg lays text chunks out left to right in source order, so for RTL the last name goes first in the
  // markup; it then renders on the left and the first name (white) is read first, on the right.
  const lastName = `<tspan fill="${YELLOW}">${last}</tspan>`;
  const nameMarkup = rtl ? `${lastName} ${first}` : `${first} ${lastName}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="${glowX}" cy="0.47" r="0.36">
      <stop offset="0" stop-color="${YELLOW}" stop-opacity=".22"/>
      <stop offset="1" stop-color="${NAVY}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity=".045"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="${NAVY}"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  ${logoAt(logoX, logoY, logoW)}
  <polygon points="0,600 1200,600 1200,630 0,630" fill="${YELLOW}"/>
  <g font-family="Segoe UI, Vazirmatn, sans-serif" text-anchor="${anchor}">
    <text x="${textX}" y="290" font-size="80" font-weight="800" fill="#ffffff">${nameMarkup}</text>
    <text x="${textX}" y="360" font-size="32" font-weight="600" fill="#dde3ec">${role}</text>
    <text x="${textX}" y="415" font-size="28" fill="#98a4b8">${alt}</text>
    <text x="${textX}" y="530" font-size="24" font-family="Consolas, monospace" fill="${YELLOW}">${url}</text>
  </g>
</svg>`;
};

const pages = {
  en: { first: 'Goudarz', last: 'Jafari', alt: 'گودرز جعفری', role: 'Software Engineer &amp; Free Software Activist', url: 'goudarzjafari.com', dir: 'ltr' },
  fa: { first: 'گودرز', last: 'جعفری', alt: 'Goudarz Jafari', role: 'مهندس نرم‌افزار و فعال نرم‌افزار آزاد', url: 'goudarzjafari.com/fa', dir: 'rtl' },
};

for (const [lang, data] of Object.entries(pages)) {
  await writeFile(out(`og/${lang}.png`), await sharp(Buffer.from(og(data))).png({ compressionLevel: 9 }).toBuffer());
}

console.log('✓ favicon.svg/.ico, icon-192/512, icon-maskable-512, apple-touch-icon, logo.png, og/en.png, og/fa.png');
