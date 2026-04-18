import { config } from 'dotenv'
import { resolve } from 'node:path'
config({ path: resolve(__dirname, '../../../.env') })

import { EmbeddingsService } from '../src/modules/embeddings/embeddings.service'

async function main() {
  const service = new EmbeddingsService()
  service.onModuleInit()

  const query = 'how do I fix the ice machine'
  const doc = 'To reset the Scotsman ice machine, hold the power button for 5 seconds.'

  const qVec = await service.embedText(query)
  const dVec = await service.embedDocument(doc)
  const batch = await service.embedDocuments([query, doc])

  const checks: ReadonlyArray<readonly [string, boolean]> = [
    ['embedText dim = 1024', qVec.length === 1024],
    ['embedDocument dim = 1024', dVec.length === 1024],
    ['embedDocuments returned 2 vectors', batch.length === 2],
    ['batch vectors all 1024-dim', batch.every((v) => v.length === 1024)],
    ['embedText is finite numbers', qVec.every((n) => Number.isFinite(n))],
    ['query != document vector', qVec.some((n, i) => n !== dVec[i])],
  ]

  let failed = 0
  for (const [name, ok] of checks) {
    console.log(ok ? `\u2713 ${name}` : `\u2717 ${name}`)
    if (!ok) failed++
  }
  if (failed) {
    console.error(`\n${failed} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll embeddings probes passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
