// src/persian-calendar/markdown.ts
// Turns the repository's Markdown into the guide pages: one language at a time, links mapped to this site,
// GitHub-compatible anchors, Prism highlighting (class based, so the CSP needs no inline styles) and copy buttons.
import GithubSlugger, { slug as githubSlug } from 'github-slugger';
import { refractor } from 'refractor/all';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import type { Element, ElementContent, Root as HastRoot, RootContent as HastNode, Text as HastText } from 'hast';
import type { Heading, Nodes, Paragraph, Root, RootContent } from 'mdast';
import type { Lang } from '../i18n/ui';
import { docsText, type DocsText } from './i18n';
import { mdParser, mdText } from './implementations';
import { resolveRepoLink } from './pages';
import { readRepoText } from './repo';

const ARABIC = /\p{Script=Arabic}/u;
const DIV_OPEN = /^<div\s+dir="(rtl|ltr)"\s*>$/i;
const DIV_CLOSE = /^<\/div>$/i;

// ---------- hast helpers ----------

export const el = (tagName: string, properties: Element['properties'] = {}, children: ElementContent[] = []): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});
export const text = (value: string): HastText => ({ type: 'text', value });

export function hastText(node: HastNode | HastRoot): string {
  if (node.type === 'text') return node.value;
  if ('children' in node) return (node.children as HastNode[]).map(hastText).join('');
  return '';
}

const htmlStringifier = unified().use(rehypeStringify);
export const toHtml = (nodes: HastNode[]) => htmlStringifier.stringify({ type: 'root', children: nodes });

// ---------- Syntax highlighting ----------

const PRISM_ALIASES: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', cs: 'csharp', kt: 'kotlin',
  rs: 'rust', rb: 'ruby', yml: 'yaml', ps1: 'powershell', 'c++': 'cpp',
};
const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', bash: 'Shell', csharp: 'C#', kotlin: 'Kotlin',
  rust: 'Rust', ruby: 'Ruby', java: 'Java', scala: 'Scala', go: 'Go', php: 'PHP', dart: 'Dart', c: 'C', cpp: 'C++',
  swift: 'Swift', sql: 'SQL', json: 'JSON', toml: 'TOML', yaml: 'YAML', powershell: 'PowerShell', markup: 'XML',
  'go-module': 'go.mod', csv: 'CSV', markdown: 'Markdown',
};

/** Highlighted children for a <code> element; plain text when the language is unknown */
export function highlight(code: string, language: string): ElementContent[] {
  const grammar = PRISM_ALIASES[language] ?? language;
  if (!grammar || !refractor.registered(grammar)) return [text(code)];
  return refractor.highlight(code, grammar).children as ElementContent[];
}

export const languageLabel = (language: string) => {
  const grammar = PRISM_ALIASES[language] ?? language;
  return LANGUAGE_LABELS[grammar] ?? grammar;
};

/** Copy button for a code block. It stays hidden until the page script can copy (progressive enhancement). */
export const copyButton = (t: DocsText) =>
  el('button', { type: 'button', className: ['code-copy'], dataCopyCode: '', ariaLabel: t.copyCode, hidden: true }, [
    text(t.copy),
  ]);

function codeBlock(pre: Element, t: DocsText): Element {
  const code = pre.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code');
  const classes = (code?.properties.className as string[] | undefined) ?? [];
  const language = classes.find((c) => c.startsWith('language-'))?.slice('language-'.length) ?? '';
  if (code) code.children = highlight(hastText(code).replace(/\n$/, ''), language);
  pre.properties = { ...pre.properties, dir: 'ltr', tabIndex: 0 };
  return el('div', { className: ['code-block'] }, [
    el('div', { className: ['code-head'] }, [
      el('span', { className: ['code-lang'] }, language ? [text(languageLabel(language))] : []),
      copyButton(t),
    ]),
    pre,
  ]);
}

// ---------- Language of parts ----------

// A run of Persian text: starts and ends with an Arabic-script character
const PERSIAN_RUN = /[\p{Script=Arabic}](?:[\p{Script=Arabic}\p{M}‌‍\s«»،؛:.\-–/()0-9]*[\p{Script=Arabic}\p{M}])?/gu;

/** Wrap Persian phrases inside English text in <span lang="fa"> (WCAG 3.1.2, language of parts) */
function markPersian(value: string): ElementContent[] {
  const out: ElementContent[] = [];
  let last = 0;
  for (const match of value.matchAll(PERSIAN_RUN)) {
    if (match.index > last) out.push(text(value.slice(last, match.index)));
    out.push(el('span', { lang: 'fa' }, [text(match[0])]));
    last = match.index + match[0].length;
  }
  if (last < value.length) out.push(text(value.slice(last)));
  return out;
}

// ---------- hast enhancements ----------

function enhance(tree: HastRoot, lang: Lang) {
  const t = docsText[lang];
  let lastHeading = '';
  const walk = (parent: HastRoot | Element) => {
    const kids = parent.children as HastNode[];
    for (let i = 0; i < kids.length; i++) {
      const node = kids[i];
      if (node.type === 'text') {
        if (lang === 'en' && ARABIC.test(node.value)) {
          const parts = markPersian(node.value);
          kids.splice(i, 1, ...parts);
          i += parts.length - 1;
        }
        continue;
      }
      if (node.type !== 'element') continue;
      const tag = node.tagName;
      if (tag === 'pre') {
        kids[i] = codeBlock(node, t);
        continue;
      }
      if (tag === 'code' || tag === 'script' || tag === 'style') continue;
      walk(node);
      if (/^h[2-6]$/.test(tag) && node.properties.id) {
        lastHeading = hastText(node);
        kids[i] = el('div', { className: ['heading', `heading-${tag}`] }, [
          node,
          el('a', { className: ['heading-anchor'], href: `#${node.properties.id}` }, [
            el('span', { ariaHidden: 'true' }, [text('#')]),
            el('span', { className: ['sr-only'] }, [text(t.sectionLink(lastHeading))]),
          ]),
        ]);
      } else if (tag === 'table') {
        // Wide tables scroll on their own; the wrapper is focusable so keyboard users can scroll it too
        kids[i] = el('div', { className: ['table-wrap'], tabIndex: 0, role: 'region', ariaLabel: t.tableLabel(lastHeading) }, [node]);
      } else if (tag === 'a' && typeof node.properties.href === 'string' && /^https?:/.test(node.properties.href)) {
        node.properties.rel = ['noopener'];
      }
    }
  };
  walk(tree);
}

// ---------- Language views of a bilingual file ----------

interface Block {
  node: RootContent;
  rtl: boolean;
  ghId?: string;
}

/** A node to keep, plus the anchor ids that must exist at its position (aliases for old links) */
interface Entry {
  node?: RootContent;
  anchors: string[];
}

/** Drop <div dir="…"> wrappers and remember which blocks were inside a right-to-left one */
function splitDirBlocks(root: Root): Block[] {
  const stack: string[] = [];
  const blocks: Block[] = [];
  for (const node of root.children) {
    if (node.type === 'html') {
      const value = node.value.trim();
      const open = value.match(DIV_OPEN);
      if (open) {
        stack.push(open[1].toLowerCase());
        continue;
      }
      if (DIV_CLOSE.test(value)) {
        stack.pop();
        continue;
      }
    }
    blocks.push({ node, rtl: stack.includes('rtl') });
  }
  return blocks;
}

/** "Common API · توابع مشترک" → { en: 'Common API', fa: 'توابع مشترک' } */
function splitBilingual(value: string): { en?: string; fa?: string } {
  const at = value.indexOf(' · ');
  if (at < 0) return {};
  const a = value.slice(0, at).trim();
  const b = value.slice(at + 3).trim();
  if (ARABIC.test(b) && !ARABIC.test(a)) return { en: a, fa: b };
  if (ARABIC.test(a) && !ARABIC.test(b)) return { en: b, fa: a };
  return {};
}

const retitle = (heading: Heading, value: string): Heading => ({ ...heading, children: [{ type: 'text', value }] });

/** English blocks shown on a Persian page get lang="en" and left-to-right direction */
function markEnglish(node: RootContent): RootContent {
  if (ARABIC.test(mdText(node)) || node.type === 'code' || node.type === 'thematicBreak') return node;
  const data = (node.data ?? {}) as { hProperties?: Record<string, unknown> };
  return { ...node, data: { ...data, hProperties: { ...data.hProperties, lang: 'en', dir: 'ltr' } } } as RootContent;
}

const LANGUAGE_HEADING = /^(?:راهنمای |توضیحات )?فارسی$/;

function viewMixed(blocks: Block[], lang: Lang): Entry[] {
  const sections: { heading?: Block; body: Block[] }[] = [{ body: [] }];
  for (const block of blocks) {
    if (block.node.type === 'heading' && !block.rtl) sections.push({ heading: block, body: [] });
    else sections[sections.length - 1].body.push(block);
  }

  const out: Entry[] = [];
  const keep = (block: Block): Entry => {
    if (block.node.type === 'heading' && LANGUAGE_HEADING.test(mdText(block.node).trim())) return { anchors: [block.ghId!] };
    return { node: block.node, anchors: block.ghId ? [block.ghId] : [] };
  };

  // CONTRIBUTING.md style: an "## English" and a "## فارسی" section, each with its own subsections.
  // The language heading itself is dropped, so the headings below it move up one level.
  let scope: { lang: Lang; depth: number } | null = null;
  const promote = (entry: Entry): Entry =>
    entry.node?.type === 'heading' ? { ...entry, node: { ...entry.node, depth: Math.max(2, entry.node.depth - 1) as Heading['depth'] } } : entry;

  for (const { heading, body } of sections) {
    const headingNode = heading?.node as Heading | undefined;
    const title = headingNode ? mdText(headingNode).trim() : '';
    const parts = splitBilingual(title);
    const anchors = heading ? [heading.ghId!, ...[parts.en, parts.fa].filter((p) => p !== undefined).map((p) => githubSlug(p))] : [];
    const persian = body.filter((b) => b.rtl);

    if (scope && headingNode && headingNode.depth <= scope.depth) scope = null;
    if (title === 'English' || LANGUAGE_HEADING.test(title)) {
      scope = { lang: title === 'English' ? 'en' : 'fa', depth: headingNode!.depth };
      out.push({ anchors });
      if (scope.lang === lang) out.push(...body.filter((b) => b.rtl === (lang === 'fa')).map(keep).map(promote));
      continue;
    }
    if (scope) {
      if (scope.lang === lang) {
        if (headingNode) out.push(promote({ node: headingNode, anchors }));
        out.push(...body.filter((b) => b.rtl === (lang === 'fa')).map(keep).map(promote));
      } else if (heading) {
        out.push({ anchors });
      }
      continue;
    }

    if (lang === 'en') {
      if (headingNode) out.push({ node: parts.en ? retitle(headingNode, parts.en) : headingNode, anchors });
      out.push(...body.filter((b) => !b.rtl).map(keep));
      continue;
    }

    if (headingNode) {
      if (parts.fa) out.push({ node: retitle(headingNode, parts.fa), anchors });
      else if (persian.length === 0) out.push({ node: markEnglish(headingNode), anchors });
      else out.push({ anchors }); // the Persian block below has its own heading
    }
    if (persian.length === 0) {
      out.push(...body.map((b) => ({ node: markEnglish(b.node), anchors: [] })));
      continue;
    }
    // The Persian block translates the English text. Keep only English tables and code it does not repeat.
    const persianTypes = new Set(persian.map((b) => b.node.type));
    for (const block of body) {
      if (block.rtl) out.push(keep(block));
      else if ((block.node.type === 'table' || block.node.type === 'code') && !persianTypes.has(block.node.type)) {
        out.push({ node: markEnglish(block.node), anchors: [] });
      }
    }
  }
  return out;
}

// ---------- Page rendering ----------

export interface TocItem {
  depth: number;
  id: string;
  text: string;
}

export interface RenderedMarkdown {
  title: string;
  number?: number;
  /** Summary of the introduction; empty when the page starts with a section heading */
  description: string;
  /** Text of the first paragraph anywhere on the page */
  firstText: string;
  html: string;
  leadHtml?: string;
  leadMarkdown?: string;
  headings: TocItem[];
  /** Page body as Markdown, with absolute links (for the .md endpoints and llms-full.txt) */
  markdown: string;
  words: number;
}

export interface RenderOptions {
  source: string;
  lang: Lang;
  mixed: boolean;
  /** Absolute origin for links in the Markdown output */
  origin: string;
  /** Return the first paragraph separately (the home page shows it in the hero) */
  extractLead?: boolean;
  /** Drop the chapter table (the home page shows chapter cards instead) */
  dropChapterTable?: boolean;
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const toAsciiDigits = (value: string) => value.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));

/** A paragraph that only holds navigation: prev/next links, language switches, badges */
function isNavParagraph(node: RootContent): boolean {
  if (node.type !== 'paragraph') return false;
  let links = 0;
  const ok = (child: Nodes): boolean => {
    if (child.type === 'link' || child.type === 'image') {
      links++;
      return true;
    }
    if (child.type === 'text') return /^[\s·|]*(?:English|فارسی)?[\s·|]*$/.test(child.value);
    if (child.type === 'strong' || child.type === 'emphasis') return child.children.every(ok);
    return false;
  };
  return node.children.every(ok) && links > 0;
}

export function summarize(value: string, max = 160): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).replace(/[\s,;:—–-]+$/, '')}…`;
}

function rewriteLinks(node: Nodes, source: string, lang: Lang, origin: string) {
  if (node.type === 'link' || node.type === 'definition' || node.type === 'image') {
    node.url = resolveRepoLink(node.url, source, lang, origin);
  }
  if ('children' in node) for (const child of node.children as Nodes[]) rewriteLinks(child, source, lang, origin);
}

const toHast = unified().use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);
const toMarkdown = unified().use(remarkGfm).use(remarkStringify, {
  bullet: '-',
  emphasis: '_',
  fences: true,
  rule: '-',
  listItemIndent: 'one',
});

export const stringifyMarkdown = (root: Root) => toMarkdown.stringify(root);

async function mdastToHtml(root: Root, lang: Lang): Promise<string> {
  const hast = (await toHast.run(root)) as HastRoot;
  enhance(hast, lang);
  return htmlStringifier.stringify(hast);
}

export async function renderMarkdown(options: RenderOptions): Promise<RenderedMarkdown> {
  const { source, lang, mixed, origin } = options;
  const tree = mdParser.parse(readRepoText(source)) as Root;

  // 1. Unwrap direction divs; give every heading its GitHub anchor (computed on the whole file, as GitHub does)
  const blocks = splitDirBlocks(tree);
  const ghSlugger = new GithubSlugger();
  for (const block of blocks) if (block.node.type === 'heading') block.ghId = ghSlugger.slug(mdText(block.node));

  // 2. Keep one language
  let entries: Entry[] = mixed
    ? viewMixed(blocks, lang)
    : blocks.map((b) => ({ node: b.node, anchors: b.ghId ? [b.ghId] : [] }));

  // 3. Title (the first h1), then the navigation lines under it
  const titleAt = entries.findIndex((e) => e.node?.type === 'heading' && e.node.depth === 1);
  if (titleAt < 0) throw new Error(`${source}: no level-1 heading`);
  let title = mdText(entries[titleAt].node!).trim();
  entries.splice(titleAt, 1);
  for (let i = titleAt; i < entries.length; ) {
    const node = entries[i].node;
    if (!node) i++; // anchor-only entry: keep it, look further
    else if (isNavParagraph(node)) entries.splice(i, 1);
    else break;
  }
  let number: number | undefined;
  const numbered = title.match(/^([0-9۰-۹]+)\.\s+(.*)$/);
  if (numbered) {
    number = Number(toAsciiDigits(numbered[1]));
    title = numbered[2];
  }

  // 4. Optional: drop the chapter table (and its heading)
  if (options.dropChapterTable) {
    const at = entries.findIndex((e) => {
      if (e.node?.type !== 'table') return false;
      const urls: string[] = [];
      const collect = (n: Nodes) => {
        if (n.type === 'link') urls.push(n.url);
        if ('children' in n) (n.children as Nodes[]).forEach(collect);
      };
      collect(e.node);
      return urls.filter((url) => /docs\/(en|fa)\/\d+-/.test(url)).length >= 5;
    });
    if (at >= 0) {
      const before = entries[at - 1]?.node;
      const start = before?.type === 'heading' && before.depth >= 3 ? at - 1 : at;
      entries.splice(start, at - start + 1);
    }
  }

  // 5. Optional: lead paragraph
  let lead: Paragraph | undefined;
  if (options.extractLead) {
    const at = entries.findIndex((e) => e.node?.type === 'paragraph');
    if (at >= 0) lead = entries.splice(at, 1)[0].node as Paragraph;
  }
  // The description is the introduction: the first paragraph before any section heading
  const firstHeading = entries.findIndex((e) => e.node?.type === 'heading');
  const intro = lead ?? entries.slice(0, firstHeading < 0 ? undefined : firstHeading).find((e) => e.node?.type === 'paragraph')?.node;
  const description = intro ? summarize(mdText(intro)) : '';
  const firstText = mdText(entries.find((e) => e.node?.type === 'paragraph' && !isNavParagraph(e.node))?.node ?? { type: 'text', value: '' });

  // 6. Heading levels never skip (dropping one language's heading can leave an h3 under the h1)
  let previousDepth = 1;
  for (const entry of entries) {
    if (entry.node?.type !== 'heading' || entry.node.depth < 2) continue;
    if (entry.node.depth > previousDepth + 1) entry.node = { ...entry.node, depth: (previousDepth + 1) as Heading['depth'] };
    previousDepth = (entry.node as Heading).depth;
  }

  // 7. Anchor ids from the visible heading text, plus aliases so links written for GitHub keep working
  const slugger = new GithubSlugger();
  const used = new Set<string>();
  const headings: TocItem[] = [];
  for (const entry of entries) {
    if (entry.node?.type !== 'heading' || entry.node.depth < 2) continue;
    const label = mdText(entry.node).trim();
    const id = slugger.slug(label);
    used.add(id);
    entry.node.data = { ...entry.node.data, hProperties: { ...entry.node.data?.hProperties, id } };
    if (entry.node.depth <= 3) headings.push({ depth: entry.node.depth, id, text: label });
  }
  const children: RootContent[] = [];
  for (const entry of entries) {
    for (const anchor of new Set(entry.anchors)) {
      if (!anchor || used.has(anchor)) continue;
      used.add(anchor);
      children.push({ type: 'html', value: `<span id="${anchor}"></span>`, data: { anchor: true } as never });
    }
    if (entry.node) children.push(entry.node);
  }
  // Trailing prev/next lines and the rule above them: the site has its own page navigation.
  // (A trailing rule in a bilingual README only separated the two languages.)
  for (;;) {
    const last = children[children.length - 1];
    if (last && (last.type === 'thematicBreak' || isNavParagraph(last))) children.pop();
    else break;
  }

  // 7. Markdown output (absolute links, no anchor spans)
  const mdRoot: Root = structuredClone({
    type: 'root',
    children: children.filter((n) => !(n.type === 'html' && (n.data as { anchor?: boolean })?.anchor)),
  });
  rewriteLinks(mdRoot, source, lang, origin);
  const markdown = stringifyMarkdown(mdRoot);

  // 8. HTML output (site-relative links)
  const htmlRoot: Root = { type: 'root', children };
  rewriteLinks(htmlRoot, source, lang, '');
  const html = await mdastToHtml(htmlRoot, lang);

  let leadHtml: string | undefined;
  let leadMarkdown: string | undefined;
  if (lead) {
    const leadRoot: Root = { type: 'root', children: [structuredClone(lead)] };
    rewriteLinks(leadRoot, source, lang, '');
    leadHtml = (await mdastToHtml(leadRoot, lang)).replace(/^<p>|<\/p>$/g, '');
    const leadMd: Root = { type: 'root', children: [structuredClone(lead)] };
    rewriteLinks(leadMd, source, lang, origin);
    leadMarkdown = stringifyMarkdown(leadMd);
  }

  const words = mdText(mdRoot).split(/\s+/).filter(Boolean).length + (lead ? mdText(lead).split(/\s+/).length : 0);
  return { title, number, description, firstText, html, leadHtml, leadMarkdown, headings, markdown, words };
}

/** Render inline Markdown nodes (a table cell) to HTML, with links mapped like page links */
export async function renderInline(nodes: RootContent[], source: string, lang: Lang): Promise<string> {
  const root: Root = { type: 'root', children: [{ type: 'paragraph', children: structuredClone(nodes) as Paragraph['children'] }] };
  rewriteLinks(root, source, lang, '');
  return (await mdastToHtml(root, lang)).replace(/^<p>|<\/p>$/g, '');
}

/** Same as renderInline, as Markdown with absolute links */
export function inlineMarkdown(nodes: RootContent[], source: string, lang: Lang, origin: string): string {
  const root: Root = { type: 'root', children: [{ type: 'paragraph', children: structuredClone(nodes) as Paragraph['children'] }] };
  rewriteLinks(root, source, lang, origin);
  return stringifyMarkdown(root).trim();
}
