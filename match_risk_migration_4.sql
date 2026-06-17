-- Add program-level fields (safe to run even if migration_2 already ran)
ALTER TABLE match_risk_assessments
  ADD COLUMN IF NOT EXISTS applied_programs   text[],
  ADD COLUMN IF NOT EXISTS interview_programs text[],
  ADD COLUMN IF NOT EXISTS rank_order_list    text[];
