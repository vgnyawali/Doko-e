import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('work', { recursive: true });
await build({
  entryPoints: ['tests/domain.test.ts'],
  outfile: 'work/domain.test.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
});
const result = spawnSync(process.execPath, ['--test', 'work/domain.test.mjs'], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
