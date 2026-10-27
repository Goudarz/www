// src/pages/robots.txt.ts
import type { APIRoute } from 'astro';
import { profile } from '../i18n/ui';

// Search engines and AI crawlers (training, search and on-demand user fetches)
const crawlers = [
  'Googlebot', 'Bingbot', 'DuckDuckBot', 'YandexBot', 'Applebot',
  'Google-Extended', 'Applebot-Extended',
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
  'Meta-ExternalAgent', 'Amazonbot', 'DuckAssistBot', 'MistralAI-User', 'CCBot',
];

const getRobotsTxt = (site: URL) => `
User-agent: *
Allow: /

# Explicitly allow search engines and AI answer engines to index Goudarz Jafari's profile
${crawlers.map((ua) => `User-agent: ${ua}`).join('\n')}
Allow: /

# LLM-friendly summaries: ${new URL('llms.txt', site).href}
Sitemap: ${new URL('sitemap.xml', site).href}
`.trim();

export const GET: APIRoute = ({ site }) =>
  new Response(getRobotsTxt(site ?? new URL(profile.siteUrl)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
