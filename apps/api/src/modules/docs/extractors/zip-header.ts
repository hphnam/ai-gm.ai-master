// Plan 04-01 Task 2 — shared ZIP local-file-header magic-byte check.
// OOXML formats (XLSX, PPTX, DOCX) all start with PK\x03\x04.
// Source: https://en.wikipedia.org/wiki/ZIP_(file_format)#Local_file_header · verified 2026-04-21

// Plan 04-02 Task 1 — signature widened from Buffer → Uint8Array so callers with
// Buffer<ArrayBufferLike> (e.g. exceljs consumers) type-check cleanly. Runtime identical:
// Buffer extends Uint8Array, byte indexing works via the base interface.
export function isZipHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  )
}
