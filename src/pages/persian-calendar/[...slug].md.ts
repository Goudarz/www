// /persian-calendar/<page>.md: each English page as plain Markdown (for readers, tools and language models)
import type { APIRoute } from 'astro';
import { markdownPaths, pageMarkdown } from '../../persian-calendar/endpoints';

export const getStaticPaths = markdownPaths;
export const GET: APIRoute = ({ props }) => pageMarkdown(props.page, 'en');
