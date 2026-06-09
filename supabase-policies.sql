-- Students can view their own advising notes
create policy "Students can view their own advising notes"
on advising_notes for select
using (
  exists (
    select 1 from students
    where students.id = advising_notes.student_id
    and students.profile_id = auth.uid()
  )
);

-- Admins can manage advisor-student assignments
create policy "Admins can manage advisor assignments"
on advisor_student for all
using (get_my_role() = 'admin');

-- Admins can update any student record
create policy "Admins can update any student"
on students for update
using (get_my_role() = 'admin');

-- Admins can read all profiles (to list advisors)
create policy "Admins can read all profiles"
on profiles for select
using (get_my_role() = 'admin');
