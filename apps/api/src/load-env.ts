import { config } from 'dotenv'
import { readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

function findRepoRoot(start: string): string {
  let dir = start
  while (dir !== dirname(dir)) {
    try {
      if (readdirSync(dir).includes('pnpm-workspace.yaml')) return dir
    } catch {}
    dir = dirname(dir)
  }
  throw new Error(`Could not find repo root (pnpm-workspace.yaml) from ${start}`)
}

config({ path: resolve(findRepoRoot(__dirname), '.env') })
