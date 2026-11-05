import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { cleanRequestText } from '@/models/ProductRequest';
import { submitProductRequest, listProductRequests, mutateProductRequest } from '@/services/productRequests';
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync('drizzle/0005_luxuriant_gertrude_yorkes.sql', 'utf8'));
  const db = {prepare(query:string) {return {bind(...args:any[]) {return {
    async first() {return sql.prepare(query).get(...args) || null;},
    async run() {return sql.prepare(query).run(...args);},
    async all() {return {results:sql.prepare(query).all(...args)};},
  };}, async first() {return sql.prepare(query).get() || null;}};}} as unknown as D1Database;
  return {db, sql};
}
test('request validation trims, removes controls, preserves Nepali and rejects invalid lengths', () => {
  assert.equal(cleanRequestText('  नेपाली चिया\u0000  '), 'नेपाली चिया');
  for (const value of ['', '   ', 'a', 'a'.repeat(501), null]) assert.throws(() => cleanRequestText(value));
  assert.equal(cleanRequestText('a'.repeat(500)).length, 500);
});
test('requests persist with defaults; durable limiter blocks sixth submission and resets after an hour', async () => {
  const {db, sql} = fixture();
  for (let i = 0; i < 5; i++) assert.equal(await submitProductRequest(db, 'Puja items', 'test-ip', 1000), true);
  assert.equal(await submitProductRequest(db, 'Tea', 'test-ip', 1001), false);
  assert.equal(await submitProductRequest(db, 'Tea', 'test-ip', 3601000), true);
  const row = sql.prepare('SELECT * FROM product_requests LIMIT 1').get();
  assert.equal(row?.status, 'new'); assert.equal(row?.source_page, 'homepage'); assert.equal(row?.customer_email, null);
  assert.notEqual(sql.prepare('SELECT key FROM product_request_limits').get()?.key, 'test-ip');
  sql.close();
});
test('admin search, status filters, ordering, notes, counts and deletion use persistent records', async () => {
  const {db, sql} = fixture();
  await submitProductRequest(db, 'Tea', 'test-ip', 1000);
  await submitProductRequest(db, 'Puja items', 'test-ip', 2000);
  let result = await listProductRequests(db, new URL('https://doko.test/api'));
  assert.equal(result.new_count, 2); assert.equal(result.requests[0].request_text, 'Puja items');
  const id = result.requests[0].id;
  await mutateProductRequest(db, {action:'update', id, status:'planned', admin_notes:'  Contact supplier  '});
  result = await listProductRequests(db, new URL('https://doko.test/api?status=planned&search=supplier'));
  assert.equal(result.total, 1); assert.equal(result.new_count, 1); assert.equal(result.requests[0].admin_notes, 'Contact supplier');
  result = await listProductRequests(db, new URL('https://doko.test/api?sort=oldest'));
  assert.equal(result.requests[0].request_text, 'Tea');
  await assert.rejects(mutateProductRequest(db, {action:'update', id, status:'invalid', admin_notes:''}));
  await mutateProductRequest(db, {action:'delete', id});
  assert.equal((await listProductRequests(db, new URL('https://doko.test/api'))).total, 1);
  sql.close();
});
