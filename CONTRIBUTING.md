# Contributing

Keep it small, local, and fun. The runtime must not depend on Node, DOM, a model request, or a server.

1. Use Node 22+, then `npm ci` and `npm run types:fetch`.
2. Change the Mod under `hooks/`.
3. Add a native-runtime regression test for behavior changes under `tests/`.
4. Run `npm run format` and `npm run check`.
5. Try `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --plugin-dir .`, then `/credits demo`, Still, Play, Replay, and Close. Also try `/credits --text` after real edits.

Claude's capability auditor is stricter than TypeScript. Do not replace `claude plugin test` with a fake `$` object: that misses module-loading and native-UI errors. Tests run at the normal user tier, not the built-in tier.

Use small PRs with the problem, resulting behavior, and verification. Do not commit `.api/`, local Claude configuration, transcripts, or generated dependency folders.

When updating Claude compatibility, pin the development package, research the matching official API, update the declaration URL and checksum, rerun the checks, and update `docs/compatibility.md`. Changes to the early-access API may require code changes.
