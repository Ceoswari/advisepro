-- STEP 1: Diagnose — run these SELECT statements first to confirm the issue

-- How many EM milestones exist in the milestones table?
SELECT COUNT(*) AS em_milestones_in_db
FROM milestones
WHERE specialty = 'Emergency Medicine';

-- What RLS policies exist on the milestones table?
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'milestones';

-- For a specific student (replace the email below), how many specialty vs universal milestones are assigned?
SELECT
  COUNT(*) AS total_assigned,
  SUM(CASE WHEN m.specialty IS NULL THEN 1 ELSE 0 END) AS universal_assigned,
  SUM(CASE WHEN m.specialty IS NOT NULL THEN 1 ELSE 0 END) AS specialty_assigned
FROM student_milestones sm
JOIN milestones m ON m.id = sm.milestone_id
JOIN students s ON s.id = sm.student_id
JOIN profiles p ON p.id = s.profile_id
-- WHERE p.email = 'student@example.com';  -- uncomment and fill in to filter by student


-- STEP 2: Fix — ensure all authenticated users can read all milestones
-- (Drop any restrictive SELECT policies, add a permissive one)

-- First drop any existing SELECT policies that might be too narrow
DROP POLICY IF EXISTS "Students can view milestones" ON milestones;
DROP POLICY IF EXISTS "Enable read access for all users" ON milestones;
DROP POLICY IF EXISTS "Milestones are viewable by everyone" ON milestones;
DROP POLICY IF EXISTS "Users can view milestones" ON milestones;
DROP POLICY IF EXISTS "students_read_milestones" ON milestones;
DROP POLICY IF EXISTS "read_milestones" ON milestones;
DROP POLICY IF EXISTS "milestones_select" ON milestones;

-- Create a permissive read policy for all authenticated users
-- (anyone logged in can read any milestone — write/delete stays restricted to admin)
CREATE POLICY "authenticated_read_all_milestones"
  ON milestones
  FOR SELECT
  TO authenticated
  USING (true);


-- STEP 3: Backfill — assign specialty milestones to any student who doesn't have them yet
INSERT INTO student_milestones (student_id, milestone_id, status)
SELECT
  s.id          AS student_id,
  m.id          AS milestone_id,
  'not_started' AS status
FROM students s
JOIN milestones m
  ON m.specialty = s.specialty_interest   -- specialty milestones that match the student's interest
WHERE s.specialty_interest IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM student_milestones sm
    WHERE sm.student_id = s.id
      AND sm.milestone_id = m.id
  )
ON CONFLICT DO NOTHING;

-- Confirm the backfill worked
SELECT
  p.email,
  s.specialty_interest,
  COUNT(*) AS total_milestones,
  SUM(CASE WHEN m.specialty IS NULL THEN 1 ELSE 0 END) AS universal,
  SUM(CASE WHEN m.specialty IS NOT NULL THEN 1 ELSE 0 END) AS specialty
FROM student_milestones sm
JOIN students s ON s.id = sm.student_id
JOIN profiles p ON p.id = s.profile_id
JOIN milestones m ON m.id = sm.milestone_id
GROUP BY p.email, s.specialty_interest;
