import { database } from './repository';
import type { PartnerOrganization, PartnerSubmission } from '@/models/Partner';
import { normalizePartnerDraft } from '@/models/Partner';

type UserIdentity = { userId: string; email: string };
type MembershipRow = { id:string; partner_id:string; user_id:string|null; email:string; role:'owner'|'member'; membership_status:string; partner_status:string; name:string; slug:string; profile_data:string; created_at:string; updated_at:string };

export async function resolvePartner(identity: UserIdentity) {
  const db = database();
  let row = await db.prepare(`SELECT m.id,m.partner_id,m.user_id,m.email,m.role,m.status membership_status,p.status partner_status,p.name,p.slug,p.profile_data,p.created_at,p.updated_at FROM partner_memberships m JOIN partners p ON p.id=m.partner_id WHERE m.user_id=?`).bind(identity.userId).first<MembershipRow>();
  if (!row) {
    row = await db.prepare(`SELECT m.id,m.partner_id,m.user_id,m.email,m.role,m.status membership_status,p.status partner_status,p.name,p.slug,p.profile_data,p.created_at,p.updated_at FROM partner_memberships m JOIN partners p ON p.id=m.partner_id WHERE m.user_id IS NULL AND lower(m.email)=lower(?) AND m.status='invited'`).bind(identity.email).first<MembershipRow>();
    if (row) {
      await db.prepare(`UPDATE partner_memberships SET user_id=?,status='active',updated_at=? WHERE id=? AND user_id IS NULL`).bind(identity.userId,new Date().toISOString(),row.id).run();
      row = { ...row, user_id: identity.userId, membership_status: 'active' };
    }
  }
  if (!row || row.membership_status !== 'active' || row.partner_status !== 'active') return null;
  const partner: PartnerOrganization = { id:row.partner_id,name:row.name,slug:row.slug,status:'active',profile:JSON.parse(row.profile_data),created_at:row.created_at,updated_at:row.updated_at };
  return { partner, membership: { id:row.id,partner_id:row.partner_id,user_id:row.user_id,email:row.email,role:row.role,status:'active' as const } };
}

function submission(row: Record<string, unknown>): PartnerSubmission {
  return { id:String(row.id),partner_id:String(row.partner_id),partner_name:row.partner_name ? String(row.partner_name) : undefined,product_id:row.product_id ? String(row.product_id) : null,status:row.status as PartnerSubmission['status'],draft:normalizePartnerDraft(JSON.parse(String(row.draft_data))),partner_message:String(row.partner_message||''),admin_feedback:String(row.admin_feedback||''),created_at:String(row.created_at),updated_at:String(row.updated_at),submitted_at:row.submitted_at ? String(row.submitted_at) : null };
}
export async function readPartnerSubmissions(partnerId: string) {
  const rows = await database().prepare(`SELECT * FROM partner_product_submissions WHERE partner_id=? ORDER BY updated_at DESC`).bind(partnerId).all<Record<string,unknown>>();
  return rows.results.map(submission);
}
export async function readAdminPartnerData() {
  const db=database();
  const [p,s,m,c]=await Promise.all([
    db.prepare(`SELECT id,name,slug,status,profile_data,created_at,updated_at FROM partners ORDER BY name`).all<Record<string,unknown>>(),
    db.prepare(`SELECT s.*,p.name partner_name FROM partner_product_submissions s JOIN partners p ON p.id=s.partner_id ORDER BY s.updated_at DESC`).all<Record<string,unknown>>(),
    db.prepare(`SELECT id,partner_id,user_id,email,role,status,created_at,updated_at FROM partner_memberships ORDER BY created_at DESC`).all<Record<string,unknown>>(),
    db.prepare(`SELECT id,slug,data FROM catalog_collections WHERE status!='archived' ORDER BY navigation_order`).all<{id:string;slug:string;data:string}>(),
  ]);
  return { partners:p.results.map(x=>({...x,profile:JSON.parse(String(x.profile_data)),profile_data:undefined})), submissions:s.results.map(submission), memberships:m.results, collections:c.results.map(x=>({id:x.id,slug:x.slug,label:(JSON.parse(x.data) as {navigation_label?:string}).navigation_label||x.slug})) };
}
export async function audit(partnerId:string|null,submissionId:string|null,actorType:'partner'|'admin',actorId:string,action:string,metadata:Record<string,unknown>={}) {
  await database().prepare(`INSERT INTO partner_audit_log(id,partner_id,submission_id,actor_type,actor_id,action,metadata,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),partnerId,submissionId,actorType,actorId,action,JSON.stringify(metadata),new Date().toISOString()).run();
}
export async function consumePartnerRateLimit(key:string,limit=40,windowSeconds=60){
  const db=database(),now=Math.floor(Date.now()/1000),expires=now+windowSeconds;
  const row=await db.prepare(`SELECT count,expires_at FROM partner_rate_limits WHERE key=?`).bind(key).first<{count:number;expires_at:number}>();
  if(!row||row.expires_at<=now){await db.prepare(`INSERT INTO partner_rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=1,expires_at=excluded.expires_at`).bind(key,expires).run();return;}
  if(row.count>=limit)throw new Error('Too many requests. Please wait and try again.');
  await db.prepare(`UPDATE partner_rate_limits SET count=count+1 WHERE key=? AND expires_at>?`).bind(key,now).run();
}
export function parsePartnerCsv(text:string) {
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  if(lines.length<2) throw new Error('CSV must include a header and at least one product row.');
  const split=(line:string)=>{const out:string[]=[];let value='';let quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'&&quoted&&line[i+1]==='"'){value+='"';i++;}else if(ch==='"')quoted=!quoted;else if(ch===','&&!quoted){out.push(value.trim());value='';}else value+=ch;}out.push(value.trim());return out;};
  const headers=split(lines[0]).map(x=>x.toLowerCase().replaceAll(' ','_'));
  return lines.slice(1,101).map(line=>{const values=split(line);const raw=Object.fromEntries(headers.map((h,i)=>[h,values[i]||'']));const draft=normalizePartnerDraft({...raw,partner_sku:raw.partner_sku||raw.sku,source:'csv'});draft.uncertain_fields=['name','category','brand','package_size'].filter(k=>!draft[k as keyof typeof draft]);return draft;});
}
