import { spawnSync } from 'node:child_process';
// Portable across POSIX and Windows; no shell and no global setting changes.
const result = spawnSync(
  process.env.CLAUDE_BIN || 'claude',
  process.argv.slice(2),
  {
    stdio: 'inherit',
    env: { ...process.env, CLAUDE_CODE_ENABLE_FUNCTION_HOOKS: '1' },
    timeout: 120_000,
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
