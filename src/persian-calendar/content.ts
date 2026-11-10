// src/persian-calendar/content.ts
// Page data for the guide, built once per page and language and cached for the rest of the build.
import path from 'node:path';
import type { Root, Table } from 'mdast';
import { profile, type Lang } from '../i18n/ui';
import { docsText, formatNumber } from './i18n';
import { fileAnchor, implementations, mdParser, mdText, prismLanguage, type Implementation } from './implementations';
import { highlight, inlineMarkdown, renderInline, renderMarkdown, summarize, toHtml, el, type TocItem } from './markdown';
import { chapterPages, docPages, fileUrl, pageUrl, type DocPage } from './pages';
import { readRepoText, repoDates, repoFileSize, repoFiles, version } from './repo';

export const ORIGIN = profile.siteUrl;
export { version };

export interface CodeFile {
  path: string;
  /** Path inside the language folder, for example "tests/Program.cs" */
  name: string;
  id: string;
  language: string;
  html: string;
  raw: string;
  lines: number;
  bytes: number;
  url: string;
}

export interface LanguageView {
  impl: Implementation;
  code: CodeFile[];
  tests: CodeFile[];
  extra: CodeFile[];
  zipUrl: string;
  details: { testedWith: string; crossChecked: string; checks: string } | null;
}

export interface DocData {
  page: DocPage;
  lang: Lang;
  title: string;
  navTitle: string;
  description: string;
  number?: number;
  html: string;
  leadHtml?: string;
  headings: TocItem[];
  /** Complete Markdown document for the .md endpoint and llms-full.txt */
  markdown: string;
  minutes: number;
  created: Date;
  modified: Date;
  sources: string[];
  language?: LanguageView;
}

export const zipName = (impl?: Implementation) => (impl ? `persian-calendar-${impl.slug}.zip` : `persian-calendar-${version}.zip`);
export const DATA_ZIP = 'persian-calendar-data.zip';

/** "# Title", then a summary line unless the body already opens with the introduction, then the body */
const markdownTitle = (title: string, summary: string, body: string) =>
  `# ${title}\n\n${summary ? `> ${summary}\n\n` : ''}${body.trim()}\n`;

const fence = (code: string, language: string) => {
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = '`'.repeat(longest + 1);
  return `${ticks}${language}\n${code.replace(/\n$/, '')}\n${ticks}`;
};

function codeFile(rel: string, impl: Implementation): CodeFile {
  const raw = readRepoText(rel);
  const name = rel.slice(`implementations/${impl.dir}/`.length);
  const language = prismLanguage(rel);
  return {
    path: rel,
    name,
    id: fileAnchor(rel),
    language,
    html: toHtml(highlight(raw.replace(/\n$/, ''), language)),
    raw,
    lines: raw.replace(/\n$/, '').split('\n').length,
    bytes: repoFileSize(rel),
    url: fileUrl(rel),
  };
}

async function languageDoc(page: DocPage, lang: Lang): Promise<DocData> {
  const impl = page.impl!;
  const t = docsText[lang];
  const readme = 'implementations/README.md';
  const details = impl.details[lang] ?? impl.details.en;
  const view: LanguageView = {
    impl,
    code: impl.code.map((f) => codeFile(f, impl)),
    tests: impl.tests.map((f) => codeFile(f, impl)),
    extra: impl.extra.map((f) => codeFile(f, impl)),
    zipUrl: fileUrl(zipName(impl)),
    details: details && {
      testedWith: await renderInline(details.testedWith, readme, lang),
      crossChecked: await renderInline(details.crossChecked, readme, lang),
      checks: await renderInline(details.checks, readme, lang),
    },
  };
  const title = t.languageTitle(impl.name);
  const description = t.languageDescription(impl.name);
  const files = [...view.code, ...view.tests, ...view.extra];

  const headings: TocItem[] = [
    { depth: 2, id: 'quick-start', text: t.quickStart },
    { depth: 2, id: 'source', text: t.sourceFiles },
    ...view.code.map((f) => ({ depth: 3, id: f.id, text: f.name })),
    { depth: 2, id: 'tests', text: t.testFiles },
    ...view.tests.map((f) => ({ depth: 3, id: f.id, text: f.name })),
    ...(view.extra.length ? [{ depth: 2, id: 'project-files', text: t.projectFiles }] : []),
  ];

  const facts = [
    `- ${t.facts.requirement}: ${impl.label}`,
    `- ${t.facts.testedWith}: ${impl.testedWith}`,
    ...(details
      ? [
          `- ${t.facts.crossChecked}: ${inlineMarkdown(details.crossChecked, readme, lang, ORIGIN)}`,
          `- ${t.facts.checks}: ${inlineMarkdown(details.checks, readme, lang, ORIGIN)}`,
        ]
      : []),
    `- ${t.facts.license}: MIT`,
    `- ${t.facts.version}: ${version}`,
    `- ${t.downloadAll}: ${ORIGIN}${view.zipUrl}`,
  ].join('\n');
  const body = [
    facts,
    `## ${t.quickStart}`,
    `1. ${t.stepDownload}`,
    `2. ${t.stepTest} \`implementations/${impl.dir}\`\n\n   ${fence(impl.run, 'sh').replace(/\n/g, '\n   ')}`,
    `3. ${t.stepApi} ${ORIGIN}${pageUrl('implementations', lang)}#common-api`,
    ...files.map((f) => `## ${f.name}\n\n${fence(f.raw, f.language === 'go-module' ? '' : f.language)}`),
  ].join('\n\n');

  const { created, modified } = repoDates(...impl.files);
  return {
    page,
    lang,
    title,
    navTitle: impl.name,
    description,
    html: '',
    headings,
    markdown: markdownTitle(title, description, body),
    minutes: 1,
    created,
    modified,
    sources: impl.files,
    language: view,
  };
}

async function markdownDoc(page: DocPage, lang: Lang): Promise<DocData> {
  const source = page.source[lang];
  const rendered = await renderMarkdown({
    source,
    lang,
    mixed: page.mixed,
    origin: ORIGIN,
    extractLead: page.kind === 'home',
    dropChapterTable: page.kind === 'home',
  });
  const title = page.title?.[lang] ?? rendered.title;
  // Pages without an introduction use the chapter summary from the README, or a generic line
  const blurb = page.kind === 'chapter' ? chapterBlurbs(lang).get(page.slug) : undefined;
  const description =
    page.description?.[lang] ??
    (rendered.description ||
      summarize(`${blurb ? `${title}: ${blurb}.` : `${title} · ${docsText[lang].brandLong}.`} ${rendered.firstText}`));
  const { created, modified } = repoDates(source);
  return {
    page,
    lang,
    title,
    navTitle: page.navLabel?.[lang] ?? rendered.title,
    description,
    number: rendered.number,
    html: rendered.html,
    leadHtml: rendered.leadHtml,
    headings: rendered.headings,
    markdown: markdownTitle(title, rendered.description ? '' : description, [rendered.leadMarkdown, rendered.markdown].filter(Boolean).join('\n')),
    minutes: Math.max(1, Math.round(rendered.words / (lang === 'fa' ? 180 : 220))),
    created,
    modified,
    sources: [source],
  };
}

const cache = new Map<string, Promise<DocData>>();

export function loadDoc(page: DocPage, lang: Lang): Promise<DocData> {
  const key = `${lang}:${page.slug}`;
  let doc = cache.get(key);
  if (!doc) {
    doc = page.kind === 'language' ? languageDoc(page, lang) : markdownDoc(page, lang);
    cache.set(key, doc);
  }
  return doc;
}

export const loadAll = (lang: Lang) => Promise.all(docPages.map((page) => loadDoc(page, lang)));

// ---------- Home page data ----------

/** Short chapter descriptions from the chapter table in README.md / README.fa.md */
const blurbCache = new Map<Lang, Map<string, string>>();
export function chapterBlurbs(lang: Lang): Map<string, string> {
  const cached = blurbCache.get(lang);
  if (cached) return cached;
  const tree = mdParser.parse(readRepoText(lang === 'fa' ? 'README.fa.md' : 'README.md')) as Root;
  const blurbs = new Map<string, string>();
  const visit = (node: Root | Table | Root['children'][number]) => {
    if (node.type === 'table') {
      for (const row of node.children.slice(1)) {
        const cell = row.children[1];
        const link = cell?.children.find((c) => c.type === 'link');
        const slug = link?.type === 'link' ? link.url.match(/docs\/(?:en|fa)\/\d+-(.+)\.md$/)?.[1] : undefined;
        const blurb = mdText(cell).split(/\s[—-]\s/)[1];
        if (slug && blurb) blurbs.set(slug, blurb.trim());
      }
    } else if ('children' in node) (node.children as Root['children']).forEach(visit);
  };
  visit(tree);
  blurbCache.set(lang, blurbs);
  return blurbs;
}

/** Headline numbers, counted from the repository so they never go stale */
export const stats = (() => {
  const years = readRepoText('data/years.csv').trim().split('\n').slice(1);
  const days = years.reduce((sum, line) => sum + Number(line.split(',')[2]), 0);
  const vectors = readRepoText('data/test-vectors.csv').trim().split('\n').length - 1;
  const summary = readRepoText('tools/library-evaluation/results/SUMMARY.md');
  const libraries = summary.split('\n').filter((line) => /^\|/.test(line)).length - 2;
  return { languages: implementations.length, days, vectors, libraries };
})();

export const formatStats = (lang: Lang) => ({
  languages: formatNumber(stats.languages, lang),
  days: formatNumber(stats.days, lang),
  vectors: formatNumber(stats.vectors, lang),
  libraries: formatNumber(stats.libraries, lang),
});

// ---------- Downloads ----------

export interface DataFile {
  path: string;
  name: string;
  bytes: number;
  url: string;
  format: string;
}

const FORMATS: Record<string, string> = { '.csv': 'text/csv', '.txt': 'text/plain', '.json': 'application/json' };

export const dataFiles: DataFile[] = repoFiles
  .filter((file) => file.startsWith('data/') && FORMATS[path.posix.extname(file)])
  .map((file) => ({
    path: file,
    name: file.slice('data/'.length),
    bytes: repoFileSize(file),
    url: fileUrl(file),
    format: FORMATS[path.posix.extname(file)],
  }));

export { chapterPages, el };
