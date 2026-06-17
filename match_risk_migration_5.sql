-- Structured applied programs with signal data
-- Each entry: {"program": "...", "signal": "none"|"silver"|"gold"}
ALTER TABLE match_risk_assessments
  ADD COLUMN IF NOT EXISTS applied_programs_data jsonb DEFAULT '[]'::jsonb;
