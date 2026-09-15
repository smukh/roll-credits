# Claude Mods compatibility

## API references

- [Mods README at the pinned revision](https://github.com/anthropics/claude-code/blob/f96c3b49c4c8721685206aaab23609b2d399df4e/mods/README.md): module format, testing, and early-access limits.
- [Official API declarations](https://github.com/anthropics/claude-code/blob/f96c3b49c4c8721685206aaab23609b2d399df4e/mods/types/claude-code.d.ts): exact hooks, command, clock, and native UI contracts. Header identifies Claude Code 2.1.271.
- [Built-in diff Mod](https://github.com/anthropics/claude-code/tree/f96c3b49c4c8721685206aaab23609b2d399df4e/mods/diff): reference for native pane integration and real-engine tests.
- [Anthropic's repository license](https://github.com/anthropics/claude-code/blob/f96c3b49c4c8721685206aaab23609b2d399df4e/LICENSE.md): applies to those reference materials.

Development runtime: `@anthropic-ai/claude-code@2.1.272`. Declarations SHA-256: `69d14af889cae22568b6051382e72971578156b36479d4ce4ad13f473797d4ac`.

Mods require `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`. Anthropic describes this API as early access and subject to changes without notice. Compatibility has been tested with version 2.1.272.

## Integration choices

| Concern             | Implementation                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Module loading      | `modules: ["./register.tsx"]`, relative to `hooks/hooks.json`                                 |
| Runtime             | Sandboxed TypeScript; no Node, DOM, network, or filesystem dependencies                       |
| Capability auditing | `$` stays visible at `$.noun.method` call sites; a helper receiving `$` lives at module scope |
| Command conflict    | Failed registration leaves the existing `/credits` handler untouched                          |
| Tool accounting     | Observe after `next(e)` and return the original result, including context and error status    |
| Tool parameters     | Native flattened `file_path` / `notebook_path`, not legacy shell-hook `tool_input`            |
| UI                  | Host-provided `Box`, `Text`, `Button` through `$.ui.resolve(e)`; global JSX factory `h`       |
| Pane lifecycle      | Person-origin close hook plus explicit cleanup after this plugin's own close resolves         |
| Motion              | One row every 650 ms; finite roll; still mode cancels the clock                               |
| Persistence         | None; per-loaded-module state, no transcript replay                                           |

A plugin-origin call starts below its own hook layer. Consequently, the close button must clean up after its `$.ui.close` call; relying only on the Mod's `ui.close` hook leaves its timer running. Tests cover both close paths.

## Testing

`npm run check` runs formatting, strict TypeScript checks, Claude's plugin and marketplace validators, and 18 tests in `claude plugin test` at the user tier. The tests cover command registration, tool accounting, event passthrough, native render trees, button presses, timers, and text fallback.

A fresh marketplace installation of version 0.1.0 produced the output in [demo.txt](demo.txt). [GitHub Actions](https://github.com/smukh/roll-credits/actions) runs the checks on Linux.

Native pane behavior is covered by the render and button test harness. Appearance in a signed-in interactive terminal has not been manually verified.

To check an installed copy without sending a model request:

```sh
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --no-session-persistence -p '/credits demo --text' < /dev/null
```

Closing standard input prevents Claude from appending piped text to the command arguments.
