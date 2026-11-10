// /persian-calendar/llms-full.txt: the complete English guide in one Markdown file
import type { APIRoute } from 'astro';
import { llmsFull } from '../../persian-calendar/endpoints';

export const GET: APIRoute = () => llmsFull('en');
