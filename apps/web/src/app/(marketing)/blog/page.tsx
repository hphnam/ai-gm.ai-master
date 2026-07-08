import type { Metadata } from 'next'
import Link from 'next/link'
import { formatPostDate, POSTS } from '@/components/marketing/posts'
import { Container, Eyebrow } from '@/components/marketing/primitives'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Blog',
  description: 'Notes on building an operator copilot for hospitality.',
  path: '/blog',
})

export default function BlogIndexPage() {
  return (
    <section className="py-16 sm:py-20">
      <Container className="flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          <Eyebrow>Blog</Eyebrow>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Notes from the floor.
          </h1>
          <p className="max-w-xl text-pretty text-lg text-muted-foreground">
            How we’re building an AI operator for hospitality: the decisions, the evidence, and what
            we’re learning from real venues.
          </p>
        </div>

        <ul className="divide-y divide-border border-y border-border">
          {POSTS.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-3 py-7 transition-colors sm:flex-row sm:items-baseline sm:gap-8"
              >
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground sm:w-44 sm:flex-col sm:items-start sm:gap-1.5">
                  <span className="rounded-full bg-secondary px-2.5 py-1 font-medium uppercase tracking-wide">
                    {post.category}
                  </span>
                  <span>{formatPostDate(post.date)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-medium tracking-tight group-hover:underline">
                    {post.title}
                  </h2>
                  <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                    {post.excerpt}
                  </p>
                  <span className="text-xs text-muted-foreground">{post.readingTime}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
