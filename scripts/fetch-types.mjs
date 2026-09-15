import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const commit = 'f96c3b49c4c8721685206aaab23609b2d399df4e';
const expected =
  '69d14af889cae22568b6051382e72971578156b36479d4ce4ad13f473797d4ac';
const url = `https://raw.githubusercontent.com/anthropics/claude-code/${commit}/mods/types/claude-code.d.ts`;
const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Types download failed: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash('sha256').update(bytes).digest('hex') !== expected)
  throw new Error('Official declarations checksum mismatch');
await mkdir(new URL('../.api/', import.meta.url), { recursive: true });
await writeFile(new URL('../.api/claude-code.d.ts', import.meta.url), bytes);
console.log(
  `Downloaded official declarations at ${commit}. Anthropic's license applies; .api/ is gitignored.`,
);
