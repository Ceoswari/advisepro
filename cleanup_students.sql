-- Remove all students except student@test.com
-- Run in Supabase SQL Editor BEFORE importing new students
-- This deletes all dependent records then the student and profile rows.

DO $$
DECLARE
  keep_id uuid;
BEGIN
  SELECT id INTO keep_id FROM profiles WHERE email = 'student@test.com';

  DELETE FROM student_milestones
    WHERE student_id IN (SELECT id FROM students WHERE profile_id != keep_id);

  DELETE FROM activities
    WHERE student_id IN (SELECT id FROM students WHERE profile_id != keep_id);

  DELETE FROM advising_notes
    WHERE student_id IN (SELECT id FROM students WHERE profile_id != keep_id);

  DELETE FROM advisor_student
    WHERE student_id IN (SELECT id FROM students WHERE profile_id != keep_id);

  DELETE FROM lor_requests
    WHERE student_id IN (SELECT id FROM students WHERE profile_id != keep_id);

  DELETE FROM course_grades
    WHERE student_id IN (SELECT id FROM students WHERE profile_id != keep_id);

  -- audit_logs has ON DELETE SET NULL so no action needed
  DELETE FROM students WHERE profile_id != keep_id;

  DELETE FROM profiles WHERE role = 'student' AND id != keep_id;

  RAISE NOTICE 'Done. Kept student@test.com (%). All other students removed.', keep_id;
END $$;

-- Also delete orphaned Supabase Auth users for rowan.edu accounts.
-- Required before re-importing students — otherwise bulk import fails with
-- "A user with this email address has already been registered."
DELETE FROM auth.users WHERE email LIKE '%@rowan.edu';
