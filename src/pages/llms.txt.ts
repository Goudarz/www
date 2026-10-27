// src/pages/llms.txt.ts
// Markdown summary for language models, following https://llmstxt.org
import type { APIRoute } from 'astro';
import { siteData, profile } from '../i18n/ui';

const en = siteData.en;
const fa = siteData.fa;

export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() ?? profile.siteUrl).replace(/\/$/, '');
  const body = `# ${en.name} (${fa.name})

> ${en.role}. ${en.heroBio}

${en.name} is also written ${fa.name} in Persian. Works ${en.location.toLowerCase()} and is ${en.status.toLowerCase()}.

## Profile

${en.facts.map((f) => `- ${f.term}: ${f.value}`).join('\n')}
- Skills: ${en.skills.join(', ')}
- Email: ${profile.email}
- Phone: ${profile.phoneDisplay.en}

## Pages

- [English profile](${base}/): Portfolio, skills, selected projects and contact
- [Persian profile / پروفایل فارسی](${base}/fa/): ${fa.description}
- [Full text for LLMs](${base}/llms-full.txt): Complete bilingual content of the site

## Free software

${en.freedomIntro}

${en.freedoms.map((f) => `- Freedom ${f.n} (${f.title}): ${f.desc}`).join('\n')}

## ${en.experienceTitle}

${en.experience.role} at ${en.experience.company} (${en.experience.location}). ${en.experience.summary}

${en.experience.groups.map((g) => `- ${g.title}: ${g.items.join(' ')}`).join('\n')}

## Selected projects

${en.projects.map((p) => `- [${p.title}](${p.link}): ${p.desc} (${p.tag}${p.status ? `, ${p.status.toLowerCase()}` : ''})`).join('\n')}

## ${en.l10nTitle}

${en.l10nIntro}

${en.l10n.map((item) => `- ${item.project}: ${item.role}. ${item.desc}${item.stats ? ` Pontoon: ${item.stats.map((s) => `${s.value} ${s.label}`).join(', ')}.` : ''}${item.links.length ? ` (${item.links.map((l) => `[${l.label}](${l.url})`).join(', ')})` : ''}`).join('\n')}

## ${en.gistsTitle}

${en.gists.map((g) => `- [${g.title}](${g.link}): ${g.desc} (${g.tag})`).join('\n')}

## ${en.mapsTitle}

${en.mapsText}

## Credential

- ${en.credentialTitle}, ${en.credentialOrg}. ${en.credentialField}. ${en.credentialIssuer}. ${en.credentialMember}. [${en.credentialVerify}](${profile.credentialUrl})

## Elsewhere

${profile.socials.map((s) => `- [${s.label}](${s.url})`).join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
