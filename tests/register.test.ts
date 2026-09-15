import type { On, RenderInput } from 'claude-code';
import { describe, expect, mock, test } from 'claude-code/testing';

const SESSION = {
  surface: 'terminal' as const,
  isInteractive: true,
  cwd: '/work/tiny-launch',
};
const COMMAND = {
  command: 'credits',
  args: '',
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: true, columns: 160 },
};
const PANE: RenderInput<'Pane'> = {
  component: 'Pane',
  surface: 'terminal',
  requestId: 'roll-credits',
  viewport: { columns: 160, rows: 40 },
  props: {
    title: 'Roll Credits',
    isFocused: true,
    bodyColumns: 70,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
};
function setup(on: On) {
  const clock = mock.clock(on, { now: 0 });
  const opened: string[] = [],
    closed: string[] = [],
    registered: string[] = [];
  let invalidations = 0;
  on('session.start', ($, e) => ({ cwd: e.cwd }));
  on('command.register', ($, e) => {
    registered.push(e.name);
    return { value: { command: e.name } };
  });
  on('ui.open', ($, e) => {
    opened.push(e.id);
    return { value: undefined };
  });
  on('ui.close', ($, e) => {
    closed.push(e.id);
    return { value: undefined };
  });
  on('ui.invalidate', () => {
    invalidations++;
    return { value: undefined };
  });
  on('turn.complete', ($, e) => ({ text: e.answer }));
  return {
    clock,
    opened,
    closed,
    registered,
    invalidations: () => invalidations,
  };
}
function strings(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(strings).join('\n');
  if (value && typeof value === 'object')
    return Object.values(value).map(strings).join('\n');
  return '';
}

describe('register', () => {
  test('registers /credits and describes an empty session without opening a pane in text mode', async ($, on) => {
    const world = setup(on);
    await $.session.start(SESSION);
    const result = await $.command.run({ ...COMMAND, args: '--text' });
    expect(world.registered).toEqual(['credits']);
    expect(world.opened).toEqual([]);
    expect(result.text).toContain('tiny-launch');
    expect(result.text).toContain('The blank canvas');
    expect(result.text).toContain('0 tool calls');
  });
  test('counts successful edits, errors, denials, and completed main turns without changing tool results', async ($, on) => {
    const world = setup(on);
    on('tool.call', ($, e) =>
      e.tool === 'Read'
        ? { isError: true, result: 'missing' }
        : e.tool === 'Write'
          ? { deny: 'denied' }
          : { result: 'edited', text: 'original', context: ['preserved'] },
    );
    await $.session.start(SESSION);
    expect(
      await $.tool.call({
        tool: 'Edit',
        file_path: '/work/App.tsx',
        old_string: 'a',
        new_string: 'b',
        tool_use_id: '1',
      }),
    ).toEqual({ result: 'edited', text: 'original', context: ['preserved'] });
    await $.tool.call({
      tool: 'Read',
      file_path: '/missing',
      tool_use_id: '2',
    });
    await $.tool.call({
      tool: 'Write',
      file_path: '/work/denied.ts',
      content: '',
      tool_use_id: '3',
    });
    await $.turn.complete({
      answer: 'done',
      durationMs: 100,
      isAborted: false,
      turnId: 'a',
      reason: 'answer',
    });
    await $.turn.complete({
      answer: 'done',
      durationMs: 100,
      isAborted: false,
      turnId: 'b',
      reason: 'answer',
      agentId: 'subagent',
    });
    await world.clock.advance(61000);
    const { text } = await $.command.run({ ...COMMAND, args: '--text' });
    expect(text).toContain('App.tsx');
    expect(text).not.toContain('denied.ts');
    expect(text).toContain('3 tool calls · 1 completed turns');
    expect(text).toContain('2 plot twists');
    expect(text).toContain('1m 1s');
  });
  test('native pane animates, switches to still, replays, and cancels its clock on close', async ($, on) => {
    const world = setup(on);
    await $.session.start(SESSION);
    expect(await $.command.run({ ...COMMAND, args: 'demo' })).toEqual({});
    expect(world.opened).toEqual(['roll-credits']);
    const first = strings(await $.ui.render(PANE));
    expect(first).toContain('DEMO');
    await world.clock.advance(1950);
    expect(strings(await $.ui.render(PANE))).not.toEqual(first);
    await $.ui.press({ plugin: 'roll-credits', key: 'pause' });
    const still = strings(await $.ui.render(PANE));
    expect(still).toContain('THE END');
    const count = world.invalidations();
    await world.clock.advance(5000);
    expect(world.invalidations()).toEqual(count);
    await $.ui.press({ plugin: 'roll-credits', key: 'replay' });
    expect(strings(await $.ui.render(PANE))).toContain('DEMO');
    await $.ui.press({ plugin: 'roll-credits', key: 'close' });
    await world.clock.settle();
    expect(world.closed).toEqual(['roll-credits']);
    const closedCount = world.invalidations();
    await world.clock.advance(5000);
    expect(world.invalidations()).toEqual(closedCount);
  });
  test('animation ends naturally and demo never contaminates real statistics', async ($, on) => {
    const world = setup(on);
    await $.session.start(SESSION);
    await $.command.run({ ...COMMAND, args: 'demo' });
    await $.ui.render(PANE);
    await world.clock.advance(60000);
    expect(strings(await $.ui.render(PANE))).toContain('THE END');
    const count = world.invalidations();
    await world.clock.advance(60000);
    expect(world.invalidations()).toEqual(count);
    expect(
      (await $.command.run({ ...COMMAND, args: '--text' })).text,
    ).toContain('0 tool calls');
  });
  test('noninteractive sessions return text', async ($, on) => {
    const world = setup(on);
    await $.session.start({ ...SESSION, isInteractive: false });
    expect((await $.command.run({ ...COMMAND, args: 'demo' })).text).toContain(
      '42 tool calls',
    );
    expect(world.opened).toEqual([]);
  });
  test('unavailable panes fall back to text', async ($, on) => {
    mock.clock(on);
    on('session.start', ($, e) => ({ cwd: e.cwd }));
    on('command.register', ($, e) => ({ value: { command: e.name } }));
    on('ui.open', () => ({ deny: 'No UI' }));
    await $.session.start(SESSION);
    expect((await $.command.run(COMMAND)).text).toContain('THE END');
  });
  test('a command conflict leaves the existing command untouched', async ($, on) => {
    mock.clock(on);
    on('session.start', ($, e) => ({ cwd: e.cwd }));
    on('command.register', () => ({ deny: 'Already registered' }));
    on('command.run', () => ({ text: 'other plugin' }));
    await $.session.start(SESSION);
    expect(await $.command.run(COMMAND)).toEqual({ text: 'other plugin' });
  });
  test('passes unrelated panes and commands through', async ($, on) => {
    setup(on);
    on('command.run', () => ({ text: 'untouched' }));
    on('ui.render', ($, e) => $.ui.resolve(e).Text({ children: 'other pane' }));
    await $.session.start(SESSION);
    expect(await $.command.run({ ...COMMAND, command: 'other' })).toEqual({
      text: 'untouched',
    });
    expect(
      strings(await $.ui.render({ ...PANE, requestId: 'other' })),
    ).toContain('other pane');
  });
  test('uses native elements on terminal, desktop, mobile and narrow panes', async ($, on) => {
    setup(on);
    await $.session.start(SESSION);
    await $.command.run({ ...COMMAND, args: 'demo --still' });
    for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
      const rendered = await $.ui.render({
        ...PANE,
        surface,
        props: {
          ...PANE.props,
          bodyColumns: 20,
          scroll: { offset: 0, bodyRows: 8 },
        },
      });
      expect(strings(rendered)).toContain('THE END');
    }
  });
  test(
    'an external close runs the close hook and cancels animation',
    {
      plugins: [
        {
          name: 'external-closer',
          tier: 'prepend',
          register(on) {
            on('command.run', { command: 'close-test' }, async ($) => {
              await $.ui.close({ id: 'roll-credits' });
              return {};
            });
          },
        },
      ],
    },
    async ($, on) => {
      const world = setup(on);
      await $.session.start(SESSION);
      await $.command.run({ ...COMMAND, args: 'demo' });
      await $.ui.render(PANE);
      await $.command.run({ ...COMMAND, command: 'close-test' });
      const count = world.invalidations();
      await world.clock.advance(5000);
      expect(world.invalidations()).toEqual(count);
    },
  );
  test('a denied close keeps the pane and its controls alive', async ($, on) => {
    mock.clock(on);
    on('session.start', ($, e) => ({ cwd: e.cwd }));
    on('command.register', ($, e) => ({ value: { command: e.name } }));
    on('ui.open', () => ({ value: undefined }));
    on('ui.invalidate', () => ({ value: undefined }));
    on('ui.close', () => ({ deny: 'Stay open' }));
    await $.session.start(SESSION);
    await $.command.run({ ...COMMAND, args: 'demo --still' });
    await $.ui.render(PANE);
    await $.ui.press({ plugin: 'roll-credits', key: 'close' });
    expect(strings(await $.ui.render(PANE))).toContain('THE END');
  });
  test('a thrown tool failure remains a failure and receives no starring credit', async ($, on) => {
    setup(on);
    on('tool.call', () => {
      throw new Error('tool exploded');
    });
    await $.session.start(SESSION);
    await expect(
      $.tool.call({
        tool: 'Edit',
        file_path: '/broken.ts',
        old_string: 'a',
        new_string: 'b',
      }),
    ).rejects.toThrow();
    const { text } = await $.command.run({ ...COMMAND, args: '--text' });
    expect(text).not.toContain('broken.ts');
    expect(text).toContain('1 plot twist');
  });
  test('the roll is a snapshot; replay does not silently replace its statistics', async ($, on) => {
    setup(on);
    on('tool.call', () => ({ result: 'ok' }));
    await $.session.start(SESSION);
    await $.command.run({ ...COMMAND, args: '--still' });
    await $.tool.call({
      tool: 'Edit',
      file_path: '/later.ts',
      old_string: 'a',
      new_string: 'b',
    });
    expect(strings(await $.ui.render(PANE))).not.toContain('later.ts');
    await $.command.run({ ...COMMAND, args: '--still' });
    expect(strings(await $.ui.render(PANE))).toContain('later.ts');
  });
});
