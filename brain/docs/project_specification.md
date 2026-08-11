**PROJECT SPECIFICATION**

AI General Manager: Building the Proactive Brain

*A proactive reasoning layer for an LLM-based digital general manager in hospitality venues*

|  |  |
| --- | --- |
| **Project reference** | PRJ93-AIG-AIG |
| **Host organisation** | AI General Manager Ltd, in partnership with Lune Brew Co. |
| **Industrial supervisor** | Ryan Helmn — Technical Co-Founder, AI General Manager Ltd |
| **Academic supervisor** | To be assigned by Lancaster University |
| **Programme / duration** | MSc Artificial Intelligence, Lancaster University — 14-week placement |
| **Document status** | Draft v1.0 — Week 1 specification (for academic supervisor review) |

**Contents:** 1. Background & Motivation · 2. Aims & Objectives · 3. Project Data · 4. Deliverables · 5. Candidate Techniques · 6. Project Plan & Timeline · 7. Supervision & Ways of Working

# 1. Project Background and Motivation

AI General Manager Ltd is an early-stage venture building GM-AI, a digital general manager for hospitality venues. The company frames the product as a role, not a tool: GM-AI reads every standard operating procedure (SOP), runs opening and closing checklists, monitors stock, drafts supplier purchase orders, and answers staff questions on WhatsApp throughout each shift. It is currently live across four venues operated by Lune Brew Co., with external operators onboarding next.

In its current form GM-AI is reactive — it answers competently when asked, but does not act on its own initiative. This leaves real value untapped. Many costly problems in a venue (a keg order that is now too small for an emerging trend, a recurring staff question that signals a missing SOP, a checklist quietly being skipped) are visible in operational data well before anyone notices them, yet a reactive assistant cannot surface them.

This project addresses that gap by building the proactive brain: a reasoning layer that learns each venue’s normal operating rhythm and prompts the management team before problems escalate. If Friday lunch sales run thirty per cent above forecast, it should prompt the manager that next week’s keg order ought to rise; if three staff have asked about the fryer reset in a month, it should flag a missing SOP. The brain observes what is happening, decides what is worth surfacing, and chooses when and how to raise it. The work matters commercially — proactive intervention is central to onboarding external venues at scale — and academically, sitting in active research territory: multi-venue transfer learning on small, noisy datasets, change-point and anomaly detection under real-world noise, and the design and evaluation of LLM agents whose core function is judgement rather than retrieval.

## 1.1 Research Question

***How can an LLM-based agent, given access to a hospitality venue’s operational data and tools, learn that venue’s normal operating rhythm and intervene proactively when reality deviates from it?***

## 1.2 Scope and Boundaries

The host has drawn a clear boundary. Integrations to external operational systems — Xero, Square, and the platform’s existing services — are owned by the technical co-founder and are out of scope. The student’s focus is the brain: the rhythm-learning and reasoning layers that decide what is worth raising with managers. Work is done against a read-only research schema and documented tool interfaces, so the available time is spent on intelligence rather than integration code.

# 2. Project Aims and Objectives

The aim of the project is to design, build, and rigorously evaluate a prototype proactive reasoning layer for GM-AI that learns each venue’s operating rhythm from live data and surfaces timely, well-judged prompts to venue managers. This is decomposed into five objectives.

1. Rhythm modelling — model what is normal for a venue across sales, stock movements, checklist completions and chat-log volume, exploiting multi-venue data to strengthen signal where any single venue is data-poor.
2. Deviation detection — implement anomaly and change-point detection that reliably identifies meaningful departures from the learned rhythm while remaining robust to noise and small per-venue samples.
3. Reasoning and surfacing — design an LLM-based agent that consumes deviation signals, draws on operational context via defined tool interfaces, and decides which issues are worth raising, when, and in what tone.
4. Evaluation — build a framework that measures prompt quality using quantitative metrics (precision, recall, calibration) and structured qualitative feedback from venue managers.
5. Documentation and handover — produce a technical report or dissertation, alongside a prototype the host can pick up and extend.

The minimum viable outcome is a working end-to-end prototype producing proactive prompts for at least one venue, evaluated against labelled historical signals. The target outcome additionally demonstrates measurable benefit from multi-venue transfer, a calibrated sense of when to stay silent, and positive manager feedback on a representative sample of prompts.

# 3. Project Data

## 3.1 Source and Access

From day one, the student is granted read access to a dedicated research schema within the host’s production PostgreSQL database (NeonDB, with the pgvector extension). The data is live and drawn from the four real Lune Brew Co. venues currently running GM-AI; it is not a curated teaching dataset. Access is read-only, which protects production integrity and constrains the project to observation and analysis. The technical co-founder owns the integrations that populate this schema from Xero, Square, and the platform’s own services.

## 3.2 Data Domains

Four broad domains of operational data are expected through the research schema. The early weeks include a dedicated data-audit phase to confirm coverage, granularity and quality.

| **Domain** | **Description** | **Indicative use** |
| --- | --- | --- |
| **Sales data** | Transaction-level and aggregated sales (via Square), including timestamps, line items and value. | Primary signal for demand rhythm and forecasting. |
| **Stock movements** | Inventory levels, deliveries, depletion and purchase-order history. | Detecting drift between consumption and ordering. |
| **Checklist completions** | Opening/closing and operational checklist records, with timing and completion status. | Operational-discipline rhythm; missed-step detection. |
| **Chat-log volume** | Volume and topic of staff questions to GM-AI on WhatsApp. | Surfacing knowledge gaps and missing SOPs. |

In addition, the host’s knowledge base — the SOPs and operational documents indexed behind the existing document-intelligence pipeline (Anthropic Claude and Voyage AI embeddings in pgvector) — is available as context for the reasoning agent.

## 3.3 Data Characteristics and Challenges

* Noise and irregularity. Real venue data carries genuine operational noise — promotions, weather, one-off events, staffing changes. Distinguishing meaningful deviation from ordinary variation is a core difficulty.
* Small per-venue samples. With only four venues, each providing limited history, any single venue offers a thin signal — the central motivation for a multi-venue transfer-learning approach.
* Heterogeneity. Venues differ in size, format and trading pattern, so a model must share structure across venues without erasing genuine per-venue differences.
* Cold start. New external venues onboard with little or no history, making transfer from established venues essential.

## 3.4 Data Handling, Ethics and IP

Operational data is handled in line with the host’s data policies and Lancaster University’s ethics and data-protection requirements. Analysis is conducted against the read-only research schema; no production data is copied beyond what is necessary for prototyping, and extracts are held securely and deleted at the end of the placement. Staff-related data (for example chat-log activity) is treated as aggregate operational signal, not used to evaluate individuals. Under the host’s standard Lancaster placement IP template, the host owns the models, pipelines and integrations built during the placement, while the student retains their dissertation and academic outputs; any wider publication will be discussed with the host so commercial IP remains protected.

# 4. Project Deliverables

The project produces three primary deliverables, aligned with the host’s stated expectations.

## 4.1 The Proactive Brain (prototype)

A working prototype of an LLM-based agent that learns each venue’s rhythm from live data and surfaces prompts to managers when reality drifts. It comprises the rhythm-learning component, the deviation-detection component, and the reasoning agent, exercised end to end against the research schema and documented tool interfaces, with documented methodology for the rhythm-learning approach and the agent’s reasoning design. Implementation may be in Python or TypeScript; Python is the anticipated default given the analytical content.

## 4.2 Evaluation Framework and Results

A documented evaluation framework and the results of applying it: methodology for assessing prompt performance against real signals — precision, recall and calibration against a labelled set of historical events — plus structured qualitative feedback from venue managers on a representative sample of prompts.

## 4.3 Technical Report / Dissertation

A technical report or MSc dissertation presenting the project in full: background and research question, methodology, model and agent design decisions, evaluation results, limitations, and recommendations for what the host should build next. This satisfies the MSc requirements and doubles as a handover document.

## 4.4 Supporting Outputs

* A documented, readable codebase a future developer at the host can pick up and extend.
* A lightweight evaluation/monitoring view (e.g. Streamlit or Plotly) making rhythm models, deviations and agent prompts inspectable.
* This project specification, plus interim progress notes shared at weekly check-ins.

# 5. Candidate Techniques

The host has deliberately kept the technical approach loose. The following are candidate techniques to be assessed against baselines; the final methodology will be selected on empirical performance on the real data, not committed to in advance.

## 5.1 Rhythm Modelling

* Baselines first — simple, interpretable baselines (day-of-week and hour-of-day profiles, rolling and robust statistics) set the bar any complex model must beat.
* Classical decomposition — STL or related seasonal-trend decomposition to separate trend, seasonality and residual on per-venue series.
* Statistical forecasting — exponential smoothing or Prophet-style models to capture seasonality and produce expected ranges.
* Multi-venue transfer learning — pooled or hierarchical (partial-pooling) models sharing structure across venues; global forecasting models trained across venues for the cold-start case.

## 5.2 Deviation Detection

* Residual-based anomaly detection — flagging values outside expected ranges from the rhythm model, using robust thresholds.
* Change-point detection — CUSUM, Bayesian online change-point detection, or ruptures-style offline methods to find sustained shifts rather than transient spikes.
* Statistical control approaches — control-chart-style limits as an interpretable mechanism for stable series.
* Robustness handling — explicit treatment of holidays, promotions and known events so expected irregularities are not mistaken for deviation.

## 5.3 Reasoning and Surfacing Agent

* LLM-based agent with tool use — an agent on Anthropic Claude (consistent with the host stack) using function calling to query operational context and the knowledge base before deciding what to surface.
* Retrieval-augmented generation — using the existing pgvector knowledge base to ground prompts in relevant SOPs and operational documents.
* Agent frameworks — the Anthropic SDK, Vercel AI SDK, LangChain / LangGraph and the Model Context Protocol (MCP) are candidate frameworks for structuring the agent and its tools.
* Prompt and decision design — structured prompting, explicit raise-versus-stay-silent criteria, prioritisation of competing signals, and control of tone and timing so prompts are actionable.

## 5.4 Evaluation Techniques

* Disciplined splits — time-aware train/validation/test splits and per-venue holdouts to avoid leakage and test transfer to unseen venues.
* Quantitative metrics — precision, recall and F-score against labelled signals; calibration analysis of confidence and of silence decisions.
* Baseline comparison and error analysis — every component compared against a simple baseline, with structured analysis of false positives and missed events.
* Qualitative manager review — structured rating of sample prompts by managers for usefulness, timeliness and tone, feeding back into agent design.

# 6. Draft Project Plan and Timeline

The placement runs for fourteen weeks, organised into five phases. The plan is front-loaded with data understanding and baseline work, keeps a continuous writing thread, and protects the final weeks for evaluation and the dissertation. Phases overlap where sensible and will be revisited with both supervisors at the weekly check-ins.

| **Weeks** | **Phase** | **Key activities and milestones** |
| --- | --- | --- |
| **1–2** | **Onboarding & data audit** | Site induction and operational context; secure access to the research schema; audit data coverage, granularity and quality across all four domains; confirm tool interfaces; finalise this specification with the academic supervisor. Milestone: data audit complete; specification signed off. |
| **3–5** | **Rhythm modelling & baselines** | Build interpretable baselines (seasonal profiles, rolling statistics); develop per-venue rhythm models; prototype multi-venue transfer; establish evaluation splits. Milestone: rhythm model beating baseline on held-out data. |
| **5–8** | **Deviation detection** | Implement and compare anomaly and change-point methods on real series; tune for noise robustness; handle known events; assemble a labelled set of historical deviations for evaluation. Milestone: deviation detector validated against labelled events. |
| **8–12** | **Reasoning agent** | Design and build the LLM agent with tool use and RAG over the knowledge base; implement raise / stay-silent decision logic, prioritisation and tone control; integrate the rhythm and deviation components end to end. Milestone: end-to-end prototype producing prompts for at least one venue. |
| **11–14** | **Evaluation, write-up & handover** | Run the full evaluation framework (quantitative metrics plus manager feedback); error analysis and refinement; complete the technical report / dissertation; code clean-up and handover to the host. Milestone: deliverables 1–3 complete. |

## 6.1 Writing as a Continuous Thread

Although the dissertation is formally completed in the final phase, methodology, design decisions and results are written up continuously from Week 1, with each phase closing in a short written summary. The dissertation is then assembled from maintained material rather than written from scratch under time pressure.

## 6.2 Risks and Mitigations

| **Risk** | **Mitigation** |
| --- | --- |
| Data is sparser or noisier than expected. | Front-loaded data audit in Weeks 1–2; interpretable baselines that degrade gracefully; multi-venue pooling to strengthen thin signals. |
| Few labelled deviations for evaluation. | Construct a labelled historical set early (Weeks 5–8) with input from venue managers; supplement quantitative metrics with qualitative review. |
| Agent judgement is hard to measure objectively. | Combine quantitative calibration metrics with structured manager ratings; treat raise / stay-silent as an explicit, evaluable decision. |
| Scope creep into integration work. | Hold firmly to the host’s boundary: integrations are the co-founder’s responsibility; the student works only against the read-only schema and documented interfaces. |
| 14 weeks is short for three components. | A minimum-viable end-to-end prototype is prioritised early; transfer learning and refinement are treated as target, not minimum, outcomes. |

# 7. Supervision and Ways of Working

The project is applied AI research and prototyping, and the student works largely independently. Day-to-day technical support comes from Ryan Helmn, the technical co-founder, through weekly check-ins and ad-hoc contact via Slack, email or WhatsApp; methodology and dissertation support comes from the University-assigned academic supervisor. The team is small, with no layers between the student and the co-founder. The placement is mostly remote, with optional on-site time at the Lune Brew Co. venues in the Preston / Lancaster area for site induction and operational context. The work will go live in production, and strong performance may lead to continued collaboration beyond the placement.

*This is a draft Week 1 specification, prepared for review with the academic supervisor. Aims, data assumptions and timeline will be refined once the data audit is complete and supervision is in place.*
