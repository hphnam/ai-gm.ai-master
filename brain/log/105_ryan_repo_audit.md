# Report 105 · S33 · Ryan's repository — schema and provenance

**Package:** S33, read-only audit of a third-party repository.
**Nothing was written to Ryan's repository: no branch, no commit, no push, no issue, no PR.**
**No API call. No credential use. No `.tex` edit. Zero counted body words.**
**Predecessor:** S32, `brain/log/104_numbers_fixes_and_prereg.md`.

## 0 · State

| | |
|---|---|
| date | 2026-08-19 |
| ai-gm `brain-construction-local` | `3a1641a2`, 2 unpushed (S32 + S30 reports) |
| ai-gm working tree | 1 entry, `?? .claude/skills/remove-ai-marks/` (out of bounds) |
| prj93-overleaf `main` | `019f1354`, **untouched by this package** |
| our store ceiling | **2026-07-07** — not read from, not written to |
| **Ryan's repo** | `https://github.com/andpro-digital/ai-gm.ai.git` |
| **branch** | `master` (default; `develop` and `brain-construction` also present) |
| **HEAD, everything below is pinned to it** | **`cc93b6fa123791863072ec594dc3162208fa6812`** |
| HEAD commit date | 2026-08-19 15:55:41 +0100 — *the same day as this audit* |
| HEAD subject | "Write down how to make the brain speak first, and why not via briefing_chain" |
| clone location | scratchpad, **outside both project repositories** |
| clone is a remote/submodule of ours? | **No.** `ai-gm` origin is `hphnam/ai-gm.ai-master`; the Overleaf clone's origin is unchanged |

**Credential hygiene.** No credential, DSN, connection string, key or token was copied, quoted
or used. The repository commits **no real `.env`** — `git ls-files` matching credential-shaped
names returns only `.env.example` at three paths plus two `.claude/hooks` secret-scanner files.
No value was read from any of them.

---

## 1 · V1 — Obtaining the repository

The package records the repository as not anonymously reachable (403/404). **It cloned
successfully** using Nam's existing git credentials, so it is private rather than renamed.
`gh` is not installed on this machine, so `gh repo list andpro-digital` was not run; it was not
needed, because the exact name resolved.

**Acceptance gate V1: met.**

---

## 2 · V2 — `VenueSalesDaily`

### 2.1 Definitions, and which is current

Two definitions exist, and they agree:

| path | kind | date |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Prisma model `VenueSalesDaily` | current schema |
| `apps/api/prisma/migrations/20260811090000_brain_sales_store_and_state/migration.sql` | `CREATE TABLE "venue_sales_daily"` | 2026-08-11 |

**How current was determined, rather than assumed.** The 11 August migration is the only one of
the repository's **62** migrations that mentions `venue_sales_daily` or `VenueSalesDaily`. Four
migrations are dated after it — `20260811110000_brain_forecast_scores`,
`20260811120000_brain_bands_lookup_index`, `20260811130000_generic_pos_location_id`,
`20260812090000_drop_venue_brain_slug`, plus `20260818093000_account_issuer` and
`20260818094500_drop_account_provider_unique` — and **none alters this table.** The Prisma model
and the migration DDL match column for column. So the 11 August definition stands unsuperseded,
which also answers V5.4's question about a schema change on that date: **that migration is when
the table landed.**

### 2.2 Columns, keys, indexes

| column | type |
|---|---|
| `id` | `TEXT` / uuid, primary key |
| `organizationId` | `TEXT` |
| `venueId` | `TEXT` |
| `businessDate` | `DATE` |
| `category` | `TEXT`, default `''` |
| `item` | `TEXT` |
| `units` | `DECIMAL(14,3)` |
| **`revenueExVat`** | **`DECIMAL(14,2)`** |
| `currency` | `VARCHAR(3)` |
| `source` | `TEXT`, default `'square'` |
| `updatedAt` | `TIMESTAMP(3)` |

- **Unique:** `(venueId, businessDate, category, item, source)`
- **Index:** `(organizationId, businessDate)`
- Table name `venue_sales_daily`; FKs to `Organization` and `Venue`, both `onDelete: Cascade`

### 2.3 The VAT basis — from the code, not from a ratio

**One line determines it**, `apps/api/src/modules/integrations/square/square-sales-source.ts:89`:

> `netMinor: moneyMinor(line.totalMoney) - moneyMinor(line.totalTaxMoney),`

| question | answer |
|---|---|
| Square source field | `OrderLineItem.totalMoney`, from `orders.search` |
| tax | **subtracted**, at `square-sales-source.ts:89` |
| order filter | `stateFilter: { states: ['COMPLETED'] }`, `dateTimeFilter` on `closedAt`, sorted `CLOSED_AT ASC` (`:56-63`) |
| discounts | **included in the figure** — Square's line `totalMoney` is already net of line-level discounts; nothing re-adds them |
| service charges, gratuities, tips | **excluded entirely** — these are order-level in Square and the code reads `order.lineItems` only (`:78`) |
| refunds | **handled as negative lines where Square emits them as such.** `toRevenueExVat(-500n, 'GBP') === '-5.00'` is a pinned test (`sales-aggregation.spec.ts:187`). There is **no separate refund API call**, so whether a given refund reaches the figure depends on Square returning it as a negative line within a `COMPLETED` order — a Square-side behaviour this repository does not settle |
| comps | not handled by name; a comped line carries whatever `totalMoney` Square assigns it |

**Uniform across venues: yes.** There is a single code path with no per-venue branching, no
per-venue VAT rate and no per-venue basis flag. **This is the opposite of our own store**, where
`revenue_raw` is ex-VAT at beer_hall and ellel and VAT-inclusive at two_river_taps (S32 §5.3).
The trap S32 flagged is therefore real but one-sided: Ryan's column is uniformly ex-VAT, and it
is **our** `revenue_raw` that would misalign. `revenue_exvat` remains the only like-for-like
column on our side.

### 2.4 Grain, deduplication, business date

- **Grain:** one row per `(businessDate, category, item)` per venue per source. Aggregation key
  is `` `${local.businessDate}\0${category}\0${line.item}` `` (`sales-sync.service.ts:255`).
- **Business date is venue-LOCAL**, derived from `closedAt` through the venue's `timezone`
  (`toVenueLocal`, `:250`, `:286-316`), not UTC. `closedAt` falls back to `createdAt` when
  absent (`square-sales-source.ts:69-73`).
- **Write is delete-then-insert per date inside a transaction**, not upsert
  (`sales-sync.service.ts:124-177`). The stated reason, verbatim:

  > Delete-then-insert, not upsert: an item that stopped selling must leave the day rather than
  > linger at its last value.

- **There is a guard against erasing trade**, and it is worth knowing about before comparing:
  if a re-read returns zero rows for days that already hold rows, the transaction **throws**
  (`empty-window-over-stored-trade`) rather than deleting. So a day present in the table was
  written by a window that actually returned trade.
- A business date can be rewritten by a later backfill window; the unique key plus
  delete-then-insert means the **last write wins**, and `updatedAt` records when.

### 2.5 Backfill window and coverage

`BACKFILL_MONTHS = 24` (`sales-backfill.service.ts:5`), walked backwards in
`BACKFILL_WINDOW_DAYS` chunks, with progress recorded in `venue_sales_sync_cursors.backfilledTo`
so a crash does not restart the walk. **No statement of which venues are covered** appears in
the code; coverage follows from which venues have a connected POS integration and a
`posLocationId`. That remains a question for Ryan.

**Acceptance gate V2: met** — current definition identified with reasoning, VAT basis stated
with the file and line that determines it.

---

## 3 · V3 — `NeonAdapter`

**It does not exist as code, in either repository.**

Searches run against the clone, excluding `node_modules` and `.git`, case-insensitive where
noted: `NeonAdapter` (1 hit), `neon_adapter` (0), `neon-adapter` (0), `NeonSource` (0),
`BrainAdapter` (0), `brain_adapter` (0), and a case-insensitive `neon` file sweep (11 files, all
either documentation, `prisma.config.ts`, `.env.example`, or unrelated).

The single `NeonAdapter` hit is `GLOSSARY.md:175`, and it is a definition of the term, not an
implementation:

> | **MCP-SIM** | The labelled Square-connector stand-in for the production `NeonAdapter`, used
> for simulation pulls where Neon is not provisioned. It does **not** exercise the production
> ingest path, and every simulation report says so. |

So the name is a documented concept in both repositories and code in neither. `brain/FLAGS.md:331`
in our repository states, verbatim, *"`NeonAdapter` + DDL sketch ship"*. **It does not ship, and
it does not exist on Ryan's side either.** `FLAGS.md` is **not edited** in this package; a
correction row is appended to the decision log, per the append-only rule.

### 3.1 How our side is intended to read Neon — it is not

This is the finding that makes the flag's staleness benign rather than a gap.

**The brain does not read Neon at all.** The API reads the table itself and hands the brain a
dataset: `apps/api/src/modules/proactive-brain/brain-dataset.service.ts:61` runs
`prisma.venueSalesDaily.groupBy({ by: ['venueId', 'businessDate'], _sum: { units, revenueExVat } })`
and assembles a `ComputeDataset`. The comment beside it states the design, verbatim:

> Aggregated in SQL to venue x date. The compute path emits L1 only (engine.py and forward.py
> hardcode the layer), so item-grain rows would be ~180k rows / ~20MB of JSON per org that
> nothing downstream reads

That is the "dataset in, bundle out" contract in `brain/CONTRACT.md`. Corroborating it: **Ryan's
deployed copy of `brain/` has no `ingest/sources/` directory at all** — his `brain/ingest/`
contains only `__init__.py`, `exog_supplied.py`, `exog_weather.py`. There is no adapter because
the architecture has no place for one.

**`NeonAdapter` was a superseded plan, not a missing deliverable.**

**Acceptance gate V3: met** — a "no" with the evidence, and a decision-log row.

---

## 4 · V4 — The two free questions

### 4.1 What the 735-row export filtered on — not settled, but narrowed to three candidates

**No saved export query, dashboard definition or export script that would produce the CSV exists
in the repository.** Searched: `apps/api/scripts/` for `ChatMessage`/`chatMessage` (2 files,
both probes), and the whole tree for `*query*result*`, `*export*.sql` and `*.csv` — **zero
hits** for all three.

`apps/api/scripts/probe-elliot-usage.ts` is present in **both** repositories and is
byte-equivalent apart from one reformatted type annotation. It is **not** the source of the CSV:
it prints aggregates and states *"no raw message content is logged"*, whereas the CSV carries
`content` per row and a different column set. But it does show the natural scoping, and it is
the strongest evidence available: every one of its message queries joins
`ChatConversation c ON c.id = m."conversationId"` and filters `WHERE c."userId" = <Elliot>`.

Three schema-level filters would each drop rows, and the schema documents all three:

1. **`ChatConversation.userId`.** Scoping to Elliot's own conversations excludes every other
   user's, and excludes **legacy WhatsApp threads entirely**, which the schema says carry
   `userId IS NULL`. Our corpus being one user is consistent with this.
2. **`ChatConversation.deletedAt` — a soft delete.** The schema comment reads, verbatim:
   *"Reads filter on deletedAt IS NULL; the row stays in the DB so we keep the transcript"*. A
   count taken through the application's read path therefore **omits soft-deleted conversations
   that a raw table count includes.** Notably, `probe-elliot-usage.ts` does **not** filter on
   `deletedAt`, so the two counting methods available in this repository already disagree with
   each other by construction.
3. **`ChatConversation.channel`.** Defaults to `'web'`; our 735 rows are 100 % `web`, so any
   WhatsApp traffic is either absent or was filtered out.

A fourth possibility touches `role`: `analytics.service.ts:194` filters
`m.role IN ('assistant', 'turn-failed')`, so a **`turn-failed`** role exists in the data. Our
CSV contains only `user` and `assistant`, so failed turns were excluded — by the export, or by
there being none.

**This does not explain 159 / 520 / 56 against 207 / 883 / 270, and I am not going to claim it
does.** It stays a question for Ryan, but a sharper one: §5 asks him which of these four the
export applied.

### 4.2 Can the agent decline to raise an item? Yes — but the decline is not a judgement

Two distinct paths, and the distinction is the whole answer:

- **`daily-summary` is pulled, not pushed.** Its controller exposes `@Get()` and `@Get('group')`
  only — no cron, no queue, no notification fan-out. Nothing is raised, so nothing is declined.
- **`nudges` is a genuine push path, and it can stay silent.** `nudge.service.ts` returns
  `{ sent: false, reason: … }` at three sites: `'no items below par'` (`:40`),
  `'no imminent cutoffs'` (`:42-43`), `'no contactable duty manager'` (`:47`).

So **silence exists, and it is even recorded with a reason** — which is more than most systems
do. But the decision is **deterministic**: par levels, cutoff windows and recipient
availability. There is no model call in `nudge.service.ts` (searched `anthropic`, `generateText`,
`messages.create`, `model` — **zero hits**), and therefore no probability attached to the choice
to stay quiet.

**Consequence, stated carefully.** Calibration of silence needs a probability to calibrate. A
deterministic rule produces silence but nothing calibratable, so **his implementation does not
supply the measurement the Project Specification §5.4 asks for either.** As the package says,
his answer does not determine ours: our apparatus is `signals/agent.py` with `p_raise` per item,
which *is* a probability — and S32's pre-registration draft already records that what our run
measures is **detection** calibration, not the operator-judgement term.

**Acceptance gate V4: met** — 4.1 recorded as unanswered with searches listed; 4.2 answered.

---

## 5 · What is still needed from Ryan

1. **The export.** Table `venue_sales_daily`. Columns `venueId`, `businessDate`, `category`,
   `item`, `units`, `revenueExVat`, `currency`, `source`. Business dates **2025-06-04 to
   2026-07-07 inclusive**. Grain: one row per venue × business date × category × item × source,
   exactly as stored — no pre-aggregation. Label it **"revenueExVat: ex-VAT, tax subtracted from
   Square line `totalMoney`, discounts included, service charges and gratuities excluded,
   business date in venue-local time"**, which is what the code does; he only needs to confirm it.
2. **Venue coverage and identifiers.** Which venues are in the table for that window, and the
   mapping from his `venueId` to our `beer_hall` / `two_river_taps` / `ellel`. The code does not
   state coverage; it follows from which venues have a connected POS integration.
3. **Which filter the 735-row chat export applied** — user scoping (`ChatConversation.userId`),
   soft-deleted conversations (`deletedAt`), channel, or role. One line settles a question that
   has been open across three packages.
4. **Whether any business date in the window was rewritten by a later backfill**, i.e. rows whose
   `updatedAt` is materially after their `businessDate`. Last write wins by design, so this is
   about knowing which figures are re-reads rather than originals.
