// 01-02 audit-added: plain HTML email template; no dep, no template engine.
// All interpolated values MUST be escaped via escapeHtml — prevents HTML injection
// from organizationName / inviterName (which are user-controlled strings).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderInvitationEmail(input: {
  inviteUrl: string
  organizationName: string
  inviterName: string | null
  expiresAt: Date
}): { html: string; text: string } {
  const orgSafe = escapeHtml(input.organizationName)
  const inviterSafe = input.inviterName ? escapeHtml(input.inviterName) : 'A teammate'
  const urlSafe = escapeHtml(input.inviteUrl)
  const expiresFmt = input.expiresAt.toISOString().split('T')[0]

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;background:#fff;">
    <h2 style="margin:0 0 16px 0;font-size:20px;">You've been invited to <strong>${orgSafe}</strong></h2>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px 0;">
      ${inviterSafe} invited you to join their organisation on GM AI.
    </p>
    <p style="margin:24px 0;">
      <a href="${urlSafe}" style="display:inline-block;padding:10px 18px;background:#0a0a0a;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;">Accept invitation</a>
    </p>
    <p style="font-size:13px;color:#555;line-height:1.5;margin:0 0 8px 0;">Or paste this link in your browser:</p>
    <p style="font-size:13px;color:#555;word-break:break-all;margin:0 0 24px 0;">${urlSafe}</p>
    <p style="font-size:12px;color:#888;margin:24px 0 0 0;border-top:1px solid #eee;padding-top:16px;">
      This invitation expires on ${expiresFmt}. If you weren't expecting it, ignore this email.
    </p>
  </body>
</html>`

  const text = [
    `You've been invited to ${input.organizationName}`,
    ``,
    `${input.inviterName ?? 'A teammate'} invited you to join their organisation on GM AI.`,
    ``,
    `Accept the invitation:`,
    input.inviteUrl,
    ``,
    `This invitation expires on ${expiresFmt}. If you weren't expecting it, ignore this email.`,
  ].join('\n')

  return { html, text }
}
