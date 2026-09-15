# Claude Mods compatibility

## Source of truth

Researched against Anthropic's published implementation, not a guessed SDK:

- [Mods README at the pinned revision](https://github.com/anthropics/claude-code/blob/f96c3b49c4c8721685206aaab23609b2d399df4e/mods/README.md): module format, testing, and early-access limits.
- [Official API declarations](https://github.com/anthropics/claude-code/blob/f96c3b49c4c8721685206aaab23609b2d399df4e/mods/types/claude-code.d.ts): exact hooks, command, clock, and native UI contracts. Header identifies Claude Code 2.1.271.
- [Built-in diff Mod](https://github.com/anthropics/claude-code/tree/f96c3b49c4c8721685206aaab23609b2d399df4e/mods/diff): reference for native pane integration and real-engine tests.
- [Anthropic's repository license](https://github.com/anthropics/claude-code/blob/f96c3b49c4c8721685206aaab23609b2d399df4e/LICENSE.md): applies to those reference materials.

Development runtime: `@anthropic-ai/claude-code@2.1.272`. Declarations SHA-256: `69d14af889cae22568b6051382e72971578156b36479d4ce4ad13f473797d4ac`.

Mods require `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`. Anthropic describes this API as early access and subject to changes without notice. Version 2.1.272 is the tested version, not a promise of compatibility with every earlier or future release.

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

A plugin-origin call starts below its own hook layer. Consequently, the close button must clean up after its `$.ui.close` call; relying only on the Mod's `ui.close` hook leaves its timer running. The official test harness caught this and verifies both paths.

## Verification scope

- Strict TypeScript check against pinned official declarations.
- Official `claude plugin validate` for the plugin and marketplace; the plugin validator reports the loaded module's actual hooks and capabilities.
- Official `claude plugin test` at user tier: command registration, successful/failed/denied edits, passthrough behavior, native pane rendering and button dispatch, timer cancellation/completion, noninteractive and denied-UI fallback, and deterministic formatting.
- Actual CLI smoke: `claude --plugin-dir ... --no-session-persistence -p '/credits demo --text'` returned the complete credits with exit status 0. See [demo.txt](demo.txt).

The interactive CLI was also launched, but stopped at its account sign-in screen. No signed-in interactive screenshot is claimed. Native pane behavior is verified through Claude's official render and button test engine; pixel appearance in an authenticated terminal remains a manual check.
