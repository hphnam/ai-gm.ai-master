// Plan 06-03 audit-M2 — discriminated-union contract for resolveResearcher.
//
// Without a unifying interface, ChatCoreService.resolveResearcher would compile
// only because TypeScript happens to infer a structural union over the 5
// researcher classes. A future researcher with `voyageCalls: bigint` instead
// of `number` would compile in isolation but break the orchestrator's
// CostTracker.recordResearcher silently. Declaring `Researcher` here forces
// each `*.researcher.ts` to `implements Researcher` — tsc errors at compile
// time if the contract drifts.

import type { AnthropicUsage, ResearcherFinding } from '../../types'
import type { ResearchContext } from './researchers/docs.researcher'

export type ResearcherResult = {
  finding: ResearcherFinding
  usage: AnthropicUsage
  voyageCalls: number
}

export interface Researcher {
  research(brief: string, ctx: ResearchContext): Promise<ResearcherResult>
}
