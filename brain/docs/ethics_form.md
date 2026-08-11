Response Summary:

Applicant and Supervisor Details

Please ensure you provide Lancaster University only email addresses.

Q1. Student Name

Phuong Nam Hoang

Q2. Student ID
37071495

Q35. Student Email

p.hoang@lancaster.ac.uk

Q3. Supervisor Name
Simon Tomlinson

Q36. Supervisor Email

s.tomlinson2@lancaster.ac.uk

Project Details
Please provide details of your project. Each free text area is limited to 1000 characters or around 150
words.

Q4. Project Title

AI General Manager: Building the Proactive Brain

Q11. Please briefly describe the background to the research (1000 characters max, in lay person's
language)

GM-AI is a digital "general manager" running across four hospitality venues. Right now it answers staff
questions on demand which is purely reactive. This project builds the proactive component: an AI
agent that learns each venue's normal operating rhythm from operational data and prompts managers
before problems materialise. A live example: flagging that a supplier order should increase when sales
are running above forecast. The work sits in applied AI research and uses live data from real venues.

Q5.

Please state the aims and objectives of the project (1000 characters max, in lay-person’s
language)

The project investigates how an LLM-based agent, given access to a hospitality venue's operational
data and tools, can learn that venue's normal operating rhythm and intervene proactively when reality
deviates from it.
Objectives:
(1) model normal operating patterns per venue using sales, stock, checklist and chat-log data,
exploring multi-venue transfer learning;
(2) detect meaningful deviations using anomaly and change-point methods;
(3) design an LLM agent that reasons over deviation signals and decides what to surface to managers;
(4) build an evaluation framework measuring precision, recall and calibration alongside qualitative
manager feedback.

Q34. Please provide an overview of the methodology and analysis (1000 characters max, in lay-
person’s language)

The study analyses an existing live dataset (sales, stock movements, checklist completions, chat-log
volume) accessed read-only from a dedicated research schema in the host's production database.
Methods cover time-series modelling, anomaly and change-point detection, and the design and
evaluation of an LLM-based agent. Quantitative evaluation uses train/validation/test splits with baseline
comparison across precision, recall and calibration. Qualitative evaluation gathers structured feedback
from venue managers on how useful the agent's prompts actually are. Prototyping is in Python or
TypeScript.

Study Outline
Please provide details and coverage of what your study entails

Q7. Please select any of the following that will be used as part of your study. Select all that apply
Research involving existing documents/data only, or the evaluation of an existing project with
no direct contact with human participants
Research involving the development/testing of a system or software

Q9. Does your research project involve any of the following?

Conflict of interest
Any other ethical considerations

Q97. You have indicated that there may be other ethical considerations which are not covered in
the list of options. Please provide details of what you believe these to be. (1000 characters max)

Conflict of interest:
The host offers a performance-based stipend (up to £3,000) and has indicated strong candidates may
be invited to continue working with the company after the placement. This creates a potential incentive
to present favourable results.
Other ethical considerations:
The research uses live operational data from real venues, including WhatsApp chat logs between staff
and the AI. These logs may incidentally contain identifiable information about staff. Analysis will focus
on aggregate signals (message volume, topic frequency) rather than individuals; no staff will be
identified in the dissertation. Data is accessed read-only and remains on the host's infrastructure. The
agent's proactive prompts could influence management decisions; the prototype is evaluative only and
managers retain full discretion over any action taken.

Secondary Data Analysis

You are completing this section as you have indicated that you project involves existing documents/data
relating to human participants, or the evaluation of an existing project with no direct contact with human
participants.

Q38.

Please describe briefly the data or records to be studied, or the evaluation to be undertaken.
(1000 characters max)

The dataset comprises operational records from four live hospitality venues: point-of-sale transaction
data, stock movements, opening/closing checklist completions, and volume and content of WhatsApp
chat logs between staff and the GM-AI system. Generated through normal venue operations, which is
live, not a teaching dataset. Used to model each venue's operating rhythm and evaluate the proactive
agent's prompts.

Q39. Please describe how will any data or records be obtained? (1000 characters max)
Data is accessed via read-only permissions to a dedicated research schema within the host
organisation's production PostgreSQL database (NeonDB). Access is granted by the host (AI General
Manager Ltd) from placement start. The student collects no new data from participants, all records
already exist as a by-product of the venues' use of the GM-AI platform.

Q40.

Confidentiality and Anonymity: If your study involves re-analysis and potential publication of
existing data but which was gathered as part of a previous project involving direct contact with
human beings, how will you ensure that your re-analysis of this data maintains confidentiality
and anonymity as guaranteed in the original study? (1000 characters max)

The data was generated operationally rather than through a prior research study, but chat logs may
contain staff-identifiable content. Re-analysis will use aggregate measures only and will not attribute
records to named individuals. No venue staff or managers will be identifiable in the dissertation,
publications or presentations. Where examples are reported, they will be paraphrased or anonymised.
Venue names will be pseudonymised where this does not undermine the analysis.

Q41. What plan is in place for the storage of data (electronic, digital, paper, etc)?  Please ensure
that your plans comply with the Data Protection Act 1998. (1000 characters max)

Data complies with the Data Protection Act 2018. It remains within the host's infrastructure (NeonDB
research schema) under the host's control; it will not be transferred to University servers or personal
equipment unless strictly necessary. Any analysis outputs or extracts held locally during the project will
be stored on an encrypted, password-protected device and deleted at project end. Standard retention
guidance of up to 10 years is noted, but because the underlying data is the host's, retention of the live
dataset is governed by the host. The student's own analysis files will be deleted on course completion,
with the academic supervisor responsible thereafter.

Q43.

Is the secondary data you will be using in the public domain?

No

Q44.

Please indicate the original purpose for which the data was collected, and comment on whether
consent was gathered for additional later use of the data.  (1000 characters max)

N/A

Q46.

Will you be gathering data from discussion forums, on-line ‘chat-rooms’ and similar online
spaces where privacy and anonymity are contentious?

No

Q45.

What other ethical considerations (if any), not previously noted on this application, do you think
there are in the proposed study?  How will these issues be addressed? (1000 characters max)

The dataset includes private staff–AI chat logs and live commercial data. Risks are mitigated by read-
only access, aggregate-level analysis, no identification of individuals, and retention of data within the
host's controlled infrastructure. The conflict of interest arising from the performance-linked stipend and
possible continued employment is declared separately and managed through independent supervisory
oversight.

Software or System Development
You have indicated that you will be developing software or a system as part of your research project.
Please complete all of the following questions

Q100. Please provide a short description in Lay persons language of the system or software you
intend to build. (1000 characters max)

The prototype proactive agent is built and tested by the student against the read-only research schema
and documented tool interfaces; it carries no write access to production systems; tool integrations
(Xero, Square) are owned by the host's technical co-founder and are outside the student's scope; the
prototype is for research evaluation only and does not autonomously action anything in live venues.

Q99. Could your development work be used for any of the following (select all that apply):

N/A

Q101. Could the system or software you intend to develop be used to achieve any of the
following outcomes (select all that apply)

N/A

Q108. Does your proposed research involve any of the following (Select all that apply)

N/A

Q64. Does your research require the connection of new devices (including the addition of
virtualised platforms) to the University network (for example IoT devices)

Internet connectivity required.

Q65. Please describe the following:

Devices that are needing to be connected,
What data will be collected,
How you will ensure anonymity and/or consent in the collection of the data.

(1000 characters max)

No new devices, IoT hardware, or virtualised platforms will be connected to the University network. All
work runs from a single standard laptop encrypted, password-protected, using ordinary internet
connectivity to reach two cloud services: the host's NeonDB research schema and the Anthropic and
Voyage AI APIs. That's it.
No new data is collected from participants. What the project analyses is an existing operational dataset
(sales, stock movements, checklist completions, staff–AI chat logs) produced through four venues'
normal day-to-day use of the GM-AI platform. Access is read-only throughout.
Consent for this secondary use is authorised by the host organisation as data controller. Anonymity is
protected four ways: aggregate signals rather than individual records are analysed; no staff or
managers are identified in any output; data stays within the host's infrastructure; venues are
pseudonymised where feasible.

Q105. Please describe any risk to the Campus network that may arise from your experimentation
and how you will mitigate it. (1000 characters max)

Negligible. The project involves no network scanning, no device connections, no hosting or serving of
data, and no traffic-generating experiments. The only network activity is ordinary outbound HTTPS
requests from a standard laptop to cloud services like NeonDB, Anthropic, Voyage AI, functionally
equivalent to routine web and API use.
Database access is strictly read-only to a dedicated research schema. Nothing in the host system can
be altered or impaired through it. Mitigations in place: the working device is kept patched and runs
current anti-malware; host-issued access credentials are stored securely and not shared; data sits on
encrypted storage; and the device operates within University network and security policies. No
additional load or exposure lands on Campus infrastructure beyond standard internet use.

Declaration and Signatures

I understand that as researcher I have overall responsibility for the ethical management of the project
and confirm the following:

I have read the Code of Practice, Research Ethics at Lancaster: a code of practice and I am
willing to abide by it in relation to the current project.
I will manage the project in an ethically appropriate manner according to: (a) the subject matter
involved and (b) the Code of Practice and Procedures of the University.
On behalf of the University I accept responsibility for the project in relation to promoting good
research practice and the prevention of misconduct (including plagiarism and fabrication or
misrepresentation of results).
On behalf of the University I accept responsibility for the project in relation to the observance of
the rules for the exploitation of intellectual property.
If applicable, I will take steps to ensure that no students or staff involved in the project will be
exposed to inappropriate situations.

Q13. Check the following box to confirm. (Note: If you are not able to confirm the statement
above please contact the Programme Director to provide an explanation.)

Confirmed

Q14. Please tick to confirm that you have discussed this application with your supervisor, and
that they agree to the application being submitted for ethical review.

N/A

Embedded Data:
N/A


