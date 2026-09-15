# Implementation notes

## Deviations

- Native capability auditing requires helpers receiving `$` to be declared at module scope. Moved the animation helper accordingly.
- Used a separate cleanup path for the close button because plugin-origin calls bypass their own hook layer.
- The interactive CLI requires sign-in on this machine. Verified the real noninteractive command and the official native render/button harness; do not claim a signed-in screenshot.

## Discovered edge cases

- Mods run in an isolated environment without Node or DOM. All runtime effects must use Claude's `$` capabilities.
- Anthropic's reference repository is not permissively licensed. Keep downloaded reference material in the development work folder; fetch pinned declarations for typechecking rather than redistribute them as MIT code.
- Claude Code was absent from PATH. Install an isolated development copy under the task's work directory for official validation and tests.

- Denied/error tool calls must not count as successful edits; successful results preserve their context unchanged.
- All timers must stop at the end and on both close paths. Denied closes retain the pane.
- File metadata cardinality is capped at 512; counters continue. Basenames may collide visually.

## Questions for review

- Interactive visual QA requires a signed-in Claude session. No other implementation questions remain.

## Summary

- Built a native TypeScript Claude Mod with a registered command and host-rendered pane.
- Added deterministic session statistics, fictional demo, motion-free view, and text output.
- Verified 18 tests through Claude's official runtime, strict types, and both manifests.
- Verified the real CLI command with no model call or login.
- Published smukh/roll-credits; GitHub CI passed and a fresh marketplace install produced the expected CLI demo.
