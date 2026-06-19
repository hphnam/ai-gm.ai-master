# A9 · Checklist completion-discipline (template-only mode)

Parsed: opening 27 steps, closing 32 steps. Mode: **template-only** against a synthetic completion log — replace `synthetic_log()` with `ChecklistStepCompletion` rows when exported (standing dependency on Ryan).

## Criticality weighting
| Weight | Meaning | Example steps |
|---|---|---|
| 5 | critical | close cash-up/safe (#1–2), gas off (#8), lock-up (#30) |
| 3 | high | open float (#7–8), cellar (#4), close ullage (#3) |
| 1 | normal | most steps + the sign-off |
| 0 | conditional (never a miss) | heating/soap/straws/fridge "if needed" |

## Detected deviations (synthetic log)
| Scenario | Severity | Weighted | Critical missed | Skipped | Unsigned | Late |
|---|---|---|---|---|---|---|
| Mon open — all mandatory, conditionals skipped | **ok** | 0 | – | False | False | False |
| Wed close — gas-off missed | **high** | 5 | [8] | False | False | False |
| Thu close — chairs-up (#31) absent on a weekday | **ok** | 0 | – | False | False | False |
| Sun close — chairs-up (#31) missed on Sunday | **low** | 1 | – | False | False | False |
| Fri close — skipped / abandoned | **critical** | 36 | [8, 30] | True | True | True |

Conditional steps never raise a miss; the Sunday-only close #31 is expected only on Sundays — mirroring the sales model's day-of-week structure.