# Contributing

Runtime code uses Claude’s sandboxed API. Keep Node dependencies in development scripts.

1. Use Node 22+, then `npm ci` and `npm run types:fetch`.
2. Change the Mod under `hooks/`.
3. Add a native-runtime regression test for behavior changes under `tests/`.
4. Run `npm run format` and `npm run check`.
5. Try `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --plugin-dir .`, then `/credits demo`, Still, Play, Replay, and Close. Also try `/credits --text` after editing files.

Use `claude plugin test` to check module loading and native UI behavior as well as TypeScript types. Tests run at the user tier.

Use small PRs with the problem, resulting behavior, and verification. Do not commit `.api/`, local Claude configuration, transcripts, or generated dependency folders.

When updating Claude compatibility, pin the development package, research the matching official API, update the declaration URL and checksum, rerun the checks, and update `docs/compatibility.md`. Changes to the early-access API may require code changes.
