import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { sendOrderConfirmation } from '@/modules/email/confirmation';
import { quoteCheckout } from '@/modules/checkout/quote';
import { seedProducts } from '@/data/products';
import { defaultSettings } from '@/config/defaults';

const config = { ORDER_EMAIL_ENABLED: 'true', RESEND_API_KEY: 'test-only', ORDER_EMAIL_FROM: 'Doko <order@doko-e.com>' };
function fixture(session = 'cs_live_fixture', status = 'paid') {
  const sql = new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE checkout_orders (id TEXT PRIMARY KEY, session_id TEXT, status TEXT, data TEXT, payment_data TEXT)');
  const customer = { name: 'Test', email: 'customer@example.com', address: 'Test street', city: 'Boston', state: 'MA', zip: '02108', country: 'US' };
  const quote = quoteCheckout({ items: [{ product_id: seedProducts[0].id, quantity: 1 }], customer }, seedProducts, defaultSettings);
  quote.items[0].name = '<script>bad</script>';
  sql.prepare('INSERT INTO checkout_orders VALUES (?, ?, ?, ?, ?)').run('email-fixture', session, status, JSON.stringify({quote, customer}), JSON.stringify({session_id: session, payment_status: 'paid', currency: 'usd', amount_total: 2000, amount_tax: 0, amount_shipping: 200, amount_subtotal: 1800}));
  // Exercise real SQLite JSON conditions and leases with a minimal D1 adapter.
  const db = { prepare(query: string) { return { bind(...args: any[]) { return {
    async first() { return sql.prepare(query).get(...args) || null; },
    async run() { return sql.prepare(query).run(...args); },
  }; } }; } } as unknown as D1Database;
  const data = () => JSON.parse((sql.prepare('SELECT data FROM checkout_orders').get() as {data:string}).data);
  return {db, sql, data, session};
}
test('only a verified paid order sends; configuration and session matching fail closed', async () => {
  const f = fixture('cs_live_fixture', 'pending');
  let calls = 0;
  const send = (async () => { calls++; return Response.json({id:'email-id'}); }) as typeof fetch;
  await sendOrderConfirmation(f.db, 'email-fixture', f.session, {}, send);
  await assert.rejects(sendOrderConfirmation(f.db, 'email-fixture', f.session, config, send));
  await assert.rejects(sendOrderConfirmation(f.db, 'email-fixture', 'cs_live_other', config, send));
  assert.equal(calls, 0);
  f.sql.close();
});
test('accepted live mail is escaped, contains receipt totals, and duplicate events do not resend', async () => {
  const f = fixture(); let calls = 0;
  const send = (async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.to, ['customer@example.com']);
    assert.equal(body.reply_to, 'order@doko-e.com');
    assert.match(body.html, /&lt;script&gt;/);
    assert.doesNotMatch(body.html, /<script>/);
    assert.match(body.text, /Total paid: \$20.00/);
    assert.equal((init?.headers as Record<string,string>)['Idempotency-Key'], 'doko-order/email-fixture');
    return Response.json({id:'email-id'});
  }) as typeof fetch;
  await sendOrderConfirmation(f.db, 'email-fixture', f.session, config, send);
  await sendOrderConfirmation(f.db, 'email-fixture', f.session, config, send);
  assert.equal(calls, 1);
  assert.ok(f.data().confirmation_email_sent_at);
  f.sql.close();
});
test('provider failure keeps paid state, retries identical payload, and sandbox never emails customer', async () => {
  const f = fixture('cs_test_fixture'); const bodies: string[] = [];
  const send = (async (_url, init) => {
    bodies.push(String(init?.body));
    return bodies.length === 1 ? new Response('', {status:503}) : Response.json({id:'test-email'});
  }) as typeof fetch;
  await assert.rejects(sendOrderConfirmation(f.db, 'email-fixture', f.session, config, send, 100000));
  assert.equal(f.data().confirmation_email_sent_at, undefined);
  assert.equal((f.sql.prepare('SELECT status FROM checkout_orders').get() as {status:string}).status, 'paid');
  await sendOrderConfirmation(f.db, 'email-fixture', f.session, config, send, 100001);
  assert.equal(bodies[0], bodies[1]);
  assert.deepEqual(JSON.parse(bodies[1]).to, ['delivered@resend.dev']);
  assert.ok(f.data().confirmation_email_test_sent_at);
  assert.equal(f.data().confirmation_email_sent_at, undefined);
  f.sql.close();
});
test('concurrent webhook delivery is leased and uncertain attempts stop before deduplication expiry', async () => {
  const f = fixture(); let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let entered!: () => void; const started = new Promise<void>(resolve => { entered = resolve; });
  const send = (async () => { entered(); await gate; return new Response('', {status:503}); }) as typeof fetch;
  const first = sendOrderConfirmation(f.db, 'email-fixture', f.session, config, send, 100000);
  await started;
  await assert.rejects(sendOrderConfirmation(f.db, 'email-fixture', f.session, config, send, 100001), /in progress/);
  release(); await assert.rejects(first);
  await assert.rejects(sendOrderConfirmation(f.db, 'email-fixture', f.session, config, send, 100000 + 23*3600000), /manual review/);
  f.sql.close();
});
