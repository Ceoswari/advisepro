-- Publications table
create table publications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  title text not null,
  journal text,
  publication_type text not null,
  publication_date date,
  doi text,
  created_at timestamp with time zone default now()
);

alter table publications enable row level security;

create policy "Students can manage their own publications"
on publications for all
using (
  exists (
    select 1 from students
    where students.id = publications.student_id
    and students.profile_id = auth.uid()
  )
);

create policy "Advisors can view publications for their students"
on publications for select
using (
  exists (
    select 1 from advisor_student
    where advisor_student.student_id = publications.student_id
    and advisor_student.advisor_profile_id = auth.uid()
  )
);

create policy "Admins can manage all publications"
on publications for all
using (get_my_role() = 'admin');

-- Away rotations table
create table away_rotations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  program_name text not null,
  specialty text,
  institution text,
  city text,
  state text,
  start_date date,
  end_date date,
  status text default 'planned',
  notes text,
  created_at timestamp with time zone default now()
);

alter table away_rotations enable row level security;

create policy "Students can manage their own away rotations"
on away_rotations for all
using (
  exists (
    select 1 from students
    where students.id = away_rotations.student_id
    and students.profile_id = auth.uid()
  )
);

create policy "Advisors can view away rotations for their students"
on away_rotations for select
using (
  exists (
    select 1 from advisor_student
    where advisor_student.student_id = away_rotations.student_id
    and advisor_student.advisor_profile_id = auth.uid()
  )
);

create policy "Admins can manage all away rotations"
on away_rotations for all
using (get_my_role() = 'admin');
