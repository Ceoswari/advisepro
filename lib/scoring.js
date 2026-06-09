// Residency competitiveness scoring algorithm

export const SPECIALTY_TIERS = {
  'Dermatology': 'very_competitive',
  'Orthopedic Surgery': 'very_competitive',
  'Plastic Surgery': 'very_competitive',
  'Urology': 'very_competitive',
  'Ophthalmology': 'very_competitive',
  'Otolaryngology': 'very_competitive',
  'Radiology': 'competitive',
  'Anesthesiology': 'competitive',
  'Emergency Medicine': 'competitive',
  'Obstetrics and Gynecology': 'competitive',
  'Surgery': 'competitive',
  'Neurology': 'average',
  'Internal Medicine': 'average',
  'Pathology': 'average',
  'Physical Medicine and Rehabilitation': 'average',
  'Family Medicine': 'less_competitive',
  'Pediatrics': 'less_competitive',
  'Psychiatry': 'less_competitive',
}

export const TIER_LABELS = {
  'very_competitive': 'Very Competitive',
  'competitive': 'Competitive',
  'average': 'Moderately Competitive',
  'less_competitive': 'Less Competitive',
}

// Risk thresholds: score needed for low/medium risk by tier
const RISK_THRESHOLDS = {
  'very_competitive': { low: 72, medium: 50 },
  'competitive':      { low: 62, medium: 42 },
  'average':          { low: 52, medium: 32 },
  'less_competitive': { low: 42, medium: 22 },
  'default':          { low: 55, medium: 35 },
}

export function calculateCompetitiveness(student, activitiesCount = 0) {
  if (!student) return null

  const breakdown = {}
  let total = 0

  // --- Step 2 CK (0–40 pts) ---
  const step2 = student.usmle_step2_score
  let step2Score = 0
  if (step2 >= 260)      step2Score = 40
  else if (step2 >= 250) step2Score = 37
  else if (step2 >= 240) step2Score = 32
  else if (step2 >= 230) step2Score = 25
  else if (step2 >= 220) step2Score = 15
  else if (step2 > 0)    step2Score = 5
  breakdown.step2 = { score: step2Score, max: 40, label: 'USMLE Step 2 CK' }
  total += step2Score

  // --- Step 1 (0–20 pts) ---
  const step1Num    = student.usmle_step1_score
  const step1Status = student.usmle_step1_status
  let step1Score = 0
  if (step1Status === 'fail') {
    step1Score = 0
  } else if (step1Status === 'pass') {
    if (step1Num >= 240)      step1Score = 20
    else if (step1Num >= 230) step1Score = 16
    else if (step1Num >= 220) step1Score = 12
    else                      step1Score = 10 // pass without numerical score
  } else {
    step1Score = 5 // not taken yet — neutral
  }
  breakdown.step1 = { score: step1Score, max: 20, label: 'USMLE Step 1' }
  total += step1Score

  // --- Research (0–20 pts) ---
  const research = student.research_count || 0
  let researchScore = 0
  if (research >= 6)      researchScore = 20
  else if (research >= 4) researchScore = 16
  else if (research >= 2) researchScore = 12
  else if (research >= 1) researchScore = 6
  breakdown.research = { score: researchScore, max: 20, label: 'Research Experiences' }
  total += researchScore

  // --- Volunteer Hours (0–10 pts) ---
  const volunteer = student.volunteer_hours || 0
  let volunteerScore = 0
  if (volunteer >= 300)      volunteerScore = 10
  else if (volunteer >= 150) volunteerScore = 8
  else if (volunteer >= 50)  volunteerScore = 5
  else if (volunteer > 0)    volunteerScore = 2
  breakdown.volunteer = { score: volunteerScore, max: 10, label: 'Volunteer Hours' }
  total += volunteerScore

  // --- ERAS Activities (0–10 pts) ---
  let activityScore = 0
  if (activitiesCount >= 12)      activityScore = 10
  else if (activitiesCount >= 8)  activityScore = 8
  else if (activitiesCount >= 4)  activityScore = 5
  else if (activitiesCount >= 1)  activityScore = 2
  breakdown.activities = { score: activityScore, max: 10, label: 'ERAS Activities' }
  total += activityScore

  // --- Risk level based on specialty tier ---
  const tier       = SPECIALTY_TIERS[student.specialty_interest] || 'default'
  const thresholds = RISK_THRESHOLDS[tier] || RISK_THRESHOLDS['default']
  const riskLevel  = total >= thresholds.low
    ? 'low'
    : total >= thresholds.medium
      ? 'medium'
      : 'high'

  return {
    score: total,
    riskLevel,
    breakdown,
    tier,
    thresholds,
  }
}
