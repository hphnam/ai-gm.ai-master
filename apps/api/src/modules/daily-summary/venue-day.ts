/// Resolve the UTC-instant boundaries of a venue-local calendar day, so the
/// daily summary reports "yesterday" the way the operator experienced it (their
/// trading day, in their timezone) rather than a rolling 24h UTC window that
/// straddles two local dates. Pure + dependency-free (Intl only) so it unit-tests
/// without a clock or a date library.

export type DayWindow = {
  /// Inclusive lower bound — local midnight of the target day, as a UTC ISO.
  fromIso: string
  /// Exclusive upper bound — local midnight of the following day, as a UTC ISO.
  toIso: string
  /// The target day as YYYY-MM-DD in venue-local time (cache key + display).
  date: string
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/// Offset (venue wall-clock − UTC) in ms for a given instant, via Intl. Positive
/// east of UTC. Used to convert a wall-clock midnight into a real UTC instant.
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const map: Record<string, string> = {}
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  let hour = Number(map.hour)
  // Some engines emit "24" for midnight; normalise so Date.UTC doesn't roll over.
  if (hour === 24) hour = 0
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second),
  )
  return asUtc - instant.getTime()
}

/// UTC ms for local wall-clock midnight of y-m-d in timeZone. Correct across DST
/// boundaries — midnight itself is virtually never the transition instant, so a
/// single offset correction suffices.
function zonedMidnightUtc(y: number, m: number, d: number, timeZone: string): number {
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0)
  const offset = tzOffsetMs(new Date(guess), timeZone)
  return guess - offset
}

function localToday(now: Date, timeZone: string): { y: number; m: number; d: number } {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const map: Record<string, string> = {}
  for (const p of dtf.formatToParts(now)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  return { y: Number(map.year), m: Number(map.month), d: Number(map.day) }
}

/// Window for the venue-local day `offsetDays` back (0 = today, 1 = yesterday).
/// `now` is injectable for tests.
export function venueDayWindow(
  timeZone: string,
  offsetDays = 1,
  now: Date = new Date(),
): DayWindow {
  const today = localToday(now, timeZone)
  // Anchor at local noon UTC of today's calendar date, then step whole days —
  // noon avoids ever landing on a DST gap when subtracting days.
  const anchor = new Date(Date.UTC(today.y, today.m - 1, today.d, 12, 0, 0))
  anchor.setUTCDate(anchor.getUTCDate() - offsetDays)
  const y = anchor.getUTCFullYear()
  const m = anchor.getUTCMonth() + 1
  const d = anchor.getUTCDate()

  const next = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  next.setUTCDate(next.getUTCDate() + 1)

  const fromMs = zonedMidnightUtc(y, m, d, timeZone)
  const toMs = zonedMidnightUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    timeZone,
  )

  return {
    fromIso: new Date(fromMs).toISOString(),
    toIso: new Date(toMs).toISOString(),
    date: `${y}-${pad2(m)}-${pad2(d)}`,
  }
}
