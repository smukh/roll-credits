import type { EngineInterface, Register, Timer } from 'claude-code';
import { credits, demoStats, fresh, parse, record } from './credits';
import type { Line } from './credits';
const ID = 'roll-credits';
const HELP =
  'Roll Credits\n/credits [demo] [--text] [--still] [title]\nStill/play, replay, or close using the pane buttons. --still disables animation; --text prints all credits. Demo uses fictional data. Statistics stay in memory and reset when this Mod loads.';
interface Playback {
  offset: number;
  height: number;
  paused: boolean;
  opened: boolean;
  lines: Line[];
  timer?: Timer;
}
function stop(p: Playback): void {
  p.timer?.cancel();
  p.timer = undefined;
}
function end(p: Playback): number {
  return Math.max(0, p.lines.length - p.height);
}
// Claude's capability auditor requires helpers receiving $ at module scope.
function animate($: EngineInterface, p: Playback): void {
  stop(p);
  if (!p.opened || p.paused || p.offset >= end(p)) return;
  p.timer = $.clock.every(650, () => {
    p.offset = Math.min(p.offset + 1, end(p));
    $.ui.invalidate('ui.render');
    if (p.offset >= end(p)) stop(p);
  });
}
export const register: Register = (on) => {
  let stats = fresh(0, 'Untitled project');
  let active = false,
    interactive = false;
  const p: Playback = {
    offset: 0,
    height: 12,
    paused: false,
    opened: false,
    lines: [],
  };
  on('session.start', async ($, e, next) => {
    const result = await next(e);
    stop(p);
    p.opened = false;
    active = false;
    interactive = e.isInteractive;
    try {
      stats = fresh(await $.clock.now(), e.cwd);
      await $.command.register({
        name: 'credits',
        description: 'Roll movie credits for your coding session',
        argumentHint: '[demo] [--text] [--still] [title]',
      });
      active = true;
    } catch {
      /* A denied capability or command conflict must not break startup. */
    }
    return result;
  });
  on('tool.call', async ($, e, next) => {
    try {
      const result = await next(e);
      if (active)
        record(
          stats,
          e.tool,
          'file_path' in e
            ? e.file_path
            : 'notebook_path' in e
              ? e.notebook_path
              : undefined,
          result.deny !== undefined || result.isError === true,
        );
      return result;
    } catch (error) {
      if (active) record(stats, e.tool, undefined, true);
      throw error;
    }
  });
  on('turn.complete', async ($, e, next) => {
    const result = await next(e);
    if (active && !e.agentId && !e.isAborted && e.reason === 'answer')
      stats.turns++;
    return result;
  });
  on('command.run', { command: 'credits' }, async ($, e, next) => {
    if (!active) return next(e);
    const options = parse(e.args);
    if (options.help) return { text: HELP };
    const now = await $.clock.now();
    const snapshot = credits(
      options.demo ? demoStats(now) : stats,
      now,
      options.title,
      options.demo,
    );
    if (options.text || !interactive)
      return { text: snapshot.map((line) => line.text).join('\n') };
    stop(p);
    p.lines = snapshot;
    p.offset = 0;
    p.paused = options.still;
    try {
      await $.ui.open({
        id: ID,
        title: 'Roll Credits',
        focus: true,
        closeOnEscape: true,
        rows: 20,
      });
      p.opened = true;
      $.ui.invalidate('ui.render');
      animate($, p);
      return {};
    } catch {
      p.opened = false;
      return { text: snapshot.map((line) => line.text).join('\n') };
    }
  });
  on('ui.close', { id: ID }, async ($, e, next) => {
    const result = await next(e);
    if (!('deny' in result)) {
      p.opened = false;
      stop(p);
    }
    return result;
  });
  on('ui.render', { component: 'Pane' }, ($, e, next) => {
    if (e.requestId !== ID || !p.opened) return next(e);
    const { Box, Text, Button } = $.ui.resolve(e);
    p.height = Math.max(1, Math.min(18, e.props.scroll.bodyRows - 5));
    p.offset = Math.min(p.offset, end(p));
    const visible = p.paused
      ? p.lines
      : p.lines.slice(p.offset, p.offset + p.height);
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="yellow" bold>
          ★ ROLL CREDITS ★
        </Text>
        <Text dimColor>
          {p.paused
            ? 'Still · scroll to read'
            : p.offset >= end(p)
              ? 'That’s a wrap.'
              : 'Now playing…'}
        </Text>
        <Box flexDirection="row" gap={2}>
          <Button
            key="pause"
            label={p.paused ? 'Play' : 'Still'}
            onPress={() => {
              p.paused = !p.paused;
              animate($, p);
              $.ui.invalidate('ui.render');
            }}
          />
          <Button
            key="replay"
            label="Replay"
            onPress={() => {
              p.offset = 0;
              p.paused = false;
              animate($, p);
              $.ui.invalidate('ui.render');
            }}
          />
          <Button
            key="close"
            label="Close"
            onPress={() => {
              void $.ui
                .close({ id: ID })
                .then(() => {
                  p.opened = false;
                  stop(p);
                })
                .catch(() => {});
            }}
          />
        </Box>
        <Text> </Text>
        <Box flexDirection="column" minHeight={p.height}>
          {visible.map((line, index) => (
            <Box key={`${index}`} justifyContent="center">
              <Text
                bold={line.kind === 'title'}
                color={
                  line.kind === 'heading' || line.kind === 'title'
                    ? 'yellow'
                    : undefined
                }
                dimColor={line.kind === 'muted'}
                wrap="truncate-end"
              >
                {line.text || ' '}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  });
};
