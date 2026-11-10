// src/persian-calendar/endpoints.ts
// Shared handlers for the plain-text routes: page Markdown, llms.txt and llms-full.txt.
import type { Lang } from '../i18n/ui';
import { ORIGIN, loadAll, loadDoc, version, type DocData } from './content';
import { docsText } from './i18n';
import { docPages, markdownUrl, pageUrl, type DocPage } from './pages';
import { REPO_URL } from './repo';
import { LICENSES, repoZipUrl } from './schema';

const markdown = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });

export const markdownPaths = () => docPages.map((page) => ({ params: { slug: page.slug || 'index' }, props: { page } }));

/** One page as Markdown, with a short source note at the end */
export async function pageMarkdown(page: DocPage, lang: Lang) {
  const doc = await loadDoc(page, lang);
  const url = `${ORIGIN}${pageUrl(page.slug, lang)}`;
  const note =
    lang === 'fa'
      ? `---\n\nنشانی صفحه: ${url}\nمجوز: متن CC BY 4.0، کد MIT، داده CC0 1.0. نسخهٔ ${version} از ${REPO_URL}\n`
      : `---\n\nPage: ${url}\nLicense: text CC BY 4.0, code MIT, data CC0 1.0. Version ${version} of ${REPO_URL}\n`;
  return markdown(`${doc.markdown}\n${note}`);
}

const entry = (d: DocData) => `- [${d.title}](${ORIGIN}${markdownUrl(d.page.slug, d.lang)}): ${d.description}`;

/** Index of the guide for language models (https://llmstxt.org) */
export async function llmsIndex() {
  const [en, fa] = await Promise.all([loadAll('en'), loadAll('fa')]);
  const pick = (docs: DocData[], test: (d: DocData) => boolean) => docs.filter(test).map(entry).join('\n');
  const isImplementation = (d: DocData) => d.page.group === 'code';
  return markdown(`# ${docsText.en.brandLong} (${docsText.fa.brandLong})

> ${en[0].description}

A bilingual (English and Persian) guide by Goudarz Jafari to adding the Jalali (Persian, Solar Hijri, Shamsi) calendar to
software: the astronomical leap-year rule, the 33-year rule with 78 corrections (the same algorithm as ICU 77.1+ and ICU4X),
dependency-free code in 14 languages, reference data checked against the University of Tehran Calendar Center table, and an
evaluation of 23 libraries. Every link below is plain Markdown; the HTML page has the same address without ".md".
Version ${version}. Source: ${REPO_URL}

- The whole guide in one file: [English](${ORIGIN}/persian-calendar/llms-full.txt), [Persian](${ORIGIN}/fa/persian-calendar/llms-full.txt)
- Code, data and docs as one .zip: ${ORIGIN}${repoZipUrl}
- Licenses: text [CC BY 4.0](${LICENSES.docs}), code [MIT](${LICENSES.code}), data [CC0 1.0](${LICENSES.data})

## Guide

${pick(en, (d) => d.page.kind === 'home' || d.page.kind === 'chapter')}

## Implementations

${pick(en, isImplementation)}

## Data and verification

${pick(en, (d) => d.page.group === 'verification' || d.page.group === 'project')}

## راهنما به فارسی

${pick(fa, (d) => d.page.kind === 'home' || d.page.kind === 'chapter')}

## Optional

${pick(fa, (d) => d.page.kind === 'reference' || d.page.kind === 'language')}
`);
}

/** The whole guide in one language, for models that read a single file */
export async function llmsFull(lang: Lang) {
  const docs = await loadAll(lang);
  const parts = docs
    .filter((d) => d.page.kind !== 'language')
    .map((d) => `${d.markdown.trim()}\n\nURL: ${ORIGIN}${pageUrl(d.page.slug, lang)}`);
  const t = docsText[lang];
  const code = `${ORIGIN}${pageUrl('implementations', lang)}`;
  const header =
    lang === 'fa'
      ? `> ${t.brandLong}: متن کامل راهنما در یک فایل. کد هر زبان در ${code} است.`
      : `> ${t.brandLong}: the complete guide in one file. The code for each language is at ${code}`;
  return markdown(`${header}\n\n${parts.join('\n\n---\n\n')}\n`);
}
