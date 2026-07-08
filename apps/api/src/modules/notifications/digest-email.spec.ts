import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { digestWindowEnd } from './digest.service'
import { type DigestNote, isDigestableEmail, renderNoteDigestEmail } from './digest-email'

function note(overrides: Partial<DigestNote> = {}): DigestNote {
  return {
    id: 'n-1',
    body: 'Keg room needs a deep clean before Friday',
    category: 'chat',
    automated: false,
    authorName: 'Elliot',
    ...overrides,
  }
}

describe('isDigestableEmail', () => {
  it('accepts a real email', () => {
    assert.equal(isDigestableEmail('elliot@lunebrewing.co.uk'), true)
  })

  it('rejects a synthetic phone-onboarding placeholder', () => {
    assert.equal(isDigestableEmail('ph+447700900000@phone.gm-ai.local'), false)
  })

  it('rejects the placeholder domain case-insensitively', () => {
    assert.equal(isDigestableEmail('PH+447700900000@PHONE.GM-AI.LOCAL'), false)
  })

  it('rejects an address with no @', () => {
    assert.equal(isDigestableEmail('not-an-email'), false)
  })

  it('rejects an address with whitespace', () => {
    assert.equal(isDigestableEmail('a b@example.com'), false)
  })

  it('rejects a domain without a dot', () => {
    assert.equal(isDigestableEmail('user@localhost'), false)
  })

  it('rejects an empty string', () => {
    assert.equal(isDigestableEmail(''), false)
  })
})

describe('digestWindowEnd', () => {
  it('truncates to the same-day 07:00 UTC when the run is after the anchor', () => {
    const end = digestWindowEnd(new Date('2026-07-07T10:30:00.000Z'))
    assert.equal(end.toISOString(), '2026-07-07T07:00:00.000Z')
  })

  it('rolls back to the previous day when the run is before the anchor', () => {
    const end = digestWindowEnd(new Date('2026-07-07T06:59:59.000Z'))
    assert.equal(end.toISOString(), '2026-07-06T07:00:00.000Z')
  })

  it('keeps an exact-boundary run on its own anchor', () => {
    const end = digestWindowEnd(new Date('2026-07-07T07:00:00.000Z'))
    assert.equal(end.toISOString(), '2026-07-07T07:00:00.000Z')
  })
})

describe('renderNoteDigestEmail', () => {
  const base = {
    organizationName: 'Lune Brewing',
    appUrl: 'https://app.gm-ai.example',
    notes: [note()],
    totalUnread: 1,
  }

  it('puts the unread count and org name in the subject', () => {
    assert.equal(renderNoteDigestEmail(base).subject, '1 unread note — Lune Brewing')
  })

  it('pluralises the subject for multiple notes', () => {
    const out = renderNoteDigestEmail({ ...base, totalUnread: 3 })
    assert.equal(out.subject, '3 unread notes — Lune Brewing')
  })

  it('links each note to its /notes/:id deep link', () => {
    const out = renderNoteDigestEmail(base)
    assert.ok(out.html.includes('https://app.gm-ai.example/notes/n-1'))
  })

  it('includes the deep link in the plain-text body too', () => {
    const out = renderNoteDigestEmail(base)
    assert.ok(out.text.includes('https://app.gm-ai.example/notes/n-1'))
  })

  it('escapes HTML in note bodies', () => {
    const out = renderNoteDigestEmail({
      ...base,
      notes: [note({ body: '<img src=x onerror=alert(1)>' })],
    })
    assert.ok(!out.html.includes('<img'))
  })

  it('escapes HTML in author names', () => {
    const out = renderNoteDigestEmail({
      ...base,
      notes: [note({ authorName: '<script>hi</script>' })],
    })
    assert.ok(!out.html.includes('<script>'))
  })

  it('attributes automated notes to gm, not the listed author', () => {
    const out = renderNoteDigestEmail({
      ...base,
      notes: [note({ automated: true, authorName: 'Elliot' })],
    })
    assert.ok(out.text.includes('gm · Note'))
  })

  it('truncates long bodies to a snippet', () => {
    const out = renderNoteDigestEmail({ ...base, notes: [note({ body: 'x'.repeat(500) })] })
    assert.ok(!out.text.includes('x'.repeat(200)))
  })

  it('mentions the overflow count when notes were capped', () => {
    const out = renderNoteDigestEmail({ ...base, totalUnread: 14 })
    assert.ok(out.text.includes('+ 13 more in your inbox.'))
  })
})
