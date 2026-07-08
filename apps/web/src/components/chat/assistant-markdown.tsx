'use client'

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CitationChip, DOC_ID_RE, rewriteCitations } from './citations'

// Scoped Markdown styling — we only opt in to the inline formatting the system
// prompt actually uses (bold/italic/lists/inline code). Hoisted to module scope
// so it isn't rebuilt on every render — this component re-renders on every
// streaming token for the in-flight message.
const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 whitespace-pre-wrap break-words last:mb-0">{children}</p>,
  h1: ({ children }) => (
    <h3 className="mt-4 mb-1.5 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-4 mb-1.5 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => <h4 className="mt-3 mb-1 text-sm font-semibold first:mt-0">{children}</h4>,
  h4: ({ children }) => <h4 className="mt-3 mb-1 text-sm font-semibold first:mt-0">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-border pl-3 text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => <ul className="mb-2 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="break-words">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 text-[13px] font-mono">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs last:mb-0 [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-xs">
      {children}
    </pre>
  ),
  a: ({ href, children }) => {
    if (typeof href === 'string' && href.startsWith('/docs/')) {
      const docId = href.slice('/docs/'.length)
      if (DOC_ID_RE.test(docId)) {
        return <CitationChip docId={docId}>{children}</CitationChip>
      }
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-foreground underline decoration-foreground/40 underline-offset-2 hover:decoration-foreground"
      >
        {children}
      </a>
    )
  },
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-md border border-border last:mb-0">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60 text-foreground">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border last:border-b-0">{children}</tr>,
  th: ({ children, style }) => (
    <th
      className="px-3 py-1.5 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
      style={style}
    >
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td className="px-3 py-1.5 align-top" style={style}>
      {children}
    </td>
  ),
}

export function AssistantMarkdown({ text }: { text: string }) {
  const rewritten = rewriteCitations(text)
  return (
    <div className="text-[15px] leading-relaxed text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {rewritten}
      </ReactMarkdown>
    </div>
  )
}
