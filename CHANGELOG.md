# AdvisePro — Product Changelog

A running log of features, fixes, and improvements shipped to AdvisePro.

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
