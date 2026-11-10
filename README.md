# goudarzjafari.com

Bilingual (English / فارسی) personal site of Goudarz Jafari, built with Astro 7 and Tailwind CSS 4.

## Getting started

The Persian Calendar guide (`/persian-calendar/`) is built from the [PersianCalendar](https://github.com/Goudarz/PersianCalendar)
repository, vendored as a git submodule. Clone with submodules, or fetch them afterwards:

```sh
git clone --recurse-submodules https://github.com/Goudarz/www.git
git submodule update --init          # in an existing clone
```

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
- `src/components/SEO.astro`: meta tags, Open Graph, hreflang, Schema.org graph (Person, ProfilePage, WebSite, ItemList); the FAQ data in `ui.ts` is used only by `llms-full.txt`.
- `src/components/HeroOrb.astro`: dependency-free WebGL2 orb. Loads on idle, pauses off-screen, and honours `prefers-reduced-motion`.
- `src/components/Terminal.astro`: interactive terminal (progressive enhancement; content works without JS).
- `src/pages/*.ts`: `robots.txt`, `sitemap.xml` (both languages with hreflang), `llms.txt`, `llms-full.txt`, `humans.txt`.
- PWA:
  - `src/pwa/manifest.ts` builds `/manifest.webmanifest` (English) and `/fa/manifest.webmanifest` (Persian, RTL); both share `id: "/"` so they are one app.
  - `src/pwa/sw.template.js` is the service worker; `integrations/service-worker.mjs` turns it into `dist/sw.js` with a precache list and a content-hash version on every build.
  - `src/pages/offline.astro` is shown for uncached pages when offline.
  - Registration is silent: no custom install prompt; browsers show their own install option.
- `public/_headers`: security and cache headers for Netlify and Cloudflare Pages (GitHub Pages ignores it; see below).

After changing the name or role in `ui.ts`, run `npm run assets` to refresh the social preview images.

## Persian Calendar guide (`/persian-calendar/`, `/fa/persian-calendar/`)

The guide is the [PersianCalendar](https://github.com/Goudarz/PersianCalendar) repository published as part of this site.
Nothing is copied by hand: every page, code listing, download and date is read from `vendor/persian-calendar` at build time.

- `src/persian-calendar/`
  - `pages.ts`: every page, its source file, and how repository links map to site URLs (pages stay on the site,
    data files become downloads, tool sources open on GitHub).
  - `markdown.ts`: renders the repository Markdown one language at a time. Bilingual READMEs keep English text on the
    English page and the `<div dir="rtl">` blocks on the Persian page; anchors stay compatible with GitHub's.
    Code is highlighted with Prism classes (no inline styles, so the CSP stays strict).
  - `implementations.ts`: the language list, read from the table in `implementations/README.md`.
  - `content.ts`, `schema.ts`, `endpoints.ts`: page data, Schema.org graph (TechArticle, SoftwareSourceCode, Dataset),
    and the Markdown/`llms.txt` routes. `zip.ts` builds the download archives.
- `src/components/persian-calendar/`: layout, sidebar, page types and the live date converter (which runs the
  repository's own JavaScript implementation).
- Every page is also available as Markdown (`/persian-calendar/leap-years.md`), the guide has its own
  `/persian-calendar/llms.txt` and `llms-full.txt` (English and Persian), and downloads live under `/persian-calendar/files/`.

To publish a new version of the guide, move the submodule and commit it:

```sh
git -C vendor/persian-calendar fetch --tags
git -C vendor/persian-calendar checkout v1.1.0      # or: git submodule update --remote
git add vendor/persian-calendar && git commit -m "docs: update the Persian Calendar guide to v1.1.0"
```

## Edge configuration (GitHub Pages behind Cloudflare)

GitHub Pages cannot set HTTP headers, so these live in Cloudflare (DNS records proxied, SSL/TLS mode **Full**).
The `<meta>` CSP built by Astro carries the hashed `script-src`/`style-src`; the header CSP below adds the
directives a `<meta>` tag cannot carry. Browsers enforce both.

- **Rules → Transform Rules → Response Header Transform Rule** (all requests), *Set static*:
  - `Content-Security-Policy`: `frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; require-trusted-types-for 'script'; trusted-types sw-registration; upgrade-insecure-requests`
  - `Cross-Origin-Opener-Policy`: `same-origin`
  - `X-Frame-Options`: `DENY`
  - `X-Content-Type-Options`: `nosniff`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- **SSL/TLS → Edge Certificates → HSTS**: max-age 12 months, include subdomains.
- **Caching → Cache Rules**: URI path starts with `/_astro/` → eligible for cache, Edge TTL and Browser TTL 1 year
  (file names are content-hashed).
- **Speed → Optimization**: Rocket Loader and Email Address Obfuscation off (they inject scripts the CSP blocks).
