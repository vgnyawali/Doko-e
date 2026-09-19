import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
await mkdir('work', { recursive: true });
for (const [entry, name] of [
  ['tests/product-requests.test.ts', 'product-requests'],
  ['tests/customer-export.test.ts', 'customer-export'],
  ['tests/email.test.ts', 'email'],
  ['tests/fulfillment.test.ts', 'fulfillment'],
  ['tests/confirmation.test.ts', 'confirmation'],
  ['tests/tax.test.ts', 'tax'],
  ['modules/checkout/checkout.test.ts', 'checkout'],
  ['tests/domain.test.ts', 'domain'],
]) {
  await build({
    entryPoints: [entry],
    outfile: `work/${name}.test.mjs`,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
  });
  const result = spawnSync(
    process.execPath,
    ['--test', `work/${name}.test.mjs`],
    { stdio: 'inherit' },
  );
  if (result.status) process.exit(result.status);
}
