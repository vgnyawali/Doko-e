import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
await build({entryPoints:['modules/checkout/checkout.test.ts'],outfile:'work/checkout.test.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
const result=spawnSync(process.execPath,['--test','work/checkout.test.mjs'],{stdio:'inherit'});
process.exit(result.status??1);
