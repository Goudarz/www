// src/pages/humans.txt.ts
import type { APIRoute } from 'astro';
import { siteData, profile } from '../i18n/ui';

export const GET: APIRoute = () =>
  new Response(
    `/* TEAM */
Developer: ${siteData.en.name} (${siteData.fa.name})
Role: ${siteData.en.role}
Contact: ${profile.email}
Phone: ${profile.phoneDisplay.en}
${profile.socials.map((s) => `${s.label}: ${s.url}`).join('\n')}

/* SITE */
Language: English, Persian (فارسی)
Standards: HTML5, CSS, WebGL2, Schema.org, WCAG 2.2 AA
Components: Astro, Tailwind CSS
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
