// Plan 04-01 Task 2 — PPTX extraction via officeparser v6 AST.
// Source: https://www.npmjs.com/package/officeparser · verified 2026-04-21 (v6.1.0, published 2026-04-14)
// Source: https://github.com/harshankur/officeParser#readme · verified 2026-04-21 (parseOffice(Buffer) → OfficeParserAST)
// Source: https://unpkg.com/officeparser@6.1.0/dist/types.d.ts · verified 2026-04-21
//   (OfficeContentNodeType includes 'slide' | 'note'; SlideMetadata.slideNumber is 1-based)

import { parseOffice, type OfficeContentNode, type SlideMetadata } from 'officeparser'
import { ExtractError, MAX_EXTRACT_CHARS } from '../doc-extract'
import { isZipHeader } from './zip-header'

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

// audit-M1 boundary: NO raw slide text / notes content in logger payloads.

function isSlideNode(node: OfficeContentNode): node is OfficeContentNode & { metadata: SlideMetadata } {
  return node.type === 'slide' && typeof (node.metadata as SlideMetadata | undefined)?.slideNumber === 'number'
}

function extractTitleAndBody(slide: OfficeContentNode): { title: string; body: string } {
  const children = slide.children ?? []
  // First heading child → title; everything else → body. Fall back to full text if no heading.
  // Source: https://github.com/harshankur/officeParser#the-ast-structure · verified 2026-04-21
  const titleNode = children.find((c) => c.type === 'heading')
  const title = (titleNode?.text ?? '').trim()
  const bodyChunks: string[] = []
  for (const child of children) {
    if (child === titleNode) continue
    if (child.type === 'note') continue
    const text = (child.text ?? '').trim()
    if (text.length > 0) bodyChunks.push(text)
  }
  if (!titleNode && bodyChunks.length === 0) {
    const fallback = (slide.text ?? '').trim()
    return { title: '', body: fallback }
  }
  return { title, body: bodyChunks.join('\n') }
}

function extractNoteForSlide(
  allNodes: readonly OfficeContentNode[],
  slideIndex: number,
  slide: OfficeContentNode,
): string {
  // With putNotesAtLast:false (default), a slide's note is either:
  //   (a) a 'note' child of the slide node, OR
  //   (b) a sibling 'note' node immediately after the slide in ast.content.
  const childNote = (slide.children ?? []).find((c) => c.type === 'note')
  if (childNote) return (childNote.text ?? '').trim()

  const next = allNodes[slideIndex + 1]
  if (next?.type === 'note') {
    const slideNoteId = (slide.metadata as SlideMetadata | undefined)?.noteId
    const nextNoteId = (next.metadata as { noteId?: string } | undefined)?.noteId
    // If both carry noteId, require a match; otherwise trust positional adjacency.
    if (!slideNoteId || !nextNoteId || slideNoteId === nextNoteId) {
      return (next.text ?? '').trim()
    }
  }
  return ''
}

export async function extractPptx(buffer: Buffer): Promise<string> {
  if (!isZipHeader(buffer)) {
    throw new ExtractError(PPTX_MIME, 'corrupt-bytes')
  }

  let ast
  try {
    // Source: https://github.com/harshankur/officeParser#getting-started-asyncawait · verified 2026-04-21
    ast = await parseOffice(buffer, {
      ignoreNotes: false,
      putNotesAtLast: false,
      extractAttachments: false,
      ocr: false,
    })
  } catch (err) {
    throw new ExtractError(PPTX_MIME, 'corrupt-bytes', err)
  }

  const content = ast.content ?? []
  const chunks: string[] = []
  let totalChars = 0

  for (let i = 0; i < content.length; i++) {
    if (totalChars >= MAX_EXTRACT_CHARS) break
    const node = content[i]
    if (!isSlideNode(node)) continue

    const slideNumber = node.metadata.slideNumber
    const { title, body } = extractTitleAndBody(node)
    const notes = extractNoteForSlide(content, i, node)

    if (title.length === 0 && body.length === 0 && notes.length === 0) continue

    const header = title.length > 0 ? `## Slide ${slideNumber}: ${title}\n` : `## Slide ${slideNumber}\n`
    let block = header
    if (body.length > 0) block += body + '\n'
    if (notes.length > 0) block += `[notes: ${notes}]\n`
    block += '\n'

    chunks.push(block)
    totalChars += block.length
  }

  const joined = chunks.join('').slice(0, MAX_EXTRACT_CHARS)
  if (joined.trim().length === 0) {
    throw new ExtractError(PPTX_MIME, 'empty-result')
  }
  return joined
}
