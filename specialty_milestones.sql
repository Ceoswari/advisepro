-- ============================================================
-- AdvisePro: Specialty Milestone Framework
-- Sources: ACGME Milestones, AAMC Careers in Medicine,
--          specialty society student guides, PD survey data
-- Run in Supabase SQL Editor
-- ============================================================

-- Step 1: Extend milestones table
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;

-- Index for fast specialty lookups
CREATE INDEX IF NOT EXISTS idx_milestones_specialty ON milestones(specialty);
CREATE INDEX IF NOT EXISTS idx_milestones_universal ON milestones((specialty IS NULL));

-- Prevent duplicate seeds on re-run
CREATE UNIQUE INDEX IF NOT EXISTS idx_milestones_title_specialty
  ON milestones(title, COALESCE(specialty, ''));

-- ============================================================
-- UNIVERSAL MILESTONES (specialty = NULL, all students)
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
-- MS1
('Join the American Medical Association (AMA) as a student member',
 'MS1', 'Networking',
 'Free for medical students. Provides access to advocacy resources, journals, and national leadership programs.',
 true, NULL, 'medium', 'AAMC'),

('Complete BLS/CPR certification',
 'MS1', 'Clinical',
 'Required before any patient contact. Renew every 2 years. Offered through American Heart Association.',
 true, NULL, 'high', 'AHA'),

('Meet with your assigned advisor for an orientation meeting',
 'MS1', 'Advising',
 'Establish 4-year goals, explore specialty interests, and identify early research and shadowing opportunities.',
 true, NULL, 'high', 'Cooper'),

('Begin tracking volunteer and community service hours',
 'MS1', 'Extracurricular',
 'ERAS requires documentation of all volunteer work. Start a spreadsheet now — hours accumulate quickly.',
 true, NULL, 'medium', 'ERAS'),

('Shadow physicians in at least 2 different specialties',
 'MS1', 'Clinical',
 'Broad early exposure helps confirm specialty interest before committing to a research mentor or interest group.',
 false, NULL, 'medium', 'AAMC CiM'),

('Join at least one specialty interest group at your institution',
 'MS1', 'Networking',
 'Interest groups connect you with mentors, research opportunities, and early specialty exposure.',
 false, NULL, 'medium', 'AAMC CiM'),

-- MS2
('Register for USMLE Step 1 through NBME',
 'MS2', 'Academics',
 'Registration opens 6 months before exam date. Coordinate timing with your school''s dedicated study period.',
 true, NULL, 'high', 'NBME'),

('Complete dedicated USMLE Step 1 study period (6–10 weeks)',
 'MS2', 'Academics',
 'Use First Aid, UWorld, and Anki as primary resources. Most successful students study full-time during this block.',
 true, NULL, 'high', 'NBME'),

('Pass USMLE Step 1',
 'MS2', 'Academics',
 'Step 1 is now pass/fail. Passing is required to begin clinical rotations. Prepare thoroughly.',
 true, NULL, 'high', 'NBME'),

('Identify a research mentor and start a project',
 'MS2', 'Research',
 'Research experience substantially strengthens applications in most specialties. Earlier start = more time for publications.',
 false, NULL, 'high', 'AAMC CiM'),

('Update your CV with all activities, research, and volunteer work',
 'MS2', 'Application',
 'Maintain a current CV every semester. This becomes the foundation of your ERAS application.',
 true, NULL, 'medium', 'ERAS'),

-- MS3
('Complete all required core clerkships',
 'MS3', 'Clinical',
 'Core clerkships: Internal Medicine, Surgery, Pediatrics, OB/GYN, Psychiatry, and Family Medicine. Strong evaluations matter.',
 true, NULL, 'high', 'LCME'),

('Complete ACLS certification',
 'MS3', 'Clinical',
 'Required for most residency programs. Offered through AHA. Valid for 2 years.',
 true, NULL, 'high', 'AHA'),

('Request letters of recommendation from clerkship attendings',
 'MS3', 'Application',
 'Identify 3–5 strong faculty advocates early. Ask for LORs promptly while your rotation is fresh in their minds.',
 true, NULL, 'high', 'ERAS'),

('Begin USMLE Step 2 CK preparation',
 'MS3', 'Academics',
 'Begin UWorld Step 2 during core clerkships. Target taking Step 2 by June–July of MS4 so scores are available for interviews.',
 true, NULL, 'high', 'NBME'),

('Meet with your advisor to confirm specialty and plan MS4 rotations',
 'MS3', 'Advising',
 'Review clerkship performance, finalize specialty choice, plan away rotations and sub-internships for MS4.',
 true, NULL, 'high', 'Cooper'),

('Submit research abstract or manuscript if project permits',
 'MS3', 'Research',
 'Presenting or publishing during MS3 strengthens your application timeline and demonstrates productivity.',
 false, NULL, 'medium', 'AAMC'),

-- MS4
('Pass USMLE Step 2 CK',
 'MS4', 'Academics',
 'Required for graduation and residency. Most programs want scores available before rank lists are submitted.',
 true, NULL, 'high', 'NBME'),

('Register for ERAS (Electronic Residency Application Service)',
 'MS4', 'Application',
 'ERAS opens in June. Application fees and work-up tokens are required. Complete your application over summer.',
 true, NULL, 'high', 'ERAS'),

('Draft and finalize personal statement',
 'MS4', 'Application',
 'Have at least 3 readers review your PS: an advisor, a faculty mentor, and a peer. Submit with ERAS in September.',
 true, NULL, 'high', 'ERAS'),

('Submit ERAS application (September 15 opening)',
 'MS4', 'Application',
 'Applications open to programs on September 15. Coordinate dean''s letter (MSPE) submission with your registrar.',
 true, NULL, 'high', 'ERAS'),

('Prepare for residency interviews (behavioral + clinical questions)',
 'MS4', 'Application',
 'Practice: "Why this specialty?", "Tell me about yourself", a clinical scenario. Research each program before interviewing.',
 true, NULL, 'high', 'NRMP'),

('Submit Rank Order List (ROL) by NRMP deadline',
 'MS4', 'Application',
 'Rank every program where you would accept a position. Ranking more programs improves match probability.',
 true, NULL, 'high', 'NRMP')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- ANESTHESIOLOGY
-- Match rate 86% | Step 2 matched mean 252 | Research mean 3.8
-- Source: ACGME Anesthesiology Milestones, ASA Student Resources
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Join the ASA (American Society of Anesthesiologists) student chapter',
 'MS1', 'Networking',
 'Access to anesthesia journals, mentorship networks, and the annual ASA meeting. Free or low-cost for students.',
 false, 'Anesthesiology', 'medium', 'ASA'),

('Shadow an anesthesiologist across case types (general, regional, OB, pediatric)',
 'MS1', 'Clinical',
 'Observe variability in anesthesia practice — breadth of subspecialties is a key feature of the specialty.',
 false, 'Anesthesiology', 'high', 'ASA'),

('Begin a research project in anesthesia, critical care, or pain medicine',
 'MS2', 'Research',
 'Anesthesia programs value research. Mean publications for matched applicants is 9.0. Earlier start improves output.',
 false, 'Anesthesiology', 'high', 'NRMP 2024'),

('Explore anesthesia subspecialties: cardiac, neuroanesthesia, peds, regional, critical care, pain',
 'MS2', 'Clinical',
 'Knowing your subspecialty interests makes you a stronger interview candidate and guides fellowship planning.',
 false, 'Anesthesiology', 'medium', 'ACGME'),

('Target USMLE Step 2 score ≥250 (matched mean: 252)',
 'MS2', 'Academics',
 'Step 2 is the primary numeric benchmark for anesthesia programs. Prioritize Step 2 preparation accordingly.',
 false, 'Anesthesiology', 'high', 'NRMP 2024'),

('Excel on surgery and internal medicine clerkships',
 'MS3', 'Clinical',
 'Strong performance in procedural and medicine clerkships signals anesthesia aptitude to program directors.',
 true, 'Anesthesiology', 'high', 'ACGME'),

('Complete an anesthesia sub-internship or anesthesia elective',
 'MS3', 'Clinical',
 'Hands-on experience with airway management, IV placement, and perioperative care is expected before application.',
 false, 'Anesthesiology', 'high', 'ASA'),

('Complete 1–2 away rotations at anesthesia programs of interest',
 'MS4', 'Clinical',
 'Sub-Is at away programs allow you to demonstrate your skills and get a letter from outside your home institution.',
 false, 'Anesthesiology', 'high', 'ASA'),

('Obtain a letter of recommendation from an anesthesiologist',
 'MS4', 'Application',
 'At least one LOR should be from an anesthesiologist who has directly supervised you in the OR.',
 true, 'Anesthesiology', 'high', 'ERAS')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- CHILD NEUROLOGY
-- Match rate 98% | Step 2 matched mean 248 | Research mean 3.0
-- Source: CNS Student Resources, ACGME Child Neurology Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow a child neurologist and a general pediatric neurologist',
 'MS1', 'Clinical',
 'Child neurology spans epilepsy, neuromuscular disease, developmental delay, and neuro-oncology. Broad exposure is essential.',
 false, 'Child Neurology', 'high', 'CNS'),

('Join the Child Neurology Society (CNS) as a student member',
 'MS2', 'Networking',
 'CNS provides mentorship, research opportunities, and the annual meeting where you can present work and network.',
 false, 'Child Neurology', 'medium', 'CNS'),

('Begin a research project in pediatric neurology or neuroscience',
 'MS2', 'Research',
 'Research strengthens applications. Focus on topics relevant to your subspecialty interest within child neuro.',
 false, 'Child Neurology', 'high', 'CNS'),

('Excel on both pediatrics and neurology clerkships',
 'MS3', 'Clinical',
 'Child neurology requires a preliminary year in pediatrics. Strong evaluations in both clerkships are critical.',
 true, 'Child Neurology', 'high', 'ACGME'),

('Understand the Child Neurology match pathway (pediatrics preliminary year required)',
 'MS3', 'Application',
 'Child neurology residents do 1–2 years of general pediatrics before starting neurology. Apply to peds prelim + child neuro combined.',
 true, 'Child Neurology', 'high', 'NRMP'),

('Complete a child neurology sub-internship or away rotation',
 'MS4', 'Clinical',
 'Direct experience with child neurology patients and procedures (EEG interpretation, LP) is expected.',
 false, 'Child Neurology', 'high', 'CNS'),

('Apply to pediatrics preliminary/categorical programs alongside child neurology',
 'MS4', 'Application',
 'You must match into pediatrics (prelim or categorical) to complete before starting child neurology training.',
 true, 'Child Neurology', 'high', 'NRMP')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- DERMATOLOGY
-- Match rate 71% (very competitive) | Step 2 matched mean 257 | Pubs matched mean 27.7
-- Source: AAD, ACGME Dermatology Milestones, PD surveys (J Am Acad Dermatol)
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow a dermatologist and identify a dermatology research mentor',
 'MS1', 'Clinical',
 'Dermatology is among the most competitive specialties. Research mentorship starting MS1 is nearly essential to be competitive.',
 false, 'Dermatology', 'high', 'AAD'),

('Join the American Academy of Dermatology (AAD) as a student member',
 'MS1', 'Networking',
 'AAD provides access to the annual meeting, mentorship programs (DERM MENTORS), and a student interest network.',
 false, 'Dermatology', 'high', 'AAD'),

('Begin a dermatology research project with a faculty mentor',
 'MS1', 'Research',
 'Matched derm applicants average 27.7 weighted publications. Starting research in MS1 is critical to reach that threshold.',
 false, 'Dermatology', 'high', 'NRMP 2024'),

('Submit an abstract to the AAD Annual Meeting or ASDS conference',
 'MS2', 'Research',
 'Presenting at national dermatology meetings demonstrates specialty commitment and builds your CV.',
 false, 'Dermatology', 'high', 'AAD'),

('Target USMLE Step 2 score ≥255 (matched mean: 257)',
 'MS2', 'Academics',
 'With Step 1 now pass/fail, Step 2 carries significant weight for dermatology. This is your primary numeric differentiator.',
 false, 'Dermatology', 'high', 'NRMP 2024'),

('Submit first manuscript for peer-reviewed publication',
 'MS2', 'Research',
 'First-author publications carry 2× weight in competitiveness scoring. Aim for one submission by end of MS2.',
 false, 'Dermatology', 'high', 'NRMP 2024'),

('Complete a dermatology sub-internship or elective',
 'MS3', 'Clinical',
 'Clinical performance in derm rotations and the quality of your derm LOR are heavily weighted by programs.',
 true, 'Dermatology', 'high', 'ACGME'),

('Obtain a letter of recommendation from a dermatologist',
 'MS3', 'Application',
 'A strong LOR from a dermatologist who knows you well is essential. One from your research mentor is ideal.',
 true, 'Dermatology', 'high', 'AAD'),

('Complete 2+ away rotations at dermatology programs',
 'MS4', 'Clinical',
 'Away rotations are critical for dermatology — programs use sub-Is to evaluate candidates who lack home derm programs.',
 false, 'Dermatology', 'high', 'AAD'),

('Have 3+ publications or presentations before ERAS submission',
 'MS4', 'Research',
 'Unmatched derm applicants averaged 19.0 weighted publications. 3+ strongly differentiates you from the field.',
 false, 'Dermatology', 'high', 'NRMP 2024')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- DIAGNOSTIC RADIOLOGY
-- Match rate 88% | Step 2 matched mean 256 | Research mean 4.4
-- Source: RSNA, ACR, ACGME Diagnostic Radiology Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow a radiologist across modalities: X-ray, CT, MRI, ultrasound, fluoroscopy',
 'MS1', 'Clinical',
 'Most medical students have limited radiology exposure. Intentional shadowing demonstrates specialty commitment.',
 false, 'Diagnostic Radiology', 'high', 'RSNA'),

('Join RSNA (Radiological Society of North America) as a medical student member',
 'MS2', 'Networking',
 'RSNA provides access to education resources, the annual meeting, and a robust student member community.',
 false, 'Diagnostic Radiology', 'medium', 'RSNA'),

('Begin a radiology or imaging research project',
 'MS2', 'Research',
 'Research is expected by competitive programs. Matched applicants average 12.0 weighted publications.',
 false, 'Diagnostic Radiology', 'high', 'NRMP 2024'),

('Target USMLE Step 2 score ≥250 (matched mean: 256)',
 'MS2', 'Academics',
 'Step 2 is the primary academic metric used by radiology programs post Step 1 pass/fail change.',
 false, 'Diagnostic Radiology', 'high', 'NRMP 2024'),

('Excel on internal medicine clerkship (foundational for image interpretation)',
 'MS3', 'Clinical',
 'Strong IM performance signals the clinical reasoning skills that radiology programs value in candidates.',
 true, 'Diagnostic Radiology', 'high', 'ACGME'),

('Complete a diagnostic radiology elective or sub-internship',
 'MS3', 'Clinical',
 'Direct experience reading studies and working alongside radiologists is expected before applying.',
 false, 'Diagnostic Radiology', 'high', 'ACR'),

('Complete 1–2 away rotations at radiology programs of interest',
 'MS4', 'Clinical',
 'Away rotations allow you to demonstrate skills and obtain an LOR from outside your home institution.',
 false, 'Diagnostic Radiology', 'high', 'ACR'),

('Submit at least one radiology research abstract or manuscript before ERAS',
 'MS4', 'Research',
 'Publications significantly differentiate candidates. Even an abstract or case report demonstrates scholarly activity.',
 false, 'Diagnostic Radiology', 'medium', 'NRMP 2024')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- EMERGENCY MEDICINE
-- Match rate 98% | Step 2 matched mean 248 | Research mean 2.8
-- Source: ACEP, SAEM, ACGME EM Milestones, PD survey (AEM)
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Join ACEP (American College of Emergency Physicians) as a student member',
 'MS1', 'Networking',
 'ACEP student membership provides access to the EMRA (Emergency Medicine Residents'' Association) network and annual meeting.',
 false, 'Emergency Medicine', 'medium', 'ACEP'),

('Shadow in an emergency department (academic + community settings)',
 'MS2', 'Clinical',
 'Observe the differences between academic trauma centers, community EDs, and freestanding ECs. Both LOR types help.',
 false, 'Emergency Medicine', 'high', 'ACEP'),

('Complete ACLS certification before clinical rotations',
 'MS3', 'Clinical',
 'ACLS is expected of all EM applicants. Complete early in MS3 so it does not delay clinical participation.',
 true, 'Emergency Medicine', 'high', 'AHA'),

('Excel on the emergency medicine clerkship — this is your highest-priority rotation',
 'MS3', 'Clinical',
 'EM programs weight the clinical evaluation from the core EM clerkship above almost all other application factors.',
 true, 'Emergency Medicine', 'high', 'ACGME'),

('Complete 2–3 EM away rotations (sub-internships)',
 'MS4', 'Clinical',
 'EM programs rely heavily on sub-I performance. Away rotations also give you LORs from multiple faculty.',
 false, 'Emergency Medicine', 'high', 'ACEP'),

('Obtain 3 letters of recommendation including at least 2 from EM faculty',
 'MS4', 'Application',
 'SLOE (Standardized Letter of Evaluation) is the standard EM LOR format. Each rotation generates a SLOE.',
 true, 'Emergency Medicine', 'high', 'ERAS'),

('Target USMLE Step 2 score ≥245 (matched mean: 248)',
 'MS4', 'Academics',
 'Step 2 is increasingly important for EM. Score above the matched mean to remain competitive.',
 false, 'Emergency Medicine', 'high', 'NRMP 2024'),

('Consider research in EM topics (procedures, ultrasound, tox, EMS)',
 'MS2', 'Research',
 'Research is not required for most EM programs but demonstrates intellectual engagement with the field.',
 false, 'Emergency Medicine', 'low', 'SAEM')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- FAMILY MEDICINE
-- Match rate 99% | Step 2 matched mean 244 | Research mean 2.1
-- Source: AAFP, ACGME FM Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Join AAFP (American Academy of Family Physicians) as a student member',
 'MS1', 'Networking',
 'AAFP provides access to student member programs, the National Conference of Family Medicine, and mentorship.',
 false, 'Family Medicine', 'medium', 'AAFP'),

('Shadow a family medicine physician in rural and urban settings',
 'MS2', 'Clinical',
 'FM spans preventive care, chronic disease, procedures, OB, and behavioral health. Observe both settings.',
 false, 'Family Medicine', 'medium', 'AAFP'),

('Explore rural medicine, underserved care, or population health interests',
 'MS2', 'Clinical',
 'Many FM programs value commitment to underserved communities. Consider NHSC scholarship or rural training tracks.',
 false, 'Family Medicine', 'low', 'AAFP'),

('Excel on the family medicine clerkship',
 'MS3', 'Clinical',
 'Strong FM clerkship evaluations demonstrate the longitudinal, comprehensive care skills programs are looking for.',
 true, 'Family Medicine', 'high', 'ACGME'),

('Consider research in primary care, health equity, or community health',
 'MS3', 'Research',
 'FM research is broad. Health equity, rural health, or preventive medicine research aligns well with FM values.',
 false, 'Family Medicine', 'low', 'AAFP'),

('Apply broadly — FM programs are in all regions and many have specific tracks (rural, sports med, OB)',
 'MS4', 'Application',
 'FM is one of the least competitive specialties but program fit matters. Research track offerings at programs you apply to.',
 false, 'Family Medicine', 'medium', 'NRMP')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- GENERAL SURGERY
-- Match rate 83% | Step 2 matched mean 253 | Research mean 4.2
-- Source: ACS, ACGME Surgery Milestones, J Surgical Education PD surveys
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow a general surgeon and observe at least one OR case',
 'MS1', 'Clinical',
 'Early OR exposure helps confirm interest in surgical culture. Many surgical mentors prefer early commitment.',
 false, 'General Surgery', 'high', 'ACS'),

('Join the American College of Surgeons (ACS) medical student membership',
 'MS2', 'Networking',
 'ACS provides access to the Clinical Congress, student scholarships, and a strong mentorship network.',
 false, 'General Surgery', 'medium', 'ACS'),

('Begin a surgical research project with a faculty mentor',
 'MS2', 'Research',
 'Research is expected by competitive programs. Matched applicants average 10.9 weighted publications.',
 false, 'General Surgery', 'high', 'NRMP 2024'),

('Target USMLE Step 2 score ≥248 (matched mean: 253)',
 'MS2', 'Academics',
 'Surgery programs weight Step 2 heavily. Score above 248 to be in the competitive range for most programs.',
 false, 'General Surgery', 'high', 'NRMP 2024'),

('Excel on the surgery clerkship — this is your highest-priority rotation',
 'MS3', 'Clinical',
 'Strong surgery shelf exam scores, evaluations, and honors grades are the most critical factors for surgery applications.',
 true, 'General Surgery', 'high', 'ACGME'),

('Join Surgical Interest Group and the Gold Humanism Honor Society (if eligible)',
 'MS3', 'Networking',
 'Demonstrated leadership in surgical interest group shows commitment. GHHS nomination reflects professionalism.',
 false, 'General Surgery', 'medium', 'ACS'),

('Present research at a regional or national surgical meeting',
 'MS3', 'Research',
 'Presenting at ACS, SAGES, or regional surgical meetings builds your CV and network simultaneously.',
 false, 'General Surgery', 'high', 'ACS'),

('Complete 1–2 surgery away rotations at programs of interest',
 'MS4', 'Clinical',
 'Away rotations allow programs to evaluate you and are important for obtaining an LOR from outside your institution.',
 false, 'General Surgery', 'high', 'ACS'),

('Obtain letters of recommendation from general surgeons who have supervised you',
 'MS4', 'Application',
 'Surgery programs expect LORs from surgeons. Strong letters from chiefs or vice chairs carry significant weight.',
 true, 'General Surgery', 'high', 'ERAS')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- INTERNAL MEDICINE
-- Match rate 98% | Step 2 matched mean 251 | Research mean 3.3
-- Source: ACP, ABIM, ACGME IM Milestones, JGIM PD surveys
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Join the American College of Physicians (ACP) as a medical student member',
 'MS1', 'Networking',
 'ACP provides access to the Internal Medicine Meeting, a strong mentorship network, and subspecialty resources.',
 false, 'Internal Medicine', 'medium', 'ACP'),

('Begin exploring internal medicine subspecialties (cards, GI, ID, nephro, heme-onc, pulm/CC, endo)',
 'MS2', 'Clinical',
 'Most IM residents plan for fellowship. Knowing your intended subspecialty strengthens your personal statement.',
 false, 'Internal Medicine', 'medium', 'ABIM'),

('Begin a research project in an internal medicine subspecialty',
 'MS2', 'Research',
 'Academic programs expect research. Even community-focused applicants benefit from demonstrating scholarly activity.',
 false, 'Internal Medicine', 'medium', 'NRMP 2024'),

('Excel on the internal medicine clerkship — your most important rotation',
 'MS3', 'Clinical',
 'IM programs weight clerkship evaluations and shelf exam scores heavily. Honors here is a strong signal.',
 true, 'Internal Medicine', 'high', 'ACGME'),

('Consider presenting or submitting research during MS3 if project is mature',
 'MS3', 'Research',
 'IM publications or presentations during clerkship year demonstrate academic engagement and time management.',
 false, 'Internal Medicine', 'medium', 'ACP'),

('Complete an internal medicine acting internship (AI/Sub-I)',
 'MS4', 'Clinical',
 'The IM sub-I is strongly recommended. It demonstrates readiness for internship and generates a strong LOR.',
 false, 'Internal Medicine', 'high', 'ACGME'),

('Target USMLE Step 2 score ≥245 (matched mean: 251)',
 'MS4', 'Academics',
 'Step 2 performance differentiates IM candidates. Score at or above the matched mean for competitive programs.',
 false, 'Internal Medicine', 'high', 'NRMP 2024'),

('Apply broadly across IM program types (academic, community, primary care tracks)',
 'MS4', 'Application',
 'IM has among the most spots of any specialty. Identify program types that match your career goals.',
 false, 'Internal Medicine', 'medium', 'NRMP')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- INTERNAL MEDICINE/PEDIATRICS (Combined)
-- Match rate 86% | Step 2 matched mean 253
-- Source: COAPT, ACP, AAP
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Join both ACP and AAP student memberships',
 'MS1', 'Networking',
 'Med-peds draws from both internal medicine and pediatrics communities. Dual membership signals genuine dual commitment.',
 false, 'Internal Medicine/Pediatrics', 'medium', 'COAPT'),

('Shadow physicians in established med-peds practices',
 'MS2', 'Clinical',
 'Observe how med-peds physicians balance adult and pediatric patient populations in both inpatient and outpatient settings.',
 false, 'Internal Medicine/Pediatrics', 'high', 'COAPT'),

('Excel on BOTH internal medicine and pediatrics clerkships',
 'MS3', 'Clinical',
 'Programs expect strong performance in both core clerkships. Weakness in either raises a red flag.',
 true, 'Internal Medicine/Pediatrics', 'high', 'ACGME'),

('Complete an acting internship in internal medicine',
 'MS4', 'Clinical',
 'IM sub-I demonstrates readiness for the adult medicine portion of training.',
 false, 'Internal Medicine/Pediatrics', 'high', 'COAPT'),

('Complete an acting internship or advanced rotation in pediatrics',
 'MS4', 'Clinical',
 'Peds sub-I demonstrates readiness for the pediatric medicine portion of training.',
 false, 'Internal Medicine/Pediatrics', 'high', 'COAPT'),

('Apply exclusively through NRMP to categorical med-peds programs',
 'MS4', 'Application',
 'Med-peds is a separate match category. You rank combined programs — you graduate as board-eligible in both IM and Pediatrics.',
 true, 'Internal Medicine/Pediatrics', 'high', 'NRMP')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- INTERVENTIONAL RADIOLOGY
-- Match rate 83% | Step 2 matched mean 253 | Research mean 4.7
-- Source: SIR, ACGME IR Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow both interventional and diagnostic radiologists to understand the distinction',
 'MS1', 'Clinical',
 'IR is procedurally-focused (biopsies, drains, TIPS, PAD treatment) vs. DR''s interpretive focus. Confirm which you prefer.',
 false, 'Interventional Radiology', 'high', 'SIR'),

('Join SIR (Society of Interventional Radiology) as a student member',
 'MS2', 'Networking',
 'SIR provides access to the annual scientific meeting, mentorship programs, and an active student community.',
 false, 'Interventional Radiology', 'medium', 'SIR'),

('Begin research in IR, vascular surgery, or procedural medicine',
 'MS2', 'Research',
 'IR is highly research-focused. Matched applicants average 15.8 weighted publications. Start early.',
 false, 'Interventional Radiology', 'high', 'NRMP 2024'),

('Excel on surgery and internal medicine clerkships',
 'MS3', 'Clinical',
 'IR requires both procedural skill (surgery) and systemic disease knowledge (medicine). Strong performance in both matters.',
 true, 'Interventional Radiology', 'high', 'ACGME'),

('Target USMLE Step 2 score ≥250 (matched mean: 253)',
 'MS4', 'Academics',
 'IR is moderately competitive. Step 2 above the matched mean strengthens your application significantly.',
 false, 'Interventional Radiology', 'high', 'NRMP 2024'),

('Complete a radiology or IR rotation and seek a letter from an interventional radiologist',
 'MS4', 'Clinical',
 'Direct clinical experience in IR and an LOR from an IR faculty member are expected by programs.',
 false, 'Interventional Radiology', 'high', 'SIR'),

('Understand the two application tracks: Integrated IR (6 yr) vs. Independent IR (DR + fellowship)',
 'MS3', 'Application',
 'Integrated programs offer a direct 6-year pathway. Independent track applies to DR first, then IR fellowship after PGY-5.',
 true, 'Interventional Radiology', 'high', 'NRMP')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- NEUROLOGICAL SURGERY
-- Match rate 69% (most competitive) | Step 2 matched mean 255 | Pubs matched mean 37.4
-- Source: CNS, AANS, ACGME NS Milestones, J Neurosurgery PD surveys
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Find a neurosurgery research mentor in MS1 — earlier is critical',
 'MS1', 'Research',
 'Matched neurosurgery applicants average 37.4 weighted publications. Starting research in MS1 is nearly a prerequisite.',
 false, 'Neurological Surgery', 'high', 'NRMP 2024'),

('Join the Congress of Neurological Surgeons (CNS) and/or AANS student chapter',
 'MS1', 'Networking',
 'CNS and AANS are the two main neurosurgery societies. Student membership provides meeting access and networking.',
 false, 'Neurological Surgery', 'high', 'CNS'),

('Complete a first-author publication by end of MS2',
 'MS2', 'Research',
 'Neurosurgery unmatched applicants averaged 31.8 pubs. First-author papers are the highest-value research output.',
 false, 'Neurological Surgery', 'high', 'NRMP 2024'),

('Attend and present research at the CNS Annual Meeting',
 'MS2', 'Research',
 'Presenting at CNS or AANS builds your national reputation and connects you with program directors.',
 false, 'Neurological Surgery', 'high', 'CNS'),

('Excel on the surgery clerkship and demonstrate procedural aptitude',
 'MS3', 'Clinical',
 'Strong surgery performance is the primary clinical signal for neurosurgery applicants. Aim for honors.',
 true, 'Neurological Surgery', 'high', 'ACGME'),

('Target USMLE Step 2 score ≥255 (matched mean: 255)',
 'MS3', 'Academics',
 'Neurosurgery programs expect high academic performance. Step 2 at or above 255 is the competitive threshold.',
 false, 'Neurological Surgery', 'high', 'NRMP 2024'),

('Begin a second research project; target 3+ publications before ERAS',
 'MS3', 'Research',
 'Multiple concurrent projects are expected. 3+ weighted publications by application is a competitive minimum.',
 false, 'Neurological Surgery', 'high', 'NRMP 2024'),

('Complete 2 neurosurgery away rotations at programs of interest',
 'MS4', 'Clinical',
 'Away rotations are essential in neurosurgery — programs use them to identify candidates they trust with technical skills.',
 false, 'Neurological Surgery', 'high', 'CNS'),

('Develop relationships with neurosurgery chairs or vice chairs at target programs',
 'MS4', 'Networking',
 'Neurosurgery is relationship-driven. Letters from well-known neurosurgeons at major programs carry significant weight.',
 false, 'Neurological Surgery', 'high', 'CNS')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- NEUROLOGY
-- Match rate 94% | Step 2 matched mean 250 | Research mean 3.5
-- Source: AAN, ACGME Neurology Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow a neurologist across subspecialties (epilepsy, stroke, MS, neuromuscular, movement disorders)',
 'MS1', 'Clinical',
 'Neurology has rich subspecialty options. Broad early exposure helps identify which you are drawn toward.',
 false, 'Neurology', 'high', 'AAN'),

('Join the American Academy of Neurology (AAN) as a medical student member',
 'MS2', 'Networking',
 'AAN provides access to the annual meeting, student interest group network, and the Neurology journal.',
 false, 'Neurology', 'medium', 'AAN'),

('Begin a neurology or neuroscience research project',
 'MS2', 'Research',
 'Research is expected for competitive programs. Matched applicants average 8.8 weighted publications.',
 false, 'Neurology', 'high', 'NRMP 2024'),

('Excel on the neurology clerkship and seek a strong evaluating letter',
 'MS3', 'Clinical',
 'Neurology clerkship performance is the primary clinical indicator programs assess. Aim for honors.',
 true, 'Neurology', 'high', 'ACGME'),

('Target USMLE Step 2 score ≥245 (matched mean: 250)',
 'MS4', 'Academics',
 'Step 2 matters in neurology. Scoring above 245 puts you solidly in the competitive range.',
 false, 'Neurology', 'high', 'NRMP 2024'),

('Complete a neurology acting internship or away rotation at a program of interest',
 'MS4', 'Clinical',
 'A neurology sub-I demonstrates readiness for internship and generates a strong LOR from a neurologist.',
 false, 'Neurology', 'high', 'ACGME')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- OBSTETRICS AND GYNECOLOGY
-- Match rate 86% | Step 2 matched mean 252 | Research mean 3.8
-- Source: ACOG, ACGME OB/GYN Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow an OB/GYN in both obstetrics and gynecologic surgery',
 'MS1', 'Clinical',
 'OB/GYN spans labor & delivery, surgical procedures, oncology, and reproductive endocrinology. Observe the breadth.',
 false, 'Obstetrics and Gynecology', 'high', 'ACOG'),

('Join ACOG (American College of Obstetricians and Gynecologists) as a junior fellow',
 'MS2', 'Networking',
 'ACOG junior fellowship provides access to district meetings, the annual meeting, and a strong student network.',
 false, 'Obstetrics and Gynecology', 'medium', 'ACOG'),

('Begin a women''s health research project',
 'MS2', 'Research',
 'Research in OB, GYN oncology, reproductive health, or maternal-fetal medicine strengthens your application.',
 false, 'Obstetrics and Gynecology', 'medium', 'NRMP 2024'),

('Excel on the OB/GYN clerkship — the most important rotation for applicants',
 'MS3', 'Clinical',
 'OB/GYN programs weight the core clerkship evaluation above nearly all other factors. Aim for honors.',
 true, 'Obstetrics and Gynecology', 'high', 'ACGME'),

('Complete an OB/GYN sub-internship (AI)',
 'MS4', 'Clinical',
 'The OB/GYN sub-I is strongly recommended. It demonstrates surgical readiness and generates a high-quality LOR.',
 false, 'Obstetrics and Gynecology', 'high', 'ACOG'),

('Complete 1–2 OB/GYN away rotations',
 'MS4', 'Clinical',
 'Away rotations allow programs to evaluate your procedural skills and clinical judgment directly.',
 false, 'Obstetrics and Gynecology', 'high', 'ACOG'),

('Target USMLE Step 2 score ≥248 (matched mean: 252)',
 'MS4', 'Academics',
 'Step 2 is a key academic metric. Scoring at or above 248 places you in the competitive range.',
 false, 'Obstetrics and Gynecology', 'high', 'NRMP 2024')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- ORTHOPAEDIC SURGERY
-- Match rate 74% (very competitive) | Step 2 matched mean 257 | Pubs matched mean 23.8
-- Source: AAOS, OREF, ACGME Ortho Milestones, J Bone Joint Surg PD surveys
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow an orthopaedic surgeon and observe at least one OR case',
 'MS1', 'Clinical',
 'Orthopaedics is a highly procedural, technically demanding specialty. Early OR exposure confirms the fit.',
 false, 'Orthopaedic Surgery', 'high', 'AAOS'),

('Find an orthopaedic surgery research mentor in MS1',
 'MS1', 'Research',
 'Matched ortho applicants average 23.8 weighted publications. Research mentorship starting in MS1 is nearly essential.',
 false, 'Orthopaedic Surgery', 'high', 'NRMP 2024'),

('Join AAOS (American Academy of Orthopaedic Surgeons) or OREF student membership',
 'MS1', 'Networking',
 'AAOS annual meeting and OREF research grants are primary resources for orthopaedic students.',
 false, 'Orthopaedic Surgery', 'medium', 'AAOS'),

('Begin first orthopaedic research project; target publication by MS3',
 'MS2', 'Research',
 'Publications are critical differentiators. First-author papers (2× weight) are most valuable. Submit early.',
 false, 'Orthopaedic Surgery', 'high', 'NRMP 2024'),

('Target USMLE Step 2 score ≥252 (matched mean: 257)',
 'MS2', 'Academics',
 'Orthopaedic surgery programs weight Step 2 heavily. Scores below 240 are a significant red flag.',
 false, 'Orthopaedic Surgery', 'high', 'NRMP 2024'),

('Excel on the surgery clerkship and demonstrate strong procedural aptitude',
 'MS3', 'Clinical',
 'Surgery clerkship honors is a strong signal. Demonstrate dexterity, spatial reasoning, and surgical enthusiasm.',
 true, 'Orthopaedic Surgery', 'high', 'ACGME'),

('Present research at a regional or national orthopaedic meeting',
 'MS3', 'Research',
 'Presenting at AAOS, ORS, or regional ortho meetings builds your CV and introduces you to program directors.',
 false, 'Orthopaedic Surgery', 'high', 'AAOS'),

('Complete 2–3 away rotations at orthopaedic programs (this is critical for ortho)',
 'MS4', 'Clinical',
 'Away rotations are the single most important factor after academics for ortho. Programs select candidates they have evaluated directly.',
 false, 'Orthopaedic Surgery', 'high', 'AAOS'),

('Obtain letters of recommendation from orthopaedic surgeons',
 'MS4', 'Application',
 'LORs from orthopaedic surgeons (especially department chairs or fellowship-trained attendings) are required.',
 true, 'Orthopaedic Surgery', 'high', 'ERAS')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- OTOLARYNGOLOGY (ENT)
-- Match rate 83% | Step 2 matched mean 256 | Pubs matched mean 20.0
-- Source: AAO-HNS, ACGME Oto Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow an otolaryngologist in both clinic and OR settings',
 'MS1', 'Clinical',
 'ENT covers head & neck oncology, rhinology, otology, laryngology, and pediatric ENT. Broad early exposure helps confirm fit.',
 false, 'Otolaryngology', 'high', 'AAO-HNS'),

('Join AAO-HNS (American Academy of Otolaryngology) student chapter',
 'MS2', 'Networking',
 'AAO-HNS Annual Meeting is the primary venue for networking with program directors and presenting research.',
 false, 'Otolaryngology', 'medium', 'AAO-HNS'),

('Begin ENT research with a faculty mentor',
 'MS2', 'Research',
 'Matched ENT applicants average 20.0 weighted publications. Research from MS2 forward is expected at competitive programs.',
 false, 'Otolaryngology', 'high', 'NRMP 2024'),

('Target USMLE Step 2 score ≥252 (matched mean: 256)',
 'MS2', 'Academics',
 'ENT is quite competitive. Step 2 at or above 252 places you in the competitive range.',
 false, 'Otolaryngology', 'high', 'NRMP 2024'),

('Excel on the surgery clerkship',
 'MS3', 'Clinical',
 'Surgery clerkship performance is a primary indicator of surgical aptitude for ENT programs.',
 true, 'Otolaryngology', 'high', 'ACGME'),

('Submit research manuscript or abstract before ERAS submission',
 'MS3', 'Research',
 'Programs prefer candidates with demonstrated publication or presentation records.',
 false, 'Otolaryngology', 'high', 'AAO-HNS'),

('Complete 1–2 ENT away rotations at programs of interest',
 'MS4', 'Clinical',
 'ENT programs strongly prefer candidates they have evaluated on rotation. Away rotations are critical for match.',
 false, 'Otolaryngology', 'high', 'AAO-HNS'),

('Obtain letters of recommendation from ENT faculty',
 'MS4', 'Application',
 'LORs from otolaryngologists who have directly supervised you in clinic and OR carry the most weight.',
 true, 'Otolaryngology', 'high', 'ERAS')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- PATHOLOGY
-- Match rate 95% | Step 2 matched mean 247 | Research mean 3.1
-- Source: CAP, ASCP, ACGME Pathology Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow a pathologist across subspecialties: surgical, cytology, autopsy, hematopathology',
 'MS1', 'Clinical',
 'Pathology is invisible to most medical students. Intentional shadowing demonstrates genuine specialty commitment.',
 false, 'Pathology', 'high', 'CAP'),

('Join CAP (College of American Pathologists) or ASCP student membership',
 'MS2', 'Networking',
 'Both organizations offer student member resources, the annual meeting, and a strong academic pathology community.',
 false, 'Pathology', 'medium', 'CAP'),

('Identify a subspecialty interest within pathology',
 'MS2', 'Clinical',
 'Pathology encompasses surgical, molecular, forensic, derm, neuro, and hematopathology. Knowing your direction strengthens your PS.',
 false, 'Pathology', 'medium', 'ACGME'),

('Complete a pathology rotation or elective',
 'MS3', 'Clinical',
 'Demonstrates clinical exposure and generates a letter from a pathologist who can speak to your diagnostic skills.',
 false, 'Pathology', 'high', 'ACGME'),

('Consider completing a research project or case report in pathology',
 'MS3', 'Research',
 'Research or case publications demonstrate academic engagement. Pathology programs appreciate scholarly curiosity.',
 false, 'Pathology', 'medium', 'CAP'),

('Complete an away rotation at a pathology program of interest',
 'MS4', 'Clinical',
 'An away rotation lets you build connections and get an LOR from outside your home institution.',
 false, 'Pathology', 'medium', 'CAP'),

('Pathology has a 95% match rate — focus energy on program fit and passion for diagnostics',
 'MS4', 'Application',
 'Pathology is one of the most accessible specialties. Program directors prioritize intellectual curiosity and diagnostic reasoning.',
 false, 'Pathology', 'low', 'NRMP 2024')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- PEDIATRICS
-- Match rate 99% | Step 2 matched mean 247 | Research mean 2.6
-- Source: AAP, ACGME Pediatrics Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Join the American Academy of Pediatrics (AAP) as a medical student member',
 'MS1', 'Networking',
 'AAP provides access to the National Conference & Exhibition (NCE), student scholarships, and subspecialty sections.',
 false, 'Pediatrics', 'medium', 'AAP'),

('Shadow a pediatrician in both inpatient (hospitalist) and outpatient settings',
 'MS1', 'Clinical',
 'Pediatrics spans primary care, acute care, and 14+ subspecialties. Broad exposure confirms specialty fit.',
 false, 'Pediatrics', 'medium', 'AAP'),

('Explore pediatric subspecialty interests (cardiology, heme-onc, critical care, GI, ID)',
 'MS2', 'Clinical',
 'Most pediatric residents pursue fellowship. Knowing your subspecialty interest strengthens your personal statement.',
 false, 'Pediatrics', 'low', 'ABIM'),

('Excel on the pediatrics clerkship — the most important rotation for applicants',
 'MS3', 'Clinical',
 'Pediatrics programs primarily weight clerkship evaluations. Strong shelf scores and positive evaluations are key.',
 true, 'Pediatrics', 'high', 'ACGME'),

('Complete a pediatrics sub-internship (AI)',
 'MS4', 'Clinical',
 'The pediatrics sub-I demonstrates readiness for internship and generates a strong, detailed LOR.',
 false, 'Pediatrics', 'high', 'ACGME'),

('Pediatrics has a 99% match rate — focus on genuine passion and program cultural fit',
 'MS4', 'Application',
 'Pediatrics is among the most accessible specialties. Programs select for candidates who demonstrate clear dedication to children''s health.',
 false, 'Pediatrics', 'low', 'NRMP 2024')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- PHYSICAL MEDICINE AND REHABILITATION (PM&R)
-- Match rate 85% | Step 2 matched mean 248 | Research mean 3.4
-- Source: AAPM&R, ACGME PM&R Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow a physiatrist to understand the breadth of PM&R (MSK, SCI, TBI, stroke, pediatric rehab)',
 'MS1', 'Clinical',
 'PM&R is one of the least understood specialties. Broad early exposure is essential to articulate your interest.',
 false, 'Physical Medicine and Rehabilitation', 'high', 'AAPM&R'),

('Join AAPM&R (American Academy of Physical Medicine and Rehabilitation) as a student member',
 'MS2', 'Networking',
 'AAPM&R provides access to the Annual Assembly, student mentorship programs, and subspecialty resources.',
 false, 'Physical Medicine and Rehabilitation', 'medium', 'AAPM&R'),

('Explore PM&R subspecialties: sports medicine, pain management, neuromuscular, pediatric rehab',
 'MS2', 'Clinical',
 'PM&R offers diverse fellowship tracks. Identifying your subspecialty direction strengthens your personal statement.',
 false, 'Physical Medicine and Rehabilitation', 'medium', 'ACGME'),

('Complete a PM&R elective or clerkship',
 'MS3', 'Clinical',
 'Most schools do not have mandatory PM&R rotations. Arranging an elective demonstrates intentional commitment.',
 false, 'Physical Medicine and Rehabilitation', 'high', 'AAPM&R'),

('Consider research in rehabilitation medicine, disability, or quality-of-life outcomes',
 'MS3', 'Research',
 'Research in PM&R or related fields demonstrates academic engagement with the specialty.',
 false, 'Physical Medicine and Rehabilitation', 'medium', 'AAPM&R'),

('Complete 1–2 PM&R away rotations at programs of interest',
 'MS4', 'Clinical',
 'Away rotations help you evaluate program culture and demonstrate your commitment to physiatry.',
 false, 'Physical Medicine and Rehabilitation', 'high', 'AAPM&R'),

('Target USMLE Step 2 score ≥244 (matched mean: 248)',
 'MS4', 'Academics',
 'PM&R is moderately competitive. Step 2 above 244 places you comfortably in the competitive range.',
 false, 'Physical Medicine and Rehabilitation', 'high', 'NRMP 2024')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- PLASTIC SURGERY
-- Match rate 77% (very competitive) | Step 2 matched mean 256 | Pubs matched mean 34.7
-- Source: ASPS, ACGME Plastics Milestones, PSJ PD surveys
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow a plastic surgeon covering both reconstructive and aesthetic procedures',
 'MS1', 'Clinical',
 'Plastic surgery spans microsurgery, burn care, craniofacial, hand surgery, and aesthetics. Confirm the breadth interests you.',
 false, 'Plastic Surgery', 'high', 'ASPS'),

('Find a plastic surgery research mentor in MS1 — research expectations are among the highest',
 'MS1', 'Research',
 'Matched plastics applicants average 34.7 weighted publications. Starting research in MS1 is critical.',
 false, 'Plastic Surgery', 'high', 'NRMP 2024'),

('Join ASPS (American Society of Plastic Surgeons) student membership',
 'MS2', 'Networking',
 'ASPS and PSTM (Plastic Surgery: The Meeting) are the primary conference and networking venues for students.',
 false, 'Plastic Surgery', 'medium', 'ASPS'),

('Submit first manuscript for publication; target 2+ publications by MS4',
 'MS2', 'Research',
 'First-author papers (2× scoring weight) are most impactful. Submit a manuscript by end of MS2 if possible.',
 false, 'Plastic Surgery', 'high', 'NRMP 2024'),

('Attend PSTM (Plastic Surgery: The Meeting) and present research',
 'MS3', 'Research',
 'Presenting at PSTM builds your national profile and connects you with program directors who will review your application.',
 false, 'Plastic Surgery', 'high', 'ASPS'),

('Excel on the surgery clerkship; demonstrate surgical dexterity and enthusiasm',
 'MS3', 'Clinical',
 'Plastic surgery requires exceptional surgical aptitude. Strong surgery evaluations are a core signal.',
 true, 'Plastic Surgery', 'high', 'ACGME'),

('Target USMLE Step 2 score ≥252 (matched mean: 256)',
 'MS4', 'Academics',
 'Plastic surgery is very competitive. Step 2 below 245 is a notable disadvantage.',
 false, 'Plastic Surgery', 'high', 'NRMP 2024'),

('Complete 2 plastic surgery away rotations at programs of interest',
 'MS4', 'Clinical',
 'Away rotations are critical for plastics — programs use sub-Is to identify candidates they want to rank highly.',
 false, 'Plastic Surgery', 'high', 'ASPS'),

('Have 2+ first-author or co-author publications before ERAS submission',
 'MS4', 'Research',
 'Unmatched plastics applicants averaged 26.3 weighted pubs. 2+ publications is the competitive minimum.',
 false, 'Plastic Surgery', 'high', 'NRMP 2024')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- PSYCHIATRY
-- Match rate 90% | Step 2 matched mean 246 | Research mean 3.0
-- Source: APA, ACGME Psychiatry Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Join the APA (American Psychiatric Association) as a medical student member',
 'MS1', 'Networking',
 'APA provides access to the annual meeting, the AADPRT mentorship network, and a strong student community.',
 false, 'Psychiatry', 'medium', 'APA'),

('Shadow psychiatrists across settings: inpatient, outpatient, consult-liaison, forensic, addiction',
 'MS2', 'Clinical',
 'Psychiatry''s subspecialties are diverse. Demonstrating awareness of its breadth strengthens your personal statement.',
 false, 'Psychiatry', 'medium', 'ACGME'),

('Excel on the psychiatry clerkship — the most important rotation for applicants',
 'MS3', 'Clinical',
 'Psychiatry programs weight the core clerkship evaluation above most other application factors. Aim for honors.',
 true, 'Psychiatry', 'high', 'ACGME'),

('Explore subspecialty interests: child/adolescent, forensic, addiction medicine, geriatric psychiatry',
 'MS3', 'Clinical',
 'Knowing which fellowship you plan to pursue strengthens your personal statement and interview conversations.',
 false, 'Psychiatry', 'medium', 'APA'),

('Consider research in psychiatric neuroscience, health services, or social psychiatry',
 'MS3', 'Research',
 'Research is not required by most psychiatry programs, but demonstrates intellectual engagement with the field.',
 false, 'Psychiatry', 'low', 'AADPRT'),

('Complete a psychiatry sub-internship or away rotation at a program of interest',
 'MS4', 'Clinical',
 'Sub-Is demonstrate clinical readiness and generate a strong LOR from a psychiatrist who supervised you closely.',
 false, 'Psychiatry', 'high', 'ACGME'),

('Target USMLE Step 2 score ≥240 (matched mean: 246)',
 'MS4', 'Academics',
 'Psychiatry is moderately competitive. Step 2 above 240 places you comfortably in the competitive range.',
 false, 'Psychiatry', 'medium', 'NRMP 2024')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- RADIATION ONCOLOGY
-- Match rate 97% | Step 2 matched mean 252 | Research mean 4.2
-- Source: ASTRO, ACGME RadOnc Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow a radiation oncologist to observe simulation, planning, and treatment delivery',
 'MS1', 'Clinical',
 'Radiation oncology is invisible to most students. Observing the physics-clinical interface is important for specialty confirmation.',
 false, 'Radiation Oncology', 'high', 'ASTRO'),

('Join ASTRO (American Society for Radiation Oncology) as a student member',
 'MS2', 'Networking',
 'ASTRO''s annual meeting is the primary venue for radiation oncology students. Membership provides free registration.',
 false, 'Radiation Oncology', 'medium', 'ASTRO'),

('Begin research in radiation oncology, oncology, or radiation biology',
 'MS2', 'Research',
 'Rad onc is highly research-focused. Matched applicants average 15.9 weighted publications. Start early.',
 false, 'Radiation Oncology', 'high', 'NRMP 2024'),

('Excel on internal medicine and oncology rotations',
 'MS3', 'Clinical',
 'Strong medicine performance signals the clinical reasoning skills rad onc programs expect.',
 true, 'Radiation Oncology', 'high', 'ACGME'),

('Attend and present at ASTRO Annual Meeting',
 'MS3', 'Research',
 'ASTRO meeting presentations build your national profile and introduce you to program directors.',
 false, 'Radiation Oncology', 'high', 'ASTRO'),

('Target USMLE Step 2 score ≥248 (matched mean: 252)',
 'MS4', 'Academics',
 'Radiation oncology is moderately competitive. Step 2 at or above 248 is the competitive threshold.',
 false, 'Radiation Oncology', 'high', 'NRMP 2024'),

('Complete 1–2 radiation oncology away rotations (critical for match)',
 'MS4', 'Clinical',
 'Away rotations are heavily weighted in rad onc. Most successful applicants rotate at 2 programs of interest.',
 false, 'Radiation Oncology', 'high', 'ASTRO'),

('Have research publications or presentations before ERAS submission',
 'MS4', 'Research',
 'Publications significantly differentiate rad onc candidates. Even a poster or review article demonstrates productivity.',
 false, 'Radiation Oncology', 'high', 'NRMP 2024')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;


-- ============================================================
-- VASCULAR SURGERY
-- Match rate 91% | Step 2 matched mean 253 | Research mean 4.6
-- Source: SVS, ACGME Vascular Surgery Milestones
-- ============================================================
INSERT INTO milestones (title, due_year, category, description, is_required, specialty, priority, source)
VALUES
('Shadow a vascular surgeon observing both open and endovascular procedures',
 'MS1', 'Clinical',
 'Vascular surgery is evolving rapidly toward endovascular techniques. Understanding both paradigms confirms specialty interest.',
 false, 'Vascular Surgery', 'high', 'SVS'),

('Join SVS (Society for Vascular Surgery) as a medical student member',
 'MS2', 'Networking',
 'SVS provides access to the annual Vascular Annual Meeting, student scholarships, and a mentorship community.',
 false, 'Vascular Surgery', 'medium', 'SVS'),

('Begin vascular surgery, vascular biology, or interventional research',
 'MS2', 'Research',
 'Matched vascular applicants average 12.8 weighted publications. Research strengthens a competitive application.',
 false, 'Vascular Surgery', 'high', 'NRMP 2024'),

('Excel on the surgery clerkship',
 'MS3', 'Clinical',
 'Strong surgery performance is the primary clinical signal for vascular applicants. Aim for honors.',
 true, 'Vascular Surgery', 'high', 'ACGME'),

('Understand the two vascular surgery training pathways',
 'MS3', 'Application',
 'Integrated (0+5): direct entry after medical school. Independent (5+2): general surgery residency + vascular fellowship. Decide which path to pursue.',
 true, 'Vascular Surgery', 'high', 'ACGME'),

('Complete a vascular surgery elective or away rotation',
 'MS4', 'Clinical',
 'Direct experience with vascular patients and endovascular procedures is expected. Away rotations provide LOR opportunities.',
 false, 'Vascular Surgery', 'high', 'SVS'),

('Target USMLE Step 2 score ≥248 (matched mean: 253)',
 'MS4', 'Academics',
 'Vascular surgery has a 91% match rate but strong Step 2 performance differentiates candidates at top programs.',
 false, 'Vascular Surgery', 'high', 'NRMP 2024')

ON CONFLICT (title, COALESCE(specialty, '')) DO NOTHING;
