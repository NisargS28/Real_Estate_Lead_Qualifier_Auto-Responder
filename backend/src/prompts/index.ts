import { readFileSync } from 'node:fs';

// The .md files are the single source of prompt text. n8n/build-workflows.mjs embeds the same
// files into the n8n workflow, and a unit test checks that the exported workflow is in sync.
// Literal URLs let serverless file tracing include both assets in the function.
export const CLASSIFY_SYSTEM_PROMPT = readFileSync(new URL('./classify.system.md', import.meta.url), 'utf8').trim();
export const REPLY_SYSTEM_PROMPT = readFileSync(new URL('./reply.system.md', import.meta.url), 'utf8').trim();
