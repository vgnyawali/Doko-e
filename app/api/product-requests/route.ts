import { database } from '@/services/repository';
import { submitProductRequest } from '@/services/productRequests';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Invalid origin.'}, {status:403});
  if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({error:'JSON required.'}, {status:415});
  try {
    const raw = await request.text();
    if (raw.length > 4000) return Response.json({error:'Request too long.'}, {status:413});
    const body = JSON.parse(raw);
    if (body.website) return Response.json({error:'Unable to submit this request.'}, {status:400});
    const accepted = await submitProductRequest(database(), body.request_text, request.headers.get('cf-connecting-ip') || '');
    if (!accepted) return Response.json({error:'Please wait before sending more requests. Try again in an hour.'}, {status:429, headers:{'Retry-After':'3600'}});
    return Response.json({success:true}, {status:201, headers:{'Cache-Control':'no-store'}});
  } catch (e) {
    const message = e instanceof Error && e.message.startsWith('Please enter') ? e.message : 'Unable to save your request. Please try again.';
    return Response.json({error:message}, {status:400});
  }
}
