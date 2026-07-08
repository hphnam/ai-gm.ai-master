import type { Metadata } from 'next'
import { Container, Eyebrow } from '@/components/marketing/primitives'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Changelog',
  description: 'What’s new in gm-ai: shipped improvements for hospitality operators.',
  path: '/changelog',
})

type Release = {
  version: string
  date: string
  tag: 'New' | 'Improved' | 'Fixed'
  title: string
  items: string[]
}

const RELEASES: Release[] = [
  {
    version: '0.6',
    date: '21 June 2026',
    tag: 'Improved',
    title: 'Sharper Square reporting',
    items: [
      'Top sellers now group by item with pint / half-pint splits, matching the Square Reports app.',
      'Tender mix is computed from order tenders, fixing cash-vs-card totals that previously undercounted.',
      'COGS reconciles from catalogue unit cost so GP answers land on real margin, not a fallback message.',
    ],
  },
  {
    version: '0.5',
    date: '5 June 2026',
    tag: 'New',
    title: 'Per-org capability routing',
    items: [
      'The chat tool surface is now scoped per organisation to its active integrations.',
      'Live-number questions always reach the POS tool first, so a stale document can no longer make the assistant claim data is unavailable.',
    ],
  },
  {
    version: '0.4',
    date: '18 May 2026',
    tag: 'New',
    title: 'Cited answers & knowledge capture',
    items: [
      'Every operational answer now cites the source document it drew from.',
      'Save a new SOP in the same conversation that surfaced the gap, then notify the team.',
      'Compliance reminders fire at 30 / 7 / 1 day and overdue windows.',
    ],
  },
]

const TAG_STYLE: Record<Release['tag'], string> = {
  New: 'bg-primary text-primary-foreground',
  Improved: 'bg-secondary text-foreground',
  Fixed: 'border border-border text-muted-foreground',
}

export default function ChangelogPage() {
  return (
    <section className="py-16 sm:py-20">
      <Container className="max-w-3xl">
        <div className="flex flex-col gap-4">
          <Eyebrow>Changelog</Eyebrow>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            What’s new.
          </h1>
          <p className="max-w-xl text-pretty text-lg text-muted-foreground">
            Shipped improvements, newest first. We build in the open, with a working operator.
          </p>
        </div>

        <ol className="mt-14 space-y-12 border-l border-border pl-8">
          {RELEASES.map((release) => (
            <li key={release.version} className="relative">
              <span
                className="absolute -left-[2.30rem] top-1.5 size-2.5 rounded-full border-2 border-background bg-foreground"
                aria-hidden
              />
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">v{release.version}</span>
                <span className="text-sm text-muted-foreground">{release.date}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TAG_STYLE[release.tag]}`}
                >
                  {release.tag}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-medium tracking-tight">{release.title}</h2>
              <ul className="mt-3 space-y-2">
                {release.items.map((item) => (
                  <li
                    key={item}
                    className="relative pl-5 text-sm leading-relaxed text-muted-foreground before:absolute before:left-0 before:top-2.5 before:size-1 before:rounded-full before:bg-muted-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
