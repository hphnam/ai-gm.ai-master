'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CitationChip, DOC_ID_RE, rewriteCitations } from './citations'

export function AssistantMarkdown({ text }: { text: string }) {
  // Scoped Markdown styling — we only opt in to the inline formatting that
  // the system prompt actually uses (bold/italic/lists/inline code). Headings,
  // blockquotes, tables and hr are intentionally not styled — the prompt tells
  // the model not to emit them.
  const rewritten = rewriteCitations(text)
  return (
    <div className="text-[15px] leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 whitespace-pre-wrap break-words last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="break-words">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-[13px] font-mono">{children}</code>
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
          thead: ({ children }) => (
            <thead className="bg-muted/60 text-foreground">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border last:border-b-0">{children}</tr>
          ),
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
        }}
      >
        {rewritten}
      </ReactMarkdown>
    </div>
  )
}
