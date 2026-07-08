import { PHONE_TEMP_EMAIL_DOMAIN } from '../phone/consume-phone-invite'

const SNIPPET_CHARS = 120

export type DigestNote = {
  id: string
  body: string
  category: string
  automated: boolean
  authorName: string | null
}

// Deliberately loose (local@domain.tld, no whitespace) — the goal is to keep
// junk out of the mailer's To: header, not to re-validate what better-auth
// already accepted at signup.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/// Phone-onboarded users carry a synthetic placeholder email (better-auth
/// needs one) — undeliverable by construction, so never a digest recipient.
/// Malformed addresses are dropped too rather than handed to the mailer.
export function isDigestableEmail(email: string): boolean {
  if (!EMAIL_SHAPE.test(email)) return false
  return !email.toLowerCase().endsWith(`@${PHONE_TEMP_EMAIL_DOMAIN}`)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function snippet(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > SNIPPET_CHARS ? `${flat.slice(0, SNIPPET_CHARS).trimEnd()}…` : flat
}

const CATEGORY_LABELS: Record<string, string> = {
  chat: 'Note',
  task: 'Task',
  compliance: 'Compliance',
  report: 'Report',
  system: 'System',
}

function noteWho(note: DigestNote): string {
  if (note.automated) return 'gm'
  return note.authorName ?? 'A teammate'
}

export function renderNoteDigestEmail(input: {
  organizationName: string
  appUrl: string
  notes: DigestNote[]
  totalUnread: number
}): { subject: string; html: string; text: string } {
  const count = input.totalUnread
  const subject = `${count} unread ${count === 1 ? 'note' : 'notes'} — ${input.organizationName}`
  const overflow = input.totalUnread - input.notes.length

  const htmlRows = input.notes
    .map((n) => {
      const url = `${input.appUrl}/notes/${encodeURIComponent(n.id)}`
      const label = CATEGORY_LABELS[n.category] ?? 'Note'
      return `    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eee;">
        <p style="margin:0 0 4px 0;font-size:13px;color:#555;">${escapeHtml(noteWho(n))} · ${escapeHtml(label)}</p>
        <p style="margin:0 0 8px 0;font-size:15px;line-height:1.5;color:#111;">${escapeHtml(snippet(n.body))}</p>
        <a href="${escapeHtml(url)}" style="font-size:13px;color:#0a0a0a;font-weight:500;">Open note →</a>
      </td>
    </tr>`
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;background:#fff;">
    <h2 style="margin:0 0 4px 0;font-size:20px;">${escapeHtml(subject)}</h2>
    <p style="font-size:14px;color:#555;margin:0 0 16px 0;">From the last 24 hours on GM AI.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;">
${htmlRows}
    </table>
${overflow > 0 ? `    <p style="font-size:13px;color:#555;margin:16px 0 0 0;">+ ${overflow} more in your inbox.</p>\n` : ''}    <p style="font-size:12px;color:#888;margin:24px 0 0 0;border-top:1px solid #eee;padding-top:16px;">
      You're getting this because you have unread notes in ${escapeHtml(input.organizationName)}. Open the app to mark them read.
    </p>
  </body>
</html>`

  const textLines = [
    subject,
    'From the last 24 hours on GM AI.',
    '',
    ...input.notes.flatMap((n) => [
      `${noteWho(n)} · ${CATEGORY_LABELS[n.category] ?? 'Note'}`,
      snippet(n.body),
      `${input.appUrl}/notes/${encodeURIComponent(n.id)}`,
      '',
    ]),
  ]
  if (overflow > 0) textLines.push(`+ ${overflow} more in your inbox.`)

  return { subject, html, text: textLines.join('\n') }
}
