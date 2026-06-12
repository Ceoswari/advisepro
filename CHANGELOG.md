# AdvisePro — Product Changelog

A running log of features, fixes, and improvements shipped to AdvisePro.

---

## June 12, 2026 (continued — data import)

### Banner ID
- Added `banner_id` (Banner ID) field to all student records — primary identifier for CSV data imports
- Banner ID now appears on the admin student edit page, the individual new student form, and the bulk import template
- Bulk import template simplified to `full_name, email, banner_id, class_year, specialty_interest` — scores removed since those come from official imports
- Banner ID validated as required during bulk import (rows missing it are flagged before upload)

### Import Data Hub
- New **Import Data** page in admin nav — central hub for all CSV data imports
- Currently live: Progress IQ Course Grades
- Coming soon placeholders: USMLE Step Scores, NBME Shelf Exams

### Progress IQ Grade Import
- Admins upload a grade export CSV from Progress IQ and AdvisePro matches each row to a student account
- Match logic: Banner ID is the primary key; Rowan email is cross-checked as secondary verification
  - Banner ID + email both match → imported (green)
  - Banner ID found, email blank in CSV → imported with warning (amber — Progress IQ doesn't always export email)
  - Banner ID found, email in CSV doesn't match → blocked (red — must resolve before importing)
  - Banner ID not found → skipped (red — student account needs Banner ID set first)
- Admin names the course (CourseID → human-readable name) at import time; name is remembered for future uploads
- Handles Progress IQ's metadata rows (Class Avg, Points Possible, Threshold) automatically — only student rows are imported
- Grade components (Exam 1, TBL 2, etc.) are dynamic — any course structure is supported
- Class averages stored alongside individual grades for future comparison features
- `grades_migration.sql` — run in Supabase SQL Editor before using (adds `banner_id`, creates `courses` and `course_grades` tables)

---

## June 12, 2026 (continued — security)

### Session Timeout
- All dashboard pages now auto sign out after 30 minutes of inactivity
- A warning modal appears 2 minutes before sign-out with a countdown and "Stay signed in" option
- Implemented via a shared dashboard layout so it applies to all roles (student, advisor, admin) automatically

### Audit Log
- New `audit_logs` table records every data change made by administrators — immutable, no updates or deletes allowed
- Every save on the admin student edit page logs: which admin, which student, which fields changed, old value → new value, and timestamp
- New **Audit Log** page at `/dashboard/admin/audit` — searchable by admin name, student name, or field
- Audit Log added to the admin navigation
- SQL migration in `security_migration.sql` — run in Supabase SQL Editor before this feature is active

---

## June 12, 2026 (continued)

### Data Ownership & Permissions
- Students can no longer edit USMLE scores, class year, research count, or volunteer hours — these are now admin-only fields
- Student edit page simplified to specialty interest only, with a clear notice that official data is managed by the program
- Admin student edit page now recalculates competitiveness score using all inputs (activities, publications, rotations) when saving — previously only used activity count
- Specialty list on admin edit page synced to match the 22 specialties in the scoring engine
- Admin edit page auto-assigns specialty-specific milestones when specialty is changed (previously only triggered from student side)

---

## June 12, 2026

### Score Explanation Panel
- Added `generateInsights()` to the scoring engine — analyzes the competitiveness breakdown and produces plain-language strengths, gaps, and recommended next steps
- New **"What This Means For You"** card below the competitiveness score shows:
  - Strengths (what the student is doing well relative to matched benchmarks)
  - Gaps with specific numbers ("Your Step 2 is 12 points below the matched mean")
  - 2–3 prioritized action items based on the biggest gaps

### Year-Adaptive Dashboard
- MS1 and MS2 students no longer see a near-zero competitiveness score — replaced with a **"Building Your Foundation"** view
  - Year-specific focus areas with actionable guidance (research, Step 1 prep, letter writer relationships)
  - Milestone progress bar for their current year
  - Clear explanation of when the score becomes meaningful (MS3)
- MS3/MS4 students see full scoring + insights + benchmark charts as before
- MS4 students additionally see an **ERAS 2026–2027 countdown** with next milestone banner and full timeline

### Letter of Recommendation (LOR) Tracker
- New **Letters tab** on the student dashboard
- Students can add letter writers with: faculty name, specialty, relationship type, status, target date, and notes
- Status pipeline: Planning → Asked → Confirmed → Submitted
- Confirmation progress bar (shows 1–4 slots, highlights how many are confirmed)
- LOR summary widget on the Overview tab links to the Letters tab
- Advisors can now see each student's full LOR list in the student detail page (Overview tab), including status and a warning if fewer than 3 are confirmed
- SQL migration in `lor_migration.sql` — run in Supabase SQL Editor before using this feature

---

## June 11, 2026

### Navigation
- Added shared `DashboardNav` component used across all pages — every page now has a persistent sign out button
- AdvisePro logo on any page now navigates back to the user's home dashboard
- Fixed logo home link on advisor sub-pages (paths like `/advisor/student/[id]` were incorrectly routing to the student dashboard)

### Authentication & Access
- Fixed login button getting stuck on "Signing in…" — missing profile or unknown role now shows a clear error message instead of freezing
- Fixed "Account not set up yet" error caused by circular Row Level Security (RLS) dependency between the `students` and `advisor_student` tables
- Simplified profiles RLS so all authenticated users can read profile data needed for role-based access

### Dashboard Tabs
- Student dashboard reorganized into three tabs: **Overview**, **Milestones**, **Messages**
- Advisor dashboard reorganized into two tabs: **My Students**, **Messages**
- Advisor student detail page reorganized into three tabs: **Overview**, **Documents**, **Messages**

### Milestones
- Fixed specialty-specific milestones not appearing on the student dashboard
- Milestones now auto-assign when a student logs in, not only when they save their profile
- Milestone list redesigned as a collapsible year-based accordion (MS1 → MS4) with per-year progress bars
- Current class year auto-expands on load

### Documents
- Student-uploaded documents (CV, Personal Statement, MSPE) are now viewable by advisors and admins
- Document listing and signed URL generation handled server-side to bypass storage access restrictions

### Messaging
- Added in-platform chat between advisors and students
- Messages update in real time using Supabase Realtime (no page refresh needed)
- Fixed "No advisor assigned yet" error caused by RLS blocking students from reading their advisor assignment and a query crash when a student had multiple advisors

---

## June 9, 2026

### Project Created
- AdvisePro project initialized — residency advising platform for Cooper University Health Care
- Built on Next.js (App Router) + Supabase (PostgreSQL, Auth, Storage, Realtime)
- Deployed to Vercel at advisepro.vercel.app; source hosted at github.com/Ceoswari/advisepro

### Initial MVP Launch
- Student dashboard with USMLE scores, research, volunteer hours, ERAS activities, publications, away rotations
- Advisor dashboard showing all assigned students with competitiveness scores
- Admin dashboard with full student management

### Competitiveness Scoring
- Scoring engine built on 2024 NRMP Charting Outcomes data for all 22 specialties
- Tier labels: Strong / Competitive / Borderline / Below Average
- Score updates automatically when student profile is saved
- Admin analytics page showing institutional score distribution

### Milestones
- General milestone framework (MS1–MS4) covering all students
- Specialty-specific milestone library for all 22 NRMP specialties (~200 milestones)
- Students can mark milestones as Not Started / In Progress / Complete
- Advisors can view milestone progress per student
- Admin milestone management page for creating and editing milestones

### Student Features
- Profile editing (USMLE scores, specialty interest, class year)
- ERAS activities log (up to 15 entries, 3 most meaningful)
- Publications tracker
- Away rotations tracker
- Document upload (CV, Personal Statement, MSPE) — max 10 MB per file
- Application profile page (print-ready summary of all data)

### Advisor Features
- View full student profile and competitiveness breakdown
- View and edit student activities
- Advising notes (per-student private notes)
- Alerts for students who haven't logged in recently or are below benchmark

### Admin Features
- Add students individually or via bulk CSV import
- Assign advisors to students
- Edit any student's profile
- Analytics dashboard (score distribution, specialty breakdown, milestone completion rates)
- Milestone management (create, edit, delete milestones by year and specialty)
- Password reset flow

### Auth & Infrastructure
- Email/password login with role-based routing (student → advisor → admin)
- Row Level Security on all tables
- Real-time data via Supabase
- Deployed on Vercel at advisepro.vercel.app
