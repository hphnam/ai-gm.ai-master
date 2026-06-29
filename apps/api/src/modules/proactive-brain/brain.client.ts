import { Injectable } from '@nestjs/common'

/// Typed HTTP client for the Track-A FastAPI brain (brain/service/app.py).
/// Thin and dependency-free — uses global fetch with a bounded timeout so a
/// slow or down brain fails fast into a ToolResult rather than hanging a chat
/// turn. Base URL + enable gate come from the environment (additive keys).

export class BrainUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrainUnavailableError'
  }
}

export interface ForecastQuery {
  venue: string
  layer?: string
  key?: string
  level?: number
  date_from?: string
  date_to?: string
}

export interface BandRow {
  date: string
  yhat: number
  lo: number
  hi: number
  level: number
  model: string
}

export interface ForecastResponse {
  venue: string
  layer: string
  level: number
  key: string | null
  n: number
  forecast: BandRow[]
}

export interface DeviationQuery {
  venue: string
  layer?: string
  level?: number
  observations?: Array<{ date: string; value: number }>
}

export interface Breach {
  date: string
  value: number
  lo: number
  hi: number
  direction: 'above' | 'below'
  exceedance_ratio: number
  severity: 'low' | 'medium' | 'high'
}

export interface DeviationResponse {
  venue: string
  layer: string
  level: number
  n_checked: number
  n_breaches: number
  breaches: Breach[]
}

export interface SopGapsResponse {
  failure_rate: number
  rolling7_max: number
  active_days: number
  channels: Record<string, number>
  embedding_backend: string
  gaps: Array<{
    size: number
    failed: number
    failure_density: number
    score: number
    venue_tags: Record<string, number>
    examples: string[]
  }>
}

export interface ChecklistQuery {
  checklist: 'opening' | 'closing'
  completed: number[]
  dow: number
  completion_minutes?: number
}

export interface ChecklistResponse {
  checklist: string
  dow: number
  is_sunday: boolean
  n_expected: number
  n_expected_mandatory: number
  missed: Array<[number, string, number]>
  weighted_score: number
  critical_missed: number[]
  unsigned: boolean
  skipped: boolean
  late: boolean
  severity: 'ok' | 'low' | 'medium' | 'high' | 'critical'
}

export interface StockCoverLine {
  product: string
  l1: string
  on_hand_kegs: number | null
  on_hand_pints: number | null
  forecast_daily_pints: number | null
  days_of_cover: number | null
  reorder: boolean | null
  suggested_order_kegs: number | null
  a6_node: string | null
}

export interface StockCoverResponse {
  venue: string
  as_of: string | null
  n: number
  n_reorder: number
  lines: StockCoverLine[]
  note?: string
}

export interface ChangePoint {
  onset_date: string
  detected_date: string
  detection_delay_days: number | null
  direction: 'up' | 'down'
  magnitude_band_units: number | null
  magnitude_pct: number | null
  detector: 'cusum' | 'persistence' | 'both' | 'bocpd'
  severity: 'low' | 'medium' | 'high'
  recalibration_needed: boolean | null
  attribution: string[]
  note: string | null
}

export interface ChangePointResponse {
  venue: string
  layer: string
  n_change_points: number
  change_points: ChangePoint[]
  stable: boolean
  note?: string
}

@Injectable()
export class BrainClient {
  private readonly baseUrl = (process.env.BRAIN_BASE_URL ?? 'http://127.0.0.1:8088').replace(
    /\/$/,
    '',
  )
  private readonly timeoutMs = Number(process.env.BRAIN_TIMEOUT_MS ?? 4000)

  get enabled(): boolean {
    return process.env.BRAIN_ENABLED !== '0'
  }

  health(): Promise<{ status: string; store_built: boolean; last_trained: string | null }> {
    return this.get('/health')
  }

  forecast(q: ForecastQuery): Promise<ForecastResponse> {
    const params = new URLSearchParams()
    params.set('venue', q.venue)
    if (q.layer) params.set('layer', q.layer)
    if (q.key) params.set('key', q.key)
    if (q.level != null) params.set('level', String(q.level))
    if (q.date_from) params.set('date_from', q.date_from)
    if (q.date_to) params.set('date_to', q.date_to)
    return this.get(`/forecast?${params.toString()}`)
  }

  checkDeviation(q: DeviationQuery): Promise<DeviationResponse> {
    return this.post('/deviation/check', q)
  }

  sopGaps(): Promise<SopGapsResponse> {
    return this.get('/sop-gaps')
  }

  stockCover(venue: string): Promise<StockCoverResponse> {
    return this.get(`/stock/cover?venue=${encodeURIComponent(venue)}`)
  }

  changePoint(q: { venue: string; layer?: string }): Promise<ChangePointResponse> {
    return this.post('/deviation/changepoint', q)
  }

  checkChecklist(q: ChecklistQuery): Promise<ChecklistResponse> {
    return this.post('/checklist/discipline', q)
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new BrainUnavailableError(
          `brain ${method} ${path} -> ${res.status} ${detail.slice(0, 200)}`,
        )
      }
      return (await res.json()) as T
    } catch (err) {
      if (err instanceof BrainUnavailableError) throw err
      const reason = err instanceof Error ? err.message : String(err)
      throw new BrainUnavailableError(`brain ${method} ${path} unreachable: ${reason}`)
    } finally {
      clearTimeout(timer)
    }
  }
}
