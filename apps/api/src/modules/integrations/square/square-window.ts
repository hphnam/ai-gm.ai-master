import { z } from 'zod'

/// Closed window: explicit start + end (end optional, defaults to now).
/// Rolling window: hours-back (sinceHours).
///
/// Both modes are accepted on every time-windowed Square tool so the agent
/// can express either "last 7 days" (`sinceHours: 168`) or a fixed comparison
/// range like "April 2026" (`fromIso: "2026-04-01T00:00:00Z"`,
/// `toIso: "2026-04-30T23:59:59Z"`). The fromIso/toIso form is what unlocks
/// "this month vs last month" — pos_compare_periods composes two of them.
///
/// Exposed as a raw `shape` (object-fields only) plus a refinement helper so
/// callers can compose it into a parent z.object() — `z.object({...}).and(...)`
/// produces a ZodIntersection whose JSON-Schema form drops the top-level
/// `type: "object"`, which Anthropic's tool input_schema validator rejects.
export const WindowInputShape = {
  /// Rolling window in hours back from now. Mutually exclusive with
  /// fromIso/toIso. Bounded by `maxHours` at the call site.
  sinceHours: z.number().int().min(1).optional(),
  /// ISO 8601 datetime — inclusive lower bound. Mutually exclusive with
  /// sinceHours.
  fromIso: z.string().datetime().optional(),
  /// ISO 8601 datetime — inclusive upper bound. Defaults to now when only
  /// fromIso is supplied.
  toIso: z.string().datetime().optional(),
} as const

export type WindowInput = {
  sinceHours?: number
  fromIso?: string
  toIso?: string
}

/// Apply the window-mode invariants to a parent schema via .superRefine. Keeps
/// the runtime guards (mutually-exclusive modes, toIso requires fromIso, end
/// after start) without forcing a ZodIntersection at the top level.
export function applyWindowRefinements<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((value, ctx) => {
    const v = value as WindowInput
    if (v.sinceHours !== undefined && (v.fromIso || v.toIso)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pass either sinceHours OR fromIso/toIso, not both',
      })
    }
    if (v.toIso && !v.fromIso) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'toIso requires fromIso',
        path: ['toIso'],
      })
    }
    if (v.fromIso && v.toIso) {
      const start = Date.parse(v.fromIso)
      const end = Date.parse(v.toIso)
      if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'toIso must be after fromIso',
          path: ['toIso'],
        })
      }
    }
  }) as unknown as T
}

export type ResolvedWindow = {
  startAt: string
  endAt: string
  /// Effective hours covered. Derived for both modes so summary tools can
  /// surface a single "windowHours" value to the agent regardless of how the
  /// caller expressed it.
  hours: number
  /// `true` when the upper bound was explicitly supplied (closed window).
  /// Comparisons want to know this so they can label results as the named
  /// range rather than "last N hours".
  closed: boolean
}

const HOUR_MS = 60 * 60 * 1000

/// Resolve the inputs into a concrete {startAt, endAt, hours} pair, applying
/// the per-tool max. Defaults to a `defaultHours` rolling window if the
/// caller passed neither form.
export function resolveWindow(
  input: WindowInput | undefined,
  opts: { defaultHours: number; maxHours: number },
): ResolvedWindow {
  const now = Date.now()
  if (input?.fromIso) {
    const startMs = Date.parse(input.fromIso)
    const endMs = input.toIso ? Date.parse(input.toIso) : now
    // Defensive: zod already validated datetime format, but Date.parse may
    // still return NaN for partial inputs (e.g. negative timezones at edges).
    const safeStart = Number.isFinite(startMs) ? startMs : now - opts.defaultHours * HOUR_MS
    const safeEnd = Number.isFinite(endMs) ? endMs : now
    // Fail loudly on inverted ranges (toIso < fromIso, or fromIso entirely in
    // the future with no toIso). The previous behaviour silently returned
    // startAt === endAt so Square returned 0 results — the agent then told
    // the user "no sales in that range" instead of "your range is broken".
    if (safeEnd <= safeStart) {
      throw new RangeError(
        `invalid window: toIso (${input.toIso ?? new Date(now).toISOString()}) must be after fromIso (${input.fromIso})`,
      )
    }
    const span = safeEnd - safeStart
    const cappedSpanMs = Math.min(span, opts.maxHours * HOUR_MS)
    const finalStart = safeEnd - cappedSpanMs
    return {
      startAt: new Date(finalStart).toISOString(),
      endAt: new Date(safeEnd).toISOString(),
      hours: Math.round(cappedSpanMs / HOUR_MS),
      closed: true,
    }
  }
  const requested = input?.sinceHours ?? opts.defaultHours
  const hours = Math.min(Math.max(requested, 1), opts.maxHours)
  return {
    startAt: new Date(now - hours * HOUR_MS).toISOString(),
    endAt: new Date(now).toISOString(),
    hours,
    closed: false,
  }
}

// ─── Forward-looking schedule windows ─────────────────────────────────────
// Distinct from the sales/labor backward-looking WindowInput because the
// natural framing for rotas / bookings is "next 7 days", not "last 7 days".
// Supports a hybrid: sinceHours back + aheadHours forward (so "this week"
// can include yesterday + today + the rest of the week in one call), OR a
// fixed fromIso/toIso pair.

export const ScheduleWindowInputShape = {
  sinceHours: z.number().int().min(0).optional(),
  aheadHours: z.number().int().min(1).optional(),
  fromIso: z.string().datetime().optional(),
  toIso: z.string().datetime().optional(),
} as const

export type ScheduleWindowInput = {
  sinceHours?: number
  aheadHours?: number
  fromIso?: string
  toIso?: string
}

export function applyScheduleWindowRefinements<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((value, ctx) => {
    const v = value as ScheduleWindowInput
    const rolling = v.sinceHours !== undefined || v.aheadHours !== undefined
    const fixed = v.fromIso !== undefined || v.toIso !== undefined
    if (rolling && fixed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pass either sinceHours/aheadHours OR fromIso/toIso, not both',
      })
    }
    if (v.toIso && !v.fromIso) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'toIso requires fromIso',
        path: ['toIso'],
      })
    }
    if (v.fromIso && v.toIso) {
      const s = Date.parse(v.fromIso)
      const e = Date.parse(v.toIso)
      if (Number.isFinite(s) && Number.isFinite(e) && e <= s) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'toIso must be after fromIso',
          path: ['toIso'],
        })
      }
    }
  }) as unknown as T
}

export function scheduleWindowJsonSchemaProps(opts: {
  defaultAheadHours: number
  maxHours: number
}) {
  return {
    sinceHours: {
      type: 'integer',
      description: `Hours back from now to include past shifts (0-${opts.maxHours}, default 0). Use for "this week" if today is mid-week.`,
    },
    aheadHours: {
      type: 'integer',
      description: `Hours forward from now (1-${opts.maxHours}, default ${opts.defaultAheadHours}). Use for "next 7 days" / "this coming week".`,
    },
    fromIso: {
      type: 'string',
      description:
        'ISO 8601 inclusive start (e.g. "2026-05-18T00:00:00Z"). Use for a fixed range like "week commencing 18 May". Mutually exclusive with sinceHours/aheadHours.',
    },
    toIso: {
      type: 'string',
      description: 'ISO 8601 inclusive end (e.g. "2026-05-24T23:59:59Z"). Requires fromIso.',
    },
  } as const
}

/// Reusable JSON-Schema subset for a window argument — saves repeating the
/// same property block on every tool definition.
export function windowJsonSchemaProps(opts: { defaultHours: number; maxHours: number }) {
  return {
    sinceHours: {
      type: 'integer',
      description: `Rolling window in hours back from now (1-${opts.maxHours}, default ${opts.defaultHours}). Mutually exclusive with fromIso/toIso.`,
    },
    fromIso: {
      type: 'string',
      description:
        'ISO 8601 inclusive start (e.g. "2026-04-01T00:00:00Z"). Use for fixed ranges like "April" or "last month". Mutually exclusive with sinceHours.',
    },
    toIso: {
      type: 'string',
      description:
        'ISO 8601 inclusive end (e.g. "2026-04-30T23:59:59Z"). Defaults to now if omitted. Requires fromIso.',
    },
  } as const
}
