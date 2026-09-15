/** Deterministic credits; never reads transcript text or file contents. */
export interface Stats {
  startedAt: number;
  project: string;
  calls: number;
  failures: number;
  turns: number;
  files: Map<string, number>;
  tools: Map<string, number>;
}
export interface Line {
  text: string;
  kind: 'title' | 'heading' | 'body' | 'muted';
}
export function clean(value: string, limit = 100): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '')
    .slice(0, limit);
}
export function basename(path: string): string {
  return clean(
    path.replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop() ||
      'Untitled project',
  );
}
export function fresh(now: number, cwd: string): Stats {
  return {
    startedAt: now,
    project: basename(cwd),
    calls: 0,
    failures: 0,
    turns: 0,
    files: new Map(),
    tools: new Map(),
  };
}
// Bound cardinality for sessions with thousands of different files.
function bump(map: Map<string, number>, key: string): void {
  if (map.has(key) || map.size < 512) map.set(key, (map.get(key) || 0) + 1);
}
export function record(
  stats: Stats,
  tool: string,
  path: unknown,
  failed: boolean,
): void {
  stats.calls++;
  bump(stats.tools, clean(tool));
  if (failed) {
    stats.failures++;
    return;
  }
  if (
    ['Edit', 'Write', 'NotebookEdit'].includes(tool) &&
    typeof path === 'string'
  )
    bump(stats.files, path);
}
function ranked(map: Map<string, number>): [string, number][] {
  return [...map].sort(
    (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );
}
export function credits(
  stats: Stats,
  now: number,
  title?: string,
  demo = false,
): Line[] {
  const lines: Line[] = [];
  const add = (text: string, kind: Line['kind'] = 'body') =>
    lines.push({ text, kind });
  add(demo ? 'DEMO · FICTIONAL SESSION' : 'A SESSION IN CODE', 'muted');
  add(clean(title || stats.project, 80), 'title');
  add('');
  add('DIRECTED BY', 'heading');
  add('You');
  add('WRITTEN WITH', 'heading');
  add('Claude');
  add('');
  const cast = ranked(stats.files);
  add('STARRING', 'heading');
  add(cast[0] ? basename(cast[0][0]) : 'The blank canvas');
  add(
    cast[0]
      ? `${cast[0][1]} successful edit calls`
      : 'No successful edits yet.',
    'muted',
  );
  if (cast.length > 1) {
    add('');
    add('SUPPORTING CAST', 'heading');
    for (const [file, count] of cast.slice(1, 6))
      add(`${basename(file)} · ${count} edit${count === 1 ? '' : 's'}`);
    if (cast.length > 6) add(`And ${cast.length - 6} more files`, 'muted');
  }
  add('');
  add('SPECIAL THANKS', 'heading');
  add(
    ranked(stats.tools)
      .slice(0, 4)
      .map(([tool]) => tool)
      .join(' · ') || 'Your curiosity',
  );
  add('');
  add('BY THE NUMBERS', 'heading');
  const seconds = Math.floor(Math.max(0, now - stats.startedAt) / 1000);
  const elapsed =
    seconds < 60
      ? `${seconds}s`
      : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  add(`${stats.calls} tool calls · ${stats.turns} completed turns`);
  add(
    `${elapsed} together · ${stats.failures} plot twist${stats.failures === 1 ? '' : 's'}`,
  );
  add('');
  add('POST-CREDITS SCENE', 'heading');
  add(
    stats.failures
      ? 'The bugs have signed on for a sequel.'
      : 'One more tiny change?',
  );
  add('');
  add('THE END', 'title');
  add('Made with patience. And a few tool calls.', 'muted');
  add(
    demo
      ? 'Sample data only.'
      : 'Observed since this Mod loaded. Edits via Bash are not counted.',
    'muted',
  );
  return lines;
}
export function demoStats(now: number): Stats {
  const stats = fresh(now - 754000, 'the-little-launch');
  stats.calls = 42;
  stats.turns = 7;
  stats.failures = 2;
  stats.files = new Map([
    ['src/App.tsx', 8],
    ['src/stars.ts', 3],
    ['README.md', 2],
  ]);
  stats.tools = new Map([
    ['Read', 18],
    ['Edit', 11],
    ['Bash', 9],
    ['Write', 4],
  ]);
  return stats;
}
export function parse(args: string): {
  demo: boolean;
  text: boolean;
  still: boolean;
  title?: string;
  help: boolean;
} {
  const words = args.trim().split(/\s+/).filter(Boolean);
  const flags = new Set<string>();
  while (words[0] && ['demo', '--text', '--still', '--help'].includes(words[0]))
    flags.add(words.shift()!);
  return {
    demo: flags.has('demo'),
    text: flags.has('--text'),
    still: flags.has('--still'),
    help: flags.has('--help'),
    title: words.join(' ') || undefined,
  };
}
