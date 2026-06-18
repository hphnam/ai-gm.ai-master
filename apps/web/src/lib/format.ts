// E.164 → "+44 *** ***123" style mask. Mirrors the backend's
// PhoneService.maskPhone so list/status views match what the
// API serializer returns elsewhere.
export function maskPhone(phoneNumber: string): string {
  if (phoneNumber.length < 6) return '***'
  const cc = phoneNumber.slice(0, 3)
  const tail = phoneNumber.slice(-3)
  return `${cc} *** ***${tail}`
}

// Cap on rendered JSON in debug viewers — keeps the UI fast and avoids
// memory blowups when an assistant message has a giant tool-call log.
export const DEBUG_JSON_UI_CAP = 65536
