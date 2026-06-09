import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.json()

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: 'password123',
    email_confirm: true
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

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

  const { error: studentError } = await supabaseAdmin
    .from('students')
    .insert({
      profile_id: authData.user.id,
      class_year: body.class_year,
      specialty_interest: body.specialty_interest || null,
      usmle_step1_score: body.usmle_step1_score ? parseInt(body.usmle_step1_score) : null,
      usmle_step1_status: body.usmle_step1_status,
      usmle_step2_score: body.usmle_step2_score ? parseInt(body.usmle_step2_score) : null,
      research_count: body.research_count ? parseInt(body.research_count) : 0,
      volunteer_hours: body.volunteer_hours ? parseInt(body.volunteer_hours) : 0,
      risk_level: body.risk_level
    })

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}