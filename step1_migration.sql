-- Step 1 import migration
-- Run in Supabase SQL Editor

-- Add attempt count to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS usmle_step1_attempts integer;

-- Index for name-based matching during import (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_lower ON profiles (lower(full_name));
