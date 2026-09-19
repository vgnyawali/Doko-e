import { isAdmin } from '@/services/adminAuth';
import { database } from '@/services/repository';
import { listProductRequests, mutateProductRequest } from '@/services/productRequests';
export async function GET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({error:'Admin access required'}, {status:403});
  try { return Response.json(await listProductRequests(database(), new URL(request.url)), {headers:{'Cache-Control':'no-store'}}); }
  catch { return Response.json({error:'Unable to load product requests.'}, {status:500}); }
}
export async function POST(request: Request) {
  if (!(await isAdmin(request))) return Response.json({error:'Admin access required'}, {status:403});
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Invalid origin'}, {status:403});
  try {
    const text = await request.text();
    if (text.length > 16000) throw Error('Request too long.');
    await mutateProductRequest(database(), JSON.parse(text));
    return Response.json({success:true}, {headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'Unable to save changes. Check the status and notes and try again.'}, {status:400}); }
}
