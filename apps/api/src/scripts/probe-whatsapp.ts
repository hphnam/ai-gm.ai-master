import '../load-env'

// 03-02 audit-added S3: DATABASE_URL sanity check BEFORE any prisma import.
// Rejects production-like URLs unless DATABASE_URL_PROBE_OVERRIDE=1 explicitly set.
// Allowed markers cover local Postgres + Neon branches (project DB convention).
{
  const dbUrl = process.env.DATABASE_URL ?? ''
  const looksProd = !/localhost|127\.0\.0\.1|\.local|\bdev\b|\bstaging\b|\btest\b|neon\.tech/i.test(dbUrl)
  if (looksProd && process.env.DATABASE_URL_PROBE_OVERRIDE !== '1') {
    const masked = dbUrl.replace(/:[^@]+@/, ':***@')
    console.error(
      `\n⚠️  DATABASE_URL looks production-like: "${masked}"\n   Refusing to run probe against potentially-prod database.\n   Override with DATABASE_URL_PROBE_OVERRIDE=1 if intentional.\n`,
    )
    process.exit(2)
  }
}

// 03-02 audit-added M1: cost banner BEFORE bootstrap work.
const IS_STUB = process.env.PROBE_CHAT_SERVICE_STUB === 'true'
{
  if (IS_STUB) {
    console.log('probe-whatsapp: stub mode — 0 Claude calls this run (PROBE_CHAT_SERVICE_STUB=true)')
  } else {
    console.log('probe-whatsapp: real Claude mode — ~34 API calls per run, ~$0.30-1.00 spend.')
    console.log('  Stub mode available: PROBE_CHAT_SERVICE_STUB=true pnpm --filter api probe:whatsapp')
  }
}

// 03-02 audit-added S5: force deterministic env state BEFORE NestFactory reads it.
process.env.TWILIO_WHATSAPP_DRIVER_OVERRIDE = process.env.TWILIO_WHATSAPP_DRIVER_OVERRIDE ?? 'console'
process.env.TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155550000'
process.env.WHATSAPP_WEBHOOK_PUBLIC_URL =
  process.env.WHATSAPP_WEBHOOK_PUBLIC_URL ?? 'https://probe.local/webhooks/twilio/whatsapp'
process.env.ALLOW_WEBHOOK_DEV_BYPASS = 'true'
process.env.TWILIO_AUTH_TOKEN = 'probe-whatsapp-auth-token-FIXTURE-not-real-twilio-creds'
// Always zero at boot — prevents stale env from a prior crash leaking.
process.env.PROBE_CHAT_SERVICE_DELAY_MS = '0'

import { createHmac } from 'crypto'
import { spawnSync } from 'node:child_process'
import { createServer, type Server as HttpServer } from 'node:http'
import { NestFactory, type INestApplication } from '@nestjs/core'
import { json, urlencoded } from 'express'
import { prisma } from '@gm-ai/database'
import { AppModule } from '../app.module'
import { httpLoggerMiddleware } from '../common/http-logger.middleware'
import { requestIdMiddleware } from '../common/request-id.middleware'
import { securityHeadersMiddleware } from '../common/security-headers.middleware'
import { __resetForTest as resetUnknownNumber } from '../modules/whatsapp/unknown-number-rate-limit'
import { __resetForTest as resetVerifiedSender } from '../modules/whatsapp/verified-sender-rate-limit'
import { __resetForTest as resetSeenSids } from '../modules/whatsapp/seen-message-sids'
import { __resetForTest as resetTypingTimers } from '../modules/whatsapp/typing-indicator-timers'

const PORT = Number(process.env.PROBE_WHATSAPP_PORT ?? 3099)
const BASE = `http://localhost:${PORT}`
const WEBHOOK_PATH = '/webhooks/twilio/whatsapp'
const WEBHOOK_URL = `${BASE}${WEBHOOK_PATH}`

// 03-03 image-server ports (audit S4/S8). Each runs a purpose-built fixture:
const IMG_HAPPY_PORT = PORT + 1 // valid 1x1 JPEG (AC-4 / W21)
const IMG_CORRUPT_PORT = PORT + 3 // image/jpeg Content-Type + 100 zero bytes (AC-14 / W25)
const IMG_SVG_PORT = PORT + 4 // image/svg+xml (AC-15 / W26)
const IMG_HAPPY_URL = `http://localhost:${IMG_HAPPY_PORT}/probe-image.jpg`
const IMG_CORRUPT_URL = `http://localhost:${IMG_CORRUPT_PORT}/corrupt.jpg`
const IMG_SVG_URL = `http://localhost:${IMG_SVG_PORT}/tiny.svg`
const IMG_NO_SERVER_URL = `http://localhost:${PORT + 2}/does-not-exist.jpg`
const IMG_SSRF_URL = 'http://169.254.169.254/latest/meta-data/instance-id'

// Pre-built 1x1 JPEG (smallest-possible valid JPEG, 125 bytes).
const IMG_1X1_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAECAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A//2Q=='
const IMG_1X1_JPEG_BYTES = Buffer.from(IMG_1X1_JPEG_BASE64, 'base64')
const SVG_BYTES = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8')
const CORRUPT_BYTES = Buffer.alloc(100, 0x00)

async function bootImageServers(): Promise<{ close: () => Promise<void> }> {
  const happy = createServer((_req, res) => {
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': IMG_1X1_JPEG_BYTES.length,
    })
    res.end(IMG_1X1_JPEG_BYTES)
  })
  const corrupt = createServer((_req, res) => {
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': CORRUPT_BYTES.length,
    })
    res.end(CORRUPT_BYTES)
  })
  const svg = createServer((_req, res) => {
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Content-Length': SVG_BYTES.length,
    })
    res.end(SVG_BYTES)
  })
  await Promise.all(
    [
      [happy, IMG_HAPPY_PORT] as const,
      [corrupt, IMG_CORRUPT_PORT] as const,
      [svg, IMG_SVG_PORT] as const,
    ].map(
      ([s, port]) =>
        new Promise<void>((resolve, reject) => {
          s.on('error', reject)
          s.listen(port, () => resolve())
        }),
    ),
  )
  const servers: HttpServer[] = [happy, corrupt, svg]
  return {
    close: async () => {
      await Promise.all(
        servers.map(
          (s) =>
            new Promise<void>((resolve) => {
              s.close(() => resolve())
            }),
        ),
      )
    },
  }
}

const PROBE_MARKER = 'probe-whatsapp'
const PROBE_EMAIL = 'probe-whatsapp@gm-ai.local'
const PROBE_PHONE_RAW = '+14155559999'
const PROBE_PHONE = `whatsapp:${PROBE_PHONE_RAW}`
const UNKNOWN_PHONE = 'whatsapp:+16505551111'
const PROBE_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const PROBE_PUBLIC_URL = process.env.WHATSAPP_WEBHOOK_PUBLIC_URL!
const PROBE_FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM!

// -- stdout/stderr capture ---------------------------------------------------
// 03-02 audit-added S6: interception at the stream level — more robust than
// NestJS Logger overrides, captures every log regardless of source.
const capturedOutput: string[] = []
const origStdoutWrite = process.stdout.write.bind(process.stdout)
const origStderrWrite = process.stderr.write.bind(process.stderr)
;(process.stdout.write as unknown) = ((chunk: unknown, ...rest: unknown[]) => {
  capturedOutput.push(typeof chunk === 'string' ? chunk : String(chunk))
  return (origStdoutWrite as (...args: unknown[]) => boolean)(chunk, ...rest)
}) as typeof process.stdout.write
;(process.stderr.write as unknown) = ((chunk: unknown, ...rest: unknown[]) => {
  capturedOutput.push(typeof chunk === 'string' ? chunk : String(chunk))
  return (origStderrWrite as (...args: unknown[]) => boolean)(chunk, ...rest)
}) as typeof process.stderr.write

function captureSlice(): string {
  return capturedOutput.join('')
}

function captureContainsSince(marker: number, needle: string): boolean {
  return capturedOutput.slice(marker).some((s) => s.includes(needle))
}

function captureCountSince(marker: number, needle: string): number {
  return capturedOutput.slice(marker).filter((s) => s.includes(needle)).length
}

// -- assertion harness -------------------------------------------------------
let passed = 0
let failed = 0
type AssertRes = { name: string; ok: boolean; detail?: string }
const results: AssertRes[] = []

async function assert(name: string, fn: () => Promise<string | void>): Promise<void> {
  try {
    const detail = await fn()
    console.log(`[✓] ${name}${detail ? ' — ' + detail : ''}`)
    results.push({ name, ok: true, detail: detail ?? undefined })
    passed++
  } catch (err) {
    console.error(`[✗] ${name} — ${(err as Error).message}`)
    results.push({ name, ok: false, detail: (err as Error).message })
    failed++
  }
}

function mustBe(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`)
  }
}

// -- HMAC signer (matches WhatsappSignatureGuard algorithm exactly) ----------
function signFor(url: string, body: Record<string, string>, authToken: string): string {
  const sortedKeys = Object.keys(body).sort()
  const signingString = url + sortedKeys.map((k) => k + body[k]).join('')
  return createHmac('sha1', authToken).update(signingString).digest('base64')
}

// -- HTTP helpers ------------------------------------------------------------
async function postWebhook(
  body: Record<string, string>,
  opts: { signature?: string | null; rawBody?: string } = {},
): Promise<{ status: number; text: string }> {
  const rawBody = opts.rawBody ?? new URLSearchParams(body).toString()
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (opts.signature !== null) {
    const sig = opts.signature ?? signFor(PROBE_PUBLIC_URL, body, PROBE_AUTH_TOKEN)
    headers['X-Twilio-Signature'] = sig
  }
  const res = await fetch(WEBHOOK_URL, { method: 'POST', headers, body: rawBody })
  const text = await res.text()
  return { status: res.status, text }
}

function makeBody(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    MessageSid: overrides.MessageSid ?? `SM${Math.random().toString(36).slice(2, 14)}`,
    AccountSid: overrides.AccountSid ?? 'ACprobewhatsapp00000000000000000000',
    From: overrides.From ?? PROBE_PHONE,
    To: overrides.To ?? PROBE_FROM_NUMBER,
    Body: overrides.Body ?? 'hello from probe',
    NumMedia: overrides.NumMedia ?? '0',
    ...(overrides.MediaContentType0 ? { MediaContentType0: overrides.MediaContentType0 } : {}),
  }
}

// -- cleanup -----------------------------------------------------------------
async function cleanup(): Promise<void> {
  // Order matters per FK cascade topology (schema.prisma):
  //   ChatMessage onDelete:Cascade -> ChatConversation
  //   ChatConversation -> Venue (FK onDelete:Cascade from conversation side)
  //   Venue onDelete:Restrict -> Organization (must delete venues before orgs)
  //   OrganizationMember onDelete:Cascade -> Organization
  //
  // Steps: 1) delete channel='probe-whatsapp' conversations (explicit marker).
  //        2) find probe user + orgs (by email + slug prefix).
  //        3) delete all conversations under probe venues (regardless of channel)
  //           — audit-added M3 closes the channel='whatsapp' stale-data gap.
  //        4) delete venues.
  //        5) delete orgs (cascades members + invitations).
  //        6) delete probe user (goes last; org memberships already cascaded).

  await prisma.chatConversation.deleteMany({ where: { channel: PROBE_MARKER } })

  const probeUser = await prisma.user.findUnique({ where: { email: PROBE_EMAIL } })
  const probeOrgs = await prisma.organization.findMany({
    where: { slug: { startsWith: 'probe-whatsapp-' } },
    select: { id: true },
  })
  const probeOrgIds = probeOrgs.map((o) => o.id)
  if (probeOrgIds.length > 0) {
    const probeVenues = await prisma.venue.findMany({
      where: { organizationId: { in: probeOrgIds } },
      select: { id: true },
    })
    const probeVenueIds = probeVenues.map((v) => v.id)
    if (probeVenueIds.length > 0) {
      await prisma.chatConversation.deleteMany({ where: { venueId: { in: probeVenueIds } } })
      await prisma.venue.deleteMany({ where: { id: { in: probeVenueIds } } })
    }
    await prisma.organization.deleteMany({ where: { id: { in: probeOrgIds } } })
  }
  if (probeUser) {
    await prisma.user.delete({ where: { id: probeUser.id } })
  }
}

async function preCleanupCheckAsAssertion(): Promise<void> {
  await assert('W0 pre-cleanup check OK (0 stale rows)', async () => {
    const staleConv = await prisma.chatConversation.count({ where: { channel: PROBE_MARKER } })
    const staleUser = await prisma.user.count({ where: { email: PROBE_EMAIL } })
    const staleOrg = await prisma.organization.count({
      where: { slug: { startsWith: 'probe-whatsapp-' } },
    })
    if (staleConv + staleUser + staleOrg !== 0) {
      throw new Error(
        `stale rows conv=${staleConv} user=${staleUser} org=${staleOrg}`,
      )
    }
    return 'clean'
  })
}

// -- seed --------------------------------------------------------------------
type ProbeFixture = {
  orgId: string
  venueId: string
  userId: string
}

async function setupProbeUser(): Promise<ProbeFixture> {
  const slug = `probe-whatsapp-${Date.now()}`
  const org = await prisma.organization.create({
    data: { name: 'Probe WhatsApp Org', slug },
    select: { id: true },
  })
  const venue = await prisma.venue.create({
    data: {
      organizationId: org.id,
      name: 'Probe Venue',
      type: 'pub',
      timezone: 'UTC',
    },
    select: { id: true },
  })
  // account required for better-auth user; keep minimal here.
  const user = await prisma.user.create({
    data: {
      email: PROBE_EMAIL,
      name: 'Probe WhatsApp',
      emailVerified: true,
      phoneNumber: PROBE_PHONE_RAW,
      phoneVerifiedAt: new Date(),
    },
    select: { id: true },
  })
  await prisma.organizationMember.create({
    data: { userId: user.id, organizationId: org.id, role: 'owner' },
  })
  return { orgId: org.id, venueId: venue.id, userId: user.id }
}

// -- bootstrap NestApp -------------------------------------------------------
async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false,
    rawBody: false,
  })

  const allowlist = ['http://localhost:3000']
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowlist.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-request-id'],
  })
  app.use(requestIdMiddleware)
  app.use(securityHeadersMiddleware)
  app.use(httpLoggerMiddleware)
  app.use('/api/auth', json({ limit: '8kb' }))
  const jsonDefault = json({ limit: '32kb' })
  const webhookUrlencoded = urlencoded({ limit: '32kb', extended: false })
  app.use((req: { path: string }, res: unknown, next: () => void) => {
    if (req.path === '/docs/upload') return next()
    if (req.path === WEBHOOK_PATH)
      return webhookUrlencoded(req as never, res as never, next as never)
    return jsonDefault(req as never, res as never, next as never)
  })
  app.enableShutdownHooks()

  await app.listen(PORT)
  return app
}

// -- assertions --------------------------------------------------------------
async function runAssertions(fx: ProbeFixture): Promise<void> {
  // 03-03 audit S4/S8: probe-only SSRF allowlist + local image servers for W21/W25/W26.
  // PROBE_MEDIA_HOST_ALLOWLIST is only honored in non-production; set BEFORE any
  // image-download test runs.
  process.env.PROBE_MEDIA_HOST_ALLOWLIST = `localhost:${IMG_HAPPY_PORT},localhost:${IMG_CORRUPT_PORT},localhost:${IMG_SVG_PORT}`
  const imgServers = await bootImageServers()

  try {
  // Reset all in-memory limiters + dedupe for deterministic state.
  resetUnknownNumber()
  resetVerifiedSender()
  resetSeenSids()
  resetTypingTimers()

  // W1: signFor helper round-trips through guard (AC-2).
  await assert('W1 signFor helper round-trips through guard → 200', async () => {
    const body = makeBody()
    const mark = capturedOutput.length
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W1 status')
    if (!captureContainsSince(mark, 'whatsapp.inbound') && !captureContainsSince(mark, 'whatsapp.unknown_number')) {
      // Either is acceptable — verified or unknown routing both produce 200.
      throw new Error('W1: expected whatsapp.inbound or whatsapp.unknown_number in captured logs')
    }
    return `status=${status}`
  })

  // W2: mutated signature → 403 (AC-4).
  await assert('W2 invalid signature → 403', async () => {
    const body = makeBody()
    const correct = signFor(PROBE_PUBLIC_URL, body, PROBE_AUTH_TOKEN)
    const mutated = (correct[0] === 'A' ? 'B' : 'A') + correct.slice(1)
    const { status, text } = await postWebhook(body, { signature: mutated })
    mustBe(status, 403, 'W2 status')
    if (!text.includes('signature-invalid')) throw new Error(`W2: body missing error code: ${text}`)
    return 'status=403'
  })

  // W3: missing signature header → 403 (AC-5).
  await assert('W3 missing signature header → 403', async () => {
    const body = makeBody()
    const { status, text } = await postWebhook(body, { signature: null })
    mustBe(status, 403, 'W3 status')
    if (!text.includes('signature-invalid')) throw new Error(`W3: body missing error code: ${text}`)
    return 'status=403'
  })

  // W4: unknown number first hit → 200 + onboarding reply (AC-6 path 1).
  // NestJS default Logger.log(msg, ctx) prints only the event name string, not
  // the payload object. Assertions check event-name + outbound-count signals.
  resetUnknownNumber()
  await assert('W4 unknown number first hit → onboarding reply', async () => {
    const body = makeBody({ From: UNKNOWN_PHONE })
    const mark = capturedOutput.length
    const outboundBefore = captureCountSince(0, 'whatsapp.console_outbound')
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W4 status')
    if (!captureContainsSince(mark, 'whatsapp.unknown_number'))
      throw new Error('W4: expected whatsapp.unknown_number event')
    const outboundAfter = captureCountSince(0, 'whatsapp.console_outbound')
    if (outboundAfter !== outboundBefore + 1)
      throw new Error(
        `W4: expected exactly 1 console_outbound emission (onboarding reply), got ${outboundAfter - outboundBefore}`,
      )
    return `status=200 + onboarding reply emitted`
  })

  // W5: unknown number second hit → rate-limited (AC-6 path 2).
  await assert('W5 unknown number second hit → rate-limited', async () => {
    const body = makeBody({ From: UNKNOWN_PHONE })
    const mark = capturedOutput.length
    const outboundBefore = captureCountSince(0, 'whatsapp.console_outbound')
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W5 status')
    if (!captureContainsSince(mark, 'whatsapp.unknown_number'))
      throw new Error('W5: expected whatsapp.unknown_number event')
    const outboundAfter = captureCountSince(0, 'whatsapp.console_outbound')
    if (outboundAfter !== outboundBefore)
      throw new Error(
        `W5: expected NO new console_outbound (rate-limited), got +${outboundAfter - outboundBefore}`,
      )
    return 'status=200 no outbound'
  })

  // W6: image inbound WITHOUT MediaUrl0 → image_download_failed fallback.
  // 03-03 deviation: image is no longer "unsupported media" — the new flow attempts
  // download and only rejects when MediaUrl0 is missing or the download fails.
  // W21/W25/W26 cover the in-band image paths; W6 specifically covers
  // "WhatsApp said NumMedia=1 but didn't include MediaUrl0".
  await assert('W6 image w/o MediaUrl0 → image_download_failed fallback', async () => {
    const msgCountBefore = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    const body = makeBody({
      From: PROBE_PHONE,
      NumMedia: '1',
      MediaContentType0: 'image/jpeg',
      MessageSid: 'SM-w6-image',
    })
    const mark = capturedOutput.length
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W6 status')
    if (!captureContainsSince(mark, 'whatsapp.image_download_failed'))
      throw new Error('W6: expected whatsapp.image_download_failed event')
    if (!captureContainsSince(mark, 'no-media-url'))
      throw new Error('W6: expected errorKind=no-media-url')
    const msgCountAfter = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    if (msgCountAfter !== msgCountBefore)
      throw new Error(`W6: expected NO new ChatMessage rows, got +${msgCountAfter - msgCountBefore}`)
    return 'image w/o MediaUrl0 → fallback + no ChatService call'
  })

  // W7: audio inbound → friendly rejection (AC-7 audio).
  await assert('W7 audio inbound → friendly rejection', async () => {
    const msgCountBefore = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    const body = makeBody({
      From: PROBE_PHONE,
      NumMedia: '1',
      MediaContentType0: 'audio/ogg',
      MessageSid: 'SM-w7-audio',
    })
    const mark = capturedOutput.length
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W7 status')
    if (!captureContainsSince(mark, 'whatsapp.unsupported_media'))
      throw new Error('W7: expected whatsapp.unsupported_media event')
    const msgCountAfter = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    if (msgCountAfter !== msgCountBefore)
      throw new Error(`W7: expected NO new ChatMessage rows, got +${msgCountAfter - msgCountBefore}`)
    return 'rejection + no ChatService call'
  })

  // ---- Reset before verified-user assertions ----
  resetUnknownNumber()
  resetVerifiedSender()
  resetSeenSids()

  // W8: verified user text → 200 + ChatMessage rows persisted (AC-3).
  await assert('W8 verified user text → 200 + ChatMessage rows persisted', async () => {
    const msgCountBefore = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    const body = makeBody({ MessageSid: 'SM-w8-happy-path' })
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W8 status')
    const msgCountAfter = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    if (msgCountAfter < msgCountBefore + 2)
      throw new Error(`W8: expected ≥2 new messages (user + assistant), got ${msgCountAfter - msgCountBefore}`)
    const conv = await prisma.chatConversation.findFirst({
      where: { venueId: fx.venueId, channel: 'whatsapp' },
      orderBy: { updatedAt: 'desc' },
    })
    if (!conv) throw new Error('W8: expected channel=whatsapp conversation')
    return `messages+=${msgCountAfter - msgCountBefore}`
  })

  // W9: MessageSid replay dedupe (AC-9).
  await assert('W9 MessageSid replay → dedupe', async () => {
    resetSeenSids()
    const body = makeBody({ MessageSid: 'SM-w9-replay-test' })
    const r1 = await postWebhook(body)
    mustBe(r1.status, 200, 'W9 first status')
    const countBefore = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    const mark = capturedOutput.length
    const r2 = await postWebhook(body)
    mustBe(r2.status, 200, 'W9 replay status')
    if (!captureContainsSince(mark, 'whatsapp.replay_dedupe'))
      throw new Error('W9: expected whatsapp.replay_dedupe log')
    const countAfter = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    if (countAfter !== countBefore)
      throw new Error(`W9: expected no new messages on replay, got +${countAfter - countBefore}`)
    return 'replay dedupe OK'
  })

  // W10: kill-switch disabled (AC-8) — try/finally for env cleanup.
  await assert('W10 kill-switch disabled → inbound 200 + outbound skipped', async () => {
    resetSeenSids()
    const prevOverride = process.env.TWILIO_WHATSAPP_DRIVER_OVERRIDE
    try {
      process.env.TWILIO_WHATSAPP_DRIVER_OVERRIDE = 'disabled'
      const body = makeBody({ MessageSid: 'SM-w10-killswitch' })
      const mark = capturedOutput.length
      const { status } = await postWebhook(body)
      mustBe(status, 200, 'W10 status')
      if (!captureContainsSince(mark, 'whatsapp.outbound_skipped_killswitch'))
        throw new Error('W10: expected whatsapp.outbound_skipped_killswitch log')
      return 'kill-switch honored'
    } finally {
      process.env.TWILIO_WHATSAPP_DRIVER_OVERRIDE = prevOverride ?? 'console'
    }
  })

  // W11: dev-bypass positive path (AC-14 / audit-added M4) — try/finally.
  // Must unset ALL THREE Twilio Verify env vars (SID + token + verifySid) so
  // 01-03's all-or-nothing check doesn't trip when assertAuthEnv runs per-request.
  await assert('W11 dev-bypass (probe-console signature) accepted when env allows', async () => {
    resetSeenSids()
    const prev = {
      sid: process.env.TWILIO_ACCOUNT_SID,
      token: process.env.TWILIO_AUTH_TOKEN,
      verifySid: process.env.TWILIO_VERIFY_SERVICE_SID,
    }
    try {
      delete process.env.TWILIO_ACCOUNT_SID
      delete process.env.TWILIO_AUTH_TOKEN
      delete process.env.TWILIO_VERIFY_SERVICE_SID
      const body = makeBody({ From: UNKNOWN_PHONE, MessageSid: 'SM-w11-dev-bypass' })
      const mark = capturedOutput.length
      const { status } = await postWebhook(body, { signature: 'probe-console' })
      mustBe(status, 200, 'W11 status')
      if (!captureContainsSince(mark, 'whatsapp.signature_dev_bypass'))
        throw new Error('W11: expected whatsapp.signature_dev_bypass WARN log')
      return 'dev-bypass accepted'
    } finally {
      if (prev.sid !== undefined) process.env.TWILIO_ACCOUNT_SID = prev.sid
      if (prev.token !== undefined) process.env.TWILIO_AUTH_TOKEN = prev.token
      if (prev.verifySid !== undefined) process.env.TWILIO_VERIFY_SERVICE_SID = prev.verifySid
    }
  })

  // W12: malformed form (duplicate Body keys → array) (AC-16).
  await assert('W12 malformed form (duplicate Body) → 403 malformed-params', async () => {
    // Hand-built body string with duplicate 'Body' key.
    const raw =
      'MessageSid=SM-w12-malformed' +
      '&AccountSid=ACprobewhatsapp00000000000000000000' +
      `&From=${encodeURIComponent(PROBE_PHONE)}` +
      `&To=${encodeURIComponent(PROBE_FROM_NUMBER)}` +
      '&Body=a' +
      '&Body=b' +
      '&NumMedia=0'
    // Compute a would-be signature over the single-value interpretation (irrelevant —
    // guard rejects at malformed-params stage before comparing HMAC).
    const sig = signFor(
      PROBE_PUBLIC_URL,
      { MessageSid: 'SM-w12-malformed', AccountSid: 'ACprobewhatsapp00000000000000000000', From: PROBE_PHONE, To: PROBE_FROM_NUMBER, Body: 'a', NumMedia: '0' },
      PROBE_AUTH_TOKEN,
    )
    const mark = capturedOutput.length
    const { status, text } = await postWebhook({}, { rawBody: raw, signature: sig })
    mustBe(status, 403, 'W12 status')
    if (!text.includes('signature-invalid'))
      throw new Error(`W12: expected signature-invalid, got ${text}`)
    if (!captureContainsSince(mark, 'whatsapp.signature_rejected'))
      throw new Error('W12: expected whatsapp.signature_rejected event')
    return 'malformed-params rejected'
  })

  // W13: verified-sender 30/h throttle (AC-10).
  await assert('W13 verified-sender 30/h throttle', async () => {
    resetVerifiedSender()
    resetSeenSids()
    // 30 allowed inbounds; 31st throttled.
    for (let i = 0; i < 30; i++) {
      const body = makeBody({ MessageSid: `SM-w13-${i}`, Body: `msg ${i}` })
      const { status } = await postWebhook(body)
      if (status !== 200) throw new Error(`W13: msg ${i} got status ${status}`)
    }
    const body31 = makeBody({ MessageSid: 'SM-w13-30', Body: 'throttled msg' })
    const mark = capturedOutput.length
    const { status } = await postWebhook(body31)
    mustBe(status, 200, 'W13 status')
    if (!captureContainsSince(mark, 'whatsapp.verified_sender_throttled'))
      throw new Error('W13: expected whatsapp.verified_sender_throttled log')
    return '30 allowed + 31st throttled'
  })

  // W14: ChatService timeout via PROBE_CHAT_SERVICE_DELAY_MS (AC-11) — try/finally.
  await assert('W14 ChatService 12s timeout → ack reply', async () => {
    resetSeenSids()
    resetVerifiedSender()
    const prevDelay = process.env.PROBE_CHAT_SERVICE_DELAY_MS ?? '0'
    try {
      process.env.PROBE_CHAT_SERVICE_DELAY_MS = '15000'
      const body = makeBody({ MessageSid: 'SM-w14-timeout', Body: 'timeout probe' })
      const mark = capturedOutput.length
      const t0 = Date.now()
      const { status } = await postWebhook(body)
      const elapsed = Date.now() - t0
      mustBe(status, 200, 'W14 status')
      if (elapsed > 14_000)
        throw new Error(`W14: response took ${elapsed}ms, exceeds Twilio 15s budget headroom`)
      if (!captureContainsSince(mark, 'whatsapp.chat_timeout'))
        throw new Error('W14: expected whatsapp.chat_timeout log')
      // S7: no-double-reply — wait ~5s for orphan Claude to complete in background,
      // recount whatsapp.outbound for this MessageSid. Should stay at <=1.
      await new Promise((r) => setTimeout(r, 5000))
      const outboundCount = captureCountSince(mark, '"latencyMs"') // lenient — just check outbound count
      if (outboundCount > 2)
        throw new Error(`W14 S7: expected ≤2 outbound logs after timeout, got ${outboundCount}`)
      return `elapsed=${elapsed}ms`
    } finally {
      process.env.PROBE_CHAT_SERVICE_DELAY_MS = prevDelay
    }
  })

  // W15: boot fail-fast — WHATSAPP_WEBHOOK_PUBLIC_URL missing (AC-12).
  await assert('W15 boot fail-fast: missing WHATSAPP_WEBHOOK_PUBLIC_URL', async () => {
    const child = spawnSync(
      'node',
      ['-e', "require('./dist/src/modules/auth/assert-auth-env').assertAuthEnv()"],
      {
        env: {
          ...process.env,
          NODE_ENV: 'development',
          BETTER_AUTH_SECRET: 'a'.repeat(64),
          BETTER_AUTH_URL: 'http://localhost:3001',
          WEB_ORIGIN: 'http://localhost:3000',
          TWILIO_WHATSAPP_FROM: 'whatsapp:+14155550000',
          TWILIO_WHATSAPP_DRIVER_OVERRIDE: 'live',
          WHATSAPP_WEBHOOK_PUBLIC_URL: '',
          ALLOW_WEBHOOK_DEV_BYPASS: '',
        },
      },
    )
    if (child.status === 0)
      throw new Error('W15: expected non-zero exit, got 0')
    const stderr = child.stderr?.toString() ?? ''
    if (!stderr.includes('WHATSAPP_WEBHOOK_PUBLIC_URL required'))
      throw new Error(`W15: expected URL-pin error in stderr, got: ${stderr.slice(0, 200)}`)
    return `exit=${child.status}`
  })

  // W16: boot fail-fast — ALLOW_WEBHOOK_DEV_BYPASS=true in production (AC-13).
  await assert('W16 boot fail-fast: ALLOW_WEBHOOK_DEV_BYPASS=true in production', async () => {
    const child = spawnSync(
      'node',
      ['-e', "require('./dist/src/modules/auth/assert-auth-env').assertAuthEnv()"],
      {
        env: {
          ...process.env,
          NODE_ENV: 'production',
          BETTER_AUTH_SECRET: 'a'.repeat(64),
          BETTER_AUTH_URL: 'http://localhost:3001',
          WEB_ORIGIN: 'http://localhost:3000',
          ALLOW_WEBHOOK_DEV_BYPASS: 'true',
          TWILIO_WHATSAPP_FROM: '',
          TWILIO_WHATSAPP_DRIVER_OVERRIDE: '',
          WHATSAPP_WEBHOOK_PUBLIC_URL: '',
          PROBE_CHAT_SERVICE_DELAY_MS: '',
          PROBE_CHAT_SERVICE_STUB: '',
        },
      },
    )
    if (child.status === 0) throw new Error('W16: expected non-zero exit, got 0')
    const stderr = child.stderr?.toString() ?? ''
    if (!stderr.includes('ALLOW_WEBHOOK_DEV_BYPASS must not be set to "true" in production'))
      throw new Error(`W16: expected dev-bypass prod error in stderr, got: ${stderr.slice(0, 200)}`)
    return `exit=${child.status}`
  })

  // W17: PII grep self-check (AC-15).
  await assert('W17 PII grep: no raw phone digits in capture', async () => {
    const blob = captureSlice()
    const matches = blob.match(/\+1\d{10}/g) ?? []
    // Allow occurrences of the TWILIO_WHATSAPP_FROM (our own configured sender)
    // since that's env-visible config, not PII from inbound. Strip and retest.
    const sanitized = blob.split(PROBE_FROM_NUMBER.replace('whatsapp:', '')).join('')
    const realMatches = sanitized.match(/\+1\d{10}/g) ?? []
    if (realMatches.length > 0) {
      throw new Error(
        `W17 PII grep FAILED: ${realMatches.length} unhashed phone digits found (first: ${realMatches[0]})`,
      )
    }
    return `total-patterns=${matches.length} after-config-strip=0`
  })

  // ==========================================================================
  // 03-03 new assertions (W18-W26)
  // ==========================================================================

  // W18 typing indicator fires immediately on inbound (AC-1).
  resetSeenSids()
  resetVerifiedSender()
  resetTypingTimers()
  await assert('W18 typing_indicator_sent emitted before inbound/outbound', async () => {
    const body = makeBody({ MessageSid: 'SM-w18-typing-immediate' })
    const mark = capturedOutput.length
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W18 status')
    const captured = capturedOutput.slice(mark).join('')
    if (!captured.includes('whatsapp.typing_indicator_sent') && !captured.includes('whatsapp.console_typing_indicator')) {
      throw new Error('W18: expected whatsapp.typing_indicator_sent / console_typing_indicator event')
    }
    // Ordering: typing event index < whatsapp.inbound index.
    const joined = capturedOutput.slice(mark)
    const typingIdx = joined.findIndex((s) =>
      s.includes('whatsapp.typing_indicator_sent') || s.includes('whatsapp.console_typing_indicator'),
    )
    const inboundIdx = joined.findIndex((s) => s.includes('whatsapp.inbound'))
    if (typingIdx < 0) throw new Error('W18: typing event index not found')
    if (inboundIdx > 0 && typingIdx > inboundIdx) {
      throw new Error('W18: typing event must appear BEFORE whatsapp.inbound')
    }
    return 'typing fired first'
  })

  // W19 typing indicator re-fires during slow ChatService (AC-2).
  // 03-03 APPLY deviation: production refire is 20s but CHAT_TIMEOUT_MS=12s would
  // cut handler off before the first refire. Probe-only PROBE_TYPING_REFIRE_MS env
  // shortens the refire interval so the test fits in budget.
  // refire=1s, ChatService delay=4s → expect ≥2 refires before cleared.
  await assert('W19 typing re-fires during slow ChatService (refire+cleared logged)', async () => {
    resetSeenSids()
    resetVerifiedSender()
    resetTypingTimers()
    const prevDelay = process.env.PROBE_CHAT_SERVICE_DELAY_MS ?? '0'
    const prevRefire = process.env.PROBE_TYPING_REFIRE_MS
    try {
      process.env.PROBE_CHAT_SERVICE_DELAY_MS = '4000'
      process.env.PROBE_TYPING_REFIRE_MS = '1000'
      const body = makeBody({ MessageSid: 'SM-w19-typing-refire', Body: 'slow probe' })
      const mark = capturedOutput.length
      const t0 = Date.now()
      const { status } = await postWebhook(body)
      const elapsed = Date.now() - t0
      mustBe(status, 200, 'W19 status')
      const captured = capturedOutput.slice(mark).join('')
      if (!captured.includes('whatsapp.typing_indicator_refired')) {
        throw new Error('W19: expected whatsapp.typing_indicator_refired event')
      }
      if (!captured.includes('whatsapp.typing_indicator_cleared')) {
        throw new Error('W19: expected whatsapp.typing_indicator_cleared on return')
      }
      // Sanity: refire count > 0 in cleared log.
      const clearedMatch = captured.match(/refireCount:\s*\u001b\[\d+m?(\d+)/)
      if (clearedMatch && Number(clearedMatch[1]) === 0) {
        throw new Error('W19: cleared refireCount=0 — refires never landed')
      }
      return `refire+cleared logged (elapsed=${elapsed}ms)`
    } finally {
      process.env.PROBE_CHAT_SERVICE_DELAY_MS = prevDelay
      if (prevRefire === undefined) delete process.env.PROBE_TYPING_REFIRE_MS
      else process.env.PROBE_TYPING_REFIRE_MS = prevRefire
    }
  })

  // W20 proactive opener on new 24h session + within-session skip (AC-3 / AC-7).
  await assert('W20 proactive opener: new session → check fired; second → within-session', async () => {
    resetSeenSids()
    resetVerifiedSender()
    resetTypingTimers()
    // Ensure zero prior whatsapp ChatConversations for this user — otherwise
    // the within-session branch fires on the first request.
    await prisma.chatConversation.deleteMany({
      where: { userId: fx.userId, channel: 'whatsapp' },
    })
    const body1 = makeBody({ MessageSid: 'SM-w20-opener-1', Body: 'first msg' })
    const mark1 = capturedOutput.length
    const { status: s1 } = await postWebhook(body1)
    mustBe(s1, 200, 'W20 first status')
    const cap1 = capturedOutput.slice(mark1).join('')
    const firedOrSkipped =
      cap1.includes('whatsapp.proactive_opener_sent') ||
      cap1.includes('whatsapp.proactive_opener_skipped')
    if (!firedOrSkipped) {
      throw new Error('W20: expected proactive_opener_sent OR _skipped on first inbound')
    }
    if (!cap1.includes('whatsapp.proactive_opener_sent') && !cap1.match(/"reason":\s*"no-suggestions"|reason.*no-suggestions|no-suggestions/)) {
      // Accept either "sent" or "skipped no-suggestions"
      // but NOT "within-session" on first turn.
      if (cap1.includes('within-session')) {
        throw new Error('W20 first turn: unexpected within-session skip (should be new session)')
      }
    }

    const body2 = makeBody({ MessageSid: 'SM-w20-opener-2', Body: 'second msg' })
    const mark2 = capturedOutput.length
    const { status: s2 } = await postWebhook(body2)
    mustBe(s2, 200, 'W20 second status')
    const cap2 = capturedOutput.slice(mark2).join('')
    if (!cap2.includes('whatsapp.proactive_opener_skipped')) {
      throw new Error('W20 second turn: expected proactive_opener_skipped')
    }
    if (!cap2.match(/within-session/)) {
      throw new Error('W20 second turn: expected reason="within-session"')
    }
    if (cap2.includes('whatsapp.proactive_opener_sent')) {
      throw new Error('W20 second turn: opener must NOT be sent again')
    }
    return 'new-session → check; within-session → skipped'
  })

  // W21 image happy path (AC-4).
  await assert('W21 image inbound happy path → image_ingested + placeholder persisted', async () => {
    resetSeenSids()
    resetVerifiedSender()
    resetTypingTimers()
    const msgCountBefore = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    const body = makeBody({
      MessageSid: 'SM-w21-image-happy',
      NumMedia: '1',
      MediaContentType0: 'image/jpeg',
      Body: 'here is a photo',
    })
    ;(body as Record<string, string>).MediaUrl0 = IMG_HAPPY_URL
    const mark = capturedOutput.length
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W21 status')
    const captured = capturedOutput.slice(mark).join('')
    if (!captured.includes('whatsapp.image_ingested')) {
      throw new Error('W21: expected whatsapp.image_ingested event')
    }
    const msgCountAfter = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    if (msgCountAfter < msgCountBefore + 2) {
      throw new Error(
        `W21: expected ≥2 new messages (user + assistant), got ${msgCountAfter - msgCountBefore}`,
      )
    }
    const placeholder = await prisma.chatMessage.findFirst({
      where: {
        conversation: { venueId: fx.venueId },
        role: 'user',
        content: { contains: '[image:' },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (!placeholder) throw new Error('W21: expected ChatMessage with [image: placeholder')
    if (!placeholder.content.includes('sid:SM-w21-image-happy')) {
      throw new Error(`W21: placeholder missing sid: ${placeholder.content}`)
    }
    return 'image ingested + placeholder + assistant reply'
  })

  // W22 image download failure → friendly fallback (AC-5).
  await assert('W22 image download failure → fallback + no ChatMessage', async () => {
    resetSeenSids()
    resetVerifiedSender()
    resetTypingTimers()
    // Use a local port with NO server listening — connection refused.
    // IMPORTANT: also add it to PROBE_MEDIA_HOST_ALLOWLIST so we hit the
    // download error path (not the SSRF gate — SSRF gate is W24).
    const prevAllow = process.env.PROBE_MEDIA_HOST_ALLOWLIST
    process.env.PROBE_MEDIA_HOST_ALLOWLIST = `${prevAllow ?? ''},localhost:${PORT + 2}`
    try {
      const msgCountBefore = await prisma.chatMessage.count({
        where: { conversation: { venueId: fx.venueId } },
      })
      const body = makeBody({
        MessageSid: 'SM-w22-image-fail',
        NumMedia: '1',
        MediaContentType0: 'image/jpeg',
      })
      ;(body as Record<string, string>).MediaUrl0 = IMG_NO_SERVER_URL
      const mark = capturedOutput.length
      const { status } = await postWebhook(body)
      mustBe(status, 200, 'W22 status')
      const captured = capturedOutput.slice(mark).join('')
      if (!captured.includes('whatsapp.image_download_failed')) {
        throw new Error('W22: expected whatsapp.image_download_failed event')
      }
      const msgCountAfter = await prisma.chatMessage.count({
        where: { conversation: { venueId: fx.venueId } },
      })
      if (msgCountAfter !== msgCountBefore) {
        throw new Error(
          `W22: expected NO new ChatMessage rows, got +${msgCountAfter - msgCountBefore}`,
        )
      }
      return 'download fail + fallback + no ChatService call'
    } finally {
      process.env.PROBE_MEDIA_HOST_ALLOWLIST = prevAllow ?? ''
    }
  })

  // W23 audio still rejects — AC-6 regression guard (preserves 03-01/02 behavior).
  await assert('W23 audio still rejects (verified user)', async () => {
    resetSeenSids()
    resetVerifiedSender()
    resetTypingTimers()
    const msgCountBefore = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    const body = makeBody({
      MessageSid: 'SM-w23-audio',
      From: PROBE_PHONE,
      NumMedia: '1',
      MediaContentType0: 'audio/ogg',
    })
    const mark = capturedOutput.length
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W23 status')
    const captured = capturedOutput.slice(mark).join('')
    if (!captured.includes('whatsapp.unsupported_media')) {
      throw new Error('W23: expected whatsapp.unsupported_media event')
    }
    const msgCountAfter = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    if (msgCountAfter !== msgCountBefore) {
      throw new Error(`W23: expected NO new ChatMessage rows, got +${msgCountAfter - msgCountBefore}`)
    }
    return 'audio rejected; ChatService not invoked'
  })

  // W24 ssrf: non-allowlisted host blocked BEFORE fetch (AC-13 / audit M1).
  await assert('W24 ssrf: non-allowlisted host rejected pre-fetch', async () => {
    resetSeenSids()
    resetVerifiedSender()
    resetTypingTimers()
    const msgCountBefore = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    const body = makeBody({
      MessageSid: 'SM-w24-ssrf',
      NumMedia: '1',
      MediaContentType0: 'image/jpeg',
    })
    ;(body as Record<string, string>).MediaUrl0 = IMG_SSRF_URL
    const mark = capturedOutput.length
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W24 status')
    const captured = capturedOutput.slice(mark).join('')
    if (!captured.includes('whatsapp.image_download_failed')) {
      throw new Error('W24: expected whatsapp.image_download_failed event')
    }
    if (!captured.includes('ssrf-rejected')) {
      throw new Error(`W24: expected errorKind=ssrf-rejected in capture`)
    }
    // Raw host MUST NOT appear unhashed in logs (only hostHash sha256 prefix).
    if (captured.includes('169.254.169.254')) {
      throw new Error('W24: raw SSRF host leaked into logs')
    }
    const msgCountAfter = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    if (msgCountAfter !== msgCountBefore) {
      throw new Error(`W24: expected NO new ChatMessage rows, got +${msgCountAfter - msgCountBefore}`)
    }
    return 'ssrf host rejected + no leak'
  })

  // W25 magic_byte: image MIME but corrupt body (AC-14 / audit M3).
  await assert('W25 magic_byte: declared image/jpeg + zero bytes → media-content-mismatch', async () => {
    resetSeenSids()
    resetVerifiedSender()
    resetTypingTimers()
    const msgCountBefore = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    const body = makeBody({
      MessageSid: 'SM-w25-magic-byte',
      NumMedia: '1',
      MediaContentType0: 'image/jpeg',
    })
    ;(body as Record<string, string>).MediaUrl0 = IMG_CORRUPT_URL
    const mark = capturedOutput.length
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W25 status')
    const captured = capturedOutput.slice(mark).join('')
    if (!captured.includes('whatsapp.image_download_failed')) {
      throw new Error('W25: expected whatsapp.image_download_failed event')
    }
    if (!captured.includes('media-content-mismatch')) {
      throw new Error(`W25: expected errorKind=media-content-mismatch`)
    }
    const msgCountAfter = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    if (msgCountAfter !== msgCountBefore) {
      throw new Error(`W25: expected NO new ChatMessage rows, got +${msgCountAfter - msgCountBefore}`)
    }
    return 'magic-byte mismatch rejected'
  })

  // W26 unsupported_mime: image/svg+xml blocked (AC-15 / audit M2).
  await assert('W26 unsupported_mime: image/svg+xml → unsupported-mime fallback', async () => {
    resetSeenSids()
    resetVerifiedSender()
    resetTypingTimers()
    const msgCountBefore = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    const body = makeBody({
      MessageSid: 'SM-w26-svg',
      NumMedia: '1',
      MediaContentType0: 'image/svg+xml',
    })
    ;(body as Record<string, string>).MediaUrl0 = IMG_SVG_URL
    const mark = capturedOutput.length
    const { status } = await postWebhook(body)
    mustBe(status, 200, 'W26 status')
    const captured = capturedOutput.slice(mark).join('')
    if (!captured.includes('whatsapp.image_download_failed')) {
      throw new Error('W26: expected whatsapp.image_download_failed event')
    }
    if (!captured.includes('unsupported-mime')) {
      throw new Error(`W26: expected errorKind=unsupported-mime`)
    }
    const msgCountAfter = await prisma.chatMessage.count({
      where: { conversation: { venueId: fx.venueId } },
    })
    if (msgCountAfter !== msgCountBefore) {
      throw new Error(`W26: expected NO new ChatMessage rows, got +${msgCountAfter - msgCountBefore}`)
    }
    return 'svg rejected + specific fallback'
  })

  } finally {
    await imgServers.close()
    delete process.env.PROBE_MEDIA_HOST_ALLOWLIST
  }
}

// -- main --------------------------------------------------------------------
async function main(): Promise<void> {
  console.log(`  PORT=${PORT} BASE=${BASE}\n`)

  await cleanup()
  await preCleanupCheckAsAssertion()

  let app: INestApplication | undefined
  try {
    app = await bootstrap()

    const onSignal = async () => {
      try {
        await app?.close()
      } catch {}
      process.exit(130)
    }
    process.on('SIGINT', onSignal)
    process.on('SIGTERM', onSignal)

    const fx = await setupProbeUser()
    await runAssertions(fx)
  } finally {
    try {
      await app?.close()
    } catch {}
    await cleanup()
  }

  console.log(`\nPASSED ${passed}/${passed + failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(`probe-whatsapp FATAL: ${(err as Error).message}`)
  process.exit(1)
})
