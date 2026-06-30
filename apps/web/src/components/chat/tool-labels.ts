/// Present-continuous status phrases shown WHILE a tool is in flight. The live
/// status line appends its own animated ellipsis, so phrases end without
/// punctuation ("Getting sales from your POS"). These are ephemeral — they
/// never persist into saved history, so they only need to read well in the
/// moment. Unmapped tools fall back to a generic phrase.
const TOOL_STATUS_PHRASES: Record<string, string> = {
  // Knowledge + retrieval
  find_knowledge: 'Searching the knowledge base',
  query_document_table: 'Reading your documents',
  save_knowledge_doc: 'Saving to the knowledge base',
  record_kb_gap: 'Noting that for next time',
  verify_quote: 'Checking the source',
  deep_research: 'Digging into the research',
  // Stock + suppliers
  get_stock_below_par: 'Checking stock levels',
  get_stock_by_name: 'Looking up that item',
  get_supplier_by_name: 'Looking up the supplier',
  get_upcoming_cutoffs: 'Checking order cutoffs',
  update_stock: 'Updating stock',
  add_supplier_note: 'Updating supplier notes',
  // Incident + ops
  log_incident: 'Logging the incident',
  leave_note_for_user: 'Leaving you a note',
  // Tasks
  create_task: 'Adding the task',
  complete_task: 'Marking the task done',
  list_my_tasks: 'Pulling up your list',
  // Checklists
  present_checklist: 'Pulling up the checklist',
  // Reports
  generate_report: 'Building your report',
  schedule_report: 'Scheduling the report',
  list_scheduled_reports: 'Pulling your schedules',
  pause_scheduled_report: 'Pausing the schedule',
  resume_scheduled_report: 'Resuming the schedule',
  cancel_scheduled_report: 'Cancelling the schedule',
  // POS (Square + future providers)
  pos_get_sales_summary: 'Getting sales from your POS',
  pos_get_labor_summary: 'Getting labour numbers from your POS',
  pos_get_top_items: 'Getting your top sellers from your POS',
  pos_get_payment_breakdown: 'Getting the payment mix from your POS',
  pos_get_refund_summary: 'Getting refund totals from your POS',
  pos_list_refunds: 'Getting refunds from your POS',
  pos_get_hourly_breakdown: 'Getting the hourly breakdown from your POS',
  pos_compare_periods: 'Comparing periods in your POS',
  pos_search_items: 'Searching your POS menu',
  pos_get_item_inventory: 'Checking inventory in your POS',
  pos_list_recent_orders: 'Getting recent orders from your POS',
  pos_list_locations: 'Listing your POS locations',
  pos_list_recent_shifts: 'Getting recent shifts from your POS',
  pos_get_active_shifts: 'Checking who is on shift',
  pos_list_team_members: 'Listing your team',
}

/// Maps a tool call to a human-readable "working…" phrase. `input` is accepted
/// for future per-call detail (e.g. naming the metric) but isn't needed yet —
/// the static phrases read well enough. Unknown pos_* tools get a generic POS
/// phrase; everything else falls back to "Working".
export function toolStatusPhrase(toolName: string, _input?: unknown): string {
  const phrase = TOOL_STATUS_PHRASES[toolName]
  if (phrase) return phrase
  if (toolName.startsWith('pos_')) return 'Getting data from your POS'
  return 'Working'
}
