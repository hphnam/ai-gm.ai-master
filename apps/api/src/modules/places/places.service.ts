import { Injectable, Logger } from '@nestjs/common'
import type { PlacesSearchResponse } from './dto/places.dto'
import { type GooglePlace, normalizePlaces } from './places.normalize'

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.types',
  'places.primaryTypeDisplayName',
  'places.addressComponents',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.timeZone',
  'places.businessStatus',
].join(',')
const TIMEOUT_MS = 10_000

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name)

  async search(query: string): Promise<PlacesSearchResponse> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) return { available: false, candidates: [] }

    const startedAt = Date.now()
    try {
      const res = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({ textQuery: query, pageSize: 5 }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) {
        this.logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'places.search_failed',
            status: res.status,
            latencyMs: Date.now() - startedAt,
          }),
        )
        return { available: true, candidates: [], error: 'lookup-failed' }
      }
      const body = (await res.json()) as { places?: GooglePlace[] }
      const candidates = normalizePlaces(body.places ?? [])
      this.logger.log(
        JSON.stringify({
          level: 'info',
          event: 'places.searched',
          resultCount: candidates.length,
          latencyMs: Date.now() - startedAt,
        }),
      )
      return { available: true, candidates }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'places.search_error',
          message: (err as Error).message,
          latencyMs: Date.now() - startedAt,
        }),
      )
      return { available: true, candidates: [], error: 'lookup-failed' }
    }
  }
}
