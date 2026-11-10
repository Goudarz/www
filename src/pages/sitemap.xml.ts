// src/pages/sitemap.xml.ts
// One sitemap for both languages; every URL lists its translations via hreflang, as Google recommends.
import type { APIRoute } from 'astro';
import { languages, profile, type Lang } from '../i18n/ui';
import { loadAll } from '../persian-calendar/content';
import { pageUrl } from '../persian-calendar/pages';

interface Entry {
  paths: Record<Lang, string>;
  lastmod: string;
}

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? profile.siteUrl).replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);

  const entries: Entry[] = [
    // Profile pages
    { paths: { en: languages.en.path, fa: languages.fa.path }, lastmod: today },
    // Persian Calendar guide: last commit that touched each page's source in the repository
    ...(await loadAll('en')).map((doc) => ({
      paths: { en: pageUrl(doc.page.slug, 'en'), fa: pageUrl(doc.page.slug, 'fa') },
      lastmod: doc.modified.toISOString().slice(0, 10),
    })),
  ];

  const urls = entries
    .flatMap(({ paths, lastmod }) => {
      const alternates = [
        ...(Object.keys(paths) as Lang[]).map(
          (code) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${base}${paths[code]}"/>`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}${paths.en}"/>`,
      ].join('\n');
      return (Object.keys(paths) as Lang[]).map(
        (code) => `  <url>
    <loc>${base}${paths[code]}</loc>
    <lastmod>${lastmod}</lastmod>
${alternates}
  </url>`,
      );
    })
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
