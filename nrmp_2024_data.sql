-- NRMP 2024 Charting Outcomes in the Match data
-- MD Seniors + DO Seniors, 2024 Main Residency Match

create table if not exists nrmp_specialty_data (
  id uuid primary key default gen_random_uuid(),
  specialty text not null,
  applicant_type text not null,
  n_matched integer,
  n_unmatched integer,
  match_rate integer,
  step1_mean_matched numeric(5,1),
  step1_mean_unmatched numeric(5,1),
  step2_mean_matched numeric(5,1),
  step2_mean_unmatched numeric(5,1),
  research_mean_matched numeric(5,1),
  research_mean_unmatched numeric(5,1),
  pubs_mean_matched numeric(6,1),
  pubs_mean_unmatched numeric(6,1),
  volunteer_mean_matched numeric(5,1),
  volunteer_mean_unmatched numeric(5,1),
  data_year integer default 2024,
  created_at timestamptz default now(),
  unique(specialty, applicant_type)
);

alter table nrmp_specialty_data enable row level security;

drop policy if exists "Anyone can read NRMP data" on nrmp_specialty_data;
create policy "Anyone can read NRMP data" on nrmp_specialty_data for select using (true);

insert into nrmp_specialty_data (specialty, applicant_type, n_matched, n_unmatched, match_rate, step1_mean_matched, step1_mean_unmatched, step2_mean_matched, step2_mean_unmatched, research_mean_matched, research_mean_unmatched, pubs_mean_matched, pubs_mean_unmatched, volunteer_mean_matched, volunteer_mean_unmatched)
values
  ('Anesthesiology', 'MD', 1136, 191, 86, 234, 216, 252, 240, 3.8, 3.1, 9, 5.4, 4.3, 4.1),
  ('Child Neurology', 'MD', 115, 2, 98, 230, 248, 248, 230, 3, 2, 9.8, 1, 4.5, 3.5),
  ('Dermatology', 'MD', 314, 126, 71, 245, 235, 257, 250, 6.4, 4.9, 27.7, 19, 5.3, 5.6),
  ('Diagnostic Radiology', 'MD', 625, 86, 88, 241, 224, 256, 241, 4.4, 3.6, 12, 8, 3.9, 3.6),
  ('Emergency Medicine', 'MD', 1027, 20, 98, 224, 220, 248, 234, 2.8, 2.3, 5.7, 5, 4.4, 4.8),
  ('Family Medicine', 'MD', 1170, 12, 99, 217, 208, 244, 231, 2.1, 1.8, 4.2, 1.4, 4.6, 7.4),
  ('General Surgery', 'MD', 858, 181, 83, 235, 215, 253, 238, 4.2, 3.7, 10.9, 7.3, 4.5, 4.2),
  ('Internal Medicine', 'MD', 3024, 64, 98, 234, 220, 251, 234, 3.3, 3.3, 8.7, 6.2, 4.2, 4.1),
  ('Internal Medicine/Pediatrics', 'MD', 294, 46, 86, 233, 216, 253, 243, 3.1, 2.6, 6.9, 6.2, 5.1, 4.8),
  ('Interventional Radiology', 'MD', 117, 24, 83, 247, 237, 253, 245, 4.7, 4.6, 15.8, 10.1, 3.9, 15.6),
  ('Neurological Surgery', 'MD', 161, 71, 69, 245, 230, 255, 247, 5.8, 5.5, 37.4, 31.8, 4.2, 4.2),
  ('Neurology', 'MD', 488, 30, 94, 231, 228, 250, 236, 3.5, 2.8, 8.8, 5.5, 4.2, 3.9),
  ('Obstetrics and Gynecology', 'MD', 925, 149, 86, 227, 220, 252, 244, 3.8, 3.3, 9, 6.8, 5, 5),
  ('Orthopaedic Surgery', 'MD', 587, 203, 74, 244, 234, 257, 246, 8.1, 8, 23.8, 18, 4.8, 4.8),
  ('Otolaryngology', 'MD', 268, 54, 83, 243, 242, 256, 251, 7.1, 5.5, 20, 15.6, 4.3, 6.7),
  ('Pathology', 'MD', 213, 11, 95, 235, 232, 247, 232, 3.1, 2.3, 8.4, 4.1, 3.3, 4.7),
  ('Pediatrics', 'MD', 1216, 2, 100, 224, 214, 247, 233, 2.6, 0.5, 6.4, 21.5, 4.9, 6),
  ('Physical Medicine and Rehabilitation', 'MD', 231, 42, 85, 226, 212, 248, 236, 3.4, 3.3, 8.6, 6.4, 4.8, 4.9),
  ('Plastic Surgery', 'MD', 159, 48, 77, 247, 226, 256, 247, 8.6, 9.2, 34.7, 26.3, 5, 4.9),
  ('Psychiatry', 'MD', 1051, 123, 90, 226, 216, 246, 235, 3, 3.1, 7.5, 4.6, 4.5, 4),
  ('Radiation Oncology', 'MD', 103, 3, 97, 238, 252, 252, 242, 4.2, 2, 15.9, 13.5, 3.9, 2),
  ('Vascular Surgery', 'MD', 64, 6, 91, 239, 253, 253, 246, 4.6, 4.5, 12.8, 8, 4.7, 4),
  ('Anesthesiology', 'DO', 252, 172, 59, 223, 221, 251, 239, 3.2, 2.5, 4.9, 4.2, NULL, NULL),
  ('Child Neurology', 'DO', 17, 4, 81, 425, 535, 244, 246, 2.1, 2.3, 4, 3.5, NULL, NULL),
  ('Dermatology', 'DO', 34, 37, 48, 222, 243, 250, 246, 4.5, 5.4, 15.4, 11.8, NULL, NULL),
  ('Diagnostic Radiology', 'DO', 128, 59, 68, 247, 212, 252, 237, 3.5, 3.1, 7.1, 5.4, NULL, NULL),
  ('Emergency Medicine', 'DO', 779, 31, 96, 231, 251, 242, 243, 1.8, 2.2, 2.9, 3, NULL, NULL),
  ('Family Medicine', 'DO', 1034, 20, 98, 213, 240, 240, 243, 1.6, 1.7, 2.8, 2.3, NULL, NULL),
  ('General Surgery', 'DO', 216, 86, 72, 241, 248, 248, 237, 3.5, 2.8, 6.9, 5.1, NULL, NULL),
  ('Internal Medicine', 'DO', 1326, 67, 95, 221, 220, 242, 220, 2.7, 3.1, 4.1, 3.8, NULL, NULL),
  ('Internal Medicine/Pediatrics', 'DO', 24, 12, 67, 206, 241, 241, 223, 2.4, 2.3, 5.6, 5.4, NULL, NULL),
  ('Interventional Radiology', 'DO', 13, 14, 48, 253, 243, 253, 243, 4, 4.3, 6.3, 10.4, NULL, NULL),
  ('Neurological Surgery', 'DO', 2, 9, 18, 218, 250, 256, 241, 4, 10.9, 23, 11, NULL, NULL),
  ('Neurology', 'DO', 140, 21, 87, 210, 245, 245, 236, 2.5, 2.4, 4.8, 2.6, NULL, NULL),
  ('Obstetrics and Gynecology', 'DO', 246, 116, 68, 220, 219, 245, 234, 3.1, 2.6, 6.4, 4.7, NULL, NULL),
  ('Orthopaedic Surgery', 'DO', 93, 112, 45, 239, 218, 251, 241, 5.1, 4.4, 11.2, 7, NULL, NULL),
  ('Otolaryngology', 'DO', 20, 8, 71, 242, 248, 248, 240, 4.5, 4.3, 11.3, 7, NULL, NULL),
  ('Pathology', 'DO', 70, 14, 83, 238, 245, 245, 243, 2.1, 1.8, 6.3, 3.8, NULL, NULL),
  ('Pediatrics', 'DO', 454, 3, 99, 226, 241, 241, NULL, 1.8, 2, 3.6, 2, NULL, NULL),
  ('Physical Medicine and Rehabilitation', 'DO', 159, 52, 75, 225, 207, 241, 231, 3.3, 2.1, 6.8, 5.2, NULL, NULL),
  ('Psychiatry', 'DO', 385, 90, 81, 204, 233, 240, 232, 2.1, 1.9, 3.8, 3, NULL, NULL),
  ('Vascular Surgery', 'DO', 5, 1, 83, 247, NULL, 247, NULL, 2.8, 9, 9, 1.5, NULL, NULL)
on conflict (specialty, applicant_type) do update set
  n_matched = excluded.n_matched,
  n_unmatched = excluded.n_unmatched,
  match_rate = excluded.match_rate,
  step1_mean_matched = excluded.step1_mean_matched,
  step2_mean_matched = excluded.step2_mean_matched,
  step2_mean_unmatched = excluded.step2_mean_unmatched,
  research_mean_matched = excluded.research_mean_matched,
  pubs_mean_matched = excluded.pubs_mean_matched,
  volunteer_mean_matched = excluded.volunteer_mean_matched;
