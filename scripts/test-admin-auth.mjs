import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { pbkdf2Sync } from 'node:crypto';
import assert from 'node:assert/strict';
const salt = Buffer.alloc(16, 9);
const password = 'test-only-$-unicode-नेपाली';
const hash = `pbkdf2$150000$${salt.toString('base64url')}$${pbkdf2Sync(password,salt,150000,32,'sha256').toString('base64url')}`;
const compiled = await build({stdin:{contents:`import {deriveCompatiblePassword} from './services/adminCredentials'; import {authenticatePassword, adminAuthDiagnostics} from './services/adminAuth'; export default {async fetch(request){ if(new URL(request.url).pathname==='/compat') return Response.json({matches:deriveCompatiblePassword('test-only-$-unicode-नेपाली',new Uint8Array(16).fill(9),150000).toString('base64url') === '${hash.split('$')[3]}'}); if(request.method==='GET') return Response.json(adminAuthDiagnostics()); const {username,password}=await request.json(); try {return Response.json({ok: Boolean(await authenticatePassword(username,password))})}catch{return Response.json({configurationError:true},{status:503})}}}`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',external:['cloudflare:workers','node:crypto'],plugins:[{name:'request-context',setup(b){b.onResolve({filter:/next\/headers|chatgpt-auth/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export async function headers(){return new Headers()} export async function getChatGPTUser(){return null}'}))}}]});
async function run(bindings, check) {
 const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],script:compiled.outputFiles[0].text,bindings});
 try {await check(mf)} finally {await mf.dispose()}
}
const bindings={ADMIN_LOGIN_USERNAME:' "admin" ',ADMIN_LOGIN_PASSWORD_HASH:` '${hash}' `,ADMIN_SESSION_SECRET:'s'.repeat(40)};
await run(bindings,async mf=>{
 assert.equal((await (await mf.dispatchFetch('https://test.local/compat')).json()).matches,true);
 assert.deepEqual(await (await mf.dispatchFetch('https://test.local')).json(),{usernameConfigured:true,passwordHashConfigured:true,sessionSecretConfigured:true,hashStartsWithPbkdf2:true});
 for(const [name,pw,ok] of [['admin',password,true],['wrong',password,false],['admin','wrong',false]]){
 const r=await mf.dispatchFetch('https://test.local',{method:'POST',body:JSON.stringify({username:name,password:pw})});assert.equal((await r.json()).ok,ok);
 }
});
await run({...bindings,ADMIN_SESSION_SECRET:'short'},async mf=>{const r=await mf.dispatchFetch('https://test.local',{method:'POST',body:JSON.stringify({username:'admin',password})});assert.equal(r.status,503)});
console.log('PASS: Workers runtime accepts generator hash, rejects wrong credentials, normalizes copied configuration, reports only four booleans, and identifies invalid session configuration.');

