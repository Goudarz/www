// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import serviceWorker from './integrations/service-worker.mjs';
import validatorFriendlyCss, { trimInlineStyles } from './integrations/validator-friendly-css.mjs';

// Unicode ranges of the subsets the font files in src/assets/fonts were cut to
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const ARABIC =
  'U+0600-06FF,U+0750-077F,U+0870-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC7,U+10EC9-10EEE,U+10EF0-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1';

export default defineConfig({
  site: 'https://goudarzjafari.com', // Production domain
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fa'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  // The CSS is small; inlining it removes a render-blocking request
  build: {
    inlineStylesheets: 'always',
  },
  // Shiki emits inline styles that break CSP; this site has no Markdown code blocks
  markdown: {
    syntaxHighlight: false,
  },
  // CSP with automatic hashes for scripts and styles
  security: {
    csp: {
      // Extra directives for the <meta> CSP. frame-ancestors and the HTTP-only headers (HSTS, COOP, XFO) cannot
      // live in a <meta> tag; they are set at the edge (see README).
      directives: [
        "default-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'upgrade-insecure-requests',
        // Trusted Types: DOM XSS sinks only accept values from the named policy (used for the service worker URL)
        "require-trusted-types-for 'script'",
        'trusted-types sw-registration',
      ],
      // No 'unsafe-inline' in script-src: Astro then drops the script hashes, which would allow any inline script
    },
  },
  // Fonts live in the repository (src/assets/fonts, SIL OFL 1.1) and are served from this domain:
  // no requests to font services at build time or at runtime.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Plus Jakarta Sans',
      cssVariable: '--font-jakarta',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/plus-jakarta-sans-latin-wght.woff2'],
            weight: '400 800',
            style: 'normal',
            unicodeRange: [LATIN],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Vazirmatn',
      cssVariable: '--font-vazir',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/vazirmatn-arabic-wght.woff2'], weight: '400 800', style: 'normal', unicodeRange: [ARABIC] },
          { src: ['./src/assets/fonts/vazirmatn-latin-wght.woff2'], weight: '400 800', style: 'normal', unicodeRange: [LATIN] },
        ],
      },
    },
    {
      // Arabic-script-only Vazirmatn for Persian words inside English text. It has no local() fallback face,
      // so Latin characters skip it and Persian ones never reach Jakarta's Arial fallback.
      provider: fontProviders.local(),
      name: 'Vazirmatn',
      cssVariable: '--font-vazir-arabic',
      fallbacks: [],
      optimizedFallbacks: false,
      options: {
        variants: [
          { src: ['./src/assets/fonts/vazirmatn-arabic-wght.woff2'], weight: '400 800', style: 'normal', unicodeRange: [ARABIC] },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      // No fallbacks here: generic monospace maps Persian to Courier New (unjoined letters).
      // global.css puts Vazirmatn right after this face and the generic fallbacks after that.
      fallbacks: [],
      optimizedFallbacks: false,
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/jetbrains-mono-latin-wght.woff2'],
            weight: '400 500',
            style: 'normal',
            unicodeRange: [LATIN],
          },
        ],
      },
    },
  ],
  // The sitemap is a plain endpoint (src/pages/sitemap.xml.ts); the service worker is generated after the build
  integrations: [
    trimInlineStyles(),
    serviceWorker({
      pages: ['/', '/fa/', '/offline/'],
      assets: ['/manifest.webmanifest', '/fa/manifest.webmanifest', '/favicon.svg', '/icon-192.png'],
    }),
  ],
  vite: {
    // Order matters: Tailwind generates the CSS, then it is rewritten for the W3C validator
    plugins: [tailwindcss(), validatorFriendlyCss()],
  },
});
