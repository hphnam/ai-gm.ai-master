// Plan 06-04 hot-fix 2026-05-02 — deterministic fast-path identifier.
//
// For high-confidence single-tool lookups (contact, supplier cutoff, stock
// below par, checklist), we know the answer comes from one structured query.
// Spending an LLM-Researcher round on these wastes 5-15s and risks the model
// declining to call the tool (the "Who is the cellar engineer" → no-tools bug
// that motivated this change).
//
// identifyFastPath() inspects the user message and returns either a Recipe
// (a tool name + args) or null. The orchestrator executes the recipe directly
// and feeds the result into the Writer. Recipes are pure data — no DB / LLM
// access here.

const STOP_WORDS = new Set([
  'who',
  'is',
  'the',
  'a',
  'an',
  'whos',
  'whats',
  'what',
  'tell',
  'me',
  'about',
  'find',
  'lookup',
  'look',
  'up',
  'show',
  'give',
  'do',
  'we',
  'have',
  'on',
  'file',
  'for',
  'this',
  'venue',
  'our',
  'my',
])

export type FastPathRecipe =
  | { tool: 'get_person'; roleQuery: string }
  | { tool: 'get_stock_below_par' }
  | { tool: 'get_upcoming_cutoffs' }
  | { tool: 'get_supplier_by_name'; name: string }
  | { tool: 'get_checklist'; intent: 'opening' | 'closing' }

export function identifyFastPath(userMessage: string): FastPathRecipe | null {
  const msg = userMessage.trim()
  const lower = msg.toLowerCase()

  // ── People / contact lookup ─────────────────────────────────────────────
  // Triggers: "engineer", "manager", "first aider", "fire warden", role-y
  // phrases. We extract a role query by stripping stop-words; the underlying
  // getPerson tool then tokenizes that query (Plan 06-04 hot-fix B) so a
  // search for "cellar engineer" matches a stored "Gas Engineer" / etc.
  const peopleTriggers =
    /\b(engineer|manager|first aider|fire warden|cleaner|maintenance|gas safe|emergency contact|duty manager|on call|on-call)\b/i
  if (peopleTriggers.test(lower)) {
    const roleQuery = stripStopwords(msg)
    if (roleQuery.length > 0) {
      return { tool: 'get_person', roleQuery }
    }
  }

  // ── Stock below par ─────────────────────────────────────────────────────
  if (/\b(below par|low stock|running low|out of stock|need to order)\b/i.test(lower)) {
    return { tool: 'get_stock_below_par' }
  }

  // ── Supplier cutoffs ────────────────────────────────────────────────────
  // "Bibendum cutoff" / "Matthew Clark cutoff" — extract the supplier name
  // from before the word "cutoff". Multi-word names supported.
  const supplierCutoffMatch = /([A-Za-z][\w\s&'-]{1,40}?)\s+cutoff/i.exec(msg)
  if (supplierCutoffMatch) {
    const candidate = supplierCutoffMatch[1].trim()
    const cleaned = stripStopwords(candidate)
    if (cleaned.length > 1) {
      return { tool: 'get_supplier_by_name', name: cleaned }
    }
  }
  // Generic "what cutoffs are coming up" / "any cutoffs today"
  if (/\b(cutoffs?\s+(today|coming up|soon|tonight)|upcoming cutoffs?)\b/i.test(lower)) {
    return { tool: 'get_upcoming_cutoffs' }
  }

  // ── Checklists ──────────────────────────────────────────────────────────
  if (
    /\b(open(?:ing)? checklist|how (?:do|to) (?:we |i )?open|opening procedure|opening up)\b/i.test(
      lower,
    )
  ) {
    return { tool: 'get_checklist', intent: 'opening' }
  }
  if (
    /\b(clos(?:ing)? checklist|how (?:do|to) (?:we |i )?close|closing procedure|closing up|locking up)\b/i.test(
      lower,
    )
  ) {
    return { tool: 'get_checklist', intent: 'closing' }
  }

  return null
}

function stripStopwords(s: string): string {
  return s
    .replace(/[?.!,'"]/g, '')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()))
    .join(' ')
    .trim()
}
