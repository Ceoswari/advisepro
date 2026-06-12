-- Graduation year migration
-- Run in Supabase SQL Editor

ALTER TABLE students ADD COLUMN IF NOT EXISTS graduation_year integer;

-- Index for analytics grouping by cohort
CREATE INDEX IF NOT EXISTS idx_students_graduation_year ON students (graduation_year);
