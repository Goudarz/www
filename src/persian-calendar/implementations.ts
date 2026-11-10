// src/persian-calendar/implementations.ts
// Reads the language list from implementations/README.md, so the site follows the repository without a copy.
import path from 'node:path';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { Nodes, PhrasingContent, Root, Table, TableCell } from 'mdast';
import type { Lang } from '../i18n/ui';
import { readRepoText, repoFiles } from './repo';

/** Shared Markdown parser (CommonMark + GitHub Flavored Markdown) */
export const mdParser = unified().use(remarkParse).use(remarkGfm);

/** Plain text of an mdast node (inline code included, as GitHub does for heading anchors) */
export function mdText(node: Nodes): string {
  if (node.type === 'html') return '';
  if ('value' in node) return node.value;
  if ('children' in node) return (node.children as Nodes[]).map(mdText).join('');
  return '';
}

// Folder name in implementations/ → display name used by the README tables
const NAMES: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  kotlin: 'Kotlin',
  scala: 'Scala',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  dart: 'Dart',
  c: 'C / C++',
  ruby: 'Ruby',
  sql: 'PostgreSQL',
};
// Readable URL slugs where the folder name is not the language name
const SLUGS: Record<string, string> = { sql: 'postgresql' };

/** Prism grammar for a file, by extension or name */
export function prismLanguage(file: string): string {
  const base = path.posix.basename(file);
  if (base === 'go.mod') return 'go-module';
  const ext = path.posix.extname(file).slice(1);
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', mjs: 'javascript', ts: 'typescript', java: 'java', kt: 'kotlin',
    scala: 'scala', cs: 'csharp', csproj: 'markup', go: 'go', rs: 'rust', php: 'php', dart: 'dart',
    c: 'c', h: 'c', rb: 'ruby', sql: 'sql', json: 'json', toml: 'toml', yaml: 'yaml', yml: 'yaml',
    sh: 'bash', md: 'markdown', csv: 'csv',
  };
  return map[ext] ?? '';
}

/** Anchor id of a file on its language page ("implementations/csharp/tests/Program.cs" → "file-tests-program-cs") */
export const fileAnchor = (rel: string) =>
  `file-${rel.split('/').slice(2).join('/').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;

export interface LanguageDetails {
  testedWith: PhrasingContent[];
  crossChecked: PhrasingContent[];
  checks: PhrasingContent[];
}

export interface Implementation {
  dir: string;
  slug: string;
  name: string;
  /** Language and minimum version, for example "Python 3.8+" */
  label: string;
  code: string[];
  tests: string[];
  /** Other files the folder needs (package.json, Cargo.toml, ...) */
  extra: string[];
  /** Every tracked file in the folder */
  files: string[];
  run: string;
  runNote: string;
  testedWith: string;
  details: Record<Lang, LanguageDetails | null>;
}

const README = 'implementations/README.md';
const tree = mdParser.parse(readRepoText(README)) as Root;
const tables = tree.children.filter((node): node is Table => node.type === 'table');
const headerOf = (table: Table) => table.children[0].children.map((cell) => mdText(cell).trim());

function linksIn(cell: TableCell): string[] {
  const urls: string[] = [];
  const visit = (node: Nodes) => {
    if (node.type === 'link') urls.push(node.url);
    if ('children' in node) (node.children as Nodes[]).forEach(visit);
  };
  visit(cell);
  return urls.map((url) => path.posix.normalize(path.posix.join('implementations', url)));
}

function detailsTable(firstHeader: string): Map<string, LanguageDetails> {
  const table = tables.find((t) => {
    const header = headerOf(t);
    return header[0] === firstHeader && header.length === 4;
  });
  const rows = new Map<string, LanguageDetails>();
  for (const row of table?.children.slice(1) ?? []) {
    const [name, testedWith, crossChecked, checks] = row.children;
    rows.set(mdText(name).trim(), {
      testedWith: testedWith.children,
      crossChecked: crossChecked.children,
      checks: checks.children,
    });
  }
  return rows;
}

const listTable = tables.find((t) => {
  const [language, code, test] = headerOf(t);
  return language === 'Language' && code === 'Code' && test === 'Test';
});
if (!listTable) throw new Error(`${README}: the language table (Language | Code | Test | …) was not found`);

const detailsEn = detailsTable('Language');
const detailsFa = detailsTable('زبان');

export const implementations: Implementation[] = listTable.children.slice(1).map((row) => {
  const [labelCell, codeCell, testCell, runCell, testedCell] = row.children;
  const code = linksIn(codeCell);
  const tests = linksIn(testCell);
  const dir = code[0]?.split('/')[1];
  if (!dir) throw new Error(`${README}: no code link in row "${mdText(labelCell)}"`);
  const files = repoFiles.filter((file) => file.startsWith(`implementations/${dir}/`));
  const runCode = runCell.children.find((node) => node.type === 'inlineCode');
  const name = NAMES[dir] ?? mdText(labelCell).trim();
  return {
    dir,
    slug: SLUGS[dir] ?? dir,
    name,
    label: mdText(labelCell).trim(),
    code,
    tests,
    extra: files.filter((file) => !code.includes(file) && !tests.includes(file) && !file.endsWith('-lock.json')),
    files,
    run: runCode?.type === 'inlineCode' ? runCode.value : mdText(runCell).trim(),
    runNote: mdText(runCell).replace(runCode?.type === 'inlineCode' ? runCode.value : '', '').trim(),
    testedWith: mdText(testedCell).trim(),
    details: { en: detailsEn.get(name) ?? null, fa: detailsFa.get(name) ?? null },
  };
});
