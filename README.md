# goudarzjafari.com

Bilingual (English / فارسی) personal site of Goudarz Jafari, built with Astro 7 and Tailwind CSS 4.

## Commands

| Command           | Action                                                        |
| :---------------- | :------------------------------------------------------------ |
| `npm run dev`     | Dev server at `localhost:4321`                                |
| `npm run build`   | Static build to `./dist/`                                     |
| `npm run preview` | Preview the build                                             |
| `npm run assets`  | Regenerate favicons, PWA icons and OG images from `src/assets/gj-logo.svg` |
| `npm run screenshots` | Capture PWA install screenshots (needs `npm run preview` running; set `BASE_URL` if not on port 4321) |

## Where things live

- `src/i18n/ui.ts`: **single source of truth** for all content. Pages, JSON-LD, `llms.txt`, `llms-full.txt` and the terminal all read from it.
- `src/components/SEO.astro`: meta tags, Open Graph, hreflang, Schema.org graph (Person, ProfilePage, WebSite, ItemList, FAQPage).
- `src/components/HeroOrb.astro`: dependency-free WebGL2 orb. Loads on idle, pauses off-screen, and honours `prefers-reduced-motion`.
- `src/components/Terminal.astro`: interactive terminal (progressive enhancement; content works without JS).
- `src/pages/*.ts`: `robots.txt`, `sitemap.xml` (both languages with hreflang), `llms.txt`, `llms-full.txt`, `humans.txt`.
- PWA:
  - `src/pwa/manifest.ts` builds `/manifest.webmanifest` (English) and `/fa/manifest.webmanifest` (Persian, RTL); both share `id: "/"` so they are one app.
  - `src/pwa/sw.template.js` is the service worker; `integrations/service-worker.mjs` turns it into `dist/sw.js` with a precache list and a content-hash version on every build.
  - `src/pages/offline.astro` is shown for uncached pages when offline.
  - Registration is silent: no custom install prompt; browsers show their own install option.
- `public/_headers`: security and cache headers for Netlify and Cloudflare Pages.

After changing the name or role in `ui.ts`, run `npm run assets` to refresh the social preview images.
