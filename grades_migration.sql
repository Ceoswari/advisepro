-- Grades & Banner ID Migration
-- Run this in the Supabase SQL Editor

-- 1. Add banner_id to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS banner_id text UNIQUE;
CREATE INDEX IF NOT EXISTS students_banner_id_idx ON students (banner_id);

-- 2. Courses table — maps CourseID numbers to human-readable names
CREATE TABLE IF NOT EXISTS courses (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id    text NOT NULL UNIQUE,   -- e.g. "4341"
  course_name  text NOT NULL,          -- e.g. "Foundations of Medicine I"
  academic_year text,                  -- e.g. "2025-2026"
  term         text,                   -- e.g. "M1"
  created_at   timestamptz DEFAULT now()
);

-- 3. Course grades — one row per student per course upload
CREATE TABLE IF NOT EXISTS course_grades (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id      text NOT NULL,
  course_name    text NOT NULL,
  academic_year  text,
  term           text,
  letter_grade   text,        -- "High Pass", "Pass", "Fail", etc.
  course_percent numeric,
  components     jsonb,       -- {"Exam 1 (44%)": 86.61, "TBL 1 (3%)": 86.67, ...}
  class_averages jsonb,       -- class-level mean/SD for each component
  uploaded_by    uuid REFERENCES profiles(id),
  uploaded_at    timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id, academic_year, term)
);

-- RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_grades ENABLE ROW LEVEL SECURITY;

-- Courses: all authenticated users can read
CREATE POLICY "Authenticated users read courses"
  ON courses FOR SELECT USING (auth.role() = 'authenticated');

-- Courses: only admins can insert/update
CREATE POLICY "Admins manage courses"
  ON courses FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Course grades: students see only their own
CREATE POLICY "Students read own course_grades"
  ON course_grades FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

-- Course grades: advisors see their assigned students
CREATE POLICY "Advisors read assigned student course_grades"
  ON course_grades FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN advisor_student ads ON ads.student_id = s.id
      WHERE ads.advisor_profile_id = auth.uid()
    )
  );

-- Course grades: admins manage all
CREATE POLICY "Admins manage course_grades"
  ON course_grades FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
