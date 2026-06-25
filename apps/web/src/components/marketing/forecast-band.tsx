import { cn } from '@/lib/utils'

// A static data-viz of the forecasting band, used as the hero artifact for the
// forecasting section. Seven days of revenue: the shaded band is the expected
// range, the dashed line the central forecast, the dots the actuals. Saturday's
// actual sits above the band and is flagged — the breach the model catches.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// c = central forecast, b = half-band width, a = actual (all as 0..1 of the
// plot height). Tuned to the real weekly rhythm: quiet start, Thu–Sat peak.
const SERIES = [
  { c: 0.34, b: 0.12, a: 0.33 },
  { c: 0.31, b: 0.12, a: 0.35 },
  { c: 0.33, b: 0.12, a: 0.3 },
  { c: 0.6, b: 0.13, a: 0.58 },
  { c: 0.76, b: 0.13, a: 0.79 },
  { c: 0.8, b: 0.12, a: 0.95 }, // breach: actual above the band ceiling
  { c: 0.46, b: 0.12, a: 0.48 },
]

const W = 640
const H = 260
const PAD = { l: 16, r: 16, t: 30, b: 34 }

const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (SERIES.length - 1)
const y = (frac: number) => PAD.t + (1 - frac) * (H - PAD.t - PAD.b)

const isBreach = (d: (typeof SERIES)[number]) => d.a > d.c + d.b

export function ForecastBand({ className }: { className?: string }) {
  const upper = SERIES.map((d, i) => `${x(i)},${y(d.c + d.b)}`)
  const lower = SERIES.map((d, i) => `${x(i)},${y(d.c - d.b)}`).reverse()
  const bandPath = `M ${upper.join(' L ')} L ${lower.join(' L ')} Z`
  const centerPts = SERIES.map((d, i) => `${x(i)},${y(d.c)}`).join(' ')
  const actualPts = SERIES.map((d, i) => `${x(i)},${y(d.a)}`).join(' ')
  const breachIndex = SERIES.findIndex(isBreach)
  const breach = SERIES[breachIndex]

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-foreground/[0.06]',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground">
            G
          </span>
          <span className="text-sm font-medium">Next 7 days · Beer Hall</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
          90% band
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label="A seven-day revenue forecast drawn as a confidence band. Six days land inside the expected range; Saturday's takings of £2,262 sit above the band ceiling and are flagged."
        >
          <path d={bandPath} className="fill-[var(--chart-2)]" opacity={0.18} />
          <polyline
            points={centerPts}
            fill="none"
            className="stroke-muted-foreground"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.5}
          />
          <polyline
            points={actualPts}
            fill="none"
            className="stroke-foreground"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {SERIES.map((d, i) =>
            isBreach(d) ? (
              <g key={DAYS[i]}>
                <circle
                  cx={x(i)}
                  cy={y(d.a)}
                  r={9}
                  className="fill-[var(--chart-3)]"
                  opacity={0.22}
                />
                <circle cx={x(i)} cy={y(d.a)} r={4.5} className="fill-[var(--chart-3)]" />
              </g>
            ) : (
              <circle
                key={DAYS[i]}
                cx={x(i)}
                cy={y(d.a)}
                r={3.5}
                className="fill-[var(--chart-1)]"
              />
            ),
          )}

          {DAYS.map((day, i) => (
            <text
              key={day}
              x={x(i)}
              y={H - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {day}
            </text>
          ))}

          {/* Breach callout, set to the right of the dot so it never clips the top. */}
          <g>
            <rect
              x={x(breachIndex) + 10}
              y={y(breach.a) - 11}
              width={56}
              height={22}
              rx={6}
              className="fill-[var(--chart-3)]"
            />
            <text
              x={x(breachIndex) + 38}
              y={y(breach.a) + 4}
              textAnchor="middle"
              className="fill-white text-[11px] font-semibold"
            >
              £2,262
            </text>
          </g>
        </svg>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-[var(--chart-2)]/40" aria-hidden />
            Expected band
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--chart-1)]" aria-hidden />
            Actual, in range
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--chart-3)]" aria-hidden />
            Breach, flagged
          </span>
        </div>
      </div>
    </div>
  )
}
