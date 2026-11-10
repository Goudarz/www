// src/persian-calendar/pages.ts
// Every page of the guide, its source in the repository, and how repository links map to site URLs.
import path from 'node:path';
import type { Lang } from '../i18n/ui';
import { BASE_PATH } from './i18n';
import { fileAnchor, implementations, type Implementation } from './implementations';
import { githubUrl, isRepoDir, isRepoFile, repoFiles } from './repo';

export type PageKind = 'home' | 'chapter' | 'reference' | 'language';
export type PageGroup = 'start' | 'guide' | 'code' | 'verification' | 'project';

export interface DocPage {
  /** URL path below /persian-calendar/ ('' for the overview) */
  slug: string;
  kind: PageKind;
  group: PageGroup;
  /** Source file per language (the same file for bilingual READMEs) */
  source: Record<Lang, string>;
  /** Source mixes English text with Persian <div dir="rtl"> blocks */
  mixed: boolean;
  number?: number;
  navLabel?: Record<Lang, string>;
  title?: Partial<Record<Lang, string>>;
  description?: Partial<Record<Lang, string>>;
  impl?: Implementation;
}

const same = (file: string) => ({ en: file, fa: file });

const chapters: DocPage[] = repoFiles
  .map((file) => file.match(/^docs\/en\/(\d+)-(.+)\.md$/))
  .filter((m) => m !== null)
  .map((m) => ({
    slug: m[2],
    kind: 'chapter',
    group: 'guide',
    source: { en: m[0], fa: `docs/fa/${m[1]}-${m[2]}.md` },
    mixed: false,
    number: Number(m[1]),
  }));

for (const chapter of chapters) {
  if (!isRepoFile(chapter.source.fa)) throw new Error(`Missing Persian translation: ${chapter.source.fa}`);
}

const reference = (
  slug: string,
  source: string,
  group: PageGroup,
  navLabel: Record<Lang, string>,
  title?: Partial<Record<Lang, string>>,
): DocPage => ({ slug, kind: 'reference', group, source: same(source), mixed: true, navLabel, title });

export const homePage: DocPage = {
  slug: '',
  kind: 'home',
  group: 'start',
  source: { en: 'README.md', fa: 'README.fa.md' },
  mixed: false,
  navLabel: { en: 'Overview', fa: 'معرفی' },
};

export const implementationsPage: DocPage = {
  ...reference('implementations', 'implementations/README.md', 'code', { en: 'Overview & API', fa: 'معرفی و توابع' }),
  description: {
    en: 'Copy-ready Jalali calendar code in 14 languages with no dependencies: Python, JavaScript, TypeScript, Java, Kotlin, Scala, C#, Go, Rust, PHP, Dart, C/C++, Ruby and PostgreSQL.',
  },
};

export const languagePages: DocPage[] = implementations.map((impl) => ({
  slug: `implementations/${impl.slug}`,
  kind: 'language',
  group: 'code',
  source: same(impl.code[0]),
  mixed: false,
  navLabel: { en: impl.name, fa: impl.name },
  impl,
}));

export const dataPage = reference(
  'data',
  'data/README.md',
  'verification',
  { en: 'Reference data', fa: 'دادهٔ مرجع' },
  { en: 'Reference data' },
);

const verificationPages = [
  dataPage,
  reference(
    'tools/calendar-data',
    'tools/calendar-data/README.md',
    'verification',
    { en: 'Astronomical engine', fa: 'موتور نجومی' },
    { en: 'calendar-data: the astronomical engine' },
  ),
  reference('tools/icu-cross-check', 'tools/icu-cross-check/README.md', 'verification', {
    en: 'ICU cross-check',
    fa: 'تطبیق با ICU',
  }),
  reference('tools/library-evaluation', 'tools/library-evaluation/README.md', 'verification', {
    en: 'Library evaluation',
    fa: 'ارزیابی کتابخانه‌ها',
  }),
  reference('tools/library-evaluation/results', 'tools/library-evaluation/results/SUMMARY.md', 'verification', {
    en: 'Evaluation results',
    fa: 'نتایج ارزیابی',
  }),
];

const projectPages = [reference('contributing', 'CONTRIBUTING.md', 'project', { en: 'Contributing', fa: 'مشارکت' })];

/** Reading order: used for the sidebar and previous/next links */
export const docPages: DocPage[] = [
  homePage,
  ...chapters,
  implementationsPage,
  ...languagePages,
  ...verificationPages,
  ...projectPages,
];

for (const page of docPages) {
  for (const file of Object.values(page.source)) {
    if (!isRepoFile(file)) throw new Error(`Guide page "${page.slug}" points to a missing file: ${file}`);
  }
}

export const chapterPages = chapters;

// ---------- URLs ----------

const langPrefix = (lang: Lang) => (lang === 'fa' ? '/fa' : '');

export const pageUrl = (slug: string, lang: Lang) => `${langPrefix(lang)}/${BASE_PATH}/${slug ? `${slug}/` : ''}`;
export const markdownUrl = (slug: string, lang: Lang) => `${langPrefix(lang)}/${BASE_PATH}/${slug || 'index'}.md`;
/** Downloads are language independent */
export const fileUrl = (rel: string) => `/${BASE_PATH}/files/${rel}`;

// ---------- Repository links → site URLs ----------

const pageByRepoPath = new Map<string, DocPage>();
for (const page of [implementationsPage, ...verificationPages, ...projectPages]) {
  pageByRepoPath.set(page.source.en, page);
  const dir = path.posix.dirname(page.source.en);
  if (dir !== '.') pageByRepoPath.set(dir, page);
}
pageByRepoPath.set('data/official', dataPage);
for (const page of languagePages) {
  pageByRepoPath.set(`implementations/${page.impl!.dir}`, page);
  for (const file of page.impl!.files) pageByRepoPath.set(file, page);
}

function pageForRepoPath(rel: string, lang: Lang): { page: DocPage; lang: Lang } | null {
  if (rel === '' || rel === 'README.md') return { page: homePage, lang: rel === '' ? lang : 'en' };
  if (rel === 'README.fa.md') return { page: homePage, lang: 'fa' };
  const chapter = rel.match(/^docs\/(en|fa)\/(\d+)-(.+)\.md$/);
  if (chapter) {
    const page = chapters.find((c) => c.slug === chapter[3]);
    return page ? { page, lang: chapter[1] as Lang } : null;
  }
  const page = pageByRepoPath.get(rel);
  return page ? { page, lang } : null;
}

/**
 * Rewrite a link found in a repository Markdown file.
 * Guide pages stay on this site, data files become downloads from this domain, and anything else
 * (tool sources, workflows, the license) opens on GitHub.
 */
export function resolveRepoLink(href: string, fromFile: string, lang: Lang, origin = ''): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//') || href.startsWith('#')) return href;
  const hashAt = href.indexOf('#');
  const rawPath = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const hash = hashAt >= 0 ? href.slice(hashAt) : '';
  let rel = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), decodeURI(rawPath))).replace(/\/$/, '');
  if (rel === '.') rel = '';

  const target = pageForRepoPath(rel, lang);
  if (target) {
    // A file of an implementation opens its listing on the language page
    const anchor = !hash && target.page.kind === 'language' && isRepoFile(rel) ? `#${fileAnchor(rel)}` : hash;
    return `${origin}${pageUrl(target.page.slug, target.lang)}${anchor}`;
  }
  if (rel.startsWith('data/') && isRepoFile(rel)) return `${origin}${fileUrl(rel)}`;
  if (isRepoFile(rel) || isRepoDir(rel)) return `${githubUrl(rel)}${hash}`;
  return `${githubUrl(rel, 'blob')}${hash}`;
}
