-- LOR (Letter of Recommendation) Tracker
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS lor_requests (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  faculty_name      text NOT NULL,
  faculty_specialty text,
  relationship  text NOT NULL DEFAULT 'attending',
  status        text NOT NULL DEFAULT 'planning'
                  CHECK (status IN ('planning', 'asked', 'confirmed', 'submitted')),
  target_date   date,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lor_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER lor_requests_updated_at
  BEFORE UPDATE ON lor_requests
  FOR EACH ROW EXECUTE FUNCTION update_lor_requests_updated_at();

-- RLS
ALTER TABLE lor_requests ENABLE ROW LEVEL SECURITY;

-- Students can manage their own LOR requests
CREATE POLICY "Students manage own lor_requests"
  ON lor_requests FOR ALL
  USING (
    student_id IN (
      SELECT id FROM students WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE profile_id = auth.uid()
    )
  );

-- Advisors can view LOR requests for their assigned students
CREATE POLICY "Advisors view assigned student lor_requests"
  ON lor_requests FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN advisor_student ads ON ads.student_id = s.id
      WHERE ads.advisor_profile_id = auth.uid()
    )
  );

-- Admins can view all LOR requests
CREATE POLICY "Admins view all lor_requests"
  ON lor_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
