-- Add match-related fields to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS mspe_ranking          text,
  ADD COLUMN IF NOT EXISTS aoa                   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hp_in_specialty       text,
  ADD COLUMN IF NOT EXISTS poor_academic_history text,
  ADD COLUMN IF NOT EXISTS gap_in_school         text;

-- One assessment per student per match season
CREATE TABLE IF NOT EXISTS match_risk_assessments (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id             uuid REFERENCES students(id) ON DELETE CASCADE,
  season                 integer NOT NULL,
  risk_level             text NOT NULL DEFAULT 'low',
  parallel_plan          text,
  soap_plan              text,
  interview_count        integer,
  prelim_interview_count integer,
  geographic_preference  text,
  away_rotation          boolean DEFAULT false,
  release_of_information boolean DEFAULT false,
  matched_program        text,
  matched_specialty      text,
  rank_of_match          integer,
  soap_outcome           boolean DEFAULT false,
  notes                  text,
  updated_at             timestamptz DEFAULT now(),
  updated_by             uuid REFERENCES profiles(id),
  created_at             timestamptz DEFAULT now(),
  UNIQUE(student_id, season)
);

-- Immutable log every time risk level changes
CREATE TABLE IF NOT EXISTS match_risk_history (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid REFERENCES match_risk_assessments(id) ON DELETE CASCADE,
  risk_level    text NOT NULL,
  snapshot_date timestamptz DEFAULT now(),
  changed_by    uuid REFERENCES profiles(id)
);

-- Admin-configurable factor weights (for future auto-score tuning)
CREATE TABLE IF NOT EXISTS match_risk_factor_weights (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  factor_key text UNIQUE NOT NULL,
  label      text NOT NULL,
  weight     integer DEFAULT 3 CHECK (weight BETWEEN 1 AND 5),
  enabled    boolean DEFAULT true,
  category   text DEFAULT 'interview'
);

INSERT INTO match_risk_factor_weights (factor_key, label, weight, enabled, category) VALUES
  ('step1_fail_attempt',   'Any failed USMLE attempt',                      5, true, 'interview'),
  ('step2_far_below_mean', 'Step 2 >20 below specialty mean',               5, true, 'interview'),
  ('step2_below_mean',     'Step 2 10–20 below specialty mean',             4, true, 'interview'),
  ('competitive_specialty','Highly competitive specialty',                   4, true, 'interview'),
  ('poor_academic_history','History of poor academic performance',           4, true, 'interview'),
  ('mspe_below_good',      'MSPE ranking below Good',                       4, true, 'interview'),
  ('educational_gap',      'Educational gap in medical school',             3, true, 'supplemental'),
  ('no_hp_in_specialty',   'No HP/Honors in desired specialty',             3, true, 'interview'),
  ('no_parallel_plan',     'No parallel plan for high-risk specialty',      3, true, 'interview'),
  ('geographic_restriction','Strong geographic restriction',                 2, true, 'supplemental'),
  ('aoa_member',           'AOA membership (positive signal)',               2, true, 'interview'),
  ('away_rotation',        'Away rotation in desired specialty (positive)',  2, true, 'interview')
ON CONFLICT (factor_key) DO NOTHING;
