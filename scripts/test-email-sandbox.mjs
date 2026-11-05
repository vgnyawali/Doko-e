// Isolated Workers/D1 test. All provider traffic is intercepted; no real mail or payments.
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
const compiled = await build({
  stdin:{contents:`import {POST} from './app/api/checkout/webhook/route'; export default {fetch:POST};`,resolveDir:process.cwd(),loader:'ts'},
  bundle:true,write:false,format:'esm',platform:'node',external:['cloudflare:workers','node:crypto'],
});
const secret='isolated-webhook-secret';
const requests=[];
let rejectProvider=true;
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],script:compiled.outputFiles[0].text,
  d1Databases:['DB'],bindings:{STRIPE_WEBHOOK_SECRET:secret,ORDER_EMAIL_ENABLED:'true',RESEND_API_KEY:'test-only-not-real',ORDER_EMAIL_FROM:'Doko <order@doko-e.com>'},
  outboundService:async(request)=>{
    assert.equal(request.url,'https://api.resend.com/emails');
    const payload=await request.json();
    assert.deepEqual(payload.to,['delivered@resend.dev']);
    requests.push({payload,key:request.headers.get('Idempotency-Key')});
    return rejectProvider ? new Response('synthetic provider failure',{status:503}) : Response.json({id:'isolated-test-email'});
  },
});
try {
  const db=await mf.getD1Database('DB');
  await db.prepare('CREATE TABLE checkout_orders (id TEXT PRIMARY KEY, session_id TEXT, status TEXT, data TEXT, payment_data TEXT)').run();
  const data={customer:{name:'Controlled test',email:'controlled@example.com',address:'Test street',city:'Boston',state:'MA',zip:'02108',country:'US'},quote:{fulfillment_method:'shipping',subtotal:20,items:[{product_id:'probe',name:'Synthetic product',quantity:2,unit_price:10,line_total:20,tax_lines:[]}]}};
  await db.prepare('INSERT INTO checkout_orders VALUES (?,?,?,?,?)').bind('sandbox-order','cs_test_isolated','pending',JSON.stringify(data),null).run();
  const event=(type,payment_status='paid')=>({type,created:Math.floor(Date.now()/1000),data:{object:{id:'cs_test_isolated',metadata:{doko_order_id:'sandbox-order'},payment_status,currency:'usd',amount_subtotal:2000,amount_total:2500,total_details:{amount_tax:0,amount_shipping:500},customer_details:{email:'controlled@example.com'}}}});
  const dispatch=async(value,valid=true)=>{
    const raw=JSON.stringify(value),ts=Math.floor(Date.now()/1000);
    const signature=createHmac('sha256',secret).update(`${ts}.${raw}`).digest('hex');
    return mf.dispatchFetch('https://sandbox.local/api/checkout/webhook',{method:'POST',headers:{'stripe-signature':valid?`t=${ts},v1=${signature}`:'invalid'},body:raw});
  };
  assert.equal((await dispatch(event('checkout.session.completed'),false)).status,400);
  assert.equal(requests.length,0);
  for(const type of ['checkout.session.completed','checkout.session.async_payment_failed','checkout.session.expired']) {
    assert.equal((await dispatch(event(type,'unpaid'))).status,200);
    assert.equal(requests.length,0);
  }
  const success=event('checkout.session.async_payment_succeeded');
  assert.equal((await dispatch(success)).status,500);
  assert.equal((await db.prepare('SELECT status FROM checkout_orders').first()).status,'paid');
  rejectProvider=false;
  assert.equal((await dispatch(success)).status,200);
  assert.deepEqual(requests[0],requests[1]);
  assert.equal(requests[1].key,'doko-order/sandbox-order');
  assert.ok(requests[1].payload.text.includes('Total paid: $25.00'));
  assert.equal((await dispatch(success)).status,200);
  assert.equal(requests.length,2);
  const saved=JSON.parse((await db.prepare('SELECT data FROM checkout_orders').first()).data);
  assert.ok(saved.confirmation_email_test_sent_at);
  assert.equal(saved.confirmation_email_sent_at,undefined);
  assert.equal((await dispatch(event('checkout.session.expired','unpaid'))).status,200);
  assert.equal((await db.prepare('SELECT status FROM checkout_orders').first()).status,'paid');
  console.log('PASS: isolated signed webhook → D1 paid order → intercepted Resend test-sink request; invalid/unpaid/failed/expired events do not send; retry is identical, replay is deduplicated, and payment remains paid. No network email or payment performed.');
} finally { await mf.dispose(); }
