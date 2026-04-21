// Plan 04-01 Task 2 — shared ZIP local-file-header magic-byte check.
// OOXML formats (XLSX, PPTX, DOCX) all start with PK\x03\x04.
// Source: https://en.wikipedia.org/wiki/ZIP_(file_format)#Local_file_header · verified 2026-04-21

export function isZipHeader(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  )
}
