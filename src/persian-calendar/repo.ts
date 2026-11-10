// src/persian-calendar/repo.ts
// Read access to the PersianCalendar repository, vendored as a git submodule in vendor/persian-calendar.
// The repository is the single source of truth: guide pages, code listings, downloads and dates all come from it.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const REPO_SLUG = 'Goudarz/PersianCalendar';
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
export const REPO_BRANCH = 'main';

// Builds run from the project root (Astro bundles this module, so import.meta.url is not reliable here)
export const REPO_DIR = path.resolve(process.cwd(), 'vendor/persian-calendar');

if (!existsSync(path.join(REPO_DIR, 'README.md'))) {
  throw new Error(
    'vendor/persian-calendar is empty. Run `git submodule update --init` before building the site.',
  );
}

function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: REPO_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'target', '__pycache__', '.toolchains', '.dart_tool', 'bin', 'obj', 'out']);

/** Fallback when git is unavailable: walk the folder, skipping build output */
function walk(dir = '', out: string[] = []): string[] {
  for (const entry of readdirSync(path.join(REPO_DIR, dir), { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

/** Every tracked file, as a repository-relative POSIX path */
export const repoFiles: string[] = (git(['ls-files', '-z']) ?? '').split('\0').filter(Boolean).sort();
if (repoFiles.length === 0) repoFiles.push(...walk().sort());

const fileSet = new Set(repoFiles);
const dirSet = new Set(repoFiles.flatMap((file) => file.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'))));

export const isRepoFile = (rel: string) => fileSet.has(rel);
export const isRepoDir = (rel: string) => dirSet.has(rel);

export const readRepoText = (rel: string) => readFileSync(path.join(REPO_DIR, rel), 'utf8');
export const readRepoBytes = (rel: string) => readFileSync(path.join(REPO_DIR, rel));
export const repoFileSize = (rel: string) => statSync(path.join(REPO_DIR, rel)).size;

/** GitHub URL of a file or folder on the default branch */
export function githubUrl(rel = '', kind: 'blob' | 'tree' | 'edit' = isRepoDir(rel) || rel === '' ? 'tree' : 'blob'): string {
  return rel ? `${REPO_URL}/${kind}/${REPO_BRANCH}/${rel}` : REPO_URL;
}

// ---------- Version and dates ----------

export const commitDate = new Date(git(['log', '-1', '--format=%cI'])?.trim() || Date.now());

function readVersion(): string {
  const tag = git(['describe', '--tags', '--abbrev=0'])?.trim();
  if (tag) return tag.replace(/^v/, '');
  const cargo = readRepoText('implementations/rust/Cargo.toml').match(/^version\s*=\s*"([^"]+)"/m);
  return cargo?.[1] ?? '1.0.0';
}
export const version = readVersion();

/** First and last commit date of every file (one git call). Falls back to the checkout's commit date. */
const fileDates = (() => {
  const dates = new Map<string, { created: Date; modified: Date }>();
  const log = git(['log', '--format=@%cI', '--name-only', '--no-renames']);
  if (!log) return dates;
  let current: Date | null = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) current = new Date(line.slice(1));
    else if (line && current) {
      const entry = dates.get(line);
      // git log lists the newest commit first
      if (entry) entry.created = current;
      else dates.set(line, { created: current, modified: current });
    }
  }
  return dates;
})();

export function repoDates(...files: string[]): { created: Date; modified: Date } {
  const known = files.map((file) => fileDates.get(file)).filter((d) => d !== undefined);
  if (known.length === 0) return { created: commitDate, modified: commitDate };
  return {
    created: new Date(Math.min(...known.map((d) => d.created.getTime()))),
    modified: new Date(Math.max(...known.map((d) => d.modified.getTime()))),
  };
}
