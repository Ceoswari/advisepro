-- Add attempt tracking for Step 2 (score already exists as usmle_step2_score)
ALTER TABLE students ADD COLUMN IF NOT EXISTS usmle_step2_attempts integer;
