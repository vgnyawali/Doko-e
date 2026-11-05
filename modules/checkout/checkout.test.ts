import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { quoteCheckout, type CheckoutRequest } from './quote';
import { createPaymentSession, paymentReady, sessionParameters } from './payment';
import { validStripeSignature } from './webhook';
import { seedProducts } from '@/data/products';
import { defaultSettings } from '@/config/defaults';
const request: CheckoutRequest = {items:[{product_id:'P001',quantity:2}],customer:{name:'Test',email:'test@example.com',address:'123 Test Street',city:'Example',state:'NY',zip:'10001',country:'US'}};
const config={STRIPE_SECRET_KEY:'sk_test_example',STRIPE_WEBHOOK_SECRET:'whsec_example',STRIPE_SHIPPING_RATE_ID:'shr_example'};
test('basket uses catalog prices and rejects invalid and stale items',()=>{
 assert.equal(quoteCheckout(request,seedProducts,defaultSettings).subtotal,37.98);
 for(const items of [[],[{product_id:'P001',quantity:31}],[{product_id:'P001',quantity:-1}],[{product_id:'missing',quantity:1}],request.items.concat(request.items)])assert.throws(()=>quoteCheckout({...request,items},seedProducts,defaultSettings));
 assert.throws(()=>quoteCheckout(request,seedProducts.map(p=>({...p,active:false})),defaultSettings));
 assert.throws(()=>quoteCheckout(request,seedProducts.map(p=>({...p,price:NaN})),defaultSettings));
});
test('session transfers quantities, cents, shipping and tax configuration',()=>{
 const quote=quoteCheckout(request,seedProducts,defaultSettings);
 assert.equal(paymentReady({},quote),false);
 assert.equal(paymentReady({...config,STRIPE_SHIPPING_RATE_ID:''},quote),false);
 const body=sessionParameters(quote,request.customer,'https://doko-e.com','order',config);
 assert.equal(body.get('line_items[0][quantity]'),'2');assert.equal(body.get('line_items[0][price_data][unit_amount]'),'1899');
 assert.equal(body.get('shipping_options[0][shipping_rate]'),'shr_example');assert.equal(body.get('automatic_tax[enabled]'),'true');
 const free=sessionParameters({...quote,shipping:0},request.customer,'https://doko-e.com','order',config);
 assert.equal(free.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'),'0');
});
test('Stripe requests use idempotency and do not expose upstream errors',async()=>{
 const send:typeof fetch=async(_url,init)=>{assert.equal((init?.headers as Record<string,string>)['Idempotency-Key'],'order');return Response.json({id:'cs_test_example',url:'https://checkout.stripe.com/c/pay/example'});};
 assert.equal((await createPaymentSession(new URLSearchParams(),config.STRIPE_SECRET_KEY,'order',send)).id,'cs_test_example');
 await assert.rejects(createPaymentSession(new URLSearchParams(),'key','order',async()=>new Response('private upstream detail',{status:401})),/Unable to start secure payment/);
});
test('webhook rejects tampering, stale events and missing signatures',()=>{
 const raw='{"type":"checkout.session.completed"}',now=Date.now(),t=Math.floor(now/1000);
 const signature=createHmac('sha256',config.STRIPE_WEBHOOK_SECRET).update(`${t}.${raw}`).digest('hex');
 const header=`t=${t},v1=${signature}`;
 assert.equal(validStripeSignature(raw,header,config.STRIPE_WEBHOOK_SECRET,now),true);
 assert.equal(validStripeSignature(raw+' ',header,config.STRIPE_WEBHOOK_SECRET,now),false);
 assert.equal(validStripeSignature(raw,header,config.STRIPE_WEBHOOK_SECRET,now+301000),false);
 assert.equal(validStripeSignature(raw,'',config.STRIPE_WEBHOOK_SECRET,now),false);
});
