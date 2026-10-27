// src/pages/manifest.webmanifest.ts
import type { APIRoute } from 'astro';
import { manifestResponse } from '../pwa/manifest';

export const GET: APIRoute = () => manifestResponse('en');
