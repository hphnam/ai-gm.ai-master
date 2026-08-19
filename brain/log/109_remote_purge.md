# 109 · Erase the data from the remote, keep it locally, one repository

**S37.** A destructive history rewrite of `hphnam/ai-gm.ai-master` with a proven recovery
path. The Overleaf clone was not touched. No API call to a model, no credential, no model
load, refit, rescore or store write. Predecessor: S36, `brain/log/108_ryan_adoption.md`,
decision row 127.

---

## 0 · The finding that sets the severity, before anything else

S36 reported the exposure as *"real venue trade and PII"*. V1.1 of this package required
inspecting the files rather than describing them, and what the largest one holds is worse
than that phrase implies.

`brain/data/items-2024-01-01-2026-06-01.csv` is a 77 MB UTF-16 Square export, **92,329
transaction lines from 2025-06-04 to 2026-05-31, 36 columns**. Measured from the preserved
local copy:

| column | non-empty rows | distinct values |
|---|---:|---:|
| `Customer Name` | 14,296 | **506** |
| `Customer ID` | 14,348 | 524 |
| `Employee` | 92,172 | **17** |
| `PAN Suffix` | 74,619 | **6,752** |
| `Card Brand` | 74,619 | 8 |
| `Transaction ID` | 92,329 | 51,705 |
| `Payment ID` | 92,329 | 51,587 |
| `Token` | 92,131 | 582 |
| `Notes` | 1,281 | 43 |

**506 named members of the public, each linked to a card brand and the last four digits of
a card, to a timestamp, an item and a price. Seventeen named employees across every line.**
On a repository that has been public since 2026-06-18.

That is a different category from commercial data, and it is what the rest of this package
removes. **Removing it from the remote ends future access. It cannot recall past access**,
and nothing in this package should be read as claiming otherwise.

The second file, `brain/data/Elliot's AI-GM Questions - Query result.csv`, holds 735
messages across 66 conversations, 2026-04-29 to 2026-06-12, containing 4 email addresses,
1 phone number and 1,449 money amounts. **The named individuals in it are counted here and
deliberately not listed**: this report is committed to the same public repository, and a
list of real people's names inside it would re-create in prose exactly what the package
exists to delete.

---

## 1 · State

| | before | after |
|---|---|---|
| `refs/heads/main` | `c611d2e11f74` | **`c208f94753f2`** |
| `refs/heads/brain-construction-local` | `b64eaf8be4b4` | **`44f4d9eaf907`** |
| `refs/heads/brain-construction` | *(remote-only, `dbcc525bbe63`)* | **`37c8d8c62418`** |
| `refs/heads/ryan-adoption` | `81b1f9025e69` | **`349e29a8744d`** |
| `refs/stash` | `5b0fd4121bae` | `a8db3c70e2fc`, and preserved as `refs/heads/s37-stash-preserved` |
| commits, all refs | 573 | **573 — none dropped** |
| `.git` size | 376 MB | **22 MB** |
| pack | 292.58 MiB | **21.30 MiB** |
| repository visibility | public | public — unchanged, and Nam's to decide |
| forks | — | **0** |

`refs/remotes/origin/*` does not appear after the rewrite because `filter-repo` removes the
`origin` remote by design. It was re-added by hand before the push.

**Two refs were converted to branches before the rewrite so that nothing could be lost.**
`origin/brain-construction` had no local counterpart, and a stash is not a branch: both were
given `refs/heads` names first. All five branches and the stash survive with rewritten SHAs.

---

## 2 · The removal set, and the two things the twenty-one missed

| paths | files | where | verdict |
|---|---:|---|---|
| `brain/data/` | 21 | all three remote branches | **removed** |
| `items-2024-01-01-2026-06-01.csv` (repository ROOT) | 1 | history only | **removed** |
| `Elliot's AI-GM Questions - Query result.csv` (ROOT) | 1 | history only | **removed** |
| `opening_and_closing_checklist.md` (ROOT) | 1 | history only | **removed, in a second pass** |
| `data/state_store.db/` | 18 | history only | **removed** |
| `docs/*.xlsx` | 3 | history only | **removed** |

**The two root CSVs share a blob with the copies under `brain/data/`** — verified,
`638f80da3596697a2398450b96de597add9b9863` for the 77 MB export at both paths. Removing only
`brain/data/` would have left the identical content reachable at the root path. This is why
the sweep is not optional.

**The sweep's own miss, recorded because it nearly cost the package its result.** V1.2's
search terms are extensions: `.csv .xlsx .xls .json .db .duckdb .parquet .sqlite .env`.
`opening_and_closing_checklist.md` is none of them, so a third root copy of a removed file
survived pass 1 and was caught only by the post-rewrite filename grep. **An extension list
is a guess about what data looks like.** A second pass removed it.

**A second methodological trap, which produced a wrong file list before it was caught.**
`git rev-list --objects --all` lists each *object* once, with one of its paths. Git
deduplicates identical blobs, so three stock sheets with byte-identical twins never appeared:
the enumeration showed 17 files under `brain/data/` where the index has 21. The correct
enumerator is `git log --all --pretty=format: --name-only --no-renames`, per commit.

### 2.1 · What the sweep found and this package did **not** remove

| path | what it holds | why it stayed |
|---|---|---|
| `brain/sim/*_l3_raw.json` (2) | item-grain net sales by location × category × item × date, plus `merchant_id: ML1FFAGJMQBTZ` | frozen held-out actuals; the confrontation result is scored against them |
| `brain/sim/*_actuals_l1/l2_raw.json` (5) | venue and category daily actuals, same merchant id | same |
| `brain/sim/*.parquet` (5) | frozen forecasts and June actuals | the reproducibility anchor for report 31 |
| `brain/eval/exchangeability_scores.csv` | 5,167 rows of venue daily actual and forecast | the exchangeability diagnostic reads it |

**These are a decision for Nam, not for this package.** They are derived research artefacts
that published claims rest on, and deleting them three weeks before submission would break
reproducibility to remove commercial data of a much lower order than the transaction export.
**No customer name, no employee name, no card suffix and no transaction id survives in any
of them** — that was verified by content scan, §7.3.

The residual identifier is the **Square merchant id `ML1FFAGJMQBTZ`**, present in seven
`brain/sim/*_raw.json` artefacts and five prose files (`brain/docs/PRJ93_Master_State_Log.md`,
`brain/knowledge/04_supervisor_evidence_pack.md`, `brain/ledger/phase_state.md`,
`brain/log/12_WorldCup_LiveProbe_Report.md`, `brain/log/31_G12_17c_C2_Confront_Report.md`).
A merchant id is an account identifier, not a credential. **Redacting it from the five prose
files costs nothing and touches no artefact**; that is the cheap half of the remaining
decision, and it is not taken here.

---

## 3 · The bundle, and the proof it restores

`~/prj93-backup/ai-gm-prerewrite-2026-08-19.bundle`

| | |
|---|---|
| size | **29,854,873 bytes** |
| SHA-256 | **`9b40074eceab8273ea4300e2b87e050121e482b3eb46228a1115117335626734`** |
| location | outside every git working tree — verified: `git rev-parse --show-toplevel` in that directory returns *"fatal: not a git repository"* |

**Restoration, demonstrated rather than asserted.** A mirror clone of the bundle, compared
against the pre-rewrite ref list:

```
=== V2.3 · refs in the RESTORED clone ===
b64eaf8be4b4f30f65121ced9e34434329579635 refs/heads/brain-construction-local
c611d2e11f7465b073f2309ca61134d117011248 refs/heads/main
81b1f9025e6947d3fdd4372d4fea0f9d09b9895c refs/heads/ryan-adoption
c611d2e11f7465b073f2309ca61134d117011248 refs/remotes/origin/HEAD
dbcc525bbe632c277a25eee4c8f5670913fd5a0d refs/remotes/origin/brain-construction
b64eaf8be4b4f30f65121ced9e34434329579635 refs/remotes/origin/brain-construction-local
c611d2e11f7465b073f2309ca61134d117011248 refs/remotes/origin/main
5b0fd4121baea15d8168e19e8d285f327c58b7f0 refs/stash

=== comparison against the original (V1.3) ===
*** EVERY REF PRESENT, EVERY HEAD SHA MATCHES ***

=== commit counts ===
original : 572
restored : 572

=== the data is present in the restored clone (so the backup is real) ===
5
77045466
```

The last two lines are the ones that matter: the restored clone still has five commits
touching the 77 MB export, and `git cat-file -s 638f80da…` returns its exact byte count. **A
backup that restores a repository without the thing you deleted is not a backup.**

(572 rather than 573 because the bundle was taken before the V5 ignore commit.)

---

## 4 · The local copies, checksummed

`~/prj93-data-local/` — outside every git working tree, verified the same way.

**42 files, 42 SHA-256 pairs, 42 matches, 0 mismatches.** The 21 live files were copied from
the working tree; the 18 agentmemory blobs and the 3 `docs/` canaries exist on no ref tip and
were extracted from `e84c42e8` and `b515e620` **before** the rewrite, which is the only moment
they were still reachable.

```
total rows: 42
OK        : 42
MISMATCH  : 0
```

---

## 5 · Ignore rules, and the gap they had

`brain/.gitignore` already covered `brain/data/` — the one thing S36 adopted from Ryan. It
did not cover the repository root, and `git check-ignore -v` said so:

```
NOT IGNORED  Elliot's AI-GM Questions - Query result.csv
NOT IGNORED  items-2024-01-01-2026-06-01.csv
```

Fixed before the rewrite, root-anchored so nested fixtures are untouched, and re-verified
with a control that must stay un-ignored:

```
ignored      Elliot's AI-GM Questions - Query result.csv   <- .gitignore:60:/*.csv
ignored      items-2024-01-01-2026-06-01.csv               <- .gitignore:60:/*.csv
NOT IGNORED  brain/eval/exchangeability_scores.csv          (the control)
ignored      docs/OPENING CHECKLIST BEERHALL.xlsx           <- .gitignore:12:docs/*.xlsx
```

---

## 6 · The rewrite

`git filter-repo` **`a40bce548d2c`**, installed into an isolated scratch venv so no project
environment changed. Two passes, `--invert-paths --paths-from-file`, the paths files kept as
artefacts.

Local verification before the remote was touched:

```
    0 commits  brain/data/
    0 commits  Elliot's AI-GM Questions - Query result.csv
    0 commits  items-2024-01-01-2026-06-01.csv
    0 commits  data/state_store.db/
    0 commits  docs/CLOSING CHECKLIST BEERHALL.xlsx
    0 commits  docs/OPENING CHECKLIST BEERHALL.xlsx
    0 commits  docs/WEEKLY JOBS CHECKLIST BEERHALL.xlsx
    0 commits  opening_and_closing_checklist.md
```

and a blob-level check that does not depend on paths at all: every one of the 42 preserved
files was hashed with `git hash-object` and looked up with `git cat-file -e`. **None is
reachable.**

`brain/ledger/commit_map_2026-08-19.txt`, 574 rows, **composed across both passes** —
verified by looking up an original SHA and getting the final one, not the intermediate:

```
b64eaf8be4b4f30f65121ced9e34434329579635 44f4d9eaf9071e71a0383cf8b19a6529af57fd7c
final    brain-construction-local = 44f4d9eaf9071e71a0383cf8b19a6529af57fd7c
```

`filter-repo` also wrote `suboptimal-issues`, listing 37 hash-shaped strings in commit
messages it left as-is. Nearly all are not commits in this repository: `cc93b6fa` is Ryan's
pin, `019f1354`/`e0add42`/`0d87d8a` are Overleaf, `c1137f76a76f` is the frozen prompt hash,
`2c0533c4` is S36's fingerprint digest, `20260811090000` is a migration name. Commit-message
text was not rewritten; §8's register is the bridge instead.

---

## 7 · The force push, and verification from outside

### 7.1 · The pushes

All three remote branches, each with `--force-with-lease` naming the exact SHA it expected to
replace, so a concurrent change would have aborted the push rather than overwriting it:

```
+ b64eaf8...44f4d9e brain-construction-local -> brain-construction-local (forced update)
+ dbcc525...37c8d8c brain-construction       -> brain-construction       (forced update)
+ c611d2e...c208f94 main                     -> main                     (forced update)
```

**One thing to report that nobody asked for.** The project's push guard
(`.claude/hooks/block-dangerous-commands.sh`) is supposed to block any push to `main`. It did
not block this one. Its regex expects the branch name in the token immediately after the
remote; `--force-with-lease=refs/heads/main:<sha>` sits between `push` and `origin`, so the
branch lands one position further along and the pattern misses it. The lease form was
necessary here — `filter-repo` removes the `origin` remote, so there were no remote-tracking
refs for a bare `--force-with-lease` to compare against, and fetching to create them would
have pulled the deleted blobs straight back into the local repository. **The push was
authorised by this package's own specification; the guard's gap is real and independent of
that, and it is reported so it can be closed.**

### 7.2 · A fresh clone, and what it says

`git clone --mirror` from the remote into a scratch directory, then every check on that clone
and not on the local one:

```
=== refs on the remote now ===
37c8d8c6241804eedb53fd02d0bd05b195e467e9 refs/heads/brain-construction
44f4d9eaf9071e71a0383cf8b19a6529af57fd7c refs/heads/brain-construction-local
c208f94753f29ac0e6766d6dfa541227ff72de23 refs/heads/main
bcfab6ee21d259154c83fb0a2cefe5afe9d5b7c6 refs/pull/1/head

=== V7.2b · rev-list --objects --all grep for every removed FILENAME ===
    0  items-2024-01-01
    0  Elliot's AI-GM
    0  state_store.db
    0  BEERHALL
    0  Stock Take
    0  Stock Sheet
    0  Stock Lune
    0  stock sheet
    1  opening_and_closing
```

**A fourth ref exists that no force push can reach.** `refs/pull/1/head` is GitHub-managed,
belongs to closed pull request #1 *"run 1st test"*, and is not rewritten by anything a client
can do. `git log --full-history` on it returned **one** commit touching `brain/data`, and the
filename grep returned **one** hit — so for a while this package's result was one file short
of clean.

**It is not.** The entry is a symlink, not the file:

```
120000 blob e7802749947e82536c4f69e927bd7bd9ef4d0d58      38   brain/data/opening_and_closing_checklist.md
$ git cat-file -p e7802749947e82536c4f69e927bd7bd9ef4d0d58
../../opening_and_closing_checklist.md
```

Thirty-eight bytes pointing at the root copy, which no longer exists anywhere in the history.
`refs/pull/1/head` is an ancestor of no branch. **The PR ref carries a dangling symlink and no
data.** Recorded in full because the path-and-filename checks alone would have read as a
failure, and a package that stopped there would have reported the wrong answer in the safe
direction — which is still the wrong answer.

### 7.3 · The content scan, which is the check that actually settles it

Paths can be renamed; content cannot hide. Every object in the fresh clone's **full history,
all refs**, was streamed through `git cat-file --batch` — 11,212 objects, **797,749,378 bytes
decompressed** — and grepped:

```
conversationId,channel,conversationStartedAt   : 0 hits
Turn on Rhubarb Room lamps                     : 0 hits
Customer Reference ID                          : 0 hits
PAN Suffix                                     : 0 hits
Fuggle FP                                      : 0 hits
Stock take                                     : 0 hits
Rhubarb Room                                   : 2 hits
```

The two surviving `Rhubarb Room` hits were traced to a single object,
`brain/sim/june2026_actuals_l3_raw.json` — the frozen item-grain June actuals of §2.1, which
this package deliberately did not remove. **Every string unique to the deleted data returns
zero.** The one non-zero hit is a file we chose to keep, and it is named here rather than
excluded from the search.

### 7.4 · Forks, visibility, and the request that is not mine to send

From the public GitHub API, unauthenticated:

| | |
|---|---|
| visibility | **public** (`private: false`), created 2026-06-18 |
| **forks** | **0** (`forks_count: 0`, `network_count: 0`) |
| watchers | 0 · stars 0 |
| pull requests | 1, closed — head `bcfab6ee`, the dangling symlink above |

**Zero forks is the single best fact in this report.** A fork keeps its own copy of the
objects and no force push reaches it; there is none to reach.

**Still outstanding, and it is Nam's to send, not mine.** GitHub keeps unreachable objects
fetchable by direct SHA URL —
`https://github.com/hphnam/ai-gm.ai-master/commit/<old-sha>` and the raw blob endpoints —
until Support garbage-collects them. Drafted, not sent:

> **To:** GitHub Support · **Subject:** Request to purge unreachable objects after a
> history rewrite — hphnam/ai-gm.ai-master
>
> I have rewritten the history of `hphnam/ai-gm.ai-master` with `git filter-repo` and
> force-pushed `main`, `brain-construction` and `brain-construction-local`, to remove files
> that were committed in error and contain personal data: customer names, employee names and
> partial payment-card details (last four digits and card brand) for a hospitality business,
> across roughly 92,000 transaction rows.
>
> The objects are no longer reachable from any branch, but I understand they remain
> retrievable by direct SHA URL until purged. **Please garbage-collect the unreachable
> objects on this repository.** The repository has no forks (`network_count: 0`).
>
> Old branch tips, for reference:
> `main` `c611d2e11f7465b073f2309ca61134d117011248`;
> `brain-construction-local` `b64eaf8be4b4f30f65121ced9e34434329579635`;
> `brain-construction` `dbcc525bbe632c277a25eee4c8f5670913fd5a0d`.
>
> There is also one closed pull request, #1, whose `refs/pull/1/head` I cannot rewrite. I have
> verified it carries only a dangling symlink and no file content, but please include it in
> the purge.

**One thing this draft does not do is decide whether the exposure is notifiable.** 506 named
individuals with partial card data, on a public repository, for an unknown period, is a
question for the data controller and not for a package specification. It is raised here so
that it is raised somewhere.

---

## 8 · The evidence chain

`brain/ledger/sha_citation_register.md` was written **before** the rewrite: 207 files
scanned, 339 hex tokens found, **121 that resolve to real commits here, cited 429 times**.
Tokens that are not commits — the prompt hash `c1137f76`, S36's digest `2c0533c4`, blob SHAs,
file checksums — were excluded by the resolution test rather than by eye. So were SHAs
belonging to other repositories: Ryan's `cc93b6fa` is cited many times and correctly does not
appear, because the rewrite cannot touch it.

**120 of the 121 map to a successor. None was dropped for becoming empty**, including
`58e9b792` *"data enrichment"*, the commit that introduced the data, which survives because
it touched more than the removed paths.

**Four citations live in the dissertation itself, all four in `appendix/tables.tex`, and all
four are LaTeX comments.** No printed sentence anywhere in the document cites a commit SHA,
so nothing an examiner reads changed. The four are mapped in the register like the rest.

### 8.1 · The one that does not map, and it is not the rewrite's doing

`6c919a59`, cited once, in report 99's own state table at
`brain/log/99_appendix_placements_and_static_regime.md:10`. **It has no successor because it
was never a reachable commit.** It resolved in the working repository only as a dangling
object and is absent from the pre-rewrite bundle, which carries every ref.

Report 99 wrote down the SHA its own commit would take, before making it. The commit that
actually landed the report is `4e0867c2` — verified with `git show --stat`, which lists
`brain/log/99_appendix_placements_and_static_regime.md | 489 +++` — and that maps to
`ec4f6778`. **A broken citation that predates this package, found by the mapping exercise.**
Report 99 is not edited; the register carries the forward pointer.

---

## 9 · The two loose ends from S36

### 9.1 · Three corrections, appended to `brain/ledger/numbers_audit.md`, no numbered row edited

**C-S37-1 · the surface is 12 endpoints, not 8.** Ten in `service/app.py`, two in
`service/compute.py`. The cause of the drift ran the *other* way from a stale count:
`README.md` listed eleven for `app.py`, one more than exist, because it still carried
`POST /refresh`, deleted under M1. **Fixed here**, along with a second note further down the
same file that named `/refresh` as the reason to bind to localhost — the bounded write behind
`GET /forecast?freshness=live` is what makes that advice true now.

**C-S37-2 · the suite is 678 collected with one failure.** And the failing test is not a
network test: it fails in `.venv-run`, which has neither `torch` nor `chronos`. See §9.2.

**C-S37-3 · a pre-push scan of the diff cannot see what is already tracked.** S35's scan was
correct about what it examined and reported clean indefinitely, because the data was added in
`58e9b792` and appears in no later diff. **The scope was never stated next to the verdict,
which is what made it read as a guarantee.**

### 9.2 · The Ellel static exposure — established, not repaired

**Outcome: (2) a claim needs qualifying.** Not (1), and not (3).

The three document sites that rest on the static regime:

1. `chapters/methodology.tex:378` — *"on a single eight-week static block the served
   exogenous arm produces no forecast at any venue"*.
2. `appendix/robustness.tex:442` — *"On that block the served exogenous foundation arm
   produces no forecast at all, at any of the three venues. It raises a `ValueError` and its
   row in each ladder report carries an error marker where a score would be."*
3. `appendix/robustness.tex:451` — *"The other two venues reorder again rather than
   reproducing either pattern."*

**Sites 1 and 2 are safe.** Both are claims about what the committed reports *say*, verifiable
by reading them, and the mechanism behind them — Chronos-2's `predict_df` requiring a gap-free
continuation, with `chronos2_exo_predict` carrying no fallback by design — is verified at
`models/foundation.py`, independently of Ellel.

**Site 3 is the one that needs qualifying.** *"The other two venues reorder"* is a claim about
the **ordering** of the Two River Taps and Ellel static tables — that is, about their score
columns. Ellel's column cannot be regenerated from this code: `evaluate_static("ellel")`
raises `UnknownBasisError` before scoring its first entrant, because
`config.VENUE_SCALE_BASIS["ellel"] == "unscaled"` reaches `harness.point_metrics` at
`models/ladder.py:405` ahead of the two places the same file handles that basis.

**And there is a sharper form of the same problem, which is the finding worth carrying.** The
committed `models/ladder_results_L1_ellel.md` static table prints a **MASE** column — 1.095,
1.050, 1.039 and so on — for the one venue `chapters/methodology.tex:259` rules *"has no
defensible scaled basis and is scored on unscaled"*. The table predates the ruling. **It is
not that the numbers cannot be regenerated; it is that today's code is right to refuse to
regenerate them.**

**No reported number is affected.** Every ladder figure in Chapter 4 is rolling, which
`robustness.tex:453` states outright. The one static figure quoted anywhere,
`appendix/tables.tex:51`'s `$0.824$`, is the **Beer Hall**, and that same passage says of
Prophet *"It never scored at Ellel"*. Searched: `chapters/*.tex` and `appendix/*.tex` for
`static regime`, `static block`, `eight-week`, `8-week`, `static horizon`, and for `ellel`
co-occurring with `static`, `unscaled` or `MAE`. **No Ellel static-regime score is printed
anywhere in the document.**

So: one appendix sentence makes a claim about an ordering that this codebase can no longer
produce for one of the two venues it names. It is not repaired here, and neither is the
underlying defect — both are `models/ladder.py`, and both are Nam's call against three weeks
of budget.

---

## 10 · Close

| | |
|---|---|
| **V7 verification** | **Clean.** On a fresh mirror clone of the remote: zero commits for every removed path, zero hits for every removed filename, and **zero hits for every content string unique to the deleted data across all 11,212 objects and 797,749,378 decompressed bytes of full history**. The one apparent survivor, `refs/pull/1/head`, carries a 38-byte dangling symlink and no content. |
| **Forks** | **0.** `forks_count: 0`, `network_count: 0`. No copy of the old objects exists outside this repository. Visibility is still public and unchanged — Nam's decision, not this package's. |
| **Bundle** | `~/prj93-backup/ai-gm-prerewrite-2026-08-19.bundle` · 29,854,873 bytes · SHA-256 `9b40074eceab8273ea4300e2b87e050121e482b3eb46228a1115117335626734` · restoration demonstrated, all 8 refs and 572 commits, with the 77 MB blob intact |
| **Local copies** | `~/prj93-data-local/` · 42 files · **42 of 42 SHA-256 pairs match** |
| **V9.2 outcome** | **(2) a claim needs qualifying** — `appendix/robustness.tex:451`. No reported number derives from the Ellel static evaluation, and the committed Ellel static table prints a MASE for the venue the methodology rules has no defensible scaled basis. |

**Still open, and all three are Nam's:** send the Support request; decide whether the
exposure is notifiable; and rule on `brain/sim/`'s item-grain actuals and the merchant id,
where redacting the five prose mentions is free and removing the seven artefacts is not.
