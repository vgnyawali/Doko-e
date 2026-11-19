import test from 'node:test';
import assert from 'node:assert/strict';
import {
  partnerInvitationEmail,
  sendPartnerInvitation,
} from '@/modules/email/partnerInvitation';

test('partner invitation contains a one-time password setup link', () => {
  const message = partnerInvitationEmail(
    'maker@example.test',
    'Maker & Sons',
    'member',
    'https://doko-e.com/partners/accept?token=synthetic-token',
    'Doko <order@doko-e.com>',
  );
  assert.equal(message.to[0], 'maker@example.test');
  assert.match(message.text, /\/partners\/accept\?token=synthetic-token/);
  assert.match(message.text, /invitation is for maker@example\.test/i);
  assert.match(message.html, /Maker &amp; Sons/);
});

test('partner invitation is opt-in and provider acceptance is verified', async () => {
  const input = {
    invitationId: 'invite-1',
    email: 'maker@example.test',
    partnerName: 'Maker',
    role: 'owner' as const,
    invitationUrl: 'https://doko-e.com/partners/accept?token=synthetic-token',
  };
  assert.deepEqual(await sendPartnerInvitation(input, {}), {
    status: 'disabled',
  });
  let request: RequestInit | undefined;
  const result = await sendPartnerInvitation(
    input,
    {
      PARTNER_INVITE_EMAIL_ENABLED: 'true',
      RESEND_API_KEY: 'test-only',
      PARTNER_EMAIL_FROM: 'Doko Partners <order@doko-e.com>',
    },
    async (_url, init) => {
      request = init;
      return Response.json({ id: 'email-1' });
    },
  );
  assert.deepEqual(result, { status: 'sent' });
  assert.equal(
    (request?.headers as Record<string, string>)['Idempotency-Key'],
    'doko-partner-invite/invite-1',
  );
});
