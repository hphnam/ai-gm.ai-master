import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { type GooglePlace, normalizePlace, normalizePlaces } from './places.normalize'

function place(overrides: Partial<GooglePlace> = {}): GooglePlace {
  return {
    id: 'ChIJabc123',
    displayName: { text: 'The Crown' },
    formattedAddress: '14 High Street, London SW1A 1AA, UK',
    types: ['pub', 'bar', 'point_of_interest', 'establishment'],
    primaryTypeDisplayName: { text: 'Pub' },
    addressComponents: [
      { longText: 'London', shortText: 'London', types: ['postal_town'] },
      { longText: 'United Kingdom', shortText: 'GB', types: ['country', 'political'] },
    ],
    regularOpeningHours: {
      weekdayDescriptions: ['Monday: 12:00 – 11:00 PM', 'Tuesday: 12:00 – 11:00 PM'],
    },
    timeZone: { id: 'Europe/London' },
    businessStatus: 'OPERATIONAL',
    ...overrides,
  }
}

describe('normalizePlace', () => {
  it('normalizes a full place into a candidate', () => {
    assert.deepEqual(normalizePlace(place()), {
      placeId: 'ChIJabc123',
      name: 'The Crown',
      address: '14 High Street, London SW1A 1AA, UK',
      businessType: 'Pub',
      venueType: 'pub',
      country: 'GB',
      currency: 'GBP',
      timezone: 'Europe/London',
      openingHours: 'Monday: 12:00 – 11:00 PM\nTuesday: 12:00 – 11:00 PM',
    })
  })

  it('maps pub ahead of bar and restaurant when types overlap', () => {
    const candidate = normalizePlace(place({ types: ['bar', 'restaurant', 'pub'] }))
    assert.equal(candidate?.venueType, 'pub')
  })

  it('maps suffixed restaurant types to restaurant', () => {
    const candidate = normalizePlace(
      place({
        types: ['italian_restaurant', 'point_of_interest'],
        primaryTypeDisplayName: undefined,
      }),
    )
    assert.equal(candidate?.venueType, 'restaurant')
  })

  it('maps night_club to nightclub and event_venue to event space', () => {
    assert.equal(normalizePlace(place({ types: ['night_club'] }))?.venueType, 'nightclub')
    assert.equal(normalizePlace(place({ types: ['event_venue'] }))?.venueType, 'event space')
  })

  it('falls back to other for unmapped types', () => {
    const candidate = normalizePlace(place({ types: ['hardware_store'] }))
    assert.equal(candidate?.venueType, 'other')
  })

  it('falls back to the first non-generic type for businessType', () => {
    const candidate = normalizePlace(
      place({
        primaryTypeDisplayName: undefined,
        types: ['point_of_interest', 'establishment', 'wine_bar'],
      }),
    )
    assert.equal(candidate?.businessType, 'wine bar')
  })

  it('derives currency from the country component', () => {
    const candidate = normalizePlace(
      place({
        addressComponents: [{ longText: 'United States', shortText: 'US', types: ['country'] }],
      }),
    )
    assert.equal(candidate?.currency, 'USD')
  })

  it('maps eurozone countries to EUR', () => {
    const candidate = normalizePlace(
      place({
        addressComponents: [{ longText: 'Germany', shortText: 'DE', types: ['country'] }],
      }),
    )
    assert.equal(candidate?.currency, 'EUR')
  })

  it('returns null currency for unmapped countries', () => {
    const candidate = normalizePlace(
      place({
        addressComponents: [{ longText: 'Brazil', shortText: 'BR', types: ['country'] }],
      }),
    )
    assert.equal(candidate?.currency, null)
  })

  it('clamps opening hours to whole lines under the 500-char cap', () => {
    const line = `Monday: ${'x'.repeat(90)}`
    const candidate = normalizePlace(
      place({ regularOpeningHours: { weekdayDescriptions: Array(10).fill(line) } }),
    )
    assert.ok(candidate?.openingHours)
    assert.ok(candidate.openingHours.length <= 500)
    assert.ok(candidate.openingHours.split('\n').every((l) => l === line))
  })

  it('returns nulls for missing optional fields', () => {
    const candidate = normalizePlace(
      place({
        formattedAddress: undefined,
        addressComponents: undefined,
        regularOpeningHours: undefined,
        timeZone: undefined,
        primaryTypeDisplayName: undefined,
        types: [],
      }),
    )
    assert.deepEqual(candidate, {
      placeId: 'ChIJabc123',
      name: 'The Crown',
      address: null,
      businessType: null,
      venueType: 'other',
      country: null,
      currency: null,
      timezone: null,
      openingHours: null,
    })
  })

  it('drops closed places', () => {
    assert.equal(normalizePlace(place({ businessStatus: 'CLOSED_PERMANENTLY' })), null)
    assert.equal(normalizePlace(place({ businessStatus: 'CLOSED_TEMPORARILY' })), null)
  })

  it('keeps places with no businessStatus', () => {
    assert.notEqual(normalizePlace(place({ businessStatus: undefined })), null)
  })

  it('drops places missing id or name', () => {
    assert.equal(normalizePlace(place({ id: undefined })), null)
    assert.equal(normalizePlace(place({ displayName: undefined })), null)
  })
})

describe('normalizePlaces', () => {
  it('filters dropped places out of the list', () => {
    const results = normalizePlaces([
      place(),
      place({ id: 'x', businessStatus: 'CLOSED_PERMANENTLY' }),
    ])
    assert.equal(results.length, 1)
    assert.equal(results[0]?.placeId, 'ChIJabc123')
  })
})
