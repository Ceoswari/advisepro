-- Residency programs reference table (from NRMP data)
CREATE TABLE IF NOT EXISTS residency_programs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_code text UNIQUE NOT NULL,       -- NRMP code, e.g. "1903140C0"
  specialty    text NOT NULL,
  institution  text,
  city         text,
  state        text,
  -- NRMP national match results per year
  quota_2022   int,  filled_2022  int,
  quota_2023   int,  filled_2023  int,
  quota_2024   int,  filled_2024  int,
  quota_2025   int,  filled_2025  int,
  quota_2026   int,  filled_2026  int,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Cooper-specific match history per program per year
CREATE TABLE IF NOT EXISTS cooper_program_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id          uuid REFERENCES residency_programs(id) ON DELETE CASCADE,
  year                int NOT NULL,
  cooper_applicants   int,    -- how many Cooper students applied here
  cooper_interviews   int,    -- how many got interviews
  cooper_matched      int,    -- how many matched (0 or 1 typically)
  notes               text,
  created_at          timestamptz DEFAULT now(),
  UNIQUE (program_id, year)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_residency_programs_specialty ON residency_programs(specialty);
CREATE INDEX IF NOT EXISTS idx_residency_programs_state     ON residency_programs(state);
CREATE INDEX IF NOT EXISTS idx_cooper_history_program       ON cooper_program_history(program_id);
CREATE INDEX IF NOT EXISTS idx_cooper_history_year          ON cooper_program_history(year);

-- RLS
ALTER TABLE residency_programs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooper_program_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read residency programs"
  ON residency_programs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage residency programs"
  ON residency_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage cooper program history"
  ON cooper_program_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
