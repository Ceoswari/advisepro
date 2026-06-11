# AdvisePro — MVP Overview & Demo Guide
**Cooper University Health Care**
**Version:** MVP 1.0
**Live URL:** https://advisepro.vercel.app

---

## What Is AdvisePro?

AdvisePro is a residency advising platform built for Cooper University Health Care medical students. It centralizes everything students and advisors need during the residency application process — from tracking USMLE scores and ERAS activities to monitoring milestone progress and flagging students who need attention.

The platform has three user roles: **Student**, **Advisor**, and **Admin**.

---

## Demo Accounts

> **To log in, go to:** https://advisepro.vercel.app/login
>
> These are test accounts for demo purposes. Passwords can be changed after first login.

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cooper.edu | ChangeMe123! |
| Advisor | advisor@cooper.edu | ChangeMe123! |
| Student | student@cooper.edu | ChangeMe123! |

> **Note for supervisor:** If these accounts haven't been created yet, go to the Admin dashboard → "+ Add Student" or ask Caleb to set them up before the demo.

---

## Feature Overview by Role

---

### 🎓 Student

Students log in and manage their entire residency application profile in one place.

#### Dashboard
- Sees USMLE Step 1 & Step 2 scores, research count, volunteer hours
- Quick-access cards for ERAS Activities, Publications, Away Rotations, Documents, and Application Profile
- **Competitiveness Score** (0–100) — auto-calculated based on their data, adjusted by specialty tier
- Specialty Benchmark card — compares their scores to national 25th/75th percentile data
- Advising notes from their advisor appear here
- Milestone tracker by MS year (MS1–MS4) with status dropdowns

#### Experiences & Activities (ERAS Format)
- Add up to 15 experiences in ERAS-standard categories (Research, Volunteer, Leadership, etc.)
- Mark up to 3 as "Most Meaningful" with extended 1,325-character description
- 700-character description limit per activity (matches ERAS)
- Link any activity to a milestone
- Edit or delete at any time

#### Publications
- Log publications by type: First Author (6 pts), Co-Author (3 pts), Poster (1.5 pts), Abstract (1 pt)
- Fields: title, journal, DOI, publication date
- Points feed into the Competitiveness Score

#### Away Rotations
- Track planned, completed, or cancelled away rotations
- Fields: program, specialty, institution, location, dates, notes
- Having any rotation gives a binary score boost

#### Documents
- Upload CV, Personal Statement, MSPE/Dean's Letter, and other files
- Max 10MB per file (PDF, DOC, DOCX)
- Download or delete at any time
- Stored securely — only the student (and admin) can access their files

#### Application Profile
- A single print-ready page showing all student data
- Sections: USMLE scores, competitiveness, research/publications, away rotations, ERAS activities, milestone progress, advising history
- "Print / Export PDF" button — generates a clean PDF via the browser

#### Edit Profile
- Update specialty interest, class year, USMLE scores, research count, volunteer hours
- Risk level auto-recalculates on save

---

### 👨‍⚕️ Advisor

Advisors manage their assigned students and log meeting notes.

#### Dashboard
- List of all assigned students with last meeting date, risk level, and class year
- **Attention Alert** banner — highlights students who are high risk, haven't met yet, or haven't been seen in 30+ days
- Click the alert to filter to those students instantly
- Search by name, filter by risk level or class year
- Color-coded last meeting: red = never met, orange = >30 days ago

#### Student Detail
- Full view of student data: scores, competitiveness breakdown, milestone summary, advising history
- Log new meeting notes (date + notes)
- **Manage Activities** button — advisor can directly edit a student's ERAS activities

---

### 🔧 Admin

Admins have full visibility across all students and manage the platform.

#### Student Overview (Main Dashboard)
- Institutional view of all students
- Risk summary cards (Low / Medium / High / Not Assessed) — click to filter
- Search by name, email, or specialty; filter by risk, class year, or specialty
- **Export CSV** — exports the current filtered view with all key fields
- **Bulk Import** — paste a CSV to create multiple students at once (template downloadable)
- **+ Add Student** — add a student one at a time

#### Student Detail Page
- Full competitiveness score with breakdown
- Assign or remove advisors for each student
- Milestone progress summary
- **Academic Documents** — upload transcripts, score reports, LORs for each student
- Full advising notes history

#### Edit Student
- Update any student's academic data
- Override risk level manually or let it auto-calculate

#### Analytics
- Institutional summary: total students, average Step 2, meeting coverage %, milestone completion %
- Visual bar charts: risk distribution, class year breakdown, specialty distribution, Step 1 status, high risk by year

#### Milestone Management
- Create new milestones and assign them to all existing students automatically
- Delete milestones
- Milestones grouped by MS year (MS1–MS4)

---

## Competitiveness Score

The score (0–100) is calculated from the following components and adjusted based on how competitive the student's target specialty is:

| Component | Max Points | Notes |
|-----------|-----------|-------|
| USMLE Step 2 | 35 | Scaled to score |
| USMLE Step 1 | 15 | Pass/Fail or numeric |
| Publications | Uncapped | First Author ×6, Co-Author ×3, Poster ×1.5, Abstract ×1 |
| Research Experiences | 10 | |
| Volunteer Hours | 10 | |
| Away Rotations | 5 | Binary — yes or no |
| ERAS Activities | 5 | |

**Specialty tiers** (Very Competitive → Less Competitive) shift the thresholds for Low/Medium/High Risk. A student targeting Orthopedic Surgery needs a higher score for "Low Risk" than one targeting Family Medicine.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), Tailwind CSS |
| Backend / Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Hosting | Vercel |
| Repository | GitHub (github.com/Ceoswari/advisepro) |

---

## What's Coming Next (Post-MVP)

The following features are planned and pending additional data or integrations:

- **Historical Match Data Analysis** — specialty-specific match rates from Cooper's match history (needs data from supervisor)
- **Signal Effectiveness Dashboard** — which activities/signals predict match success
- **Email Notifications** — meeting reminders, milestone due dates (needs email provider)
- **Outlook Calendar Integration** — schedule advising meetings directly (needs Microsoft OAuth)
- **Post-Match Survey Dashboard** — collect and analyze outcomes from matched students

---

## Security Notes

- All data is protected by Row Level Security (RLS) — students can only see their own data
- File storage is private — signed URLs expire after 60 seconds
- Passwords are hashed by Supabase Auth (never stored in plaintext)
- Role-based access: students, advisors, and admins each see only what their role allows

---

*Built by Caleb Oswari — Cooper University Health Care*
*Platform: AdvisePro · advisepro.vercel.app*
