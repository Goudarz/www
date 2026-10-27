// src/pages/llms-full.txt.ts
// Full bilingual site content as Markdown for language models
import type { APIRoute } from 'astro';
import { siteData, profile, type Lang } from '../i18n/ui';

const section = (lang: Lang) => {
  const t = siteData[lang];
  return `# ${t.name} — ${t.role}

${t.description}

${t.heroBio}

Status: ${t.status}

## ${t.factsTitle}

${t.facts.map((f) => `- **${f.term}:** ${f.value}`).join('\n')}

## ${t.skillsTitle}

${t.skills.map((s) => `- ${s}`).join('\n')}

## ${t.freedomTitle}

${t.freedomIntro}

${t.freedoms.map((f) => `- **${f.n}. ${f.title}:** ${f.desc}`).join('\n')}

## ${t.experienceTitle}

### ${t.experience.role} — ${t.experience.company}, ${t.experience.location}

${t.experience.summary}

${t.experience.groups.map((g) => `#### ${g.title}\n\n${g.items.map((i) => `- ${i}`).join('\n')}`).join('\n\n')}

## ${t.projectsTitle}

${t.projects.map((p) => `### ${p.title}\n\n${p.desc}\n\n- Tags: ${p.tag}${p.status ? `\n- Status: ${p.status}` : ''}\n- Link: ${p.link}`).join('\n\n')}

## ${t.l10nTitle}

${t.l10nIntro}

${t.l10n.map((item) => `### ${item.project}: ${item.role}\n\n${item.desc}${item.stats ? `\n\n${item.stats.map((s) => `- ${s.value} ${s.label}`).join('\n')}` : ''}${item.note ? `\n\n${item.note}` : ''}${item.links.map((l) => `\n- ${l.label}: ${l.url}`).join('')}`).join('\n\n')}

## ${t.gistsTitle}

${t.gistsIntro}

${t.gists.map((g) => `### ${g.title}\n\n${g.desc}\n\n- Example: \`${g.snippet}\`\n- Tags: ${g.tag}\n- Link: ${g.link}`).join('\n\n')}

## ${t.mapsTitle}

${t.mapsText}

${t.mapsTools.map((tool) => `- ${tool}`).join('\n')}

## ${t.credentialTitle}: ${t.credentialOrg}

- ${t.credentialField}
- ${t.credentialIssuer}
- ${t.credentialMember}
- ${t.credentialVerify}: ${profile.credentialUrl}

## ${t.faqTitle}

${t.faq.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')}

## ${t.contactTitle}

${t.contactSub}

- Email: ${profile.email}
- Phone: ${profile.phoneDisplay[lang]}
${profile.socials.map((s) => `- ${s.label}: ${s.url}`).join('\n')}`;
};

export const GET: APIRoute = () =>
  new Response(`${section('en')}\n\n---\n\n${section('fa')}\n`, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
