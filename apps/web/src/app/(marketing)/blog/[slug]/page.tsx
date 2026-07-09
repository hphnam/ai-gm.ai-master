import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CtaBand } from '@/components/marketing/cta-band'
import { formatPostDate, getPost, POSTS } from '@/components/marketing/posts'
import { Container } from '@/components/marketing/primitives'
import { pageMetadata } from '@/lib/seo'

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: 'Post not found' }
  return pageMetadata({ title: post.title, description: post.excerpt, path: `/blog/${post.slug}` })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <>
      <article className="py-16 sm:py-20">
        <Container className="max-w-2xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            All posts
          </Link>

          <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium uppercase tracking-wide">
              {post.category}
            </span>
            <span>{formatPostDate(post.date)}</span>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>

          <h1 className="font-news mt-4 text-balance text-[clamp(2rem,3.5vw,2.75rem)] font-extrabold leading-[1.1] tracking-[-0.025em]">
            {post.title}
          </h1>

          <div className="mt-8 flex flex-col gap-5">
            {post.body.map((paragraph, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static prose, order is stable
              <p key={i} className="text-pretty leading-relaxed text-foreground/90">
                {paragraph}
              </p>
            ))}
          </div>
        </Container>
      </article>

      <CtaBand />
    </>
  )
}
