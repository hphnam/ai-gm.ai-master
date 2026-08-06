# Agent Memory

agentmemory is the cross-session memory store. The worker must be live at
`http://localhost:3111` (`agentmemory status`); when it is down the MCP tools
silently fall back to a flat `~/.agentmemory/standalone.json` and nothing is
captured. If a memory tool returns empty sessions/audit, check the worker first
before concluding there is no history.

## Required at the start of every session

Call `mcp__agentmemory__memory_recall` with the topic of the user's first
request before making a plan. Prior decisions and dead ends live there, not in
the repo.

## Required before ending a session

Call `mcp__agentmemory__memory_save` for anything a future session would have to
re-derive: a decision and its reasoning, a constraint discovered the hard way, a
workaround and why the obvious fix does not work. Include `concepts` and the
`files` touched.

Do not save what the repo already records — file structure, diffs, commit
history, or anything restated in CLAUDE.md.

## Notes

- Lifecycle hooks in `~/.claude/settings.json` capture observations
  automatically; explicit `memory_save` is for durable conclusions, not activity.
- Recall is BM25-only unless an embeddings provider key is configured, so query
  with concrete keywords (file names, error strings, tool names) rather than
  vague prose.
