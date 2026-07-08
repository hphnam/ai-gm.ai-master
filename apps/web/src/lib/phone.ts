import { parsePhoneNumberFromString } from 'libphonenumber-js'

// Twilio, better-auth's stored identity, and the invite endpoint all require
// E.164 (+44…) to route a message. Users, though, type their number however
// they know it — most commonly UK national form (07429 481620). We canonicalise
// at the input boundary so the rest of the stack only ever sees +44….
//
// Default region is GB (the app's primary market); an explicit + prefix
// overrides it, so international numbers still work. Returns null when the input
// isn't a valid number — the caller surfaces the error and never sends an SMS.
//
// Everything here has to receive an OTP/invite over SMS, so a landline that
// passes isValid() (e.g. a UK 020… number) is still useless — reject it up
// front rather than show a false "sent" and have the carrier silently drop it.
// getType() is only decisive in well-mapped regions; when it's undefined or
// ambiguous (many non-GB mobiles report UNKNOWN) we accept and let the carrier
// be the final arbiter, so we never over-reject a real mobile.
const NON_SMS_TYPES = new Set(['FIXED_LINE', 'TOLL_FREE', 'PREMIUM_RATE', 'SHARED_COST'])

export function toE164(raw: string): string | null {
  const parsed = parsePhoneNumberFromString(raw.trim(), 'GB')
  if (!parsed?.isValid()) return null
  const type = parsed.getType()
  if (type && NON_SMS_TYPES.has(type)) return null
  return parsed.number
}
