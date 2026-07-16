export type GooglePlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  types?: string[]
  primaryTypeDisplayName?: { text?: string }
  addressComponents?: { longText?: string; shortText?: string; types?: string[] }[]
  regularOpeningHours?: { weekdayDescriptions?: string[] }
  timeZone?: { id?: string }
  businessStatus?: string
  editorialSummary?: { text?: string }
}

export type PlaceCandidate = {
  placeId: string
  name: string
  address: string | null
  businessType: string | null
  venueType: string
  country: string | null
  currency: string | null
  timezone: string | null
  openingHours: string | null
  description: string | null
}

// Superset of the server's CURRENCY_BY_COUNTRY (types/organization.ts), matching
// the settings-form client map. Unmapped countries yield null so we never pin a
// wrong currency onto the org profile.
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  GB: 'GBP',
  IE: 'EUR',
  US: 'USD',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  IN: 'INR',
  ZA: 'ZAR',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  PT: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  CH: 'CHF',
  DK: 'DKK',
  SE: 'SEK',
  NO: 'NOK',
  PL: 'PLN',
  CZ: 'CZK',
  JP: 'JPY',
  SG: 'SGD',
  HK: 'HKD',
  AE: 'AED',
}

// Server-side write caps: venue name 120 / address 240, profile businessType
// 120, venue openingHours 500.
const NAME_MAX = 120
const ADDRESS_MAX = 240
const BUSINESS_TYPE_MAX = 120
const OPENING_HOURS_MAX = 500
const DESCRIPTION_MAX = 2000

const CLOSED_STATUSES = new Set(['CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY'])

const GENERIC_TYPES = new Set(['point_of_interest', 'establishment', 'food', 'store'])

const VENUE_TYPE_MATCHERS: { venueType: string; types: string[] }[] = [
  { venueType: 'pub', types: ['pub', 'brewery'] },
  { venueType: 'nightclub', types: ['night_club'] },
  {
    venueType: 'event space',
    types: ['event_venue', 'banquet_hall', 'wedding_venue', 'convention_center'],
  },
  {
    venueType: 'hotel',
    types: [
      'hotel',
      'lodging',
      'motel',
      'resort_hotel',
      'extended_stay_hotel',
      'bed_and_breakfast',
      'guest_house',
      'hostel',
      'inn',
    ],
  },
  { venueType: 'cafe', types: ['cafe', 'coffee_shop', 'tea_house', 'cat_cafe', 'dog_cafe'] },
  { venueType: 'bar', types: ['bar', 'wine_bar'] },
  { venueType: 'restaurant', types: ['restaurant', 'meal_takeaway', 'meal_delivery', 'diner'] },
]

export function venueTypeFromGoogleTypes(types: string[]): string {
  for (const matcher of VENUE_TYPE_MATCHERS) {
    if (types.some((t) => matcher.types.includes(t))) return matcher.venueType
  }
  if (types.some((t) => t.endsWith('_restaurant'))) return 'restaurant'
  return 'other'
}

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}

function businessTypeFrom(place: GooglePlace): string | null {
  const primary = place.primaryTypeDisplayName?.text?.trim()
  if (primary) return clamp(primary, BUSINESS_TYPE_MAX)
  const first = (place.types ?? []).find((t) => !GENERIC_TYPES.has(t))
  return first ? clamp(first.replace(/_/g, ' '), BUSINESS_TYPE_MAX) : null
}

function openingHoursFrom(place: GooglePlace): string | null {
  const lines: string[] = []
  let length = 0
  for (const line of place.regularOpeningHours?.weekdayDescriptions ?? []) {
    if (length + line.length + (lines.length > 0 ? 1 : 0) > OPENING_HOURS_MAX) break
    length += line.length + (lines.length > 0 ? 1 : 0)
    lines.push(line)
  }
  return lines.length > 0 ? lines.join('\n') : null
}

function descriptionFrom(place: GooglePlace): string | null {
  const summary = place.editorialSummary?.text?.trim()
  return summary ? clamp(summary, DESCRIPTION_MAX) : null
}

export function normalizePlace(place: GooglePlace): PlaceCandidate | null {
  if (!place.id || !place.displayName?.text) return null
  if (place.businessStatus && CLOSED_STATUSES.has(place.businessStatus)) return null

  const country =
    place.addressComponents
      ?.find((c) => c.types?.includes('country'))
      ?.shortText?.trim()
      .toUpperCase() ?? null

  return {
    placeId: place.id,
    name: clamp(place.displayName.text, NAME_MAX),
    address: place.formattedAddress ? clamp(place.formattedAddress, ADDRESS_MAX) : null,
    businessType: businessTypeFrom(place),
    venueType: venueTypeFromGoogleTypes(place.types ?? []),
    country,
    currency: country ? (CURRENCY_BY_COUNTRY[country] ?? null) : null,
    timezone: place.timeZone?.id ?? null,
    openingHours: openingHoursFrom(place),
    description: descriptionFrom(place),
  }
}

export function normalizePlaces(places: GooglePlace[]): PlaceCandidate[] {
  return places.map(normalizePlace).filter((c): c is PlaceCandidate => c !== null)
}
