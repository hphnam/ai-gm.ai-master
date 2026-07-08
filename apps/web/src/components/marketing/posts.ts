export type Post = {
  slug: string
  title: string
  excerpt: string
  date: string
  readingTime: string
  category: string
  // Body paragraphs. Plain text for the scaffold — swap for MDX when the blog
  // graduates from placeholder to real.
  body: string[]
}

export const POSTS: Post[] = [
  {
    slug: 'why-pos-grounded',
    title: 'Why an operator copilot has to be POS-grounded',
    excerpt:
      'Checklist AI can tell you the opening procedure. It can’t tell you last night’s GP. Here’s why that gap defines the category.',
    date: '2026-06-02',
    readingTime: '4 min read',
    category: 'Product',
    body: [
      'A GM’s hardest questions aren’t about procedure. They’re about money. “What’s my margin?” “Where am I overspending on labour?” “Which line can take a price rise?” None of those can be answered from a document. They need the till.',
      'That’s the line between a knowledge tool and an operator copilot. Knowledge tools retrieve SOPs. An operator copilot reconciles your sales against COGS, reads your labour against your shifts, and grounds every recommendation in what actually happened last night.',
      'We made the call early: gm-ai connects to your POS first, then your documents. The documents make the POS data legible. A price recommendation cites your pricing ladder; an ops answer cites your prep routine. Together they answer the question the way the GM would ask it.',
    ],
  },
  {
    slug: 'starter-library-knows-beer',
    title: 'A starter library that already knows your venue',
    excerpt:
      'Generic tools start from an empty box. We pre-load the 25 to 30 docs an operator would recognise on sight.',
    date: '2026-05-20',
    readingTime: '3 min read',
    category: 'Library',
    body: [
      'The empty state is where most knowledge tools die. A GM signs up, sees a blank corpus, and never comes back to fill it.',
      'So we start full. Front of house: opening and closing checklists, cleaning rotas, handover templates. Kitchen and bar: prep routines, line-cleaning cycles, temperature and stock logs, equipment troubleshooting. Compliance: HACCP, allergens, fire safety, COSHH, DPS responsibilities. Commercial: GP targets and pricing ladders.',
      'An operator reads that list and nods. That recognition is the difference between a tool they configure and a tool they trust on day one.',
    ],
  },
  {
    slug: 'cite-every-claim',
    title: 'Cited, not asserted: why every answer points to a source',
    excerpt:
      'Asserted confidence is how operational knowledge drifts. We make trust verifiable by citing the document behind every claim.',
    date: '2026-05-08',
    readingTime: '3 min read',
    category: 'Trust',
    body: [
      'When an AI says “clean down the station every night,” the GM has no way to know if that’s your policy or a guess. Over time, guesses become procedure, and procedure drifts.',
      'gm-ai cites the source document on every operational claim. The GM can open the exact SOP an answer came from, and if it’s wrong or out of date, fix it in the same chat.',
      'Verifiable beats confident. It’s slower to build and it’s the right default for a tool people make real decisions from.',
    ],
  },
]

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug)
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
