// Residency competitiveness scoring — powered by NRMP 2024 Charting Outcomes data
// Source: National Resident Matching Program, 2024 Main Residency Match

// NRMP 2024 benchmark data per specialty (MD seniors)
// step2, research, pubs, volunteer = mean for matched vs unmatched applicants
// step1M/step1U = USMLE Step 1 matched/unmatched means (NRMP 2024, MD seniors)
// step2M/step2U = USMLE Step 2 CK matched/unmatched means
export const NRMP_BENCHMARKS = {
  'Anesthesiology':                   { matchRate: 86, step1M: 234, step1U: 216, step2M: 252, step2U: 240, resM: 3.8, resU: 3.1, pubsM: 9.0,  pubsU: 5.4,  volM: 4.3, volU: 4.1 },
  'Child Neurology':                  { matchRate: 98, step1M: 230, step1U: null, step2M: 248, step2U: 230, resM: 3.0, resU: 2.0, pubsM: 9.8,  pubsU: 1.0,  volM: 4.5, volU: 3.5 },
  'Dermatology':                      { matchRate: 71, step1M: 245, step1U: 235, step2M: 257, step2U: 250, resM: 6.4, resU: 4.9, pubsM: 27.7, pubsU: 19.0, volM: 5.3, volU: 5.6 },
  'Diagnostic Radiology':             { matchRate: 88, step1M: 241, step1U: 224, step2M: 256, step2U: 241, resM: 4.4, resU: 3.6, pubsM: 12.0, pubsU: 8.0,  volM: 3.9, volU: 3.6 },
  'Emergency Medicine':               { matchRate: 98, step1M: 224, step1U: 220, step2M: 248, step2U: 234, resM: 2.8, resU: 2.3, pubsM: 5.7,  pubsU: 5.0,  volM: 4.4, volU: 4.8 },
  'Family Medicine':                  { matchRate: 99, step1M: 217, step1U: 208, step2M: 244, step2U: 231, resM: 2.1, resU: 1.8, pubsM: 4.2,  pubsU: 1.4,  volM: 4.6, volU: 7.4 },
  'General Surgery':                  { matchRate: 83, step1M: 235, step1U: 215, step2M: 253, step2U: 238, resM: 4.2, resU: 3.7, pubsM: 10.9, pubsU: 7.3,  volM: 4.5, volU: 4.2 },
  'Internal Medicine':                { matchRate: 98, step1M: 234, step1U: 220, step2M: 251, step2U: 234, resM: 3.3, resU: 3.3, pubsM: 8.7,  pubsU: 6.2,  volM: 4.2, volU: 4.1 },
  'Internal Medicine/Pediatrics':     { matchRate: 86, step1M: 233, step1U: 216, step2M: 253, step2U: 243, resM: 3.1, resU: 2.6, pubsM: 6.9,  pubsU: 6.2,  volM: 5.1, volU: 4.8 },
  'Interventional Radiology':         { matchRate: 83, step1M: 247, step1U: 237, step2M: 253, step2U: 245, resM: 4.7, resU: 4.6, pubsM: 15.8, pubsU: 10.1, volM: 3.9, volU: 3.9 },
  'Neurological Surgery':             { matchRate: 69, step1M: 245, step1U: 230, step2M: 255, step2U: 247, resM: 5.8, resU: 5.5, pubsM: 37.4, pubsU: 31.8, volM: 4.2, volU: 4.2 },
  'Neurology':                        { matchRate: 94, step1M: 231, step1U: 228, step2M: 250, step2U: 236, resM: 3.5, resU: 2.8, pubsM: 8.8,  pubsU: 5.5,  volM: 4.2, volU: 3.9 },
  'Obstetrics and Gynecology':        { matchRate: 86, step1M: 227, step1U: 220, step2M: 252, step2U: 244, resM: 3.8, resU: 3.3, pubsM: 9.0,  pubsU: 6.8,  volM: 5.0, volU: 5.0 },
  'Orthopaedic Surgery':              { matchRate: 74, step1M: 244, step1U: 234, step2M: 257, step2U: 246, resM: 8.1, resU: 8.0, pubsM: 23.8, pubsU: 18.0, volM: 4.8, volU: 4.8 },
  'Orthopedic Surgery':               { matchRate: 74, step1M: 244, step1U: 234, step2M: 257, step2U: 246, resM: 8.1, resU: 8.0, pubsM: 23.8, pubsU: 18.0, volM: 4.8, volU: 4.8 },
  'Otolaryngology':                   { matchRate: 83, step1M: 243, step1U: 242, step2M: 256, step2U: 251, resM: 7.1, resU: 5.5, pubsM: 20.0, pubsU: 15.6, volM: 4.3, volU: 6.7 },
  'Pathology':                        { matchRate: 95, step1M: 235, step1U: 232, step2M: 247, step2U: 232, resM: 3.1, resU: 2.3, pubsM: 8.4,  pubsU: 4.1,  volM: 3.3, volU: 4.7 },
  'Pediatrics':                       { matchRate: 99, step1M: 224, step1U: 214, step2M: 247, step2U: 233, resM: 2.6, resU: 0.5, pubsM: 6.4,  pubsU: null, volM: 4.9, volU: 6.0 },
  'Physical Medicine and Rehabilitation': { matchRate: 85, step1M: 226, step1U: 212, step2M: 248, step2U: 236, resM: 3.4, resU: 3.3, pubsM: 8.6, pubsU: 6.4, volM: 4.8, volU: 4.9 },
  'Plastic Surgery':                  { matchRate: 77, step1M: 247, step1U: 226, step2M: 256, step2U: 247, resM: 8.6, resU: 9.2, pubsM: 34.7, pubsU: 26.3, volM: 5.0, volU: 4.9 },
  'Psychiatry':                       { matchRate: 90, step1M: 226, step1U: 216, step2M: 246, step2U: 235, resM: 3.0, resU: 3.1, pubsM: 7.5,  pubsU: 4.6,  volM: 4.5, volU: 4.0 },
  'Radiation Oncology':               { matchRate: 97, step1M: 238, step1U: null, step2M: 252, step2U: 242, resM: 4.2, resU: 2.0, pubsM: 15.9, pubsU: 13.5, volM: 3.9, volU: 2.0 },
  'Vascular Surgery':                 { matchRate: 91, step1M: 239, step1U: null, step2M: 253, step2U: 246, resM: 4.6, resU: 4.5, pubsM: 12.8, pubsU: 8.0,  volM: 4.7, volU: 4.0 },
}

export const TIER_LABELS = {
  'very_competitive': 'Very Competitive',
  'competitive': 'Competitive',
  'average': 'Moderately Competitive',
  'less_competitive': 'Less Competitive',
}

// Derive tier from NRMP match rate
function getTierFromMatchRate(matchRate) {
  if (matchRate == null) return 'default'
  if (matchRate < 75)  return 'very_competitive'
  if (matchRate < 87)  return 'competitive'
  if (matchRate < 95)  return 'average'
  return 'less_competitive'
}

// Score a student's value against matched/unmatched benchmarks
// Returns 0.0–1.0 representing how they compare
function benchmarkScore(studentVal, matchedMean, unmatchedMean) {
  if (studentVal == null || studentVal === 0) return 0
  if (matchedMean == null) return null // no benchmark available
  const unmatched = unmatchedMean ?? (matchedMean * 0.9)

  if (studentVal >= matchedMean * 1.25) return 1.0   // significantly above matched mean
  if (studentVal >= matchedMean)         return 0.85  // at or above matched mean
  if (studentVal >= (matchedMean + unmatched) / 2) return 0.70 // between midpoint and matched
  if (studentVal >= unmatched)           return 0.55  // at or above unmatched mean
  if (studentVal >= unmatched * 0.85)   return 0.35  // slightly below unmatched mean
  return 0.15                                          // well below
}

// publications: array of { publication_type: 'first_author'|'co_author'|'poster'|'abstract' }
export function calculateCompetitiveness(student, activitiesCount = 0, publications = [], awayRotationsCount = 0) {
  if (!student) return null

  const benchmark = NRMP_BENCHMARKS[student.specialty_interest] || null
  const tier = benchmark ? getTierFromMatchRate(benchmark.matchRate) : 'default'

  // Risk thresholds based on specialty competitiveness
  // These are the minimum scores to be considered low/medium risk
  const RISK_THRESHOLDS = {
    'very_competitive': { low: 70, medium: 48 },
    'competitive':      { low: 60, medium: 40 },
    'average':          { low: 50, medium: 32 },
    'less_competitive': { low: 40, medium: 25 },
    'default':          { low: 55, medium: 35 },
  }
  const thresholds = RISK_THRESHOLDS[tier]

  const breakdown = {}
  let total = 0

  // --- Step 2 CK (0–35 pts) — benchmark-aware ---
  const step2 = student.usmle_step2_score
  let step2Score = 0
  if (benchmark?.step2M) {
    const ratio = benchmarkScore(step2, benchmark.step2M, benchmark.step2U)
    step2Score = Math.round(ratio * 35)
  } else {
    // Fallback: absolute scoring
    if (step2 >= 260)      step2Score = 35
    else if (step2 >= 250) step2Score = 32
    else if (step2 >= 240) step2Score = 27
    else if (step2 >= 230) step2Score = 21
    else if (step2 >= 220) step2Score = 13
    else if (step2 > 0)    step2Score = 4
  }
  breakdown.step2 = {
    score: step2Score, max: 35, label: 'USMLE Step 2 CK',
    benchmarkMatched: benchmark?.step2M,
    benchmarkUnmatched: benchmark?.step2U,
    studentValue: step2,
  }
  total += step2Score

  // --- Step 1 (0–10 pts) ---
  const step1Num    = student.usmle_step1_score
  const step1Status = student.usmle_step1_status
  let step1Score = 0
  if (step1Status === 'fail') {
    step1Score = 0
  } else if (step1Status === 'pass') {
    if (step1Num >= 240)      step1Score = 10
    else if (step1Num >= 230) step1Score = 8
    else if (step1Num >= 220) step1Score = 6
    else                      step1Score = 4
  } else {
    step1Score = 3 // not taken — neutral
  }
  breakdown.step1 = { score: step1Score, max: 10, label: 'USMLE Step 1' }
  total += step1Score

  // --- Research (0–20 pts) — benchmark-aware ---
  const research = student.research_count || 0
  let researchScore = 0
  if (benchmark?.resM) {
    const ratio = benchmarkScore(research, benchmark.resM, benchmark.resU)
    researchScore = Math.round(ratio * 20)
  } else {
    if (research >= 6)      researchScore = 20
    else if (research >= 4) researchScore = 16
    else if (research >= 2) researchScore = 10
    else if (research >= 1) researchScore = 6
  }
  breakdown.research = {
    score: researchScore, max: 20, label: 'Research Experiences',
    benchmarkMatched: benchmark?.resM,
    benchmarkUnmatched: benchmark?.resU,
    studentValue: research,
  }
  total += researchScore

  // --- Publications (0–20 pts) — benchmark-aware, uncapped display ---
  const firstAuthor = publications.filter(p => p.publication_type === 'first_author').length
  const coAuthor    = publications.filter(p => p.publication_type === 'co_author').length
  const poster      = publications.filter(p => p.publication_type === 'poster').length
  const abstract    = publications.filter(p => p.publication_type === 'abstract').length
  // Weighted pub count (abstracts/posters count less than papers)
  const pubCount = firstAuthor * 2 + coAuthor * 1.5 + poster * 0.75 + abstract * 0.5
  let pubScore = 0
  if (benchmark?.pubsM) {
    const ratio = benchmarkScore(pubCount, benchmark.pubsM, benchmark.pubsU)
    pubScore = Math.round(ratio * 20)
  } else {
    pubScore = Math.min(Math.round(pubCount * 2), 20)
  }
  breakdown.publications = {
    score: pubScore, max: 20, label: 'Publications & Abstracts',
    benchmarkMatched: benchmark?.pubsM,
    benchmarkUnmatched: benchmark?.pubsU,
    studentValue: Math.round(pubCount * 10) / 10,
    rawCounts: { firstAuthor, coAuthor, poster, abstract },
  }
  total += pubScore

  // --- Volunteer (0–8 pts) — benchmark-aware ---
  const volunteer = student.volunteer_hours || 0
  let volunteerScore = 0
  if (benchmark?.volM) {
    // Convert hours to experience count estimate (benchmark is in # of experiences, not hours)
    // Assume ~40 hrs per experience on average
    const volExpEstimate = volunteer / 40
    const ratio = benchmarkScore(volExpEstimate, benchmark.volM, benchmark.volU)
    volunteerScore = Math.round(ratio * 8)
  } else {
    if (volunteer >= 300)      volunteerScore = 8
    else if (volunteer >= 150) volunteerScore = 6
    else if (volunteer >= 50)  volunteerScore = 4
    else if (volunteer > 0)    volunteerScore = 2
  }
  breakdown.volunteer = {
    score: volunteerScore, max: 8, label: 'Volunteer Experience',
    studentValue: volunteer,
  }
  total += volunteerScore

  // --- Away Rotations (binary: 5 pts if any) ---
  const rotationScore = awayRotationsCount >= 1 ? 5 : 0
  breakdown.rotations = { score: rotationScore, max: 5, label: 'Away Rotations', binary: true }
  total += rotationScore

  // --- ERAS Activities (0–2 pts) ---
  let activityScore = 0
  if (activitiesCount >= 12)      activityScore = 2
  else if (activitiesCount >= 6)  activityScore = 1
  breakdown.activities = { score: activityScore, max: 2, label: 'ERAS Activities' }
  total += activityScore

  // --- Normalize to 0–100 ---
  // Max possible = 35+10+20+20+8+5+2 = 100
  const score = Math.min(total, 100)
  const riskLevel = score >= thresholds.low ? 'low' : score >= thresholds.medium ? 'medium' : 'high'

  return {
    score,
    riskLevel,
    breakdown,
    tier,
    thresholds,
    benchmark,
    matchRate: benchmark?.matchRate ?? null,
  }
}

// Plain-language explanation of what's driving or hurting the score
export function generateInsights(result, student) {
  if (!result || !student) return null

  const { breakdown, riskLevel, tier } = result
  const specialty = student.specialty_interest || null

  if (!specialty) {
    return {
      strengths: [],
      gaps: [],
      actions: ['Set your specialty interest in Edit Profile to unlock personalized insights and benchmarking.']
    }
  }

  const strengths = []
  const gaps = []
  const actions = []

  // Step 2
  const s2 = breakdown.step2
  if (s2.studentValue && s2.benchmarkMatched) {
    if (s2.studentValue >= s2.benchmarkMatched) {
      strengths.push(`Step 2 CK (${s2.studentValue}) is at or above the matched mean of ${s2.benchmarkMatched}`)
    } else {
      const gap = s2.benchmarkMatched - s2.studentValue
      gaps.push({ label: 'Step 2 CK', detail: `Your score (${s2.studentValue}) is ${gap} points below the matched mean (${s2.benchmarkMatched})`, priority: gap * 1.5 })
    }
  }

  // Research
  const res = breakdown.research
  if (res.benchmarkMatched) {
    const have = res.studentValue || 0
    if (have >= res.benchmarkMatched) {
      strengths.push(`Research (${have} experience${have !== 1 ? 's' : ''}) meets or exceeds the matched mean of ${res.benchmarkMatched}`)
    } else {
      gaps.push({ label: 'Research', detail: `${have} research experience${have !== 1 ? 's' : ''} — matched applicants average ${res.benchmarkMatched}`, priority: (res.benchmarkMatched - have) * 4 })
    }
  }

  // Publications
  const pubs = breakdown.publications
  if (pubs.benchmarkMatched) {
    const have = pubs.studentValue || 0
    if (have >= pubs.benchmarkMatched) {
      strengths.push(`Publications (${have} weighted) meet the matched mean of ${pubs.benchmarkMatched}`)
    } else {
      gaps.push({ label: 'Publications', detail: `Weighted count of ${have} — matched applicants average ${pubs.benchmarkMatched}`, priority: Math.min((pubs.benchmarkMatched - have) * 0.8, 20) })
    }
  }

  // Step 1 (only if taken and failing)
  const s1 = breakdown.step1
  if (student.usmle_step1_status === 'fail') {
    gaps.push({ label: 'Step 1', detail: 'A failed Step 1 is a significant flag for competitive specialties — discuss remediation strategy with your advisor', priority: 30 })
  } else if (student.usmle_step1_status === 'pass' && s1.score <= 4) {
    gaps.push({ label: 'Step 1', detail: `Step 1 score (${student.usmle_step1_score}) is below competitive thresholds for ${specialty}`, priority: 10 })
  } else if (student.usmle_step1_status === 'pass' && s1.score >= 8) {
    strengths.push(`Step 1 (${student.usmle_step1_score}) is competitive for ${specialty}`)
  }

  gaps.sort((a, b) => b.priority - a.priority)
  const topGaps = gaps.slice(0, 2)

  topGaps.forEach(gap => {
    if (gap.label === 'Step 2 CK') {
      actions.push(`Prioritize Step 2 prep — reaching ${s2.benchmarkMatched}+ is a key threshold for ${specialty}`)
    }
    if (gap.label === 'Research') {
      actions.push(`Pursue research in ${specialty} — aim for at least ${Math.ceil(res.benchmarkMatched)} experiences before applying`)
    }
    if (gap.label === 'Publications') {
      actions.push(`Convert existing research into an abstract or manuscript — one first-author paper meaningfully closes this gap`)
    }
    if (gap.label === 'Step 1') {
      actions.push(`Discuss Step 1 strategy with your advisor — address this early before it affects program screening`)
    }
  })

  if (breakdown.rotations?.score === 0 && ['very_competitive', 'competitive'].includes(tier)) {
    actions.push(`Consider an away rotation in ${specialty} — it strengthens letters and signals genuine interest`)
  }

  if (riskLevel === 'high') {
    actions.push(`Discuss a backup specialty with your advisor — dual-applying significantly reduces SOAP risk`)
  }

  return {
    strengths: strengths.slice(0, 3),
    gaps: topGaps,
    actions: actions.slice(0, 3),
  }
}
