# SHA citation register — taken BEFORE the S37 history rewrite

**Purpose.** A `filter-repo` rewrite changes every commit SHA. This file is the list of
every SHA-shaped token in the project's prose that **resolves to a real commit in this
repository**, recorded before the rewrite so the old-to-new mapping in §4 can be built
afterwards. Without it the evidence chain in the reports and the ledger becomes
unreadable: a report that says *"measured at `76a8f033`"* points at nothing.

| | |
|---|---|
| taken | 2026-08-19, S37 V3, before any rewrite |
| repository | `hphnam/ai-gm.ai-master` |
| head at capture | `81b1f902` (`ryan-adoption`); `main` `c611d2e1`; `brain-construction-local` `b64eaf8b` |
| files scanned | 207 — `brain/log/`, `brain/ledger/`, `brain/docs/`, four `brain/` root docs, and the Overleaf clone's `.tex` and `.bib` |
| hex tokens of 7+ characters seen | 339 |
| **tokens that resolve to a commit here** | **121** |
| **citation occurrences** | **429** |

## 1 · Method, and what it deliberately excludes

Every `[0-9a-f]{7,40}` token was extracted and then tested with
`git rev-parse --verify <tok>^{commit}`. **A hex string is not a citation; a hex string
that resolves is.** That test is what separates a commit reference from the many other
hashes in this prose — the frozen prompt hash `c1137f76`, the S36 fingerprint digest
`2c0533c4`, blob SHAs, file checksums. None of those resolve, and none appear below.

**Excluded by the same test, correctly: SHAs belonging to other repositories.** Ryan's
pin `cc93b6fa` is cited many times across reports 105, 107 and 108 and does **not**
resolve here, because it is a commit in `andpro-digital/ai-gm.ai`. The rewrite does not
touch it, so it needs no mapping. Confirmed: `cc93b6fa` is absent from this register.

## 2 · Where the citations are

| area | occurrences |
|---|---:|
| brain/log | 282 |
| brain/docs | 78 |
| brain/ledger | 57 |
| brain root | 8 |
| overleaf tex | 4 |

| file | occurrences |
|---|---:|
| `brain/log/Decision_and_Resolution_Log.md` | 63 |
| `brain/docs/Prj93_external_examiner_assessment.md` | 40 |
| `brain/ledger/phase_state.md` | 30 |
| `brain/docs/PRJ93_Master_State_Log.md` | 21 |
| `brain/log/40_G16_Portable_Baseline_and_Corrections.md` | 19 |
| `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md` | 17 |
| `brain/log/95_mondrian_aci.md` | 15 |
| `brain/log/32_G13_Production_Integration_Report.md` | 14 |
| `brain/log/99_appendix_placements_and_static_regime.md` | 13 |
| `brain/log/102_post_push_free_repairs.md` | 11 |
| `brain/log/108_ryan_adoption.md` | 9 |
| `brain/log/35_For_Ryan_Integration_Brief_Response.md` | 8 |
| `brain/log/23_G12_13_Canonical_Reconciliation_Report.md` | 8 |
| `brain/log/103_agent_eval_scope.md` | 7 |
| `brain/FLAGS.md` | 7 |
| `brain/log/24_G12_15_Report.md` | 6 |
| `brain/log/29_G12_17cb_Corrected_Freeze_Report.md` | 6 |
| `brain/log/34_G14b_Defect_Closure_Verdict.md` | 6 |
| `brain/log/25_G12_16_Report.md` | 5 |
| `brain/log/46_G17e_Agent_and_Calibration.md` | 5 |

## 3 · The four citations in the dissertation itself

All four are in **`appendix/tables.tex`, and all four are LaTeX comments** — `% Trace:`
provenance notes, not printed text. **No printed sentence in the dissertation cites a
commit SHA**, so the rewrite changes nothing a reader or an examiner sees. The four are
still load-bearing as provenance and are mapped in §4.

```latex
overleaf:appendix/tables.tex:64
  % Trace: reports regenerated at brain commit a04eb2d6 ("expand ellel forecasting rung",
overleaf:appendix/tables.tex:66
  % pre-regeneration figures are at a0fbd64e and the outright Beer Hall selection at d4f347d9. The
overleaf:appendix/tables.tex:66
  % pre-regeneration figures are at a0fbd64e and the outright Beer Hall selection at d4f347d9. The
overleaf:appendix/tables.tex:67
  % exogenous arm's later move from 0.779 to 0.745 is c4efe3cc, a separate change. This note retires
```

## 4 · Every cited SHA, with what it does

`old` is the token as written in the prose. `resolves to` is the full commit it names
today. The new SHA after the rewrite is appended by V8 from `filter-repo`'s commit map.

| old token | resolves to | cited | subject of that commit | sites |
|---|---|---:|---|---|
| `d40dea7` | `d40dea774901` | 25 | brain: reports 40 and 41 — the hash gate made portable, and the de-Lun | `brain/log/42_G17a_Metric_Integrity.md`:3; `brain/log/42_G17a_Metric_Integrity.md`:315; `brain/ledger/final_audit.md`:736; `brain/docs/PRJ93_Master_State_Log.md`:12 … +21 more |
| `1d966be` | `1d966be8499f` | 24 | PRJ93 G12.13a: freeze pre-registered forward June 2026 forecast (Pass  | `brain/log/27_G12_17b_July_Pass2_Report.md`:149; `brain/log/22_G12_13b_June_Simulation_Report.md`:16; `brain/log/22_G12_13b_June_Simulation_Report.md`:180; `brain/log/24_G12_15_Report.md`:6 … +20 more |
| `2cc97e7` | `2cc97e790460` | 24 | brain: report 32 — G13 production integration | `brain/log/35_For_Ryan_Integration_Brief_Response.md`:5; `brain/log/35_For_Ryan_Integration_Brief_Response.md`:525; `brain/log/33_G14_De_Lune_Report.md`:4; `brain/log/33_G14_De_Lune_Report.md`:461 … +20 more |
| `c008651` | `c00865142a28` | 19 | brain: report 39 — G15d, the last hardcoded Lune date on the tenant pa | `brain/log/35_For_Ryan_Integration_Brief_Response.md`:526; `brain/log/33_G14_De_Lune_Report.md`:461; `brain/log/33_G14_De_Lune_Report.md`:495; `brain/log/41_For_Ryan_Addendum_Post_G15.md`:29 … +15 more |
| `a04eb2d6` | `a04eb2d6a744` | 18 | expand ellel forecasting rung | `brain/log/16_Chronos2_Promotion_Report.md`:321; `brain/log/99_appendix_placements_and_static_regime.md`:113; `brain/log/99_appendix_placements_and_static_regime.md`:126; `brain/log/99_appendix_placements_and_static_regime.md`:129 … +14 more |
| `c8fa127` | `c8fa1272a18c` | 13 | brain: S8a pre-register the agent triage prompt (v1) and the agent | `brain/log/103_agent_eval_scope.md`:103; `brain/log/Decision_and_Resolution_Log.md`:1539; `brain/log/46_G17e_Agent_and_Calibration.md`:4; `brain/log/46_G17e_Agent_and_Calibration.md`:65 … +9 more |
| `5f77591` | `5f77591a0361` | 9 | brain: fix reversed Kostenko-Hyndman SBA selection rule | `brain/log/55_G17k_Split_Conformal_And_Naming.md`:130; `brain/ledger/numbers_audit_resolutions.md`:340; `brain/ledger/numbers_audit_resolutions.md`:460; `brain/ledger/phase_state.md`:595 … +5 more |
| `b64eaf8b` | `b64eaf8be4b4` | 9 | Apply the rulings, split the determinism claim from the temperature se | `brain/log/Decision_and_Resolution_Log.md`:4411; `brain/log/Decision_and_Resolution_Log.md`:4460; `brain/log/108_ryan_adoption.md`:18; `brain/log/108_ryan_adoption.md`:18 … +5 more |
| `45588f1` | `45588f1c4e39` | 9 | PRJ93 G12.18: rewrite AI-sounding comments and docstrings in plain eng | `brain/docs/Prj93_external_examiner_assessment.md`:45; `brain/docs/Prj93_external_examiner_assessment.md`:61; `brain/docs/Prj93_external_examiner_assessment.md`:1420; `brain/docs/Prj93_external_examiner_assessment.md`:2017 … +5 more |
| `dbcc525` | `dbcc525bbe63` | 7 | brain: report 51 - S11 G17j, the chat-log gap signal, wired into the b | `brain/log/58_G17n_Environment_And_Artefact_Isolation.md`:124; `brain/log/57_G17m_Staleness_Sweep_And_G2.md`:65; `brain/ledger/tooling_verdict.md`:106; `brain/ledger/phase_state.md`:43 … +3 more |
| `7d103aa` | `7d103aaa4194` | 7 | PRJ93 G12.17a (Pass 1): advance to end-June, refresh, freeze July fore | `brain/log/Decision_and_Resolution_Log.md`:598; `brain/log/Decision_and_Resolution_Log.md`:622; `brain/log/Decision_and_Resolution_Log.md`:646; `brain/log/29_G12_17cb_Corrected_Freeze_Report.md`:55 … +3 more |
| `1641dbc` | `1641dbc4b260` | 6 | brain: regenerate intermittency artefacts from the restored warehouse | `brain/log/55_G17k_Split_Conformal_And_Naming.md`:163; `brain/log/76_staleness_triage_result.md`:13; `brain/ledger/numbers_audit_resolutions.md`:492; `brain/ledger/phase_state.md`:637 … +2 more |
| `a4e5fa3` | `a4e5fa31e27b` | 6 | brain: propagate the A14 scope correction to the flag ledger | `brain/log/35_For_Ryan_Integration_Brief_Response.md`:290; `brain/log/32_G13_Production_Integration_Report.md`:5; `brain/log/32_G13_Production_Integration_Report.md`:40; `brain/log/32_G13_Production_Integration_Report.md`:88 … +2 more |
| `64e6fc4` | `64e6fc407f0c` | 6 | brain: report 46 - S8a G17e, the agent, the cost-sensitive threshold,  | `brain/log/47_G17f_Group_ICL.md`:3; `brain/log/47_G17f_Group_ICL.md`:32; `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:211; `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:214 … +2 more |
| `a590f91` | `a590f917d3b0` | 6 | PRJ93 G12.17c (Step C1): freeze a second blind July window (8-14 July) | `brain/log/Decision_and_Resolution_Log.md`:646; `brain/log/29_G12_17cb_Corrected_Freeze_Report.md`:8; `brain/log/29_G12_17cb_Corrected_Freeze_Report.md`:36; `brain/log/29_G12_17cb_Corrected_Freeze_Report.md`:118 … +2 more |
| `44a0f08` | `44a0f080945c` | 6 | brain: report 35 — point-by-point response to Ryan's integration brief | `brain/log/Decision_and_Resolution_Log.md`:986; `brain/log/36_G15a_Fixture_Shortfall_Diagnostics.md`:3; `brain/log/36_G15a_Fixture_Shortfall_Diagnostics.md`:399; `brain/log/40_G16_Portable_Baseline_and_Corrections.md`:278 … +2 more |
| `7d8bfbd` | `7d8bfbd5fb89` | 5 | brain: pin down the compute contract and scope the A14 verdict to the  | `brain/log/35_For_Ryan_Integration_Brief_Response.md`:287; `brain/log/32_G13_Production_Integration_Report.md`:35; `brain/log/Decision_and_Resolution_Log.md`:708; `brain/log/README.md`:49 … +1 more |
| `e7fae52efe9d0aff8d4e27ad72839dbed4e02e5d` | `e7fae52efe9d` | 5 | Find the window a check was looking through, and the venv it wasn't | `brain/log/85_defect_evidence.md`:8; `brain/log/83_novelty_feasibility_audit.md`:17; `brain/log/83_novelty_feasibility_audit.md`:18; `brain/log/84_method_source_verification.md`:17 … +1 more |
| `087d20a` | `087d20a53833` | 5 | brain: harden the service surface ahead of hosted deployment | `brain/log/32_G13_Production_Integration_Report.md`:4; `brain/log/32_G13_Production_Integration_Report.md`:47; `brain/log/Decision_and_Resolution_Log.md`:697; `brain/log/Decision_and_Resolution_Log.md`:712 … +1 more |
| `0db56339` | `0db563394702` | 5 | Keep the exemplar dissertation out of a public repo | `brain/log/103_agent_eval_scope.md`:12; `brain/log/103_agent_eval_scope.md`:12; `brain/log/Decision_and_Resolution_Log.md`:4176; `brain/log/104_numbers_fixes_and_prereg.md`:178 … +1 more |
| `a0fbd64e` | `a0fbd64e94ca` | 5 | G12.1/G12.2: rung4_chronos2_exo entrant, gate confirms exo wins on Bee | `brain/log/99_appendix_placements_and_static_regime.md`:125; `brain/log/99_appendix_placements_and_static_regime.md`:419; `brain/log/Decision_and_Resolution_Log.md`:3891; `brain/log/Decision_and_Resolution_Log.md`:3897 … +1 more |
| `c4efe3cc` | `c4efe3cc39ef` | 5 | PRJ93 G12.10: TRT coord fix, is_ellel_event leak, full exo set, World  | `brain/log/99_appendix_placements_and_static_regime.md`:130; `brain/log/99_appendix_placements_and_static_regime.md`:425; `brain/log/Decision_and_Resolution_Log.md`:3896; `brain/log/Decision_and_Resolution_Log.md`:3941 … +1 more |
| `af11c81` | `af11c81b53a8` | 5 | brain: report 36 — G15a, the 11 July shortfall diagnosed, both hypothe | `brain/log/Decision_and_Resolution_Log.md`:1211; `brain/log/40_G16_Portable_Baseline_and_Corrections.md`:159; `brain/log/40_G16_Portable_Baseline_and_Corrections.md`:342; `brain/log/40_G16_Portable_Baseline_and_Corrections.md`:343 … +1 more |
| `671772f6` | `671772f6090b` | 5 | Record the two commit SHAs in the S29 report's state table | `brain/log/102_post_push_free_repairs.md`:12; `brain/log/102_post_push_free_repairs.md`:358; `brain/log/102_post_push_free_repairs.md`:372; `brain/ledger/phase_state.md`:5470 … +1 more |
| `64980d0` | `64980d06ac4e` | 4 | brain: report 50 - S10 G17i, injection realism, and what the detection | `brain/log/51_G17j_Chatlog_Signal.md`:3; `brain/log/51_G17j_Chatlog_Signal.md`:26; `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:243; `brain/docs/Prj93_external_examiner_assessment.md`:2891 |
| `64d6b9f` | `64d6b9f9d5a6` | 4 | brain: report 49 - S7 G17h, interval calibration, per-step bands, and  | `brain/log/50_G17i_Injection_Realism.md`:3; `brain/log/50_G17i_Injection_Realism.md`:38; `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:242; `brain/docs/Prj93_external_examiner_assessment.md`:2877 |
| `1b649dc` | `1b649dcc0db1` | 4 | brain: pre-register a one-standard-error margin on the A6 adoption rul | `brain/log/55_G17k_Split_Conformal_And_Naming.md`:97; `brain/log/56_G17l_Adoption_Margin.md`:16; `brain/log/56_G17l_Adoption_Margin.md`:95; `brain/ledger/phase_state.md`:869 |
| `872eb6c` | `872eb6c5124b` | 4 | brain: close the Phase 3 defects, including two of my own fixes | `brain/log/35_For_Ryan_Integration_Brief_Response.md`:6; `brain/log/34_G14b_Defect_Closure_Verdict.md`:3; `brain/log/34_G14b_Defect_Closure_Verdict.md`:232; `brain/log/37_G15b_Round4_Review.md`:3 |
| `0f9b511` | `0f9b5113f73f` | 4 | brain: add the per-request scratch store, the seam for stateless compu | `brain/log/32_G13_Production_Integration_Report.md`:5; `brain/log/32_G13_Production_Integration_Report.md`:119; `brain/log/Decision_and_Resolution_Log.md`:698; `brain/log/Decision_and_Resolution_Log.md`:723 |
| `b5fb3a7` | `b5fb3a74d608` | 4 | brain: stateless compute — dataset in, bundle out (Phase 2) | `brain/log/32_G13_Production_Integration_Report.md`:5; `brain/log/32_G13_Production_Integration_Report.md`:119; `brain/log/Decision_and_Resolution_Log.md`:698; `brain/log/Decision_and_Resolution_Log.md`:723 |
| `6348a082` | `6348a082916f` | 4 | Pre-register S20 as ledger row 112, before the instrument exists | `brain/log/95_mondrian_aci.md`:33; `brain/log/95_mondrian_aci.md`:623; `brain/log/Decision_and_Resolution_Log.md`:3574; `brain/ledger/phase_state.md`:5389 |
| `d76abf7c` | `d76abf7ce3e2` | 4 | Build the S20 five-arm instrument and its tests, after the pre-registr | `brain/log/95_mondrian_aci.md`:34; `brain/log/95_mondrian_aci.md`:624; `brain/log/Decision_and_Resolution_Log.md`:3575; `brain/ledger/phase_state.md`:5390 |
| `c1b11d6` | `c1b11d6896a0` | 4 | PRJ93 G12.13b: confront frozen June forecast with real actuals (Pass 2 | `brain/log/Decision_and_Resolution_Log.md`:450; `brain/log/Decision_and_Resolution_Log.md`:465; `brain/log/23_G12_13_Canonical_Reconciliation_Report.md`:10; `brain/log/23_G12_13_Canonical_Reconciliation_Report.md`:124 |
| `e79e317d` | `e79e317d0324` | 4 | Stop chat over-gatekeeping legitimate follow-ups and staff directory l | `brain/log/Decision_and_Resolution_Log.md`:4459; `brain/log/108_ryan_adoption.md`:171; `brain/ledger/ryan_divergence.md`:13; `brain/ledger/ryan_divergence.md`:20 |
| `50486a55` | `50486a55b831` | 4 | Verify the push on the remote, and land the two repairs that cost no b | `brain/log/102_post_push_free_repairs.md`:320; `brain/log/102_post_push_free_repairs.md`:367; `brain/log/102_post_push_free_repairs.md`:369; `brain/ledger/phase_state.md`:5471 |
| `070f249` | `070f249b6c17` | 4 | brain: report 48 - S6 G17g, lead-matched weather and what the exogenou | `brain/log/49_G17h_Interval_Calibration.md`:14; `brain/log/49_G17h_Interval_Calibration.md`:47; `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:241; `brain/docs/Prj93_external_examiner_assessment.md`:2865 |
| `8525395` | `852539516b88` | 4 | brain: report 44 - S3 G17c, the model confidence set, environment pinn | `brain/log/45_G17d_Intermittency_and_Occurrence.md`:3; `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:7; `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:22; `brain/docs/Prj93_external_examiner_assessment.md`:2585 |
| `7d103aaa` | `7d103aaa4194` | 3 | PRJ93 G12.17a (Pass 1): advance to end-June, refresh, freeze July fore | `brain/log/27_G12_17b_July_Pass2_Report.md`:13; `brain/log/27_G12_17b_July_Pass2_Report.md`:148; `brain/log/Decision_and_Resolution_Log.md`:568 |
| `52a3864` | `52a3864df6b2` | 3 | brain: Phase 3 de-Lune — and the forward forecast that was missing | `brain/log/35_For_Ryan_Integration_Brief_Response.md`:5; `brain/log/34_G14b_Defect_Closure_Verdict.md`:4; `brain/log/34_G14b_Defect_Closure_Verdict.md`:230 |
| `284663f` | `284663f5d9ff` | 3 | brain: resolve the ledger and write the dissertation notes | `brain/log/32_G13_Production_Integration_Report.md`:5; `brain/log/32_G13_Production_Integration_Report.md`:88; `brain/log/Decision_and_Resolution_Log.md`:697 |
| `04b3bf1` | `04b3bf19fe99` | 3 | brain: close the compute contract's honesty gaps (security review) | `brain/log/32_G13_Production_Integration_Report.md`:5; `brain/log/32_G13_Production_Integration_Report.md`:119; `brain/log/Decision_and_Resolution_Log.md`:698 |
| `d4f347d9` | `d4f347d94f73` | 3 | WP4: Rung 4 Chronos-Bolt zero-shot through the adoption gate | `brain/log/99_appendix_placements_and_static_regime.md`:113; `brain/log/Decision_and_Resolution_Log.md`:3893; `overleaf:appendix/tables.tex`:66 |
| `f0c3d5bc` | `f0c3d5bc54a8` | 3 | Instrument the B-to-D group delta the P2 and P4 verdicts rest on, and  | `brain/log/95_mondrian_aci.md`:626; `brain/log/Decision_and_Resolution_Log.md`:4178; `brain/log/104_numbers_fixes_and_prereg.md`:176 |
| `00fa5be` | `00fa5be65944` | 3 | docs(brain): reconcile decision log (Section C, G12.9-G12.11) + G12.12 | `brain/log/Decision_and_Resolution_Log.md`:461; `brain/log/23_G12_13_Canonical_Reconciliation_Report.md`:29; `brain/log/23_G12_13_Canonical_Reconciliation_Report.md`:78 |
| `d2f05a9b` | `d2f05a9b9a3f` | 3 | Recompute the count the plan was made against, and price the finding t | `brain/log/Decision_and_Resolution_Log.md`:3174; `brain/ledger/phase_state.md`:5359; `brain/ledger/relocation_candidates.md`:98 |
| `c611d2e1` | `c611d2e11f74` | 3 | liveingest_fixes | `brain/log/Decision_and_Resolution_Log.md`:4412; `brain/log/108_ryan_adoption.md`:20; `brain/log/108_ryan_adoption.md`:20 |
| `58e9b792` | `58e9b7920f00` | 3 | data enrichment | `brain/log/Decision_and_Resolution_Log.md`:4484; `brain/log/108_ryan_adoption.md`:391; `brain/ledger/ryan_divergence.md`:375 |
| `34a1779` | `34a1779dfb6a` | 3 | brain: S2 follow-ups - pre-register the Ellel rule and correct the fra | `brain/log/44_G17c_Model_Confidence_Set.md`:3; `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:21; `brain/docs/Prj93_external_examiner_assessment.md`:2584 |
| `fccf017` | `fccf0170136b` | 3 | brain: S1 follow-ups - RMSSE emitted on both readings, and two correct | `brain/log/43_G17b_Fold_Count.md`:3; `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:19; `brain/docs/Prj93_external_examiner_assessment.md`:2583 |
| `c098fba` | `c098fba98566` | 3 | brain: pre-register the functional minimal pair before touching code | `brain/log/66_R9_functional_pair_result.md`:3; `brain/ledger/phase_state.md`:1730; `brain/ledger/defensible_divergences_writeup_pack.md`:56 |
| `5b95641` | `5b956417daa6` | 3 | brain: report 47 - S5 G17f, multi-venue group in-context learning, a p | `brain/log/48_G17g_Weather_Basis.md`:3; `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:240; `brain/docs/Prj93_external_examiner_assessment.md`:2852 |
| `f8bcf1f` | `f8bcf1fbe40d` | 3 | brain: correct the store-ceiling diagnosis and point at the one-comman | `brain/log/57_G17m_Staleness_Sweep_And_G2.md`:14; `brain/log/76_staleness_triage_result.md`:18; `brain/ledger/phase_state.md`:671 |
| `b1faf683` | `b1faf6837159` | 3 | brain: make RMSSE the headline loss, and stop naming designations in k | `brain/ledger/phase_state.md`:3313; `brain/ledger/figure_title_sweep.md`:63; `brain/ledger/figure_title_sweep.md`:71 |
| `76a8f033` | `76a8f03354e3` | 2 | scaled eval | `brain/log/103_agent_eval_scope.md`:50; `brain/ledger/agent_eval_numbers.md`:190 |
| `64e6fc40` | `64e6fc407f0c` | 2 | brain: report 46 - S8a G17e, the agent, the cost-sensitive threshold,  | `brain/log/103_agent_eval_scope.md`:66; `brain/ledger/agent_eval_numbers.md`:196 |
| `35f6fb42` | `35f6fb42b69a` | 2 | Measure what the available partition costs, and find the cell that car | `brain/log/87_correction_costing.md`:4; `brain/log/88_c7_placement_analysis.md`:4 |
| `8f1d86c60279f5471d32cd03ec4521d803ab8294` | `8f1d86c60279` | 2 | Close S19 into the ledger, and commit the three artefacts that were on | `brain/log/95_mondrian_aci.md`:7; `brain/log/95_mondrian_aci.md`:611 |
| `c15ab728` | `c15ab728e807` | 2 | Record the scoped suite result and the end state | `brain/log/95_mondrian_aci.md`:613; `brain/log/95_mondrian_aci.md`:630 |
| `f9c5b6ab` | `f9c5b6abdfe8` | 2 | Replace a guessed SHA with the real one in the end-state table | `brain/log/95_mondrian_aci.md`:614; `brain/log/95_mondrian_aci.md`:631 |
| `a9d147f` | `a9d147ff7aa1` | 2 | PRJ93 G12.15a: run Chronos-2 on Mac GPU (MPS) with CPU fallback | `brain/log/24_G12_15_Report.md`:7; `brain/log/Decision_and_Resolution_Log.md`:470 |
| `39610aa` | `39610aae1daa` | 2 | PRJ93 G12.15b: home-nation fixture features + measured June uplift | `brain/log/24_G12_15_Report.md`:8; `brain/log/Decision_and_Resolution_Log.md`:471 |
| `0564389` | `056438990814` | 2 | PRJ93 G12.15c: refresh-cadence sweep over June (item-demand focus, MPS | `brain/log/24_G12_15_Report.md`:8; `brain/log/Decision_and_Resolution_Log.md`:471 |
| `b96747e` | `b96747e63a26` | 2 | PRJ93 G12.15d: event-aware refresh policy (calendar-triggered cadence) | `brain/log/24_G12_15_Report.md`:8; `brain/log/Decision_and_Resolution_Log.md`:471 |
| `ec78d4d` | `ec78d4dd09f5` | 2 | PRJ93 G12.15e: record honest stock status, stock code untouched | `brain/log/24_G12_15_Report.md`:8; `brain/log/Decision_and_Resolution_Log.md`:471 |
| `0a21c75` | `0a21c758e66e` | 2 | PRJ93 G12.16a: canonical category map + loud-fail loader + mapped L2 r | `brain/log/Decision_and_Resolution_Log.md`:506; `brain/log/25_G12_16_Report.md`:4 |
| `85b209b` | `85b209b2e61c` | 2 | PRJ93 G12.16b: item-grain June pull, item map, first real L3 item MASE | `brain/log/Decision_and_Resolution_Log.md`:506; `brain/log/25_G12_16_Report.md`:4 |
| `1b8fb88` | `1b8fb88e8e89` | 2 | PRJ93 G12.16c: wire taxonomy map into the confront eval path + tests | `brain/log/Decision_and_Resolution_Log.md`:506; `brain/log/25_G12_16_Report.md`:4 |
| `473de1df` | `473de1dfba58` | 2 | brain: pre-register the TabPFN-TS entrant before writing its evaluator | `brain/log/Decision_and_Resolution_Log.md`:2262; `brain/log/68_R5_tabpfn_entrant_result.md`:3 |
| `c8bd2c9` | `c8bd2c91c9ab` | 2 | chore: remove remaining PRJ93_ working docs (build report, decision lo | `brain/log/17_G12_9_Report.md`:93; `brain/log/19_G12_10_Report.md`:115 |
| `b82172a` | `b82172ae0aed` | 2 | new | `brain/log/03_Build_Report_Current.md`:4; `brain/log/03_Build_Report_Current.md`:193 |
| `609badaf9236e3ab0e31cfaaca8c0459a19fc47b` | `609badaf9236` | 2 | Make a certification quote its requirement, and land the static-regime | `brain/log/101_feedback_triage.md`:10; `brain/log/101_feedback_triage.md`:10 |
| `c5fdab45` | `c5fdab459b3a` | 2 | Green the gate on a ligature, and find the missing pointer that hid a  | `brain/log/93_pointer_and_sweep.md`:4; `brain/ledger/phase_state.md`:5360 |
| `31691e2d` | `31691e2dd0be` | 2 | Record the second writer, the invented acronym, and the preprint class | `brain/log/102_post_push_free_repairs.md`:358; `brain/ledger/phase_state.md`:5470 |
| `671772f6090bff9e93f4c7e4ca00bcc4d934bcb0` | `671772f6090b` | 2 | Record the two commit SHAs in the S29 report's state table | `brain/log/102_post_push_free_repairs.md`:364; `brain/log/102_post_push_free_repairs.md`:365 |
| `d0c43e8` | `d0c43e82e6d5` | 2 | brain: report 45 - S4 G17d, the scale basis decided by bootstrap, the  | `brain/log/46_G17e_Agent_and_Calibration.md`:3; `brain/docs/Prj93_external_examiner_assessment.md`:2800 |
| `4e0867c2` | `4e0867c22baa` | 2 | Place three free appendix records, and find the disclosure that cannot | `brain/log/100_rulings_applied.md`:9; `brain/log/100_rulings_applied.md`:545 |
| `9dd9028` | `9dd9028fbdfa` | 2 | PRJ93 G12.17c-b (Corrected C1): 7-day-cadence re-freeze of 8-14 July ( | `brain/log/31_G12_17c_C2_Confront_Report.md`:16; `brain/docs/PRJ93_Master_State_Log.md`:542 |
| `076fa062` | `076fa0625336` | 2 | Retrofit the pointers the rule could not, and replace the rule with a  | `brain/ledger/phase_state.md`:5218; `brain/ledger/phase_state.md`:5360 |
| `0b302ec` | `0b302ec0c69b` | 2 | brain: report 42 - S1 G17a, one scale ruler and the July headline rest | `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:18; `brain/docs/Prj93_external_examiner_assessment.md`:2583 |
| `91f4a9c` | `91f4a9cc692f` | 2 | brain: report 43 - S2 G17b, fold count 6 to 273/260/205 and the served | `brain/docs/PRJ93_State_Log_Addendum_2026-07-21.md`:20; `brain/docs/Prj93_external_examiner_assessment.md`:2584 |
| `7c518dd3` | `7c518dd33061` | 1 | Find the window the spike evaluation was never looking through | `brain/log/83_fig_sensitivity_units_result.md`:9 |
| `d449d96` | `d449d9645f15` | 1 | brain: report 34 — defect-closure verdict, and the third wrong fix | `brain/log/35_For_Ryan_Integration_Brief_Response.md`:6 |
| `e84c42e8` | `e84c42e85311` | 1 | brain: run the functional minimal pair, resolve D-D1 on RMSSE | `brain/log/103_agent_eval_scope.md`:74 |
| `f489afe2` | `f489afe2b610` | 1 | Point the ledger at the committed instrument, not the scratchpad scrip | `brain/log/103_agent_eval_scope.md`:79 |
| `5ad875bc` | `5ad875bc80e5` | 1 | Correct row 117 for the concurrent conclusion edit that spends four of | `brain/log/99_appendix_placements_and_static_regime.md`:10 |
| `6c919a59` | `6c919a59b884` | 1 | Place three free appendix records, and find the disclosure that cannot | `brain/log/99_appendix_placements_and_static_regime.md`:10 |
| `40c97697` | `40c97697d711` | 1 | Draft the six Hansi items on an unpushed branch, and find the density  | `brain/log/107_rulings_applied_and_exo_drafted.md`:26 |
| `2d0cc50a` | `2d0cc50ac2da` | 1 | Add per-group stats and auditable degeneracy scope, and land the S20 a | `brain/log/95_mondrian_aci.md`:625 |
| `dbb4f1d7` | `dbb4f1d706ce` | 1 | Correct two claims in report 95 that the artefact does not support | `brain/log/95_mondrian_aci.md`:627 |
| `29b24b2c` | `29b24b2c9895` | 1 | Document the S20 artefact schema report 95 was missing | `brain/log/95_mondrian_aci.md`:628 |
| `114f5b12` | `114f5b1216d9` | 1 | Close S20 into the ledger and the phase state, and place the pointer t | `brain/log/95_mondrian_aci.md`:629 |
| `01b77db1` | `01b77db1e7ff` | 1 | PRJ93 G12.10: TRT coord fix, is_ellel_event leak, full exo set, World  | `brain/log/Decision_and_Resolution_Log.md`:3896 |
| `3a1641a2` | `3a1641a2ab5b` | 1 | Record the agent-eval numbers, clear the two run blockers, draft the p | `brain/log/105_ryan_repo_audit.md`:13 |
| `05935c6` | `05935c6bb235` | 1 | chore: remove PRJ93_*_Report.md working reports from tracking | `brain/log/17_G12_9_Report.md`:93 |
| `4fb1327f` | `4fb1327fe218` | 1 | 8C-6 records: six real floors, and the thousandth claim reaches a resu | `brain/log/79_8C6_Introduction_And_Abstract_Report.md`:4 |
| `8e772071ab6bda5b723dd1d2c52412305e9d7e19` | `8e772071ab6b` | 1 | Finish the end-state table with the two commits that carry no measurem | `brain/log/96_served_partition_and_c7_placement.md`:9 |
| `48549bedafde1e641e86b4e6c1f42601d1116c78` | `48549bedafde` | 1 | Read Ryan's repository for schema and provenance, and find NeonAdapter | `brain/log/106_hansi_items_drafted.md`:23 |
| `19bac325` | `19bac325d3f9` | 1 | docs: number brain/log reports in implementation order, drop PRJ93 pre | `brain/log/93_pointer_and_sweep.md`:84 |
| `30d3c133b123f5ef6025ac3c09f8b57ddd772794` | `30d3c133b123` | 1 | Record the two guaranteed misses hiding in twelve degenerate bands, an | `brain/log/98_serving_model_filter_and_appendix_route.md`:9 |
| `609badaf` | `609badaf9236` | 1 | Make a certification quote its requirement, and land the static-regime | `brain/log/102_post_push_free_repairs.md`:12 |
| `53ad273d` | `53ad273d8b72` | 1 | Give every figure one palette, one font and one type scale | `brain/log/102_post_push_free_repairs.md`:370 |
| `b8da68cb` | `b8da68cb62d9` | 1 | Pre-register the C7 partition contrast before the instrument exists | `brain/log/86_c7_partition_contrast.md`:6 |
| `e9441de9` | `e9441de92e65` | 1 | Measure the agent-eval call count: 644 is the corpus, and the run make | `brain/log/104_numbers_fixes_and_prereg.md`:14 |
| `d9eefe72` | `d9eefe720237` | 1 | Compute Square COGS from catalog unit cost and fix tender mix | `brain/log/108_ryan_adoption.md`:47 |
| `7c7770501d66f7f2723f0655bdcb388b56b4b795` | `7c7770501d66` | 1 | Settle that the served band is partitioned at every venue, and find a  | `brain/log/97_degenerate_bands_and_honest_pricing.md`:10 |
| `bc6792f1c12661ae8ab102025826854d63b1f3da` | `bc6792f1c126` | 1 | Pin what served means, and reconnect the lever the ledger says is dead | `brain/log/90_patch_manifest.md`:8 |
| `22fcdba` | `22fcdbae65b6` | 1 | graphify for memory | `brain/ledger/tooling_verdict.md`:107 |
| `c9ba53cb` | `c9ba53cb8d9a` | 1 | brain: refresh the knowledge graph at final close | `brain/ledger/phase_state.md`:1930 |
| `e410203e` | `e410203efb56` | 1 | Local compile: latexcheck instrument, three-tier assertion boundary, g | `brain/ledger/phase_state.md`:3128 |
| `1843274b` | `1843274bb9df` | 1 | graphify update after the active/traded stamps; write guard confirms t | `brain/ledger/phase_state.md`:3856 |
| `84e25c42` | `84e25c427ed6` | 1 | graphify: clear stale chunk artefacts, keep new extraction cache | `brain/ledger/phase_state.md`:3880 |
| `a06068c6` | `a06068c6792b` | 1 | Register the unfunded work as a stated trade, and correct R101's price | `brain/ledger/phase_state.md`:4925 |
| `bc6792f1` | `bc6792f1c126` | 1 | Pin what served means, and reconnect the lever the ledger says is dead | `brain/ledger/phase_state.md`:5359 |
| `54c8a470` | `54c8a470be2b` | 1 | Give the eleven repairs their text, and verify the net once instead of | `brain/ledger/phase_state.md`:5359 |
| `2914bad1` | `2914bad1b44e` | 1 | Close the disclosure question on a divergence that was already fixed,  | `brain/ledger/phase_state.md`:5360 |
| `a2de0583` | `a2de0583c989` | 1 | Place the pointer that three packages needed, and find the ten other r | `brain/ledger/phase_state.md`:5360 |
| `4c7f26b2` | `4c7f26b29d5f` | 1 | graphify | `brain/ledger/final_audit.md`:1360 |
| `79f2fdce` | `79f2fdce4183` | 1 | Record the four 2026-08-12 post-audit defects: sec:exo, the swallowed  | `brain/ledger/final_audit.md`:1360 |
| `fa51b72` | `fa51b7236b1a` | 1 | brain: report 37 — G15b round 4, and the guard that fired on nobody | `brain/docs/PRJ93_Master_State_Log.md`:1535 |
| `6d98d77` | `6d98d7751e0b` | 1 | brain: report 38 — G15c, taxonomy drift decided, and the answer is do  | `brain/docs/PRJ93_Master_State_Log.md`:1535 |
| `7cf01337` | `7cf01337de96` | 1 | T8 discharged for Chapter 5; S-3 closed as superseded; quote-not-name  | `brain/PRJ93_RULES.md`:166 |

## 5 · Load-bearing versus incidental

A citation is **load-bearing** when a measurement, a provenance claim or a state
assertion is anchored to it, and **incidental** when it merely records which commit a
session happened to be on. The distinction matters only for V8's mapping effort; the
commit map covers all of them either way, so every row in §4 is mappable.

The clearest load-bearing cases, by their own text:

- **`76a8f033`** — where the 644-injection corpus first appears *measured, with its
  working* (`ledger/agent_eval_numbers.md` §7a). The whole correction of "644 was a
  Claude Code estimate" rests on that commit existing and containing that report.
- **`64e6fc40`** — where the call count first appears already-formed with no working,
  the other half of the same correction.
- **`a04eb2d6`, `a0fbd64e`, `d4f347d9`, `c4efe3cc`** — the four in `appendix/tables.tex`,
  which trace the Beer Hall selection and the exogenous arm's move from 0.779 to 0.745.
- **`e79e317d`** — the merge base with Ryan's repository, the anchor for S36's finding
  that `brain/` has no common ancestor.
- **`58e9b792`** — *"data enrichment"*, the commit that introduced the venue data this
  package removes. **This one is expected to have no successor**: see V8.

---

## 6 · APPENDED 2026-08-19 (S37 V8) — the rewrite happened; here is the mapping

**This section is an append. No row above it was edited.** §4's table records the state
before the rewrite and stays as written; the translation lives here.

| | |
|---|---|
| rewrite | `git filter-repo` `a40bce548d2c`, two passes, 2026-08-19 |
| paths removed | `brain/data/`, the two root exports, `data/state_store.db/`, three `docs/*.xlsx`, root `opening_and_closing_checklist.md` |
| commit map | `brain/ledger/commit_map_2026-08-19.txt` (574 rows, composed across both passes: original to final) |
| bundle | `~/prj93-backup/ai-gm-prerewrite-2026-08-19.bundle`, 29,854,873 bytes, SHA-256 `9b40074eceab8273ea4300e2b87e050121e482b3eb46228a1115117335626734` |
| commits | 573 before, 573 after — **none dropped** |

**120 of the 121 cited SHAs map to a successor. None was dropped for having become
empty.** The commit that introduced the data, `58e9b792` *"data enrichment"*, survives with a
successor, because it touched more than the removed paths.

### 6.1 · The one that does not map, and why it is not the rewrite's doing

**`6c919a59`**, cited once, at `brain/log/99_appendix_placements_and_static_regime.md:10`, in
that report's own state table. It has **no successor because it never existed as a reachable
commit**. It resolved in the working repository only as a dangling object, and it is absent
from the pre-rewrite bundle, which carries every ref.

Report 99 predicted the SHA its own commit would take and wrote it into the table before the
commit was made; the commit that actually landed the report is **`4e0867c2`**, verified by
`git show --stat`, which lists `brain/log/99_appendix_placements_and_static_regime.md | 489 +++`.
That commit maps to **`ec4f6778`**.

So the correct reading of report 99's row 10 is `4e0867c2` before the rewrite and `ec4f6778`
after. **This was a broken citation before S37 touched anything**, and the mapping exercise is
what found it. Report 99 is not edited; this row is the forward pointer.

### 6.2 · Old to new, every cited SHA

| old (as cited) | old full | new full |
|---|---|---|
| `00fa5be` | `00fa5be65944` | `94bdc021ae7d` |
| `01b77db1` | `01b77db1e7ff` | `1ff3662c60f6` |
| `04b3bf1` | `04b3bf19fe99` | `3f5e4f50fa1a` |
| `0564389` | `056438990814` | `77706a015446` |
| `05935c6` | `05935c6bb235` | `1ac2e9b58a0b` |
| `070f249` | `070f249b6c17` | `63a35f2217bb` |
| `076fa062` | `076fa0625336` | `d7419f6b744a` |
| `087d20a` | `087d20a53833` | `d6b8dc645341` |
| `0a21c75` | `0a21c758e66e` | `a23d8d0cde64` |
| `0b302ec` | `0b302ec0c69b` | `1add564af956` |
| `0db56339` | `0db563394702` | `eb46911e2145` |
| `0f9b511` | `0f9b5113f73f` | `ad815d2571e4` |
| `114f5b12` | `114f5b1216d9` | `1e63fdd8ee21` |
| `1641dbc` | `1641dbc4b260` | `9ab67d9d245a` |
| `1843274b` | `1843274bb9df` | `2a33f56c5cdd` |
| `19bac325` | `19bac325d3f9` | `1bef7427df7d` |
| `1b649dc` | `1b649dcc0db1` | `5cca4b4c106b` |
| `1b8fb88` | `1b8fb88e8e89` | `fea52baa2157` |
| `1d966be` | `1d966be8499f` | `00cd7bb4d1d1` |
| `22fcdba` | `22fcdbae65b6` | `cc679ed8fc2b` |
| `284663f` | `284663f5d9ff` | `324683d5d292` |
| `2914bad1` | `2914bad1b44e` | `77079c054c89` |
| `29b24b2c` | `29b24b2c9895` | `83de4d3ea873` |
| `2cc97e7` | `2cc97e790460` | `846f5fcbdb5b` |
| `2d0cc50a` | `2d0cc50ac2da` | `ed9370520e21` |
| `30d3c133b123f5ef6025ac3c09f8b57ddd772794` | `30d3c133b123` | `9dfa7ee62361` |
| `31691e2d` | `31691e2dd0be` | `8d3bbedcf5d8` |
| `34a1779` | `34a1779dfb6a` | `2f39abcf8061` |
| `35f6fb42` | `35f6fb42b69a` | `f6361640a3a2` |
| `39610aa` | `39610aae1daa` | `4eb60521ca97` |
| `3a1641a2` | `3a1641a2ab5b` | `8bed55cde54e` |
| `40c97697` | `40c97697d711` | `bf611474954a` |
| `44a0f08` | `44a0f080945c` | `dd81b455ac36` |
| `45588f1` | `45588f1c4e39` | `c6988af018ce` |
| `473de1df` | `473de1dfba58` | `c9c4d451fdda` |
| `48549bedafde1e641e86b4e6c1f42601d1116c78` | `48549bedafde` | `a2b325b3e892` |
| `4c7f26b2` | `4c7f26b29d5f` | `75108dbcba40` |
| `4e0867c2` | `4e0867c22baa` | `ec4f67788349` |
| `4fb1327f` | `4fb1327fe218` | `0b763a034340` |
| `50486a55` | `50486a55b831` | `535251deb129` |
| `52a3864` | `52a3864df6b2` | `ef58a6eb43fe` |
| `53ad273d` | `53ad273d8b72` | `ac7548e111d2` |
| `54c8a470` | `54c8a470be2b` | `81c4782a91ea` |
| `58e9b792` | `58e9b7920f00` | `3e4e481b3cf5` |
| `5ad875bc` | `5ad875bc80e5` | `04a8226d1931` |
| `5b95641` | `5b956417daa6` | `792b945ef24c` |
| `5f77591` | `5f77591a0361` | `fc0897f076a2` |
| `609badaf` | `609badaf9236` | `5a7733991827` |
| `609badaf9236e3ab0e31cfaaca8c0459a19fc47b` | `609badaf9236` | `5a7733991827` |
| `6348a082` | `6348a082916f` | `285dbc1f8231` |
| `64980d0` | `64980d06ac4e` | `50dc33fdb733` |
| `64d6b9f` | `64d6b9f9d5a6` | `c67674d06294` |
| `64e6fc4` | `64e6fc407f0c` | `4ba6a0dea835` |
| `64e6fc40` | `64e6fc407f0c` | `4ba6a0dea835` |
| `671772f6` | `671772f6090b` | `217bcf65094a` |
| `671772f6090bff9e93f4c7e4ca00bcc4d934bcb0` | `671772f6090b` | `217bcf65094a` |
| `6d98d77` | `6d98d7751e0b` | `a9b20431cc0f` |
| `76a8f033` | `76a8f03354e3` | `ce19dbc613fb` |
| `79f2fdce` | `79f2fdce4183` | `02e8a641e97b` |
| `7c518dd3` | `7c518dd33061` | `0d1f81eb8e9e` |
| `7c7770501d66f7f2723f0655bdcb388b56b4b795` | `7c7770501d66` | `86a33318e858` |
| `7cf01337` | `7cf01337de96` | `cb2e0efac585` |
| `7d103aa` | `7d103aaa4194` | `038c65886b1f` |
| `7d103aaa` | `7d103aaa4194` | `038c65886b1f` |
| `7d8bfbd` | `7d8bfbd5fb89` | `61631cfe2c7f` |
| `84e25c42` | `84e25c427ed6` | `c1b67ba91881` |
| `8525395` | `852539516b88` | `d9772091527d` |
| `85b209b` | `85b209b2e61c` | `dcf9d6fcc130` |
| `872eb6c` | `872eb6c5124b` | `11d6ad7277e4` |
| `8e772071ab6bda5b723dd1d2c52412305e9d7e19` | `8e772071ab6b` | `42f6970ab252` |
| `8f1d86c60279f5471d32cd03ec4521d803ab8294` | `8f1d86c60279` | `ac0f7e7e6361` |
| `91f4a9c` | `91f4a9cc692f` | `824a1e561a5d` |
| `9dd9028` | `9dd9028fbdfa` | `752b05582c5e` |
| `a04eb2d6` | `a04eb2d6a744` | `c528cd5b69f1` |
| `a06068c6` | `a06068c6792b` | `8e72e0bf6d99` |
| `a0fbd64e` | `a0fbd64e94ca` | `bd004c18fb32` |
| `a2de0583` | `a2de0583c989` | `46ee0d3eb221` |
| `a4e5fa3` | `a4e5fa31e27b` | `bfea48799a21` |
| `a590f91` | `a590f917d3b0` | `7746ef5a13d3` |
| `a9d147f` | `a9d147ff7aa1` | `4e87d1182a4e` |
| `af11c81` | `af11c81b53a8` | `010d4982b663` |
| `b1faf683` | `b1faf6837159` | `60c7ec636da4` |
| `b5fb3a7` | `b5fb3a74d608` | `4579419ab8c0` |
| `b64eaf8b` | `b64eaf8be4b4` | `44f4d9eaf907` |
| `b82172a` | `b82172ae0aed` | `fddb9ec38e73` |
| `b8da68cb` | `b8da68cb62d9` | `1ff9a966e2ed` |
| `b96747e` | `b96747e63a26` | `fe01cebccb61` |
| `bc6792f1` | `bc6792f1c126` | `a0990d6b0de1` |
| `bc6792f1c12661ae8ab102025826854d63b1f3da` | `bc6792f1c126` | `a0990d6b0de1` |
| `c008651` | `c00865142a28` | `d19bcd712cf8` |
| `c098fba` | `c098fba98566` | `d7eac75433ea` |
| `c15ab728` | `c15ab728e807` | `22009b838514` |
| `c1b11d6` | `c1b11d6896a0` | `eee9f1777845` |
| `c4efe3cc` | `c4efe3cc39ef` | `9c46124294d0` |
| `c5fdab45` | `c5fdab459b3a` | `43f69c6b2ff3` |
| `c611d2e1` | `c611d2e11f74` | `c208f94753f2` |
| `c8bd2c9` | `c8bd2c91c9ab` | `34147808d238` |
| `c8fa127` | `c8fa1272a18c` | `fc0a0c2c836f` |
| `c9ba53cb` | `c9ba53cb8d9a` | `61a20e402be1` |
| `d0c43e8` | `d0c43e82e6d5` | `47a11f70c1ca` |
| `d2f05a9b` | `d2f05a9b9a3f` | `730438514fb8` |
| `d40dea7` | `d40dea774901` | `35478f1f04ac` |
| `d449d96` | `d449d9645f15` | `5e7761bfb8d2` |
| `d4f347d9` | `d4f347d94f73` | `cf7d9ff73383` |
| `d76abf7c` | `d76abf7ce3e2` | `3d7db4e59d53` |
| `d9eefe72` | `d9eefe720237` | `a7cee9d0e6cd` |
| `dbb4f1d7` | `dbb4f1d706ce` | `1f7376064d75` |
| `dbcc525` | `dbcc525bbe63` | `37c8d8c62418` |
| `e410203e` | `e410203efb56` | `911c1588cf42` |
| `e79e317d` | `e79e317d0324` | `c3a231cf7da4` |
| `e7fae52efe9d0aff8d4e27ad72839dbed4e02e5d` | `e7fae52efe9d` | `bddb18da0c44` |
| `e84c42e8` | `e84c42e85311` | `7f2e793a815c` |
| `e9441de9` | `e9441de92e65` | `be5f655d0d8f` |
| `ec78d4d` | `ec78d4dd09f5` | `147025be2d7d` |
| `f0c3d5bc` | `f0c3d5bc54a8` | `d6e03fb8c63a` |
| `f489afe2` | `f489afe2b610` | `9ca872dfeed9` |
| `f8bcf1f` | `f8bcf1fbe40d` | `77106afcee2a` |
| `f9c5b6ab` | `f9c5b6abdfe8` | `5f5613dcbaf4` |
| `fa51b72` | `fa51b7236b1a` | `159b4ac920f8` |
| `fccf017` | `fccf0170136b` | `124e6c9bf520` |
| `6c919a59` | *(never reachable)* | **see §6.1 — read as `4e0867c2` → `ec4f6778`** |

