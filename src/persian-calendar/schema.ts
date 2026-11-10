// src/persian-calendar/schema.ts
// Schema.org graph for the guide pages (search engines and AI answer engines).
import { languages, siteData, type Lang } from '../i18n/ui';
import { DATA_ZIP, ORIGIN, dataFiles, version, zipName, type DocData } from './content';
import { docsText } from './i18n';
import { implementations } from './implementations';
import { chapterPages, fileUrl, pageUrl, type DocPage } from './pages';
import { REPO_URL, githubUrl } from './repo';
// The repository's own JavaScript implementation, used here to state the dataset's date range exactly
import { daysInMonth, toGregorian } from '../../vendor/persian-calendar/implementations/javascript/persian-calendar.js';

const abs = (path: string) => `${ORIGIN}${path}`;
const iso = ({ year, month, day }: { year: number; month: number; day: number }) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const LICENSES = {
  docs: 'https://creativecommons.org/licenses/by/4.0/',
  code: 'https://opensource.org/license/mit',
  data: 'https://creativecommons.org/publicdomain/zero/1.0/',
};
export { LICENSES };

const person = { '@id': `${ORIGIN}/#person` };
const softwareId = `${abs(pageUrl('', 'en'))}#software`;
const calendarTopic = {
  '@type': 'Thing',
  name: 'Solar Hijri calendar',
  alternateName: ['Jalali calendar', 'Persian calendar', 'Shamsi calendar', 'تقویم هجری شمسی', 'تقویم جلالی'],
  sameAs: ['https://en.wikipedia.org/wiki/Solar_Hijri_calendar', 'https://fa.wikipedia.org/wiki/گاه‌شماری_هجری_خورشیدی'],
};

const keywords = {
  en: 'Jalali calendar, Persian calendar, Solar Hijri, Shamsi, leap year, date conversion, Gregorian to Jalali, Nowruz, ICU, algorithm',
  fa: 'تقویم جلالی, تقویم شمسی, هجری شمسی, سال کبیسه, تبدیل تاریخ, تبدیل میلادی به شمسی, نوروز, الگوریتم',
};

const articleId = (page: DocPage, lang: Lang) => `${abs(pageUrl(page.slug, lang))}#article`;

export function buildSchema(doc: DocData, ogImage: string) {
  const { page, lang } = doc;
  const t = docsText[lang];
  const other: Lang = lang === 'en' ? 'fa' : 'en';
  const url = abs(pageUrl(page.slug, lang));
  const homeUrl = abs(pageUrl('', lang));

  const crumbs = [
    { name: t.homeLabel, item: abs(languages[lang].path) },
    { name: t.brandLong, item: homeUrl },
    ...(page.kind === 'language' ? [{ name: docsText[lang].groups.code, item: abs(pageUrl('implementations', lang)) }] : []),
    ...(page.kind === 'home' ? [] : [{ name: doc.title, item: url }]),
  ];

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${ORIGIN}/#website`,
      url: `${ORIGIN}/`,
      name: 'Goudarz Jafari | گودرز جعفری',
      inLanguage: ['en-US', 'fa-IR'],
      publisher: person,
    },
    {
      '@type': 'Person',
      '@id': `${ORIGIN}/#person`,
      name: siteData.en.name,
      alternateName: siteData.fa.name,
      url: `${ORIGIN}/`,
      jobTitle: siteData[lang].role,
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })),
    },
    {
      '@type': page.kind === 'home' ? 'CollectionPage' : 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: doc.title,
      description: doc.description,
      inLanguage: languages[lang].locale,
      isPartOf: { '@id': `${ORIGIN}/#website` },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      primaryImageOfPage: ogImage,
      datePublished: doc.created.toISOString(),
      dateModified: doc.modified.toISOString(),
      ...(page.kind === 'home'
        ? {
            mainEntity: { '@id': softwareId },
            hasPart: chapterPages.map((c) => ({ '@id': articleId(c, lang) })),
          }
        : { mainEntity: { '@id': page.kind === 'language' ? `${url}#code` : `${url}#article` } }),
    },
  ];

  // The repository itself: listed on the overview, referenced from every other page
  if (page.kind === 'home') {
    graph.push({
      '@type': 'SoftwareSourceCode',
      '@id': softwareId,
      name: 'PersianCalendar',
      alternateName: t.brandLong,
      description: doc.description,
      url: abs(pageUrl('', 'en')),
      codeRepository: REPO_URL,
      programmingLanguage: implementations.map((impl) => impl.name),
      license: LICENSES.code,
      version,
      author: person,
      about: calendarTopic,
      keywords: keywords[lang],
      dateModified: doc.modified.toISOString(),
    });
    // Chapter list, so each chapter is discoverable from the overview
    graph.push({
      '@type': 'ItemList',
      '@id': `${url}#chapters`,
      name: t.chaptersTitle,
      itemListElement: chapterPages.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: abs(pageUrl(c.slug, lang)),
      })),
    });
  }

  if (page.kind === 'chapter' || page.kind === 'reference') {
    graph.push({
      '@type': 'TechArticle',
      '@id': `${url}#article`,
      headline: doc.title,
      description: doc.description,
      url,
      mainEntityOfPage: { '@id': `${url}#webpage` },
      inLanguage: languages[lang].locale,
      author: person,
      publisher: person,
      datePublished: doc.created.toISOString(),
      dateModified: doc.modified.toISOString(),
      image: ogImage,
      license: LICENSES.docs,
      isAccessibleForFree: true,
      isPartOf: { '@id': softwareId },
      about: calendarTopic,
      keywords: keywords[lang],
      ...(page.kind === 'chapter' && { position: page.number }),
      // The other language version of the same text
      [lang === 'en' ? 'workTranslation' : 'translationOfWork']: { '@id': articleId(page, other) },
    });
  }

  if (page.kind === 'language' && doc.language) {
    const { impl } = doc.language;
    graph.push({
      '@type': 'SoftwareSourceCode',
      '@id': `${url}#code`,
      name: doc.title,
      description: doc.description,
      url,
      codeRepository: githubUrl(`implementations/${impl.dir}`),
      programmingLanguage: { '@type': 'ComputerLanguage', name: impl.name },
      codeSampleType: 'full solution',
      runtimePlatform: impl.testedWith,
      license: LICENSES.code,
      version,
      author: person,
      dateModified: doc.modified.toISOString(),
      isPartOf: { '@id': softwareId },
      about: calendarTopic,
      keywords: `${impl.name}, ${keywords[lang]}`,
    });
  }

  if (page.slug === 'data') {
    const first = toGregorian(1178, 1, 1);
    const last = toGregorian(3000, 12, daysInMonth(3000, 12));
    graph.push({
      '@type': 'Dataset',
      '@id': `${abs(pageUrl('data', 'en'))}#dataset`,
      name: lang === 'fa' ? 'دادهٔ مرجع تقویم جلالی (هجری شمسی)' : 'Jalali (Persian, Solar Hijri) calendar reference data',
      description: doc.description,
      url,
      sameAs: githubUrl('data'),
      license: LICENSES.data,
      isAccessibleForFree: true,
      creator: person,
      version,
      dateModified: doc.modified.toISOString(),
      inLanguage: languages[lang].locale,
      keywords: keywords[lang].split(', '),
      about: calendarTopic,
      temporalCoverage: `${iso(first)}/${iso(last)}`,
      distribution: [
        ...dataFiles.map((file) => ({
          '@type': 'DataDownload',
          name: file.name,
          encodingFormat: file.format,
          contentUrl: abs(file.url),
          contentSize: `${file.bytes} B`,
        })),
        { '@type': 'DataDownload', name: DATA_ZIP, encodingFormat: 'application/zip', contentUrl: abs(fileUrl(DATA_ZIP)) },
      ],
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export const repoZipUrl = fileUrl(zipName());
