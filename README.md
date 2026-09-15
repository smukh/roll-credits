# Roll Credits 🎬

A Claude Mod that turns your coding session into movie credits. Your most-edited file gets top billing, tools get a thank-you, and failed calls become plot twists.

```text
/credits demo
```

Credits scroll in a native pane with Still / Play, Replay, and Close controls. Everything runs locally, without model calls or telemetry.

## Install

**Requires Claude Code with early-access function hooks enabled.** Tested with **2.1.272**. The Mods API is experimental.

```sh
claude plugin marketplace add smukh/roll-credits
claude plugin install roll-credits@roll-credits-marketplace
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude
```

Then run `/credits demo`. Restart Claude after installing. Enable the flag in every session where you want the Mod to load. On PowerShell, set `$env:CLAUDE_CODE_ENABLE_FUNCTION_HOOKS="1"` before running `claude`.

**Try from source:** no build or npm installation needed to use the Mod.

```sh
git clone https://github.com/smukh/roll-credits.git
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --plugin-dir ./roll-credits
```

If `/credits` is missing, check `claude --version`, restart with the flag, and inspect `/plugin` for load errors. Another plugin already owning `/credits` takes precedence; Roll Credits leaves that command unchanged.

## Commands

| Command                                 | Result                                                      |
| --------------------------------------- | ----------------------------------------------------------- |
| `/credits`                              | Roll the current session's credits                          |
| `/credits The Tiny Launch`              | Give the session a movie title                              |
| `/credits --still`                      | Show the full credits without animation; scroll to read     |
| `/credits --text`                       | Print the complete credits as text                          |
| `/credits demo`                         | Try fictional sample data, without changing your statistics |
| `/credits demo --still The Tiny Launch` | A named, motion-free demo                                   |
| `/credits --help`                       | Show usage                                                  |

Put options before the title. The pane opens only when requested. Use its buttons to switch to a still view, replay, or close; Escape closes it while it has focus. At the end, animation stops automatically. Each invocation takes a snapshot, so edits during the roll don't move the cast around.

### Demo

Output from `/credits demo --text`:

```text
STARRING
App.tsx
8 successful edit calls

SUPPORTING CAST
stars.ts · 3 edits
README.md · 2 edits

SPECIAL THANKS
Read · Edit · Bash · Write

BY THE NUMBERS
42 tool calls · 7 completed turns
12m 34s together · 2 plot twists

POST-CREDITS SCENE
The bugs have signed on for a sequel.
```

The demo is fictional. [Complete CLI output](docs/demo.txt).

## How it works

This uses Anthropic's published [Mods integration](https://github.com/anthropics/claude-code/tree/main/mods):

- `.claude-plugin/plugin.json` identifies the plugin.
- `hooks/hooks.json` loads `hooks/register.tsx` as a **function-hooks module**.
- `register(on)` observes `session.start`, `tool.call`, and `turn.complete`.
- `$.command.register` installs `/credits`; `command.run` handles it locally.
- `$.ui.open`, `ui.render`, and `$.ui.resolve` render a native pane using Claude's `Box`, `Text`, and `Button` elements.
- `$.clock.every` drives the roll; timers stop on still mode, close, or completion.

Runtime code is in `hooks/`. See [API references and compatibility](docs/compatibility.md).

## What the credits count

- Activity **observed since the Mod loaded**, including subagent tool calls. Reloading or restarting resets it; historical transcripts are not imported.
- Successful `Edit`, `Write`, and `NotebookEdit` calls determine the cast. These are call counts, not changed-line counts. Edits performed through Bash, external editors, or other tools aren't cast credits.
- Errors, denied calls, and thrown failures become “plot twists.” They are not a test-failure metric.
- Completed main-agent answer turns count as turns; aborted, error, and subagent turns don't.
- Elapsed wall time includes idle time.

Everything stays in memory. Full file paths are used as distinct keys, but only basenames are displayed. No prompts, answers, file contents, or command arguments are saved. Filenames may still be sensitive when you share credits. Up to 512 distinct files and 512 tool names are retained; aggregate call/failure counters continue after that limit. Identical basenames can appear twice. This measures activity, not code quality.

Noninteractive sessions or an unavailable pane fall back to text. The native element trees are tested for terminal, desktop, and mobile surfaces; those tests do not establish that every Claude app exposes Mods.

## Develop

Node **22+** is needed for the pinned development tooling. A Claude login is not needed for the tests.

```sh
npm ci
npm run types:fetch
npm run check
```

The type-fetch step downloads a checksum-verified declaration file from a pinned Anthropic commit into gitignored `.api/`. Anthropic's reference source has its own license; it is not republished under this project's MIT license.

`npm test` runs `claude plugin test` at the user tier. Tests cover event dispatch, native rendering, button presses, and timers. `npm run validate` checks the plugin and marketplace manifests.

See [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed. Independent community project; not affiliated with Anthropic.
