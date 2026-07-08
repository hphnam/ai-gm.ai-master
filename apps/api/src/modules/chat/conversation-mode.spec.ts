import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ConversationModeService } from './conversation-mode.service'

function serviceWithReply(text: string, calls?: { count: number }): ConversationModeService {
  const svc = new ConversationModeService()
  // biome-ignore lint/suspicious/noExplicitAny: test injection of the private Anthropic client
  ;(svc as any).client = {
    messages: {
      create: async () => {
        if (calls) calls.count++
        return { content: [{ type: 'text', text }] }
      },
    },
  }
  return svc
}

function serviceThatThrows(): ConversationModeService {
  const svc = new ConversationModeService()
  // biome-ignore lint/suspicious/noExplicitAny: test injection of the private Anthropic client
  ;(svc as any).client = {
    messages: {
      create: async () => {
        throw new Error('boom')
      },
    },
  }
  return svc
}

describe('ConversationModeService.triage', () => {
  it('marks a clearly off-topic message off-topic', async () => {
    const svc = serviceWithReply('{"mode":"default","onTopic":false}')
    const result = await svc.triage('write me a python script to reverse a linked list')
    assert.equal(result.onTopic, false)
  })

  it('marks a real work question on-topic', async () => {
    const svc = serviceWithReply('{"mode":"default","onTopic":true}')
    const result = await svc.triage("what's below par in the cellar")
    assert.equal(result.onTopic, true)
  })

  it('forces incident mode + on-topic for an injury without calling Haiku', async () => {
    const calls = { count: 0 }
    const svc = serviceWithReply('{"mode":"default","onTopic":false}', calls)
    const result = await svc.triage("someone's been badly burned in the kitchen")
    assert.deepEqual(result, { mode: 'incident', onTopic: true })
    assert.equal(calls.count, 0)
  })

  it('soft-fails to default + on-topic on a classifier error', async () => {
    const svc = serviceThatThrows()
    const result = await svc.triage('how do other venues handle a rude customer')
    assert.deepEqual(result, { mode: 'default', onTopic: true })
  })

  it('never marks a safety question off-topic even if Haiku says so', async () => {
    const svc = serviceWithReply('{"mode":"default","onTopic":false}')
    const result = await svc.triage('a customer is choking, what do I do')
    assert.equal(result.onTopic, true)
    assert.equal(result.mode, 'incident')
  })
})

describe('ConversationModeService.hasIncidentKeywords', () => {
  it('detects an emergency call phrase', () => {
    const svc = new ConversationModeService()
    assert.equal(svc.hasIncidentKeywords('should I call an ambulance'), true)
  })

  it('does not fire on ordinary ops chatter', () => {
    const svc = new ConversationModeService()
    assert.equal(svc.hasIncidentKeywords('what time does the keg delivery arrive'), false)
  })
})
