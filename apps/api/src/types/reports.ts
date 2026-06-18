import { z } from 'zod'

/// Report sections — the building blocks the agent stitches together. Kept
/// deliberately narrow so the renderer is easy to keep in lock-step. New
/// section kinds are additive: register here, render in the frontend
/// `report-card.tsx`.
///
/// Money is expressed as { value, currency } so the renderer can format with
/// the venue's currency without the agent guessing the symbol. Numeric KPIs
/// without currency just use the `value` shape with currency:null.

export const REPORT_SPEC_VERSION = 1

export const ReportMoneySchema = z.object({
  // .finite() rejects NaN and ±Infinity. The renderer divides by max-bar-value
  // and would otherwise compute width: NaN%, breaking layout for the rest of
  // the report.
  value: z.number().finite(),
  currency: z.string().min(3).max(8).nullable(),
})

const ReportTrendSchema = z
  .object({
    /// + / 0 / − relative to the comparison baseline. Lets the renderer pick
    /// a colour without re-deriving sign from `delta`.
    direction: z.enum(['up', 'down', 'flat']),
    /// Percent change vs baseline. Optional — when null, the renderer omits
    /// the percent badge and just shows `delta` text.
    percent: z.number().nullable().optional(),
    /// Free-form description: "vs March", "vs same week last year". Surfaced
    /// as a small line under the KPI value.
    label: z.string().min(1).max(60).optional(),
  })
  .strict()

export const ReportKpiSchema = z
  .object({
    label: z.string().min(1).max(80),
    /// Display value. Either numeric (with optional currency) OR a pre-
    /// formatted string. Strings are useful for compound values
    /// ("£12,450 / 142 orders") the agent already crafted.
    value: z.union([z.string().min(1).max(80), ReportMoneySchema, z.number().finite()]),
    /// One-line caption under the value (e.g. "vs March"). Optional.
    sublabel: z.string().min(1).max(120).optional(),
    trend: ReportTrendSchema.optional(),
  })
  .strict()

const ReportBarRowSchema = z
  .object({
    label: z.string().min(1).max(80),
    value: z.number().finite(),
    /// Optional caption next to the bar (e.g. "£1,234 · 87 orders").
    sublabel: z.string().max(120).optional(),
    /// Optional explicit colour token; defaults to neutral. We keep this an
    /// enum so a hostile spec can't inject CSS colour values.
    tone: z.enum(['neutral', 'positive', 'warning', 'negative']).optional(),
  })
  .strict()

const SectionTextSchema = z
  .object({
    type: z.literal('text'),
    /// Markdown — same restricted subset as the chat renderer (paragraphs,
    /// lists, bold, italics). No headings/blockquotes/HTML.
    body: z.string().min(1).max(8000),
  })
  .strict()

const SectionKpiSchema = z
  .object({
    type: z.literal('kpi'),
    kpi: ReportKpiSchema,
  })
  .strict()

const SectionKpiGroupSchema = z
  .object({
    type: z.literal('kpiGroup'),
    title: z.string().min(1).max(120).optional(),
    kpis: z.array(ReportKpiSchema).min(1).max(6),
  })
  .strict()

const SectionBarSchema = z
  .object({
    type: z.literal('bar'),
    title: z.string().min(1).max(120).optional(),
    /// Free-text caption under the title (e.g. "Top 10 wines, April 2026").
    caption: z.string().max(200).optional(),
    /// Renderer scales bars relative to the highest value in `rows`.
    rows: z.array(ReportBarRowSchema).min(1).max(50),
    /// Optional value-axis label ("£" / "orders" / "hours"). Used as a tiny
    /// caption next to the value column.
    unit: z.string().max(16).optional(),
  })
  .strict()

const SectionTableSchema = z
  .object({
    type: z.literal('table'),
    title: z.string().min(1).max(120).optional(),
    columns: z.array(z.string().min(1).max(60)).min(1).max(8),
    rows: z
      .array(
        z
          .array(z.union([z.string().max(200), z.number(), z.null()]))
          .min(1)
          .max(8),
      )
      .max(100),
  })
  .strict()
  .refine((s) => s.rows.every((r) => r.length === s.columns.length), {
    message: 'every row must have one cell per column',
  })

const SectionDividerSchema = z
  .object({
    type: z.literal('divider'),
    label: z.string().min(1).max(60).optional(),
  })
  .strict()

export const ReportSectionSchema = z.discriminatedUnion('type', [
  SectionTextSchema,
  SectionKpiSchema,
  SectionKpiGroupSchema,
  SectionBarSchema,
  SectionTableSchema,
  SectionDividerSchema,
])

export type ReportSection = z.infer<typeof ReportSectionSchema>
export type ReportKpi = z.infer<typeof ReportKpiSchema>
export type ReportMoney = z.infer<typeof ReportMoneySchema>

export const ReportSpecSchema = z.object({
  version: z.literal(REPORT_SPEC_VERSION).default(REPORT_SPEC_VERSION),
  /// Optional date range the report covers — surfaced in the header alongside
  /// the title. Strings, not Date objects, so JSON round-trips faithfully.
  rangeFromIso: z.string().datetime().optional(),
  rangeToIso: z.string().datetime().optional(),
  sections: z.array(ReportSectionSchema).min(1).max(40),
})

export type ReportSpec = z.infer<typeof ReportSpecSchema>
