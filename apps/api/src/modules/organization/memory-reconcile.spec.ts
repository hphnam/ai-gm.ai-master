import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { selectStalePaths } from './memory-reconcile.service'

describe('selectStalePaths', () => {
  const memory = { '/memories/a.md': '1', '/memories/b.md': '2' }

  it('keeps only paths that exist in the map', () => {
    assert.deepEqual(selectStalePaths(memory, ['/memories/a.md']), ['/memories/a.md'])
  })

  it('drops hallucinated paths the model returned but that do not exist', () => {
    assert.deepEqual(selectStalePaths(memory, ['/memories/ghost.md']), [])
  })

  it('returns empty when nothing is flagged', () => {
    assert.deepEqual(selectStalePaths(memory, []), [])
  })
})
