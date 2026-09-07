import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteCheckout, type CheckoutRequest } from './quote';
import { createPaymentSession } from './payment';
import { seedProducts } from '@/data/products';
import { defaultSettings } from '@/config/defaults';
const request: CheckoutRequest = { items: [{product_id:'P001',quantity:2}], customer: {name:'Test Shopper',email:'test@example.com',address:'123 Test Street',city:'Example',state:'NY',zip:'10001',country:'US'} };
test('checkout uses catalog price and leaves unconfigured totals unknown', () => {
  const quote=quoteCheckout(request,seedProducts,defaultSettings);
  assert.equal(quote.subtotal,37.98);assert.equal(quote.shipping,null);assert.equal(quote.tax,null);assert.equal(quote.total,null);
  assert.equal(quoteCheckout({...request,items:[{product_id:'P001',quantity:4}]},seedProducts,defaultSettings).shipping,0);
});
test('checkout rejects stale, invalid and non-shippable baskets',()=>{
  for(const items of [[],[{product_id:'P001',quantity:31}],[{product_id:'P001',quantity:-1}],[{product_id:'P001',quantity:1.5}],[{product_id:'missing',quantity:1}],request.items.concat(request.items)])assert.throws(()=>quoteCheckout({...request,items},seedProducts,defaultSettings));
  assert.throws(()=>quoteCheckout(request,seedProducts.map(p=>({...p,active:false})),defaultSettings));
  assert.throws(()=>quoteCheckout(request,seedProducts.map(p=>({...p,shipping_type:'pickup_only'})),defaultSettings));
});
test('checkout validates shipping and contact details',()=>{
  for(const change of [{email:'invalid'},{country:'CA'},{state:'XX'},{zip:'abc'},{name:''}])assert.throws(()=>quoteCheckout({...request,customer:{...request.customer,...change}},seedProducts,defaultSettings));
});
test('payment placeholder never claims payment or order success',()=>{
  const session=createPaymentSession();assert.equal(session.status,'not_configured');assert.equal(session.payment_processed,false);assert.equal(session.order_created,false);assert.equal(session.checkout_url,null);
});
