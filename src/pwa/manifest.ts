// src/pwa/manifest.ts
// Builds the Web App Manifest for each language. Both share one `id`, so the browser treats them as the same app.
import { languages, siteData, type Lang } from '../i18n/ui';

export const THEME_COLOR = '#141c29';

export function buildManifest(lang: Lang) {
  const t = siteData[lang];
  const { dir, path } = languages[lang];
  const other = lang === 'en' ? 'fa' : 'en';

  return {
    id: '/',
    name: `${t.name} — ${t.role}`,
    short_name: t.pwaShortName,
    description: t.description,
    lang: languages[lang].locale,
    dir,
    start_url: path,
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    theme_color: THEME_COLOR,
    background_color: THEME_COLOR,
    categories: ['personal', 'developer', 'portfolio'],
    prefer_related_applications: false,
    launch_handler: { client_mode: ['navigate-existing', 'auto'] },
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    screenshots: [
      { src: `/screenshots/${lang}-wide.png`, sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: t.title },
      { src: `/screenshots/${lang}-narrow.png`, sizes: '540x1170', type: 'image/png', form_factor: 'narrow', label: t.title },
    ],
    shortcuts: [
      { name: t.projectsTitle, url: `${path}#work`, icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: t.freedomTitle, url: `${path}#free-software`, icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: t.contactTitle, short_name: t.nav.find((item) => item.href === '#contact')!.label, url: `${path}#contact`, icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: t.switchLangLabel, url: languages[other].path, icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  };
}

export const manifestResponse = (lang: Lang) =>
  new Response(JSON.stringify(buildManifest(lang)), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
