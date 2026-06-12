import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function classYearFromGraduationYear(graduationYear) {
  const yearsLeft = parseInt(graduationYear) - new Date().getFullYear()
  if (yearsLeft <= 0) return 'MS4'
  if (yearsLeft === 1) return 'MS3'
  if (yearsLeft === 2) return 'MS2'
  return 'MS1'
}

export async function POST(request) {
  const body = await request.json()

  // Derive class_year from graduation_year if not explicitly provided
  const classYear = body.class_year ||
    (body.graduation_year ? classYearFromGraduationYear(body.graduation_year) : null)

  // 1. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password || 'ChangeMe123!',
    email_confirm: true
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 2. Create profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: body.email,
      full_name: body.full_name,
      role: 'student'
    })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  // 3. Create student record
  const { data: studentData, error: studentError } = await supabaseAdmin
    .from('students')
    .insert({
      profile_id: authData.user.id,
      banner_id: body.banner_id || null,
      class_year: classYear,
      graduation_year: body.graduation_year ? parseInt(body.graduation_year) : null,
      specialty_interest: body.specialty_interest || null,
      usmle_step1_score: body.usmle_step1_score ? parseInt(body.usmle_step1_score) : null,
      usmle_step1_status: body.usmle_step1_status || 'not_taken',
      usmle_step2_score: body.usmle_step2_score ? parseInt(body.usmle_step2_score) : null,
      research_count: body.research_count ? parseInt(body.research_count) : 0,
      volunteer_hours: body.volunteer_hours ? parseInt(body.volunteer_hours) : 0,
      risk_level: body.risk_level || null
    })
    .select()
    .single()

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 400 })
  }

  // 4. Auto-assign all existing milestones to this student
  const { data: milestones } = await supabaseAdmin.from('milestones').select('id')
  if (milestones && milestones.length > 0) {
    await supabaseAdmin.from('student_milestones').insert(
      milestones.map(m => ({
        student_id: studentData.id,
        milestone_id: m.id,
        status: 'not_started'
      }))
    )
  }

  return NextResponse.json({ success: true, student_id: studentData.id })
}
