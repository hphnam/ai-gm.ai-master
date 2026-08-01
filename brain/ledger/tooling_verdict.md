# Tooling verdict — MCP connector smoke test

Date: 2026-07-30. Method: one minimal live call per connector, plus follow-up
calls to characterise any failure. **Re-tested after Zotero was started.**

## Result table (final, post-retest)

| Connector | Call | Result |
|---|---|---|
| Zotero | `zotero_list_libraries`, `zotero_get_recent`, `zotero_get_item_metadata(format=bibtex)` | **PASS** — see below |
| NotebookLM | `notebook_query` on `d565d5f0-9ad6-446f-9573-2316a2f8c0ca` | **PASS** — 106 source titles returned |
| Overleaf | `list_projects`, `list_files` (read-only, no writes) | **PASS** — 1 project (`6a11ac2180bb716e3c2491c4`), 14 files |
| Repo / filesystem | Read + Bash under `brain/` | **PASS** |

## Verdict

**Yes — this environment has simultaneous reliable access to all four.** No
connector is a blocker for unattended runs.

## Zotero — READS ONLY. Writes are unavailable.

**Amendment 2026-07-30.** The PASS recorded above and below covers **reads
only**. `zotero_add_by_isbn` failed with:

> `Cannot perform write operations in local-only mode. Add ZOTERO_API_KEY and
> ZOTERO_LIBRARY_ID to enable hybrid mode.`

Every write path is therefore unavailable — `add_by_isbn`, `add_by_doi`,
`add_by_url`, `create_note`, `update_item`. **This blocks the `PRJ93_RULES.md`
requirement that the agent push new papers to Zotero itself**, and it blocks it
for every future session, not just the one that found it. Until those two
environment variables are set, a session that needs to add a paper can only hand
over a BibTeX entry and say so.

Reads verified working and unaffected: `list_libraries`, `search_items`,
`get_item_metadata`, `get_item_fulltext`, `get_item_children`.

**`get_item_fulltext` is the most valuable of these.** It resolved all eleven
citations NotebookLM could not verify, including paywalled journal articles the
notebook held only as reference-list fragments. When NotebookLM answers with an
external-knowledge disclaimer, go to Zotero fulltext rather than re-querying.
Caution: it returns 10k+ tokens per paper — delegate to subagents that return
verdicts and quotes only.

One extraction failure worth knowing: `parasuraman_humans_1997` is a scanned
ProQuest image PDF with no OCR layer and returns only "Reproduced with
permission of the copyright owner" page stamps. `zotero_read_pdf_pages` also
fails there (PyMuPDF not installed). Its abstract field carried enough to settle
the claim, but a scanned attachment is a silent failure mode — the call
succeeds and returns text that is not the paper.

---

## Zotero — first probe failed, second passed

The first probe ran with the Zotero desktop app closed. Recorded here because
the failure mode is dangerous and will recur if the app is ever shut:

- `zotero_list_libraries` **succeeded** even then (it reads the local SQLite DB
  directly), returning My Library 122 items and group `scc452` 109 items. So a
  successful library listing is **not** evidence the connector works.
- Everything needing the desktop app's local HTTP API failed with
  `[Errno 61] Connection refused`: `get_recent`, `get_item_metadata`,
  `search_by_citation_key`.
- **The dangerous part:** `zotero_search_items(query='Chronos')` did *not*
  error. It silently fell back to semantic search and returned items rendered
  as `Untitled` / `Type: unknown` / no authors. That is a silent-wrong-answer
  mode — a careless unattended run could read it as a hit.

After the app was started, the full smoke test passed: `get_recent` returned
real metadata, and `get_item_metadata(item_key='QPIG7HYM', format='bibtex')`
returned Diebold & Mariano (1995), *Comparing Predictive Accuracy*, JBES 13(3)
253-263, doi 10.2307/1392185, key `Diebold1995_QPIG7HYM`.

**Standing rule for later sessions.** Before any citation work, run one
`zotero_get_item_metadata` on a known key. If it errors, or if a search returns
`Untitled` / `Type: unknown`, treat Zotero as DOWN and stop — do not treat a
successful `list_libraries` as proof of life.

**Better BibTeX not separately confirmed.** `search_by_citation_key` was tested
with a guessed key (`ansari2024chronos`) and correctly returned "No item found"
— a working answer to a bad question, not a failure, but it does not prove BBT
is loaded. The bibtex key the MCP returned (`Diebold1995_QPIG7HYM`) is
MCP-generated, not necessarily the BBT key the Overleaf `ref.bib` uses. Confirm
against a real key from the chapter before relying on key-level verification.

## Observations to carry forward

- **Source-count mismatch, unreconciled:** NotebookLM 106, Zotero My Library
  122, Zotero group `scc452` 109. Do not assume the two are in sync. Note that
  Diebold & Mariano was added **2026-07-27**, i.e. the reading gaps in examiner
  weakness 54 are actively being filled — some of the Zotero surplus over
  NotebookLM is probably recent additions not yet loaded into the notebook.
- **Which library backs the bibliography is not established.** Resolve before
  any citation-key verification pass: `scc452` (109) is closer to NotebookLM's
  106 than My Library (122) is.
- Overleaf exposes one project; its file list is the chapter scaffold. **No
  file contents were read** — listing only.
- **graphify:** the graph lives at the **repo root** (`graphify-out/graph.json`,
  9.4 MB, plus `graph.html` and `GRAPH_REPORT.md`), not under `brain/` —
  `brain/graphify-out/` holds only `cache/stat-index.json` and is not a graph.
  **The root graph DOES cover `brain/`:** 3,258 of 7,959 nodes are brain-scoped
  (41%), across **271 brain files** — `compute/`, `conformal/`, `eval/`,
  `models/`, `signals/`, `sim/`, `ingest/`, `store/`, `tests/`, plus the `.md`
  reports and `CONTRACT.md` / `FLAGS.md`. Communities include "Brain / Tests"
  and "Api / Modules / Proactive Brain". Built at commit `dbcc525` (report 51,
  S11 G17j) — **one commit behind** tip `22fcdba`, so re-run `graphify update .`
  before relying on it.

  > **Correction, and how the error was made.** An earlier entry in this file
  > claimed 0 brain-scoped nodes. That was wrong. The probe filtered node keys
  > `file` / `path` / `id`; the actual key is **`source_file`**, and `id` (which
  > does exist) holds a numeric string, so the filter silently matched nothing
  > and returned a confident zero. A null result from a guessed schema is not
  > evidence of absence — inspect the node keys first. Verified three ways:
  > `source_file` scan (3,258), a `"brain/…"` path grep on `graph.json` (271
  > unique files), and community labels in `graph.html` (740 "brain" hits).

- **`graphify query` / `explain` hang in practice — do not call them inline.**
  Measured: `graphify --version` returns instantly, but `query` and `explain`
  produced no output at all after 115s and 100s respectively (not even an exit
  code). The cause is parse cost, not disk: `wc -c` on `graph.json` returns in
  **0.008s**, while `python3 json.load` on the same file did not finish inside
  **5 minutes**. The file reads instantly and parses pathologically slowly; why
  is unresolved. Practical rules for later sessions:
  - Do not block a turn on `graphify query`. Background it, or skip it.
  - For orientation, `grep` the artifacts directly — `graph.json` for
    `"brain/…"` paths, `GRAPH_REPORT.md` (108 KB markdown) for architecture.
    Both are fast because they avoid the JSON parse.
  - Root `CLAUDE.md` mandates graphify-before-grep. That instruction assumes a
    responsive CLI. Where it is unresponsive, grepping the graph artifacts is
    the same information by another route — but say so rather than silently
    skipping the step.
