// Run via:
//   node --import tsx --test apps/api/src/modules/chat/gm-agent.spec.ts
//
// Covers synthesizeTerminalToolReply — the helper that turns a "loop stopped
// on a terminal tool with no follow-up text" outcome into a brief assistant
// confirmation. Without it the persisted assistant row falls back to the
// generic "couldn't produce an answer" string even though the report/save
// actually succeeded and rendered its own tool card.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { synthesizeTerminalToolReply, TERMINAL_STOP_TOOLS } from './gm-agent'

describe('synthesizeTerminalToolReply', () => {
  it('returns a success confirmation when generate_report resolved ok', () => {
    const reply = synthesizeTerminalToolReply([
      { tool: 'find_knowledge', result: { ok: true, data: [] } },
      { tool: 'generate_report', result: { ok: true, data: { id: 'r1' } } },
    ])
    assert.equal(reply, "Report's ready — opened it above.")
  })

  it('returns a failure confirmation when generate_report resolved with ok=false', () => {
    const reply = synthesizeTerminalToolReply([
      { tool: 'generate_report', result: { ok: false, reason: 'error' } },
    ])
    assert.equal(reply, "I couldn't build that report — details are in the card above.")
  })

  it('returns a success confirmation when save_knowledge_doc resolved ok', () => {
    const reply = synthesizeTerminalToolReply([
      { tool: 'save_knowledge_doc', result: { ok: true, data: { id: 'd1' } } },
    ])
    assert.equal(reply, 'Saved that to your knowledge base.')
  })

  it('returns a failure confirmation when save_knowledge_doc resolved with ok=false', () => {
    const reply = synthesizeTerminalToolReply([
      { tool: 'save_knowledge_doc', result: { ok: false, reason: 'error' } },
    ])
    assert.equal(reply, "I couldn't save that — details are in the card above.")
  })

  it('returns null when the last call is not a terminal-stop tool (MAX_STEPS exit)', () => {
    const reply = synthesizeTerminalToolReply([
      { tool: 'find_knowledge', result: { ok: true, data: [] } },
      { tool: 'pos_sales', result: { ok: true, data: {} } },
    ])
    assert.equal(reply, null)
  })

  it('returns null on an empty tool call log', () => {
    assert.equal(synthesizeTerminalToolReply([]), null)
  })

  it('treats a still-pending result (null) as failure, not success', () => {
    const reply = synthesizeTerminalToolReply([{ tool: 'generate_report', result: null }])
    assert.equal(reply, "I couldn't build that report — details are in the card above.")
  })

  it('keeps TERMINAL_STOP_TOOLS and the helper switch in sync (both branches)', () => {
    for (const tool of TERMINAL_STOP_TOOLS) {
      const success = synthesizeTerminalToolReply([{ tool, result: { ok: true } }])
      assert.ok(success, `expected a success reply for terminal tool ${tool}`)
      const failure = synthesizeTerminalToolReply([{ tool, result: { ok: false } }])
      assert.ok(failure, `expected a failure reply for terminal tool ${tool}`)
      assert.notEqual(success, failure, `success and failure replies for ${tool} should differ`)
    }
  })
})
