// integrations/service-worker.mjs
// After the build, writes dist/sw.js from src/pwa/sw.template.js with a precache list and a content hash.
// The hash changes whenever any precached file changes, so clients pick up new deploys automatically.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Map a site URL to its file in dist ("/fa/" -> "fa/index.html") */
const toFile = (url) => (url.endsWith('/') ? `${url.slice(1)}index.html` : url.slice(1));

async function listFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full)));
    else files.push(full);
  }
  return files;
}

/**
 * @param {{ pages: string[], assets?: string[] }} options
 *   pages: HTML routes to precache; assets: extra files. Everything in /_astro/ (hashed JS and fonts) is added automatically.
 */
export default function serviceWorker({ pages, assets = [] }) {
  return {
    name: 'service-worker',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const bundled = (await listFiles(path.join(root, '_astro'))).map(
          (file) => `/${path.relative(root, file).split(path.sep).join('/')}`,
        );
        const urls = [...pages, ...assets, ...bundled];

        const hash = createHash('sha256');
        for (const url of urls) hash.update(await readFile(path.join(root, toFile(url))));
        const version = hash.digest('hex').slice(0, 12);

        const template = await readFile(new URL('../src/pwa/sw.template.js', import.meta.url), 'utf8');
        const sw = template
          .replace("'__VERSION__'", JSON.stringify(version))
          .replace('/* __PRECACHE__ */ []', JSON.stringify(urls, null, 2));
        await writeFile(path.join(root, 'sw.js'), sw);

        logger.info(`sw.js ${version}: ${urls.length} files precached`);
      },
    },
  };
}
