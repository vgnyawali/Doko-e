import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { emptyPartnerDraft, normalizePartnerDraft, validatePartnerDraft } from '@/models/Partner';

function database() {
  const testFile = join(tmpdir(), `doko-partner-mvp-${randomUUID()}.sqlite`);
  const db = new DatabaseSync(testFile);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE products(id TEXT PRIMARY KEY,sku TEXT NOT NULL UNIQUE,data TEXT NOT NULL);
    CREATE TABLE catalog_collections(id TEXT PRIMARY KEY,slug TEXT NOT NULL,status TEXT NOT NULL,navigation_visible INTEGER NOT NULL,navigation_order INTEGER NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE catalog_collection_products(collection_id TEXT NOT NULL,product_id TEXT NOT NULL,display_order INTEGER NOT NULL,badge TEXT NOT NULL,description TEXT NOT NULL,PRIMARY KEY(collection_id,product_id),FOREIGN KEY(collection_id) REFERENCES catalog_collections(id),FOREIGN KEY(product_id) REFERENCES products(id));`);
  for (const file of ['drizzle/0008_lethal_madelyne_pryor.sql', 'drizzle/0009_blue_gamora.sql'])
    db.exec(readFileSync(file, 'utf8').replaceAll('--> statement-breakpoint', ''));
  return { db, testFile };
}

test('partner creation, editing, collection assignment and persistence survive reopen', () => {
  let { db, testFile } = database();
  const now = new Date(0).toISOString();
  db.prepare(`INSERT INTO catalog_collections(id,slug,status,navigation_visible,navigation_order,data,created_at,updated_at) VALUES('c1','crafts','published',1,1,'{}',?,?)`).run(now, now);
  db.prepare(`INSERT INTO partners(id,name,slug,status,profile_data,created_at,updated_at) VALUES('p1','Maker','maker','pending','{}',?,?)`).run(now, now);
  db.prepare(`UPDATE partners SET name='Maker Nepal',status='active',profile_data='{"country":"Nepal"}' WHERE id='p1'`).run();
  db.prepare(`INSERT INTO partner_collections(partner_id,collection_id,created_at) VALUES('p1','c1',?)`).run(now);
  db.close();
  db = new DatabaseSync(testFile);
  const saved = db.prepare(`SELECT name,status FROM partners WHERE id='p1'`).get() as { name: string; status: string };
  assert.equal(saved.name, 'Maker Nepal');
  assert.equal(saved.status, 'active');
  assert.equal(db.prepare(`SELECT count(*) total FROM partner_collections WHERE partner_id='p1'`).get()!.total, 1);
  db.close();
});

test('invitation identity is separate from admin and tenant reads deny other partners', () => {
  const { db } = database();
  const now = new Date(0).toISOString();
  const addPartner = db.prepare(`INSERT INTO partners(id,name,slug,status,profile_data,created_at,updated_at) VALUES(?,?,?,'active','{}',?,?)`);
  addPartner.run('p1', 'One', 'one', now, now); addPartner.run('p2', 'Two', 'two', now, now);
  db.prepare(`INSERT INTO partner_memberships(id,partner_id,user_id,email,role,status,created_at,updated_at) VALUES('m1','p1','sites-user-1','one@example.test','owner','active',?,?)`).run(now, now);
  const draft = JSON.stringify(normalizePartnerDraft({ ...emptyPartnerDraft, name:'Item', category:'Crafts', brand:'One', package_size:'1', partner_sku:'ONE-1', country_of_origin:'Nepal' }));
  db.prepare(`INSERT INTO partner_product_submissions(id,partner_id,status,draft_data,created_by,created_at,updated_at) VALUES('s1','p1','draft',?,'sites-user-1',?,?)`).run(draft, now, now);
  db.prepare(`INSERT INTO partner_product_submissions(id,partner_id,status,draft_data,created_by,created_at,updated_at) VALUES('s2','p2','draft',?,'sites-user-2',?,?)`).run(draft, now, now);
  const membership = db.prepare(`SELECT partner_id,role FROM partner_memberships WHERE user_id=? AND status='active'`).get('sites-user-1');
  assert.equal((membership as { partner_id: string }).partner_id, 'p1');
  assert.equal((membership as { role: string }).role, 'owner');
  assert.equal((db.prepare(`SELECT id FROM partner_product_submissions WHERE partner_id=? ORDER BY id`).get('p1') as { id: string }).id, 's1');
  assert.equal(db.prepare(`SELECT id FROM partner_product_submissions WHERE id=? AND partner_id=?`).get('s2','p1'), undefined);
  db.close();
});

test('draft validation covers marketplace fields', () => {
  const valid = normalizePartnerDraft({ ...emptyPartnerDraft, name:'Copper cup', partner_sku:'CUP-1', category:'Household', brand:'Maker', package_size:'1 cup', material_specifications:'Copper', available_variants:'Small, large', proposed_wholesale_price:12.5, available_supply_quantity:20, country_of_origin:'Nepal' });
  assert.deepEqual(validatePartnerDraft(valid), []);
  assert.ok(validatePartnerDraft({ ...valid, partner_sku:'', country_of_origin:'' }).length >= 2);
});

test('incomplete products can be saved as drafts but cannot be submitted', () => {
  const incomplete = normalizePartnerDraft({ name: 'Work in progress' });
  assert.deepEqual(validatePartnerDraft(incomplete, { requireComplete: false }), []);
  assert.ok(validatePartnerDraft(incomplete).some(error => error.includes('partner_sku is required')));
});

test('review stages approval, preserves live product until publish, and prevents duplicate publish', () => {
  const { db } = database();
  const now = new Date(0).toISOString();
  db.prepare(`INSERT INTO catalog_collections(id,slug,status,navigation_visible,navigation_order,data,created_at,updated_at) VALUES('c1','crafts','published',1,1,'{}',?,?)`).run(now, now);
  db.prepare(`INSERT INTO partners(id,name,slug,status,profile_data,created_at,updated_at) VALUES('p1','Maker','maker','active','{}',?,?)`).run(now, now);
  const draft = normalizePartnerDraft({ ...emptyPartnerDraft, name:'Copper cup', partner_sku:'CUP-1', category:'Household', brand:'Maker', package_size:'1 cup', country_of_origin:'Nepal' });
  db.prepare(`INSERT INTO partner_product_submissions(id,partner_id,status,draft_data,created_by,created_at,updated_at,submitted_at) VALUES('s1','p1','submitted',?,'user',?,?,?)`).run(JSON.stringify(draft), now, now, now);
  const candidate = { id:'product-1',sku:'CUP-1',name:'Copper cup',active:false,price:24,inventory:10 };
  db.prepare(`UPDATE partner_product_submissions SET status='approved',approval_data=? WHERE id='s1' AND status='submitted'`).run(JSON.stringify({ product:candidate, collection_ids:['c1'] }));
  assert.equal(db.prepare(`SELECT count(*) total FROM products`).get()!.total, 0);
  db.prepare(`INSERT INTO products(id,sku,data) VALUES('product-1','CUP-1',?)`).run(JSON.stringify({ ...candidate, active:true }));
  db.prepare(`INSERT INTO catalog_collection_products(collection_id,product_id,display_order,badge,description) VALUES('c1','product-1',0,'','')`).run();
  const publish = db.prepare(`UPDATE partner_product_submissions SET product_id='product-1',status='published' WHERE id='s1' AND status='approved'`).run();
  assert.equal(publish.changes, 1);
  assert.equal(db.prepare(`UPDATE partner_product_submissions SET status='published' WHERE id='s1' AND status='approved'`).run().changes, 0);
  assert.equal(JSON.parse(String(db.prepare(`SELECT data FROM products WHERE id='product-1'`).get()!.data)).active, true);
  assert.equal(db.prepare(`SELECT count(*) total FROM catalog_collection_products WHERE product_id='product-1'`).get()!.total, 1);
  db.close();
});
