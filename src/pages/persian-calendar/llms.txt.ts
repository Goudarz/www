// /persian-calendar/llms.txt: index of the guide for language models (https://llmstxt.org)
import type { APIRoute } from 'astro';
import { llmsIndex } from '../../persian-calendar/endpoints';

export const GET: APIRoute = () => llmsIndex();
