import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  ClipboardList,
  Clock,
  FileText,
  LineChart,
  MessageSquare,
  PoundSterling,
  Users,
} from 'lucide-react'

export type Feature = {
  icon: LucideIcon
  title: string
  body: string
}

// The capability set, drawn from the positioning doc's "ten questions" and the
// promise. Shared by the landing feature grid and the /features page.
export const FEATURES: Feature[] = [
  {
    icon: PoundSterling,
    title: 'Live P&L from your POS',
    body: 'Ask "what\'s my GP yesterday?" and get margin reconciled against COGS straight from your POS, without the spreadsheet gymnastics or the wait on your accountant.',
  },
  {
    icon: Clock,
    title: 'Labour vs sales, by shift',
    body: 'Last night’s labour cost, which day last week you could have run tighter, who’s still on shift right now. All pulled live from your POS instead of guessed from memory.',
  },
  {
    icon: LineChart,
    title: 'Pricing intelligence',
    body: 'Which lines to put the price up on, what the market rate is, how a small rise lands against tonight’s volume. Every answer grounded in your actual till.',
  },
  {
    icon: BookOpen,
    title: 'Ops that know your venue',
    body: 'Prep routines, opening rituals, line-cleaning cycles, equipment troubleshooting. A starter library tuned to your venue type, whether that’s a kitchen, a floor or a cellar.',
  },
  {
    icon: FileText,
    title: 'Cited, not asserted',
    body: 'Every operational claim points back to the source document, so your GM can see exactly where an answer came from. Verifiable beats confident.',
  },
  {
    icon: ClipboardList,
    title: 'Capture SOPs in the chat',
    body: 'Save a new procedure in the same conversation that surfaced the gap, then notify the team. Your corpus grows where the problem appears.',
  },
]

export type Question = { q: string; tag: string }

// Verbatim question patterns from real usage — the proof the product solves
// the operator's actual day.
export const QUESTIONS: Question[] = [
  { q: 'What’s my GP yesterday?', tag: 'P&L' },
  { q: 'What did I spend on staff last night?', tag: 'Labour' },
  { q: 'Which beer could I put the price up on?', tag: 'Pricing' },
  { q: 'How do I clean a beer line?', tag: 'Cellar SOP' },
  { q: 'Who’s still working?', tag: 'Shifts' },
  { q: 'Who do I call if the ice machine is down?', tag: 'Vendors' },
  { q: 'What day last week could we have been tighter on staff?', tag: 'Labour' },
  { q: 'Save “metrics we need” as an SOP and tell the team.', tag: 'Capture' },
]

export type Problem = { icon: LucideIcon; surface: string; body: string }

// The "four broken surfaces" framing from the positioning doc.
export const PROBLEMS: Problem[] = [
  {
    icon: PoundSterling,
    surface: 'POS',
    body: 'Has the numbers but no narrative. Knowing GP means manual reconciliation against COGS.',
  },
  {
    icon: LineChart,
    surface: 'Spreadsheets',
    body: 'For everything POS doesn’t track: labour per shift, stock counts, pricing history.',
  },
  {
    icon: Users,
    surface: 'Tribal knowledge',
    body: 'Vendor contacts, troubleshooting, opening rituals, all of it in people’s heads.',
  },
  {
    icon: MessageSquare,
    surface: 'WhatsApp',
    body: 'Operational chatter, half-decisions, drift-prone procedures buried in the group.',
  },
]

export type Integration = { name: string; status: 'live' | 'next' | 'later' }

export const INTEGRATIONS: Integration[] = [
  { name: 'Square', status: 'live' },
  { name: 'Xero', status: 'next' },
  { name: 'Google Calendar', status: 'next' },
  { name: 'GoTab', status: 'next' },
  { name: 'Arryved', status: 'next' },
  { name: 'Toast', status: 'later' },
  { name: 'Lightspeed', status: 'later' },
]
