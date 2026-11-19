export interface PartnerInvitationEmailConfig {
  RESEND_API_KEY?: string;
  ORDER_EMAIL_FROM?: string;
  PARTNER_EMAIL_FROM?: string;
  PARTNER_INVITE_EMAIL_ENABLED?: string;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

export function partnerInvitationEmail(
  email: string,
  partnerName: string,
  role: 'owner' | 'member',
  invitationUrl: string,
  from: string,
) {
  const text = [
    `You have been invited to the Doko Partner Marketplace for ${partnerName}.`,
    '',
    `Access level: ${role}`,
    `Create your password: ${invitationUrl}`,
    '',
    `This invitation is for ${email}. Create a password before the link expires.`,
    'Partners can prepare and submit products for review. Only Doko administrators can publish products.',
    '',
    'Questions? Contact order@doko-e.com.',
  ].join('\n');
  return {
    from,
    to: [email],
    reply_to: 'order@doko-e.com',
    subject: `Your Doko partner invitation — ${partnerName}`,
    text,
    html: `<div style="background:#fff;color:#302323;font:16px/1.7 Arial,sans-serif;max-width:640px;margin:auto;padding:28px;border-top:5px solid #801f32"><h1 style="color:#801f32">You’re invited to Doko</h1><p>You have been invited to the Doko Partner Marketplace for <strong>${escapeHtml(partnerName)}</strong>.</p><p>Access level: ${escapeHtml(role)}</p><p><a style="display:inline-block;background:#801f32;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px" href="${escapeHtml(invitationUrl)}">Create Password</a></p><p>This invitation is for <strong>${escapeHtml(email)}</strong>. Create a password before the link expires.</p><p>Partners can prepare and submit products for review. Only Doko administrators can publish products.</p><p>Questions? Contact <a href="mailto:order@doko-e.com">order@doko-e.com</a>.</p></div>`,
  };
}

export async function sendPartnerInvitation(
  input: {
    invitationId: string;
    email: string;
    partnerName: string;
    role: 'owner' | 'member';
    invitationUrl: string;
  },
  config: PartnerInvitationEmailConfig,
  send: typeof fetch = fetch,
) {
  if (config.PARTNER_INVITE_EMAIL_ENABLED?.trim() !== 'true')
    return { status: 'disabled' as const };
  const apiKey = config.RESEND_API_KEY?.trim();
  const from = (config.PARTNER_EMAIL_FROM || config.ORDER_EMAIL_FROM)?.trim();
  if (!apiKey || !from)
    throw Error('Partner invitation email configuration is incomplete.');
  const response = await send('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `doko-partner-invite/${input.invitationId}`,
    },
    body: JSON.stringify(
      partnerInvitationEmail(
        input.email,
        input.partnerName,
        input.role,
        input.invitationUrl,
        from,
      ),
    ),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw Error(
      'The invitation was saved, but the email provider rejected it.',
    );
  const accepted = (await response.json()) as { id?: string };
  if (!accepted.id)
    throw Error(
      'The invitation was saved, but the email provider did not confirm delivery.',
    );
  return { status: 'sent' as const };
}
