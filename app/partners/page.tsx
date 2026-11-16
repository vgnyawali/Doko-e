import { requireChatGPTUser, chatGPTSignOutPath } from '@/app/chatgpt-auth';
import PartnerDashboard from '@/modules/partners/PartnerDashboard';
import { resolvePartner } from '@/services/partnerPortal';
export const dynamic='force-dynamic';
export default async function PartnerPage(){
  const user=await requireChatGPTUser('/partners');
  const access=await resolvePartner(user);
  if(!access)return <main className="partner-shell"><h1>Doko Partner Portal</h1><p>Your account is not connected to an active Doko partner organization.</p><p>Ask Doko to invite <strong>{user.email}</strong>, or contact Doko if approval is pending.</p><a href="/">Return to Doko</a></main>;
  return <PartnerDashboard initialPartner={access.partner} signOutUrl={chatGPTSignOutPath('/partners')}/>;
}
