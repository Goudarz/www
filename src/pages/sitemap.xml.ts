// src/pages/sitemap.xml.ts
// One sitemap for both languages; every URL lists its translations via hreflang, as Google recommends.
import type { APIRoute } from 'astro';
import { languages, profile } from '../i18n/ui';

export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() ?? profile.siteUrl).replace(/\/$/, '');
  const lastmod = new Date().toISOString().slice(0, 10);
  const locales = Object.entries(languages);

  const alternates = [
    ...locales.map(([code, l]) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${base}${l.path}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}${languages.en.path}"/>`,
  ].join('\n');

  const urls = locales
    .map(
      ([, l]) => `  <url>
    <loc>${base}${l.path}</loc>
    <lastmod>${lastmod}</lastmod>
${alternates}
  </url>`,
    )
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
