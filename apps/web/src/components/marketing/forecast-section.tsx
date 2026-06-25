import { ForecastBand } from './forecast-band'
import { Container, SectionHeading } from './primitives'

// Copy was run through the humanizer: plain is/has, no em dashes, concrete
// numbers from the forecasting work rather than significance puffery.
const POINTS = [
  {
    title: 'A range, not a guess',
    body: 'Every forecast comes back as a band with a confidence level attached, so you can see how sure it is before you act on it.',
  },
  {
    title: 'Catches the breakouts',
    body: 'When a day’s takings climb above the top of their expected band, gm-ai flags it at the right severity, usually before you’d have clocked it yourself.',
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
    <section className="border-t border-border bg-card/40 py-20 sm:py-28">
      <Container className="flex flex-col gap-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <SectionHeading
            eyebrow="New · Forecasting"
            title="It learns your week, then catches the days that don’t fit."
            lede="gm-ai builds a picture of a normal day for each venue and forecasts a range, not a single number, with a confidence level attached. When real takings push past the top of that range, it says so. The same forecast carries all the way down to how many kegs to put on next week’s order."
          />
          <ForecastBand />
        </div>

        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((point) => (
            <div key={point.title} className="flex flex-col gap-2 bg-card p-6">
              <h3 className="font-medium">{point.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{point.body}</p>
            </div>
          ))}
        </div>

        <p className="max-w-3xl text-sm text-muted-foreground">
          Tested against a year of real till data: the band caught a Saturday that took £2,262
          against a £1,550 ceiling and flagged it end to end, while holding its 90% confidence
          within a point of target.
        </p>
      </Container>
    </section>
  )
}
