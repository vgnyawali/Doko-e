import { redirect } from 'next/navigation';
import PartnerDashboard from '@/modules/partners/PartnerDashboard';
import { resolvePartnerAccount } from '@/services/partnerPortal';
export const dynamic = 'force-dynamic';
export default async function PartnerPage() {
  const access = await resolvePartnerAccount();
  if (!access) redirect('/partners/login');
  return (
    <PartnerDashboard
      initialPartner={access.partner}
      signOutUrl="/api/partner/auth/logout"
    />
  );
}
