// integrations/validator-friendly-css.mjs
// Makes the generated CSS and inline styles pass the W3C validators without changing how the page renders.
//
// validatorFriendlyCss() is a Vite plugin. It runs after Tailwind (which is `enforce: 'pre'`) and before Astro
// inlines the CSS and hashes it for the CSP, so the hashes stay correct.
// - `@property --tw-*` rules are dropped. Tailwind already ships a fallback (`*, ::before, ::after, ::backdrop`
//   with the same initial values) for browsers without @property; that fallback is applied unconditionally.
// - `@supports (… linear-gradient(in lab …))` blocks are dropped, so gradients interpolate in sRGB instead of oklab.
// - Custom properties are removed from `transition-property` (they only animate when registered).
// - Preflight rules for form controls the site does not use, and the legacy :-moz-focusring rule, are dropped.
//
// trimInlineStyles() is an Astro integration for the inlined <style> text; see its comment.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Index of the brace that closes the block opened at `open` (the index of a `{`) */
function matchBrace(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return i;
  }
  throw new Error('validator-friendly-css: unbalanced braces');
}

/** Replace every at-rule whose prelude matches `test` with `replace(body)` */
function rewriteAtRules(css, name, test, replace) {
  let out = '';
  let from = 0;
  for (;;) {
    const at = css.indexOf(`@${name}`, from);
    if (at < 0) return out + css.slice(from);
    const open = css.indexOf('{', at);
    const prelude = css.slice(at + name.length + 1, open);
    if (!test(prelude)) {
      out += css.slice(from, open + 1);
      from = open + 1;
      continue;
    }
    const close = matchBrace(css, open);
    out += css.slice(from, at) + replace(css.slice(open + 1, close));
    from = close + 1;
  }
}

export function transformCss(css) {
  if (!css.includes('tailwindcss')) return css;
  // @property rules have no nested blocks
  css = css.replace(/@property\s+--[\w-]+\s*\{[^}]*\}/g, '');
  // Keep the contents of Tailwind's "@property is not supported" fallback, without the @supports wrapper
  css = rewriteAtRules(css, 'supports', (p) => p.includes('margin-trim'), (body) => body);
  // Drop the oklab gradient interpolation upgrade
  css = rewriteAtRules(css, 'supports', (p) => p.includes('linear-gradient(in lab'), () => '');
  // Custom properties can only transition when registered with @property, which is removed above
  css = css.replace(/(transition-property:[^;}]*)/g, (decl) => decl.replace(/,\s*--[\w-]+/g, ''));
  // Preflight resets for form controls this site does not use (date/time, number and search inputs) and
  // Firefox's legacy focus ring (the site styles :focus-visible itself). Vendor-only selectors the validator flags.
  css = css.replace(UNUSED_VENDOR_RULES, '');
  return css;
}

const UNUSED_VENDOR_RULES = new RegExp(
  String.raw`(?<=^|[{}])[^{}@]*(?:::-webkit-(?:datetime-edit|date-and-time-value|calendar-picker-indicator|search-decoration|inner-spin-button|outer-spin-button)|:-moz-(?:ui-invalid|focusring))[^{}]*\{[^{}]*\}`,
  'g',
);

export default function validatorFriendlyCss() {
  return {
    name: 'validator-friendly-css',
    apply: 'build',
    transform: {
      filter: { id: /\.css(?:\?.*)?$/ },
      handler(code) {
        const next = transformCss(code);
        return next === code ? null : { code: next, map: null };
      },
    },
  };
}

const sha256 = (text) => createHash('sha256').update(text).digest('base64');

async function listHtml(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listHtml(full)));
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

/**
 * Astro integration. The inlined <style> ends with a newline; browsers include it in the CSP hash, but the W3C
 * validator does not, so it reports the style as blocked. After the build, trim that whitespace and swap the old
 * hash for the new one in the page's CSP meta tag, so content and policy stay in sync.
 */
export function trimInlineStyles() {
  return {
    name: 'trim-inline-styles',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        let changed = 0;
        for (const file of await listHtml(fileURLToPath(dir))) {
          const original = await readFile(file, 'utf8');
          const swaps = [];
          let html = original.replace(/<style>([\s\S]*?)<\/style>/g, (tag, css) => {
            const trimmed = css.trimEnd();
            if (trimmed === css) return tag;
            swaps.push([sha256(css), sha256(trimmed)]);
            return `<style>${trimmed}</style>`;
          });
          for (const [from, to] of swaps) html = html.replaceAll(`'sha256-${from}'`, `'sha256-${to}'`);
          if (html !== original) {
            await writeFile(file, html);
            changed++;
          }
        }
        logger.info(`trimmed inline styles in ${changed} pages`);
      },
    },
  };
}
