import { z } from 'zod'

/// Free-form-but-structured business profile, captured in Settings and stored on
/// `Organization.metadata.profile`. Injected into the chat system prompt so the
/// agent adapts per-business instead of assuming UK hospitality. Every field is
/// optional — an org that fills nothing still works (the prompt falls back to
/// sensible hospitality defaults). Kept deliberately small: a handful of fields
/// that genuinely steer the agent, not an HR record.
const organizationProfileShape = z.object({
  /// What kind of business this is, in the operator's own words.
  /// e.g. "brewpub + taproom", "fine-dining bistro", "coffee roastery".
  businessType: z.string().trim().max(120).optional(),
  /// Free-text "about your business" — operating model, scale, anything the
  /// agent should know to give relevant answers.
  description: z.string().trim().max(2000).optional(),
  /// What the operator is optimising for. Steers proactive suggestions.
  /// e.g. ["margin", "staff retention", "covers per night"].
  goals: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
  /// Hard operating constraints the agent must respect.
  /// e.g. "no deliveries after 23:00; cash-free; 20-staff ceiling".
  constraints: z.string().trim().max(1000).optional(),
  /// ISO 3166-1 alpha-2. Drives emergency number + default currency. Defaults
  /// to GB when unset (preserves the original hardcoded behaviour).
  country: z
    .string()
    .trim()
    .length(2)
    .transform((s) => s.toUpperCase())
    .optional(),
  /// ISO 4217 currency code. Overrides the country-derived default.
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((s) => s.toUpperCase())
    .optional(),
})

/// Write/validation schema — `.strict()` so the PUT endpoint rejects unknown
/// keys and malformed values at the boundary (paired with an explicit
/// ZodValidationPipe on the controller). Canonical type source.
export const OrganizationProfileSchema = organizationProfileShape.strict()
export type OrganizationProfile = z.infer<typeof OrganizationProfileSchema>

/// Read schema — deliberately NOT strict: when parsing a stored blob, unknown
/// keys are stripped rather than failing the whole parse. This keeps the
/// "evolve the shape without a migration" promise true — renaming/removing a
/// field can't silently nuke an org's entire profile on read.
export const OrganizationProfileReadSchema = organizationProfileShape

/// PUT replaces the whole profile; all fields optional so the form can clear
/// any of them by omitting it.
export const UpdateOrganizationProfileSchema = OrganizationProfileSchema
export type UpdateOrganizationProfile = z.infer<typeof UpdateOrganizationProfileSchema>

const DEFAULT_COUNTRY = 'GB'
const DEFAULT_CURRENCY = 'GBP'

// Local emergency number by country. Falls back to 112 (works on GSM phones in
// most of the world) for countries we don't list. GB default keeps incident
// mode at 999 for the existing org until a profile sets otherwise.
const EMERGENCY_BY_COUNTRY: Record<string, string> = {
  GB: '999',
  IE: '112',
  US: '911',
  CA: '911',
  AU: '000',
  NZ: '111',
  IN: '112',
  ZA: '10111',
}

export function emergencyNumberFor(country?: string | null): string {
  const c = (country ?? DEFAULT_COUNTRY).toUpperCase()
  return EMERGENCY_BY_COUNTRY[c] ?? '112'
}

// Country → default ISO 4217 currency, used only when the profile doesn't pin a
// currency explicitly. Small map; unknown countries fall back to GBP.
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  GB: 'GBP',
  IE: 'EUR',
  US: 'USD',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  IN: 'INR',
  ZA: 'ZAR',
}

export function currencyCodeFor(profile?: OrganizationProfile | null): string {
  if (profile?.currency) return profile.currency
  const c = (profile?.country ?? DEFAULT_COUNTRY).toUpperCase()
  return CURRENCY_BY_COUNTRY[c] ?? DEFAULT_CURRENCY
}

// Render the currency symbol for a code (e.g. GBP → £, USD → $). Falls back to
// the code itself for currencies Intl can't symbolise in this runtime.
export function currencySymbolFor(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? code
  } catch {
    return code
  }
}
