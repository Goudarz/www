// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import serviceWorker from './integrations/service-worker.mjs';

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
    csp: true,
  },
  // Fonts are downloaded at build time and self-hosted (no runtime requests to Google)
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Plus Jakarta Sans',
      cssVariable: '--font-jakarta',
      weights: ['400 800'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Vazirmatn',
      cssVariable: '--font-vazir',
      weights: ['400 800'],
      styles: ['normal'],
      subsets: ['arabic', 'latin'],
      fallbacks: ['sans-serif'],
    },
    {
      // Arabic-script-only Vazirmatn for Persian words inside English text. It has no local() fallback face,
      // so Latin characters skip it and Persian ones never reach Jakarta's Arial fallback.
      provider: fontProviders.google(),
      name: 'Vazirmatn',
      cssVariable: '--font-vazir-arabic',
      weights: ['400 800'],
      styles: ['normal'],
      subsets: ['arabic'],
      fallbacks: [],
      optimizedFallbacks: false,
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      weights: ['400 500'],
      styles: ['normal'],
      subsets: ['latin'],
      // No fallbacks here: generic monospace maps Persian to Courier New (unjoined letters).
      // global.css puts Vazirmatn right after this face and the generic fallbacks after that.
      fallbacks: [],
      optimizedFallbacks: false,
    },
  ],
  // The sitemap is a plain endpoint (src/pages/sitemap.xml.ts); the service worker is generated after the build
  integrations: [
    serviceWorker({
      pages: ['/', '/fa/', '/offline/'],
      assets: ['/manifest.webmanifest', '/fa/manifest.webmanifest', '/favicon.svg', '/icon-192.png'],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
