// Real isolated Workers/D1 integration; synthetic authorization only in this test bundle.
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const compiled=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`
import {GET,POST} from './app/api/admin/collections/route';
import {readCollectionNavigation,readHomepageCollectionFeatures,readCollectionBySlug} from './services/collections';
import {dokoSpecialsDraft} from './models/CatalogCollection';
import {seedProducts} from './data/products';
export default {async fetch(r){const p=new URL(r.url).pathname;if(p==='/fixture')return Response.json({collection:dokoSpecialsDraft,products:seedProducts});if(p==='/public')return Response.json({nav:await readCollectionNavigation(),features:await readHomepageCollectionFeatures(),page:await readCollectionBySlug(new URL(r.url).searchParams.get('slug')||'probe')});return r.method==='POST'?POST(r):GET(r);}};`},bundle:true,write:false,format:'esm',platform:'node',external:['cloudflare:workers','node:crypto'],plugins:[{name:'synthetic-auth',setup(b){b.onResolve({filter:/services\/adminAuth$/},()=>({path:'auth',namespace:'test-auth'}));b.onLoad({filter:/.*/,namespace:'test-auth'},()=>({contents:`export async function isAdmin(r){return r.headers.get('x-test-admin')==='yes'}`}));}}]});
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],script:compiled.outputFiles[0].text,d1Databases:['DB']});
try{
const db=await mf.getD1Database('DB');
const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
for(const m of journal.entries){const sql=await readFile(`drizzle/${m.tag}.sql`,'utf8');for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();}
const fixture=await (await mf.dispatchFetch('https://test.local/fixture')).json();
for(const p of fixture.products)await db.prepare('INSERT INTO products(id,sku,data) VALUES (?,?,?)').bind(p.id,p.sku,JSON.stringify(p)).run();
const productBefore=await db.prepare('SELECT data FROM products ORDER BY id').all();
const collection={...fixture.collection,id:'probe',slug:'probe',status:'draft',navigation_visible:true,featured_product_ids:[fixture.products[0].id]};
const assignment={collection_id:'probe',product_id:fixture.products[0].id,display_order:0,badge:'',description:''};
const post=(c,a=[assignment],admin=true,origin='https://test.local')=>mf.dispatchFetch('https://test.local/admin',{method:'POST',headers:{'content-type':'application/json','origin':origin,...(admin?{'x-test-admin':'yes'}:{})},body:JSON.stringify({action:'save',collection:c,assignments:a})});
const publicRead=async()=> (await mf.dispatchFetch('https://test.local/public?slug=probe')).json();
assert.equal((await post(collection,undefined,false)).status,403);
assert.equal((await post(collection,undefined,true,'https://other.example')).status,403);
assert.equal((await post(collection)).status,200);
assert.deepEqual((await publicRead()).nav,[]);assert.equal((await publicRead()).page,null);
collection.status='published';assert.equal((await post(collection)).status,200);
let visible=await publicRead();assert.equal(visible.nav[0].slug,'probe');assert.equal(visible.features.length,1);assert.equal(visible.page.products.length,1);
const earlier={...collection,id:'earlier',slug:'earlier',navigation_order:0,featured_product_ids:[]};
collection.navigation_order=10;assert.equal((await post(collection)).status,200);assert.equal((await post(earlier,[])).status,200);
assert.deepEqual((await publicRead()).nav.map(n=>n.id),['earlier','probe']);
collection.navigation_visible=false;assert.equal((await post(collection)).status,200);visible=await publicRead();assert.equal(visible.features.length,0);assert.equal(visible.nav.length,1);assert.equal(visible.page.products.length,1);
collection.navigation_visible=true;collection.slug='renamed';assert.equal((await post(collection)).status,200);assert.equal((await publicRead()).page.redirectedFrom,'probe');
assert.equal((await post({...collection,featured_product_ids:['missing']})).status,400);
assert.equal((await post({...collection,id:'collision'})).status,400);
assert.deepEqual((await db.prepare('SELECT data FROM products ORDER BY id').all()).results,productBefore.results);
console.log('PASS: isolated Workers/D1 collection API auth/origin, draft/publication, multiple-menu ordering, hidden navigation/highlights, assigned products, validation, redirects and product preservation.');
}finally{await mf.dispose();}
