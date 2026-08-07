# The Overleaf push block — diagnosis and proposed fix

**Status: PROPOSED, NOT APPLIED.** Awaiting Phuong's approval. See "Scope boundary" at the
end — the change lands in `.claude/`, which `PRJ93_RULES.md` puts out of bounds for this
project and which is shared with a collaborator.

## Where it comes from

**Not git.** Verified on 2026-08-07, all negative:

| Checked | Result |
|---|---|
| `prj93-overleaf/.git/hooks/` | no non-sample hooks at all |
| `core.hooksPath` (local / global / system) | unset at every level |
| `git config` push/receive/protect keys | none |

**It is a Claude Code harness hook**, wired in
`/Users/hapuna/Downloads/ai-gm.ai-master/.claude/settings.json` as a `PreToolUse` hook with
`matcher: "Bash"`, running `.claude/hooks/block-dangerous-commands.sh`. The rule is that
script's lines 38–48: it matches `git push <remote> <branch>` where the branch is in
`{main, master, init.defaultBranch}` and emits a JSON `deny` with exit 2.

Two observations that pin the diagnosis:

1. **Phuong's own terminal push succeeded** with the identical command. A git hook would have
   blocked that too. The guard only sees the agent's Bash tool.
2. **The hook is repo-agnostic.** It inspects the *command string* only. It fires on any
   `git push origin main` regardless of which repository the command targets — which is why a
   guard configured for `ai-gm.ai-master` blocked a push to `prj93-overleaf`, a completely
   separate repository with a different remote.

## Why the guard's premise does not hold here

The remedy it prescribes — *"Use a feature branch and open a PR"* — is a GitHub workflow
assumption. Overleaf's git bridge is **single-branch**: `git ls-remote --heads origin` returns
`refs/heads/main` and nothing else, and the bridge has **no pull-request mechanism**. There is
no feature branch to open a PR from and nothing to open it against. The instruction cannot be
followed, so the guard is not deferring the push — it is refusing it permanently.

This matters beyond convenience. The compile-and-push rule in `PRJ93_RULES.md` makes a landed
push part of a complete report; a guard that makes the push impossible for the agent turns
that rule into one only a human can satisfy, which is how `fig_pipeline`'s `out`/`outb`
collision sat on Overleaf in a state that would not build at all.

## The proposed change

**Scoped to this repository only. It does NOT disable the protection generally and does NOT
route around the guard** — it teaches the guard which repository it is responsible for. The
discriminator is the **resolved remote URL**, never the branch name, so every other remote
(including this repo's own GitHub origin) keeps exactly the protection it has today.

Insert immediately BEFORE the existing `# ── Git push protections ──` block (currently line
38) of `.claude/hooks/block-dangerous-commands.sh`:

```bash
# ── Overleaf git-bridge exemption ───────────────────────────────────────
# Overleaf's git bridge is single-branch (ls-remote returns only refs/heads/main)
# and has no pull-request mechanism, so the "use a feature branch and open a PR"
# remedy below cannot be performed against it -- the guard would refuse the push
# permanently rather than defer it.
#
# Discriminate on the RESOLVED REMOTE URL, never on the branch name: this exempts
# the Overleaf bridge and leaves protection for every other remote untouched.
if contains_cmd '(^|[;&|()]+[[:space:]]*)git[[:space:]]+push'; then
  PUSH_DIR=$(printf '%s' "$COMMAND" | grep -oE 'cd[[:space:]]+[^;&|]+' | head -1 \
             | sed 's/^cd[[:space:]]*//' | sed 's/[[:space:]]*$//')
  REMOTE_NAME=$(printf '%s' "$COMMAND" \
             | sed -nE 's/.*git[[:space:]]+push[[:space:]]+([^[:space:]-][^[:space:]]*).*/\1/p' | head -1)
  REMOTE_URL=$(git -C "${PUSH_DIR:-$PWD}" remote get-url "${REMOTE_NAME:-origin}" 2>/dev/null || true)
  case "$REMOTE_URL" in
    *git.overleaf.com*) exit 0 ;;
  esac
fi
```

### It was tested before being proposed, in both directions

Per the rules — a guard nobody has seen fail is taken on faith, and that applies to a fix as
much as to a check. The logic was run standalone against the real repositories:

| Command / cwd | Resolved remote | Verdict |
|---|---|---|
| `git push origin main` in `prj93-overleaf` | `…@git.overleaf.com/6a11…` | **EXEMPT** |
| `cd /Users/hapuna/Downloads/prj93-overleaf && git push origin main` | `…@git.overleaf.com/6a11…` | **EXEMPT** |
| `git push origin main` against `ai-gm.ai-master` | `github.com/hphnam/ai-gm.ai-master.git` | **guard still enforced** |

The third row is the one that matters: the exemption must not leak. It does not.

### Known limitation, stated rather than glossed

The hook receives only the command string, so the target directory is inferred from an
explicit leading `cd` or falls back to the hook's `$PWD`. A push issued with `git -C <dir>
push …` is not parsed by the snippet above and would fall through to the normal protection —
**failing closed, which is the correct direction**. If that form is wanted later, add a
`-C` extraction alongside the `cd` one.

### What will not work, so it is not proposed

Adding `Bash(git push *)` to `permissions.allow` does **not** help: a `PreToolUse` hook `deny`
is authoritative and overrides a permission allow. The fix has to be in the hook.

## Scope boundary — read before applying

`PRJ93_RULES.md` § Scope boundary: *"Nothing in this file, or anything else under `brain/`,
modifies `.claude/` or the root `CLAUDE.md`. That config is shared with a collaborator and is
out of bounds for this project."*

This change edits `.claude/hooks/block-dangerous-commands.sh`. It is therefore **presented
for approval and deliberately not applied**, and the collaborator who shares that config is
affected by it. The alternative standing arrangement is that Phuong performs every Overleaf
push by hand — workable, and what happened for `d246333`/`24887e2`, but it makes the
push half of the compile-and-push rule depend on a human being present.
