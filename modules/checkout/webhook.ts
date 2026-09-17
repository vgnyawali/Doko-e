import { createHmac, timingSafeEqual } from 'node:crypto';
// Verify the raw body and timestamp before trusting a payment event.
export function validStripeSignature(raw:string,header:string,secret:string,now=Date.now()){
 const fields=header.split(',').map(v=>v.trim().split('='));
 const timestamp=fields.find(([k])=>k==='t')?.[1];
 if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300)return false;
 const expected=createHmac('sha256',secret.trim()).update(`${timestamp}.${raw}`).digest();
 return fields.some(([k,v])=>k==='v1'&&/^[a-f0-9]{64}$/i.test(v||'')&&timingSafeEqual(expected,Buffer.from(v,'hex')));
}
