'use client'

import { getToolName, isToolUIPart } from 'ai'
import {
  BriefingCard,
  ChangePointCard,
  DeviationCard,
  ForecastBandCard,
  FreshnessCard,
  SopGapsCard,
  StockCoverCard,
} from './brain-cards'
import { ChecklistCard } from './checklist-card'
import { CutoffsCard } from './cutoffs-card'
import { NoteCard } from './note-card'
import { PricingRecommendationCard } from './pricing-recommendation-card'
import { ReportCard } from './report-card'
import { StockBelowParCard, StockByNameCard } from './stock-card'
import { SupplierCard } from './supplier-card'
import { TaskCompletedCard, TaskCreatedCard } from './task-action-card'
import { TasksListCard } from './tasks-list-card'
import type { ToolCardCtx, ToolCardRenderer, ToolPart } from './types'

// Tools mapped here render rich interactive UI instead of (just) a chip in the
// thought-process strip. find_knowledge intentionally has no card — its hits
// surface as inline citation chips in the assistant text, where they belong.
const RENDERERS: Record<string, ToolCardRenderer> = {
  present_checklist: ChecklistCard,
  generate_report: ReportCard,
  list_my_tasks: TasksListCard,
  create_task: TaskCreatedCard,
  complete_task: TaskCompletedCard,
  get_stock_below_par: StockBelowParCard,
  get_stock_by_name: StockByNameCard,
  get_supplier_by_name: SupplierCard,
  get_upcoming_cutoffs: CutoffsCard,
  leave_note_for_user: NoteCard,
  record_pricing_recommendation: PricingRecommendationCard,
  brain_forecast_sales: ForecastBandCard,
  brain_check_deviation: DeviationCard,
  brain_find_sop_gaps: SopGapsCard,
  brain_check_stock_cover: StockCoverCard,
  brain_check_change_point: ChangePointCard,
  brain_daily_briefing: BriefingCard,
  brain_data_freshness: FreshnessCard,
}

export function hasToolCard(toolName: string): boolean {
  return toolName in RENDERERS
}

type Props = {
  part: ToolPart
  ctx: ToolCardCtx
}

export function ToolCard({ part, ctx }: Props) {
  if (!isToolUIPart(part as Parameters<typeof isToolUIPart>[0])) return null
  const name = getToolName(part as Parameters<typeof getToolName>[0])
  const Renderer = RENDERERS[name]
  if (!Renderer) return null
  // Only render once we have a final output (success or error). Streaming
  // input/partial output stays in the thought-process chip strip.
  if (part.state !== 'output-available' && part.state !== 'output-error') return null
  return <Renderer part={part} ctx={ctx} />
}
