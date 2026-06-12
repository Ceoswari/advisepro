# AdvisePro — Product Strategy & Feature Roadmap

Synthesized from customer discovery (M1–M4 students + faculty advisors at CMSRU)
and independent analysis of the current product and residency application landscape.

---

## The Core Insight

The discovery confirms one thing above all else: **students don't lack information, they lack
interpretation**. They can find NRMP data, Reddit threads, and Texas Star on their own.
What they can't find anywhere is a tool that takes *their specific profile, at their specific
stage, at their specific school*, and tells them what it means and what to do next.

That's the product. Not a data dashboard. A personalized advisor that scales.

---

## What the Current Product Gets Right

- Competitiveness scoring grounded in real NRMP data is the strongest foundation in the space.
  No competitor does this at the specialty-benchmark level.
- Milestone framework per year and specialty is directionally correct.
- ERAS activities log sets up the data backbone the product will need long-term.
- Advisor/admin layer is right — institutional oversight is what makes this different from
  a consumer app.

---

## What the Current Product Gets Wrong (Honest Critique)

These are not missing features — they are problems with the existing implementation.
Fix these before building new things.

### 1. The dashboard is built for M4s, not for all students

An M1 with no scores, no research, and no publications opens the platform and sees dashes
across every metric and a score of near-zero. That is the worst possible first impression.
It creates anxiety without any utility, and it confirms the fear that they're already behind.

**Fix:** Gate the scoring display by class year. M1/M2 students should not see a
competitiveness score at all. They should see a "Building Your Foundation" view that:
- Shows only the metrics relevant to their stage (experiences logged, milestone progress)
- Tells them explicitly: "Your score becomes meaningful in MS3 when Step scores are available"
- Surfaces 2–3 high-yield actions for their current year instead

### 2. The score tells you where you are, not what to do

A student sees "Borderline" for Orthopaedic Surgery. Now what? The score has no
explanatory layer — it doesn't tell them their Step 2 is the drag, or that their
research count is below the unmatched mean, or that a single first-author publication
would move them to Competitive. The data to generate that explanation already exists
in the scoring breakdown — it's just not surfaced.

**Fix:** Add a "What's Holding You Back" section below the score that:
- Lists the 1–2 factors with the biggest gap to the matched benchmark
- Shows a plain-language version: "Your Step 2 (245) is above the unmatched mean (234)
  but 12 points below the matched mean (257) for Orthopaedic Surgery"
- Suggests one concrete action for each gap

### 3. Research count is too crude

`research_count` treats a poster at a local conference and a first-author publication in
JAMA as identical inputs. For high-competitiveness specialties (Derm, Ortho, Neurosurg,
Plastics), research *quality* is as important as quantity. The current scoring will
over-reward students with many minor research entries and under-reward those with
fewer but high-impact ones.

**Fix:** Weight research experiences by type. Add a `research_type` field:
`basic_science`, `clinical`, `case_report`, `QI`, `other`.
Weight: basic_science and clinical count 1.5x, QI/case_report count 0.75x.
This data also feeds into the ERAS activities section down the road.

### 4. Milestones have no "why"

The milestone list is a checklist. Students mark things complete without understanding
why that milestone matters or what "done" actually looks like. This reduces milestones
to a to-do list, which advisors can already send via email.

**Fix:** Each milestone needs three fields in the admin milestone editor:
- **Why it matters** (1–2 sentences, shown as a tooltip or expandable)
- **What "done" looks like** (concrete completion criteria)
- **Specialty weight** (for high-competitiveness specialties, flag certain milestones as critical)

---

## Phase 1 — High Impact, Buildable Now
*These features require no new data collection. They use what students already enter.*

### Feature 1: Year-Adaptive Dashboard (Fix + Feature)

Replace the static dashboard with a view that changes based on class year.

| Year | Primary Focus | Score Shown? |
|------|--------------|--------------|
| M1 | Experience logging, specialty exploration | No — show "Foundation Building" view |
| M2 | Research, Step 1 prep, early specialty signals | No — show progress toward M3 readiness |
| M3 | Clerkship performance, specialty commit, Step 2 | Yes, with caveat |
| M4 | ERAS, applications, interviews | Yes, full view |

The M1/M2 view should show:
- Experiences logged this year (running total by category)
- Milestone completion for their year
- "3 things to do before MS2/MS3" — surfaced from milestone data, not generic

**Why discovery backs this:** Problems A, B, D, E all stem from M1/M2 students
interacting with tools designed for M4s.

---

### Feature 2: Score Explanation Panel

Surface the breakdown data that already exists in `calculateCompetitiveness()` as
a human-readable explanation.

Display format on the student dashboard:

```
Your Competitiveness: Borderline → Orthopaedic Surgery

Strengths
  ✓ Step 2 CK (245) — above unmatched mean
  ✓ Research (5 exp) — near matched mean

Gaps
  ✗ Publications (3.2 weighted) — matched mean is 23.8
    → One first-author abstract would meaningfully close this gap
  ✗ Step 1 (228) — matched mean is 244; competitive floor for Ortho is ~240

Next actions
  → Pursue a first-author research project in orthopedic surgery before MS4
  → Consider whether your Step 1 score changes your target specialty calculus
```

No new data needed. All values are already in the `breakdown` object from scoring.

---

### Feature 3: Letter of Recommendation (LOR) Tracker

**This is the most critical missing feature in the product.** It was not the loudest
complaint in discovery because students often don't realize the problem until M4,
when it's too late. But advisors know: weak or missing letters in the target specialty
is one of the most common reasons students struggle.

Students need 3–4 letters. Strong letters come from faculty who know them well —
which means the relationship needs to start in M1/M2.

**Build:**
- LOR request table: `faculty_name`, `specialty`, `relationship` (clerkship director,
  research PI, personal connection), `status` (planning → asked → confirmed → submitted),
  `target_date`, `notes`
- Advisor can see each student's LOR status — currently this is invisible to advisors
- Milestone trigger: "Have you identified your letter writers?" appears in MS3 milestones
- Warning: if M4 student has fewer than 3 confirmed letters with < 90 days to ERAS open,
  surface an alert on the dashboard

---

### Feature 4: ERAS Activity Curation Helper

The ERAS cap is 15 activities (700 chars each) + 3 most meaningful (1,325 chars each).
Students who've been logging since M1 will have more than 15 entries. They need help
deciding what to keep.

**Build on the existing activities logger:**
- Add a `for_eras` boolean flag to each activity ("Include in ERAS submission")
- Add `eras_category` dropdown mapped to ERAS's actual categories:
  (Research/Lab, Community Service, Teaching, Leadership, Military, etc.)
- Add character counters for description fields (700 char limit)
- "Most Meaningful" flag limited to 3 (already partially built, needs surfacing)
- Add a curation mode: "You have 18 activities. ERAS allows 15. Here's what to
  consider cutting based on specialty alignment."
- Count-by-ERAS-category check: "Programs notice if students have 0 community
  service entries — consider adding one."

---

### Feature 5: Smart ERAS Deadline Calendar

M4 application season has a predictable, high-stakes timeline. Students routinely
miss or nearly miss deadlines because they're not centralized anywhere.

**Key dates to pre-load (customizable by admin per cycle):**
- ERAS opens (typically September 1)
- Program download date (typically October 1) — this is the hard deadline
- Signal deadlines (varies by specialty)
- Common LOR deadlines
- Interview invitations window (October–December)
- Rank list opens
- Rank list deadline (typically February)
- Match Day

**Build:**
- Admin configures the cycle dates once per application year
- M4 students see a countdown timeline on their dashboard
- Auto-generated tasks: "ERAS opens in 45 days. Your application is 60% complete."
  (% complete = fields filled, LORs confirmed, activities flagged for ERAS)
- Alert system: flag incomplete items 30, 14, and 7 days before critical deadlines

---

## Phase 2 — Requires Data Collection Infrastructure
*These features become possible as Cooper's own historical outcomes data accumulates.*

### Feature 6: Application Volume Recommender

Students vastly over- and under-apply. The NRMP data tells us match rates by specialty
but not by profile band. Once Cooper has even 2–3 years of outcomes data, the platform
can say: "Students from Cooper with your profile in Anesthesiology applied to an average
of 47 programs and received 11 interviews."

**Data to start collecting now (even if not used yet):**
- Number of programs applied to (add to student profile, filled in M4)
- Number of interview invitations received
- Number of interviews attended
- Specialty matched vs. specialty applied
- Programs ranked (anonymized list of program IDs)

This data is the Cooper-specific moat. No other tool has school-specific outcomes.

---

### Feature 7: "Profiles Like Yours" View

Identical to the discovery document's suggestion. Requires historical data.

**Start collecting now:** When a student matches (or doesn't), record their profile
snapshot at the time of application (scores, research count, pubs, activities count)
alongside their outcome. After 2 cycles you have a meaningful dataset.

---

### Feature 8: Dual-Apply and SOAP Risk Indicator

For students below the matched mean in a high-competitiveness specialty, the
platform should surface dual-application planning proactively — not reactively
when they're already in SOAP.

**Trigger logic (can build now, even without historical data):**
- If specialty match rate < 80% AND student score is < Borderline → surface dual-apply prompt
- If specialty match rate < 75% → always prompt advisor to discuss backup plan
- Link to FM, IM, Psych, Peds as the standard backup specialties

---

## Feature Gaps Not in the Discovery (My Additions)

The discovery captured what students *said*. These are things they didn't say but
the data and process reveal as critical:

### 1. Preliminary Year Tracking
Several specialties (Radiology, Anesthesia, Neurology, PM&R, Ophthalmology) require
a separate preliminary or transitional year application alongside the specialty application.
This means M4s in these fields are effectively filing two sets of ERAS applications,
managing two rank lists, and attending interviews for two different program types.

No advising tool currently handles this. The platform should:
- Flag specialties that require prelim/TY year in the scoring/specialty selection UI
- Add a "Prelim application" section to the ERAS calendar for affected students
- Surface advisor alert: "This student is applying to Radiology — have they started
  their IM prelim list?"

### 2. Research Quality vs. Research Quantity
Already noted in the critique above, but worth calling out as a standalone gap.
The discovery mentions research volume but not quality. For Derm, Ortho, Plastics,
and Neurosurg, having *disease-specific research in the target specialty* is
increasingly considered table stakes. The platform should eventually let students
tag research by specialty alignment and surface this to advisors.

### 3. Geographic Strategy
A student applying to EM programs in the Northeast has a very different strategy than
one applying nationally. Geographic concentration changes ideal program count, signal
strategy, and away rotation value. The current product has no geographic dimension.
Add a "preferred geography" field to the student profile and incorporate it into
future application strategy recommendations.

### 4. Advisor Meeting Prep
The discovery shows advisors are spending significant time on 1:1 catch-ups that
could be more productive with shared context. Currently advisors can see student
profiles and leave notes. What's missing: a shared pre-meeting agenda.

**Light-weight build:**
- Student can flag "I want to discuss X" before a meeting (specialty uncertainty,
  a red flag, a specific program)
- Advisor sees flagged items on the student detail page
- After meeting, advisor marks items as "discussed" — creates an audit trail
  of what was covered across the advising relationship

---

## What NOT to Build Yet

- **AI personal statement drafting** — The risk of students over-relying on
  AI-generated narratives is real, and programs are increasingly screening for it.
  Build structure and prompts; don't generate prose.
- **Program database / search** — FREIDA, Doximity Residency Navigator, and Residency
  Explorer already own this space with far more data. Build integrations, not competition.
- **School Outcomes Hub (public)** — The Cooper-specific outcomes data is the moat.
  Aggregating data from other schools before you own your own data is a distraction.

---

## Priority Order (Recommended Sequencing)

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Score Explanation Panel | Low | High — uses existing data |
| 2 | Year-Adaptive Dashboard | Medium | High — fixes M1/M2 experience |
| 3 | LOR Tracker | Low | High — critical gap, simple data model |
| 4 | ERAS Activity Curation Helper | Medium | High — builds on existing logger |
| 5 | Smart ERAS Deadline Calendar | Medium | High — M4 pain point |
| 6 | Milestone "Why It Matters" fields | Low | Medium — admin editor addition |
| 7 | Research type weighting | Low | Medium — scoring improvement |
| 8 | Advisor Meeting Prep (flags) | Low | Medium — advisor retention |
| 9 | Preliminary Year Flag | Low | Medium — niche but high-stakes |
| 10 | Application Volume Recommender | High | High — needs data collection first |
