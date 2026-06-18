#!/usr/bin/env bash
# Unattended PAUL runner.
#
# Runs Claude Code in headless mode, resumes PAUL state, advances as far as
# possible, loops until blocked by a human-only gate (UI UAT, external
# credentials) or milestone completion. Logs everything.
#
# Usage:
#   bash scripts/run-paul.sh                 # run indefinitely
#   bash scripts/run-paul.sh --once          # run one iteration then exit
#   MAX_ITERATIONS=5 bash scripts/run-paul.sh
#
# Prereqs:
#   - `claude` CLI on PATH
#   - clean git working tree (script refuses if uncommitted changes exist)
#
# WARNING:
#   Uses --dangerously-skip-permissions so tool calls never prompt. This means
#   rm, git reset --hard, etc. will execute without confirmation. Review the
#   prompt below before enabling.

set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
LOG_DIR="$REPO_ROOT/.paul/automation-logs"
mkdir -p "$LOG_DIR"

MAX_ITERATIONS="${MAX_ITERATIONS:-999}"
ONCE=0
if [[ "${1:-}" == "--once" ]]; then
  ONCE=1
  MAX_ITERATIONS=1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "error: claude CLI not found on PATH" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: working tree is dirty — commit or stash before running" >&2
  git status --short
  exit 1
fi

PROMPT=$(cat <<'PROMPT_EOF'
You are running unattended. Advance the PAUL workflow as far as possible
without asking me questions.

### Core loop
1. Start with /paul:resume to restore state.
2. Based on loop position, run the next command:
   - PLAN ○: /paul:plan
   - PLAN ✓, no AUDIT: /paul:audit <plan-id>
   - AUDIT ✓, APPLY ○: /paul:apply <plan-id>
   - APPLY ✓, UNIFY ○: /paul:unify <plan-id>
   - All ✓: advance to the next scoped plan and repeat.
3. For any discuss/question prompt, use --auto or pick the enterprise-
   audit-recommended default. Never ask the human.

### Scope discipline (hard rules)
- Do ONLY what the current plan in STATE.md specifies. Never expand scope.
- If you discover adjacent problems, note them in `.paul/DEFERRED.md`
  with a trigger, then move on. Do not fix them in this run.
- Refuse "nice to have" additions. When in doubt, cut not add.
- Prefer deleting/simplifying over adding. A smaller diff is better than
  a larger one that "improves" things.
- No new abstractions unless the plan explicitly calls for them. Three
  similar lines > premature abstraction.
- No new dependencies unless the plan names them.
- No new files unless the plan names them. Prefer editing existing files.

### Commit cadence (frequent, atomic)
- Commit after every meaningful unit: per task in a plan, per audit,
  per unify. Never let >1hr of work sit uncommitted.
- Commit messages: plain English, no conventional-commit prefixes.
- Never force push. Never amend a pushed commit.
- Never skip pre-commit hooks (--no-verify). If a hook fails, fix the
  root cause or stop.

### Blocker protocol — STOP + notify the human via this marker
When you hit any blocker, your LAST output MUST include a line that
starts with exactly:
  BLOCKER:
…followed by a one-line human-readable reason. The wrapper script
greps for this string and sends a desktop notification.

Blockers (stop + emit BLOCKER: marker):
- A plan requires external credentials not in .env (e.g. TWILIO_*, real
  RESEND_API_KEY, Stripe keys)
- A plan requires UI-based UAT (human-only verification)
- A destructive operation you cannot safely auto-decide
- A test/probe failure you cannot fix within the current plan scope
- An ambiguity that the plan does not resolve and a discuss-auto default
  would materially affect scope

On milestone completion (not a blocker), emit:
  DONE: milestone <name> complete

### Exit summary (always print before exiting)
1. Final `git log --oneline -5`
2. STATE.md "Current Position" section
3. What, if anything, a human needs to do next
4. The BLOCKER: or DONE: marker line

Prefer safety over speed. If unsure, stop and emit BLOCKER:.
PROMPT_EOF
)

# --- notification hook ---------------------------------------------------
# Sends a desktop notification. Swap the body for ntfy.sh / Slack / Pushover
# if you want phone push. Current default: macOS osascript.
notify() {
  local title="$1"
  local message="$2"
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"$message\" with title \"$title\" sound name \"Glass\"" 2>/dev/null || true
  fi
  # Uncomment for phone push via ntfy.sh (free, no account required):
  # curl -fsS -d "$message" "https://ntfy.sh/YOUR-UNIQUE-TOPIC-HERE" \
  #   -H "Title: $title" -H "Priority: high" || true
}

iter=0
while (( iter < MAX_ITERATIONS )); do
  iter=$((iter + 1))
  ts="$(date +%Y%m%d-%H%M%S)"
  log="$LOG_DIR/iter-$ts.log"
  echo "[run-paul] iteration $iter/$MAX_ITERATIONS — logging to $log"

  # --verbose streams tool calls + messages to stdout in real time so you
  # can tail -f the log. Without it, -p buffers everything until completion.
  if ! claude --dangerously-skip-permissions --verbose -p "$PROMPT" 2>&1 | tee "$log"; then
    notify "PAUL runner crashed" "iteration $iter exited non-zero — see $log"
    echo "[run-paul] iteration $iter exited non-zero — stopping"
    exit 1
  fi
  echo "[run-paul] iteration $iter completed"

  # Inspect the log for BLOCKER: or DONE: markers.
  if blocker_line=$(grep -m1 '^BLOCKER:' "$log"); then
    notify "PAUL blocked" "${blocker_line#BLOCKER: }"
    echo "[run-paul] blocker detected — stopping"
    exit 0
  fi
  if done_line=$(grep -m1 '^DONE:' "$log"); then
    notify "PAUL milestone done" "${done_line#DONE: }"
    echo "[run-paul] milestone complete — stopping"
    exit 0
  fi

  if (( ONCE )); then
    echo "[run-paul] --once: exiting"
    exit 0
  fi

  # 5min pause between iterations so STATE.md settles + you can Ctrl-C
  echo "[run-paul] sleeping 300s before next iteration (Ctrl-C to stop)"
  sleep 300
done

notify "PAUL runner finished" "reached MAX_ITERATIONS=$MAX_ITERATIONS"
echo "[run-paul] reached MAX_ITERATIONS=$MAX_ITERATIONS"
