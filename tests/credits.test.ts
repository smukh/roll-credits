import { describe, expect, test } from 'claude-code/testing';
import {
  basename,
  clean,
  credits,
  demoStats,
  fresh,
  parse,
  record,
} from '../hooks/credits';
describe('credits', () => {
  test('removes control and bidirectional characters from displayed labels', () => {
    expect(clean('name\n\u001b\u202e.ts')).toEqual('name.ts');
    expect(basename('C:\\private\\project\\app.ts')).toEqual('app.ts');
    expect(clean('a'.repeat(200))).toHaveLength(100);
  });
  test('counts distinct full paths but reveals only basenames', () => {
    const stats = fresh(0, '/secret/project');
    record(stats, 'Edit', '/secret/project/a/index.ts', false);
    record(stats, 'Write', '/secret/project/b/index.ts', false);
    record(stats, 'Bash', '/secret/project/c.ts', false);
    expect(stats.files.size).toEqual(2);
    const text = credits(stats, 1000)
      .map((line) => line.text)
      .join('\n');
    expect(text).not.toContain('/secret');
    expect(text).not.toContain('c.ts');
    expect(text).toContain('SUPPORTING CAST');
  });
  test('limits retained file metadata while continuing aggregate counters', () => {
    const stats = fresh(0, 'project');
    for (let i = 0; i < 600; i++) record(stats, 'Edit', `${i}.ts`, false);
    expect(stats.files.size).toEqual(512);
    expect(stats.calls).toEqual(600);
    record(stats, 'Edit', '0.ts', false);
    expect(stats.files.get('0.ts')).toEqual(2);
  });
  test('demo is deterministic and negative elapsed time is clamped', () => {
    expect(credits(demoStats(800000), 800000)).toEqual(
      credits(demoStats(900000), 900000),
    );
    expect(
      credits(fresh(1000, 'project'), 0)
        .map((line) => line.text)
        .join('\n'),
    ).toContain('0s together');
  });
  test('parses leading options and preserves custom titles', () => {
    expect(parse('demo --still The Tiny Launch')).toEqual({
      demo: true,
      still: true,
      text: false,
      help: false,
      title: 'The Tiny Launch',
    });
    expect(parse('--text')).toEqual({
      demo: false,
      still: false,
      text: true,
      help: false,
      title: undefined,
    });
  });
});
