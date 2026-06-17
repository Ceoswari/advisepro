-- Add program-level fields to match risk assessments
ALTER TABLE match_risk_assessments
  ADD COLUMN IF NOT EXISTS interview_programs text[],
  ADD COLUMN IF NOT EXISTS rank_order_list    text[];
