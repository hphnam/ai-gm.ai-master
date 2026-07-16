import type { Metadata } from 'next'
import { ForecastSection } from '@/components/marketing/forecast-section'
import { HeroChat } from '@/components/marketing/hero-chat'
import {
  CitationChip,
  Container,
  Diamond,
  Eyebrow,
  OutlineButton,
  SolidButton,
} from '@/components/marketing/primitives'
import { Reveal } from '@/components/marketing/reveal'
import { StructuredData } from '@/components/marketing/structured-data'
import { pageMetadata } from '@/lib/seo'

const HOME_DESCRIPTION =
  'Ask in plain English. AI-GM answers from your till, your labour and your own operating docs — every claim cited back to its source. A general manager in a chat box for pubs, bars, restaurants and groups.'

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'The AI operator for hospitality',
    description: HOME_DESCRIPTION,
    path: '/',
  }),
  title: { absolute: 'AI-GM — the AI operator for hospitality' },
}

const MARQUEE = [
  'What did I spend on staff last night?',
  'Which beer could I put the price up on?',
  'How do I clean a beer line?',
  "Who's still working?",
  'Who do I call if the ice machine is down?',
  "What's my GP yesterday?",
]

const PROBLEMS = [
  { n: '01', title: 'The POS', body: 'Has every number. Tells you no story.' },
  {
    n: '02',
    title: 'The spreadsheets',
    body: 'Labour, stock, pricing history — always a week stale.',
  },
  {
    n: '03',
    title: 'Tribal knowledge',
    body: "Vendor contacts, opening rituals, troubleshooting. All in people's heads.",
  },
  {
    n: '04',
    title: 'The group chat',
    body: 'Half-decisions and drifting procedure, buried in WhatsApp.',
  },
]

const CAPABILITIES = [
  {
    kicker: 'SOP capture',
    title: 'Fix the gap where you found it',
    body: 'Spot a missing procedure mid-question? Dictate the SOP in the same chat, AI-GM writes it up, files it, and notifies the team. Cited from then on.',
  },
  {
    kicker: 'Role-aware',
    title: 'Staff see ops. Margin stays yours.',
    body: 'Everyone gets the operational brain — rotas, SOPs, who to call. Financials and commercials answer only to managers. Read-only, venue-scoped, always.',
  },
  {
    kicker: 'WhatsApp',
    title: 'Lives where your team already talks',
    body: 'The same brain answers over WhatsApp — no new app to force on a Friday-night team. Ask from the cellar, the bar, or the back office.',
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Connect the till',
    body: 'Square today; Xero, Toast, Lightspeed and Google Calendar next. Read-only and venue-scoped — AI-GM can look, never touch.',
  },
  {
    n: '2',
    title: 'Load your docs',
    body: 'Prep sheets, compliance, supplier lists — or start from the hospitality library tuned to your venue type and make it yours over time.',
  },
  {
    n: '3',
    title: "Ask like you'd ask your GM",
    body: 'Plain English, straight answers, every claim cited. On the web or in WhatsApp, from day one.',
  },
]

const PROOF = [
  { stat: '586', suffix: null, label: 'messages in the first 19 days — still accelerating' },
  { stat: '4', suffix: '/4', label: 'venues of one hospitality group running live today' },
  { stat: '70+', suffix: null, label: 'venue SOPs in the loop, cited on every answer' },
]

export default function MarketingHome() {
  return (
    <>
      <StructuredData />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        id="top"
        className="relative overflow-hidden"
        style={{ background: 'var(--ledger-rule), var(--paper)' }}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-[68px] w-px bg-[rgba(154,75,44,0.18)]"
          aria-hidden
        />
        <Container className="grid items-center gap-16 py-[84px] pb-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="[animation:gmRise_0.7s_ease_both]">
            <Eyebrow className="mb-[26px]">The AI operator for hospitality</Eyebrow>
            <h1 className="font-news text-[clamp(3rem,5.4vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              Last night&apos;s <em className="italic text-[var(--brass)]">margin</em>, this
              morning.
            </h1>
            <p className="mt-6 max-w-[46ch] text-[18px] leading-[1.6] text-[var(--ink-muted)] text-pretty">
              Ask in plain English. AI-GM answers from your till, your labour, and your own
              operating docs — every claim cited back to its source. A general manager in a chat
              box, for pubs, bars, restaurants and groups.
            </p>
            <div className="mt-[34px] flex flex-wrap items-center gap-3.5">
              <SolidButton href="/auth/sign-up">Start free trial</SolidButton>
              <OutlineButton href="#ledger">See it answer</OutlineButton>
            </div>
            <div className="font-mono-ledger mt-6 text-[12.5px] tracking-[0.3px] text-[var(--mono-muted)]">
              14-day trial &nbsp;·&nbsp; no card &nbsp;·&nbsp; live in an afternoon
            </div>
          </div>
          <div className="[animation:gmRise_0.7s_ease_0.15s_both]">
            <HeroChat />
          </div>
        </Container>
      </section>

      {/* ── Question marquee ─────────────────────────────────── */}
      <section
        className="overflow-hidden border-y border-[var(--ink-hairline-2)] bg-[var(--ink)] py-[18px]"
        aria-label="Questions operators ask"
      >
        <div className="gm-marquee flex w-max [animation:gmMarquee_38s_linear_infinite]">
          {[0, 1].map((track) => (
            <div
              key={track}
              className="font-mono-ledger flex items-center gap-[34px] whitespace-nowrap pr-[34px] text-[14px] font-medium text-[var(--cream-mid)]"
              aria-hidden={track === 1}
            >
              {MARQUEE.map((q) => (
                <span key={q} className="flex items-center gap-[34px]">
                  <span>&ldquo;{q}&rdquo;</span>
                  <Diamond />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────── */}
      <section className="border-b border-[var(--hairline-soft)] bg-[var(--paper-2)]">
        <Container className="grid items-start gap-[72px] py-[110px] lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <Eyebrow tone="clay" className="mb-[22px]">
              The problem
            </Eyebrow>
            <h2 className="font-news text-[clamp(2.25rem,3.6vw,3.125rem)] font-extrabold leading-[1.06] tracking-[-0.028em]">
              One question, five tools, no time.
            </h2>
            <p className="mt-5 max-w-[44ch] text-[16.5px] leading-[1.65] text-[var(--ink-muted)] text-pretty">
              Every venue runs across the same broken surfaces. Answering one straight question
              means switching between all of them — so most nights, the question doesn&apos;t get
              asked.
            </p>
          </Reveal>
          <div className="border-t border-[var(--hairline-strong)]">
            {PROBLEMS.map((p) => (
              <div
                key={p.n}
                className="grid grid-cols-[44px_1fr] items-baseline gap-[18px] border-b border-[var(--hairline)] py-6"
              >
                <span className="font-mono-ledger text-[13px] font-bold text-[var(--clay)]">
                  {p.n}
                </span>
                <div>
                  <div className="mb-1 text-[18px] font-bold leading-[1.3]">{p.title}</div>
                  <div className="text-[15px] leading-[1.55] text-[var(--ink-muted)]">{p.body}</div>
                </div>
              </div>
            ))}
            <p className="font-news pt-6 text-[19px] font-medium italic leading-[1.4] text-[var(--brass)]">
              AI-GM collapses all four into one chat.
            </p>
          </div>
        </Container>
      </section>

      {/* ── Live P&L (dark) ──────────────────────────────────── */}
      <section id="ledger" className="scroll-mt-20 bg-[var(--ink)] text-[var(--cream)]">
        <Container className="grid items-center gap-[72px] py-[110px] lg:grid-cols-2">
          <Reveal>
            <Eyebrow tone="brass-dark" className="mb-[22px]">
              The margin machine
            </Eyebrow>
            <h2 className="font-news text-[clamp(2.25rem,3.6vw,3.125rem)] font-extrabold leading-[1.06] tracking-[-0.028em] text-[var(--cream-hi)]">
              Your P&amp;L, live from the till.
            </h2>
            <p className="mt-5 max-w-[44ch] text-[16.5px] leading-[1.65] text-[var(--cream-soft)] text-pretty">
              GP reconciled against COGS the moment service ends. Labour against sales by shift.
              Which lines to raise and how the rise lands. No spreadsheet gymnastics, no waiting on
              the accountant.
            </p>
            <div className="mt-7 flex flex-col gap-3 text-[15px] leading-[1.5] text-[var(--cream)]">
              {[
                'Live GP & P&L, straight off the POS',
                "Labour vs sales by shift — including who's on right now",
                'Pricing intelligence against local market rate',
              ].map((point) => (
                <div key={point} className="flex items-baseline gap-3">
                  <span
                    className="mt-0.5 size-1.5 flex-none rotate-45 bg-[var(--brass-dark)]"
                    aria-hidden
                  />
                  {point}
                </div>
              ))}
            </div>
          </Reveal>

          {/* P&L card */}
          <div className="overflow-hidden rounded-xl border border-[var(--ink-hairline)] bg-[var(--ink-2)] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.7)]">
            <div className="font-mono-ledger flex items-center justify-between border-b border-[var(--ink-hairline)] px-5 py-3.5 text-[11.5px] font-medium text-[var(--cream-muted)]">
              <span>TUE 8 JUL · CLOSED 23:40</span>
              <span className="text-[var(--brass-dark)]">SQUARE · LIVE</span>
            </div>
            <div className="font-mono-ledger px-5 pb-5 pt-2">
              {[
                { label: 'Net sales', value: '£2,551', big: true },
                { label: 'COGS · reconciled', value: '£811', big: true },
                { label: 'Gross profit', value: '68.2%', gp: true },
                { label: 'Labour · 6 on shift', value: '£684 · 26.8%', big: true },
                { label: 'vs last Tuesday', value: '+6.4%', pos: true, last: true },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`flex items-baseline justify-between py-3.5 ${row.last ? '' : 'border-b border-[var(--ink-hairline-2)]'}`}
                >
                  <span className="text-[14px] text-[var(--cream-soft)]">{row.label}</span>
                  <span
                    className={
                      row.gp
                        ? 'text-[22px] font-bold text-[var(--ledger-green-ink)]'
                        : row.pos
                          ? 'text-[17px] font-bold text-[var(--ledger-green-ink)]'
                          : 'text-[17px] font-semibold'
                    }
                  >
                    {row.value}
                  </span>
                </div>
              ))}
              <div className="font-news mt-1.5 rounded-lg border border-dashed border-[#4A3F2A] px-3.5 py-3 text-[14.5px] italic leading-[1.5] text-[var(--cream-mid)]">
                &ldquo;You beat last Tuesday on sales and held labour under 27% — the pts came from
                the kitchen rota trim.&rdquo;
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Citations ────────────────────────────────────────── */}
      <section id="cited" className="scroll-mt-20 bg-[var(--paper)]">
        <Container className="py-[110px]">
          <Reveal className="mx-auto mb-16 max-w-[640px] text-center">
            <Eyebrow rule={false} className="mb-[22px] justify-center">
              Verifiable beats confident
            </Eyebrow>
            <h2 className="font-news text-[clamp(2.25rem,3.6vw,3.125rem)] font-extrabold leading-[1.06] tracking-[-0.028em]">
              Cited, not asserted.
            </h2>
            <p className="mx-auto mt-4 max-w-[60ch] text-[16.5px] leading-[1.65] text-[var(--ink-muted)] text-pretty">
              Every operational answer points back to the exact document it came from — your prep
              sheets, compliance docs and supplier lists, or a starter hospitality library tuned to
              your venue.
            </p>
          </Reveal>

          <div className="mx-auto grid max-w-[880px] items-center gap-6 md:grid-cols-[1.25fr_44px_1fr] md:gap-0">
            <div className="rounded-xl border border-[var(--hairline)] bg-[var(--ledger-card)] p-6 shadow-[0_14px_40px_-20px_rgba(32,26,18,0.3)]">
              <div className="font-mono-ledger mb-3 text-[12px] font-medium text-[var(--mono-muted)]">
                THE ANSWER
              </div>
              <p className="mb-3.5 text-[15.5px] leading-[1.6]">
                Your cask lines get a full clean every <strong>7 days</strong>, kegs every{' '}
                <strong>14</strong> — last logged clean was Sunday, so casks are due tomorrow.
              </p>
              <div className="flex flex-wrap gap-2">
                <CitationChip>Cellar SOP — line cleaning.pdf · p.2</CitationChip>
                <CitationChip>Cleaning log · Sun 6 Jul</CitationChip>
              </div>
            </div>
            <div className="font-mono-ledger hidden place-items-center text-[22px] text-[var(--brass)] md:grid">
              →
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                {
                  title: 'Cellar SOP — line cleaning.pdf',
                  meta: 'Your document · uploaded by Sam, May ’26',
                },
                {
                  title: 'Cleaning log',
                  meta: 'Captured in chat · cited on every answer since',
                },
              ].map((doc) => (
                <div
                  key={doc.title}
                  className="rounded-[10px] border border-[rgba(32,26,18,0.16)] bg-[var(--paper-2)] px-[18px] py-4"
                >
                  <div className="mb-0.5 text-[13.5px] font-bold leading-[1.3]">{doc.title}</div>
                  <div className="text-[12.5px] leading-[1.4] text-[var(--ink-muted)]">
                    {doc.meta}
                  </div>
                </div>
              ))}
              <p className="font-news px-0.5 pt-1 text-[15px] font-medium italic leading-[1.4] text-[var(--brass)]">
                70+ venue SOPs in the loop today.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Capabilities ─────────────────────────────────────── */}
      <section className="border-y border-[var(--hairline-soft)] bg-[var(--paper-2)]">
        <Container className="grid gap-7 py-24 md:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.kicker}
              className="rounded-xl border border-[var(--hairline)] bg-[var(--paper)] px-7 py-[30px]"
            >
              <div className="font-mono-ledger mb-[18px] text-[13px] font-bold uppercase text-[var(--brass)]">
                {cap.kicker}
              </div>
              <h3 className="font-news mb-2.5 text-[22px] font-bold leading-[1.25] tracking-[-0.01em]">
                {cap.title}
              </h3>
              <p className="text-[14.5px] leading-[1.6] text-[var(--ink-muted)]">{cap.body}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how" className="scroll-mt-20 bg-[var(--paper)]">
        <Container className="py-[110px]">
          <Reveal className="mb-16 max-w-[620px]">
            <Eyebrow className="mb-[22px]">How it works</Eyebrow>
            <h2 className="font-news text-[clamp(2.25rem,3.6vw,3.125rem)] font-extrabold leading-[1.06] tracking-[-0.028em]">
              Live in an afternoon.
            </h2>
          </Reveal>
          <div className="grid gap-7 border-t border-[var(--hairline-strong)] md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="px-1 pt-7">
                <div className="font-news mb-4 text-[44px] font-extrabold leading-none text-[var(--brass)]">
                  {step.n}
                </div>
                <h3 className="mb-2 text-[19px] font-bold leading-[1.3]">{step.title}</h3>
                <p className="text-[14.5px] leading-[1.6] text-[var(--ink-muted)]">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Forecasting ──────────────────────────────────────── */}
      <ForecastSection />

      {/* ── Proof + quote (dark) ─────────────────────────────── */}
      <section id="proof" className="scroll-mt-20 bg-[var(--ink)] text-[var(--cream)]">
        <Container className="py-[110px] pb-24">
          <div className="mb-[88px] grid gap-7 text-center md:grid-cols-3">
            {PROOF.map((item) => (
              <div key={item.label} className="border-t border-[var(--ink-hairline)] pt-[26px]">
                <div className="font-mono-ledger text-[52px] font-bold leading-none tracking-[-2px] text-[var(--cream-hi)]">
                  {item.stat}
                  {item.suffix ? (
                    <span className="text-[30px] text-[var(--brass-dark)]">{item.suffix}</span>
                  ) : null}
                </div>
                <div className="mt-2 text-[13px] font-medium leading-[1.5] text-[var(--cream-muted)]">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
          <Reveal className="mx-auto max-w-[860px] text-center">
            <div className="font-news mb-5 text-[26px] leading-none text-[var(--brass)]">
              &ldquo;
            </div>
            <blockquote className="font-news text-balance text-[clamp(1.625rem,3vw,2.375rem)] font-medium italic leading-[1.3] tracking-[-0.02em] text-[var(--cream-hi)]">
              I want to know last night&apos;s margin this morning, not next week off a spreadsheet.
              AI-GM is the first thing that answers that the way I&apos;d actually ask it.
            </blockquote>
            <div className="font-mono-ledger mt-7 text-[13px] leading-[1.6] text-[var(--cream-muted)]">
              OWNER-OPERATOR · FOUR-PUB CRAFT GROUP &amp; BREWERY
              <br />
              THE PRIMARY DAILY USER — ~30 MESSAGES A DAY
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section id="cta" style={{ background: 'var(--ledger-rule), var(--paper)' }}>
        <Container className="py-[120px] text-center">
          <h2 className="font-news text-[clamp(2.5rem,4.4vw,3.75rem)] font-extrabold leading-[1.04] tracking-[-0.03em]">
            Stop reconciling.
            <br />
            <em className="italic text-[var(--brass)]">Start asking.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-[17px] leading-[1.6] text-[var(--ink-muted)] text-pretty">
            Connect the till, load your docs, and ask your first question before tonight&apos;s
            service.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3.5">
            <SolidButton href="/auth/sign-up" size="lg">
              Start free trial
            </SolidButton>
            <span className="font-mono-ledger text-[12.5px] text-[var(--mono-muted)]">
              14 days · no card
            </span>
          </div>
        </Container>
      </section>
    </>
  )
}
