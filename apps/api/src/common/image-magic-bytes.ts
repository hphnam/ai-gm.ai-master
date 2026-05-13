// Plan 04-01 Task 3 — shared magic-byte validator for image MIME types.
// Factored from apps/api/src/modules/whatsapp/whatsapp-media-download.ts (Phase 3 Plan 03-03 M3)
// on 2026-04-21 so the docs image extractor can reuse the same signature gate the WhatsApp
// adapter uses. Adds HEIC coverage (not needed by whatsapp inbound; used by /docs upload).
//
// Callers:
//   - apps/api/src/modules/whatsapp/whatsapp-media-download.ts (preserves existing behavior)
//   - apps/api/src/modules/docs/extractors/image-extractor.ts   (new — Plan 04-01 Task 3)
//
// Source: https://en.wikipedia.org/wiki/List_of_file_signatures · verified 2026-04-21
// Source: https://nokiatech.github.io/heif/technical.html (ftyp box + HEIF brand codes) · verified 2026-04-21

const HEIF_BRANDS = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1'])

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return ''
  let out = ''
  for (let i = 0; i < length; i++) out += String.fromCharCode(bytes[offset + i])
  return out
}

export function magicByteMatchesMime(bytes: Uint8Array, declaredMime: string): boolean {
  if (bytes.length < 12) return false
  const b = bytes
  switch (declaredMime) {
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    case 'image/png':
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    case 'image/gif':
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38
    case 'image/webp':
      return (
        b[0] === 0x52 &&
        b[1] === 0x49 &&
        b[2] === 0x46 &&
        b[3] === 0x46 &&
        b[8] === 0x57 &&
        b[9] === 0x45 &&
        b[10] === 0x42 &&
        b[11] === 0x50
      )
    case 'image/heic':
      // ISO BMFF 'ftyp' box at offset 4 + HEIF brand code at offset 8 (4 ASCII bytes).
      return readAscii(b, 4, 4) === 'ftyp' && HEIF_BRANDS.has(readAscii(b, 8, 4))
    default:
      return false
  }
}
