-- Security: Audit Log
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  performed_by    uuid NOT NULL REFERENCES profiles(id),
  student_id      uuid REFERENCES students(id) ON DELETE SET NULL,
  action          text NOT NULL,
  changes         jsonb,
  ip_address      text
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS audit_logs_student_id_idx   ON audit_logs (student_id);
CREATE INDEX IF NOT EXISTS audit_logs_performed_by_idx ON audit_logs (performed_by);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx   ON audit_logs (created_at DESC);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins read audit_logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can insert audit log entries
CREATE POLICY "Admins insert audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    performed_by = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- No updates or deletes — audit logs are immutable
