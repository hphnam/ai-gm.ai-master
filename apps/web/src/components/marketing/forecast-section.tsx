import { Container, Eyebrow } from './primitives'
import { Reveal } from './reveal'

// Copy was run through the humanizer: plain is/has, no em-dash puffery, concrete
// numbers from the forecasting work rather than significance language.
const POINTS = [
  {
    title: 'A range, not a guess',
    body: 'Every forecast comes back as a band with a confidence level attached, so you can see how sure it is before you act on it.',
  },
  {
    title: 'Catches the breakouts',
    body: 'When a day’s takings climb above the top of their expected band, AI-GM flags it at the right severity, usually before you’d have clocked it yourself.',
  },
  {
    title: 'Right down to the keg',
    body: 'The venue total reconciles with the category and item forecasts, so it turns straight into a purchase order. One lager line worked out at about a keg a week, from sales alone.',
  },
  {
    title: 'Carries a new venue',
    body: 'A quiet or just-opened site borrows the weekly shape from your established venues, then stands on its own history as it builds one up.',
  },
]

export function ForecastSection() {
  return (
    <section className="border-b border-[var(--hairline-soft)] bg-[var(--paper-2)]">
      <Container className="pb-[88px] pt-[110px]">
        <div className="mb-[76px] grid items-center gap-16 lg:grid-cols-[0.92fr_1.08fr]">
          <Reveal>
            <Eyebrow className="mb-[22px]">New · Forecasting</Eyebrow>
            <h2 className="font-news text-[clamp(2.25rem,3.6vw,3.125rem)] font-extrabold leading-[1.06] tracking-[-0.028em]">
              It learns your week, then catches the days that{' '}
              <em className="italic text-[var(--brass)]">don’t fit</em>.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[16.5px] leading-[1.65] text-[var(--ink-muted)] text-pretty">
              AI-GM builds a picture of a normal day for each venue and forecasts a range, not a
              single number, with a confidence level attached. When real takings push past the top
              of that range, it says so — and the same forecast carries all the way down to how many
              kegs to put on next week’s order.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <ForecastChart />
          </Reveal>
        </div>

        <div className="grid gap-[30px] sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((point) => (
            <div key={point.title}>
              <div className="mb-4 h-0.5 w-[30px] bg-[var(--brass)]" aria-hidden />
              <h3 className="mb-2.5 text-[18px] font-bold leading-[1.3]">{point.title}</h3>
              <p className="text-[14.5px] leading-[1.6] text-[var(--ink-muted)]">{point.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 max-w-[760px] border-l-[3px] border-[var(--brass)] py-1.5 pl-[22px]">
          <p className="font-news text-[17px] font-medium italic leading-[1.55] text-[var(--ink-muted)] text-pretty">
            Tested against a year of real till data: the band caught a Saturday that took{' '}
            <strong className="font-mono-ledger font-semibold not-italic text-[var(--ink-text)]">
              £2,262
            </strong>{' '}
            against a{' '}
            <strong className="font-mono-ledger font-semibold not-italic text-[var(--ink-text)]">
              £1,550
            </strong>{' '}
            ceiling and flagged it end to end, while holding its 90% confidence within a point of
            target.
          </p>
        </div>
      </Container>
    </section>
  )
}

// The forecast card: a confidence band, dashed expected midline, solid actual
// line, in-range dots and one flagged breach (Saturday). Rendered in its final
// painted state — the draw-on-scroll animation is deliberately left for a later
// pass. Values mirror the real Beer Hall breach the forecaster caught.
const DAYS = [
  { x: 60, label: 'Mon' },
  { x: 170, label: 'Tue' },
  { x: 280, label: 'Wed' },
  { x: 390, label: 'Thu' },
  { x: 500, label: 'Fri' },
  { x: 610, label: 'Sat' },
  { x: 720, label: 'Sun' },
]

const IN_RANGE_DOTS = [
  { cx: 60, cy: 210 },
  { cx: 170, cy: 205 },
  { cx: 280, cy: 216 },
  { cx: 390, cy: 168 },
  { cx: 500, cy: 128 },
  { cx: 720, cy: 176 },
]

function ForecastChart() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--ledger-card)] shadow-[0_24px_60px_-28px_rgba(32,26,18,0.35),0_2px_6px_rgba(32,26,18,0.08)]">
      <div className="flex items-center justify-between border-b border-[var(--hairline-soft)] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-[30px] place-items-center rounded-[7px] bg-[var(--brass)]">
            <span className="size-2.5 rotate-45 bg-[var(--cream-hi)]" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold">Next 7 days · Beer Hall</span>
        </div>
        <span className="font-mono-ledger rounded-full border border-[rgba(32,26,18,0.2)] px-[11px] py-1.5 text-[11px] font-semibold text-[var(--ink-muted)]">
          90% band
        </span>
      </div>

      <div className="px-[18px] pb-2 pt-5">
        <svg
          viewBox="0 0 780 340"
          className="block h-auto w-full"
          role="img"
          aria-label="Forecast for the next seven days at Beer Hall, showing the expected confidence band, the actual takings line in range Monday to Friday and Sunday, and a flagged Saturday breach of £2,262 above the expected ceiling."
          style={{ fontFamily: 'var(--font-spline-mono), ui-monospace, monospace' }}
        >
          {/* confidence band */}
          <path
            d="M 60 196 C 78.3 195.7, 133.3 193.0, 170 194 C 206.7 195.0, 243.3 208.3, 280 202 C 316.7 195.7, 353.3 169.7, 390 156 C 426.7 142.3, 463.3 128.7, 500 120 C 536.7 111.3, 573.3 97.0, 610 104 C 646.7 111.0, 701.7 152.3, 720 162 L 720 202 C 701.7 191.7, 646.7 147.0, 610 140 C 573.3 133.0, 536.7 150.3, 500 160 C 463.3 169.7, 426.7 185.0, 390 198 C 353.3 211.0, 316.7 232.3, 280 238 C 243.3 243.7, 206.7 232.7, 170 232 C 133.3 231.3, 78.3 233.7, 60 234 Z"
            fill="rgba(143,107,31,.16)"
          />
          {/* expected midline (dashed) */}
          <path
            d="M 60 216 C 78.3 215.3, 133.3 211.3, 170 212 C 206.7 212.7, 243.3 226.0, 280 220 C 316.7 214.0, 353.3 189.3, 390 176 C 426.7 162.7, 463.3 149.3, 500 140 C 536.7 130.7, 573.3 113.0, 610 120 C 646.7 127.0, 701.7 171.7, 720 182"
            fill="none"
            stroke="rgba(32,26,18,.32)"
            strokeWidth="1.5"
            strokeDasharray="2 5"
            strokeLinecap="round"
          />
          {/* actual line (solid) */}
          <path
            d="M 60 210 C 78.3 209.2, 133.3 204.0, 170 205 C 206.7 206.0, 243.3 222.2, 280 216 C 316.7 209.8, 353.3 182.7, 390 168 C 426.7 153.3, 463.3 140.0, 500 128 C 536.7 116.0, 573.3 88.0, 610 96 C 646.7 104.0, 701.7 162.7, 720 176"
            fill="none"
            stroke="#201A12"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* in-range dots */}
          {IN_RANGE_DOTS.map((d) => (
            <circle key={`${d.cx}-${d.cy}`} cx={d.cx} cy={d.cy} r="5" fill="#2F5D3D" />
          ))}
          {/* breach dot + flag (Sat) */}
          <circle cx="610" cy="96" r="6.5" fill="#9A4B2C" />
          <circle
            cx="610"
            cy="96"
            r="12"
            fill="none"
            stroke="#9A4B2C"
            strokeWidth="1.5"
            opacity=".35"
          />
          <rect x="625" y="84" width="74" height="26" rx="5" fill="#9A4B2C" />
          <text x="662" y="101" textAnchor="middle" fill="#F5EFE3" fontSize="14" fontWeight="600">
            £2,262
          </text>
          {/* x-axis */}
          {DAYS.map((day) => (
            <text
              key={day.label}
              x={day.x}
              y="322"
              textAnchor="middle"
              fill="#8A7D63"
              fontSize="13"
            >
              {day.label}
            </text>
          ))}
        </svg>

        <div className="mt-1.5 flex flex-wrap gap-[22px] border-t border-[rgba(32,26,18,0.08)] px-1.5 pb-4 pt-3 text-[12px] font-medium text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-[9px] w-4 rounded-sm bg-[rgba(143,107,31,0.28)]" aria-hidden />
            Expected band
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-[9px] rounded-full bg-[var(--ledger-green)]" aria-hidden />
            Actual, in range
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-[9px] rounded-full bg-[var(--clay)]" aria-hidden />
            Breach, flagged
          </span>
        </div>
      </div>
    </div>
  )
}
