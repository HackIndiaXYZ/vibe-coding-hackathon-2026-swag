const FILLER_KEYS = ['um', 'uh', 'like', 'you know', 'basically', 'literally']

const ROLE_STRENGTHS = {
  'software-engineer': [
    'Structured problem decomposition',
    'Clear technical vocabulary',
    'Good awareness of trade-offs',
  ],
  'product-manager': [
    'Strong stakeholder framing',
    'Prioritization reasoning',
    'Outcome-oriented thinking',
  ],
  'data-analyst': [
    'Metrics-driven answers',
    'Logical experiment design',
    'Clear data storytelling',
  ],
  'behavioral-hr': [
    'Compelling narrative structure',
    'Self-awareness in examples',
    'Empathetic communication tone',
  ],
  'system-design': [
    'Scalability considerations',
    'Component boundary clarity',
    'Thoughtful failure-mode handling',
  ],
}

const ROLE_WEAKNESSES = {
  'software-engineer': [
    'Could deepen implementation specifics',
    'Occasional pacing under pressure',
    'Edge-case coverage was light',
  ],
  'product-manager': [
    'Quantitative justification could be stronger',
    'Roadmap sequencing needed more detail',
    'Risk mitigation was briefly addressed',
  ],
  'data-analyst': [
    'Statistical rigor could be expanded',
    'Visualization choices were not discussed',
    'Sample size considerations were omitted',
  ],
  'behavioral-hr': [
    'STAR format not always consistent',
    'Impact metrics were sometimes vague',
    'Conflict resolution steps lacked closure',
  ],
  'system-design': [
    'Capacity estimation was approximate',
    'Caching strategy under-explored',
    'Monitoring and observability gaps',
  ],
}

const ROLE_SUGGESTIONS = {
  'software-engineer': [
    'Practice outlining time/space complexity upfront',
    'Prepare 2–3 production debugging war stories',
    'Rehearse concise API design walkthroughs',
  ],
  'product-manager': [
    'Lead with user impact before solution details',
    'Bring one prioritization framework per answer',
    'Include success metrics in every product decision',
  ],
  'data-analyst': [
    'State hypotheses before describing analyses',
    'Mention statistical significance explicitly',
    'Practice explaining charts to non-technical audiences',
  ],
  'behavioral-hr': [
    'Use STAR format for every behavioral response',
    'Quantify outcomes with percentages or timelines',
    'End each story with a clear lesson learned',
  ],
  'system-design': [
    'Start with requirements and scale assumptions',
    'Discuss bottlenecks before proposing solutions',
    'Close with monitoring, SLAs, and failure recovery',
  ],
}

function aggregateFillerCounts(transcriptHistory) {
  const totals = Object.fromEntries(FILLER_KEYS.map((key) => [key, 0]))

  for (const entry of transcriptHistory) {
    if (!entry.fillerCounts) continue
    for (const key of FILLER_KEYS) {
      totals[key] += entry.fillerCounts[key] ?? 0
    }
  }

  return totals
}

function clampScore(value) {
  return Math.max(45, Math.min(98, Math.round(value)))
}

function computeScores(transcriptHistory, fillerStats) {
  const totalFillers = Object.values(fillerStats).reduce((sum, count) => sum + count, 0)
  const totalWords = transcriptHistory.reduce((sum, entry) => {
    const words = (entry.answer ?? '').trim().split(/\s+/).filter(Boolean).length
    return sum + words
  }, 0)
  const answeredCount = transcriptHistory.filter((entry) => entry.answer?.trim()).length
  const answerRatio = transcriptHistory.length
    ? answeredCount / transcriptHistory.length
    : 0

  const fillerRate = totalWords > 0 ? totalFillers / totalWords : 0
  const clarity = clampScore(88 - fillerRate * 120 - totalFillers * 1.5)
  const communication = clampScore(82 - totalFillers * 2.2 + answerRatio * 8)
  const confidence = clampScore(76 + answerRatio * 12 - fillerRate * 80)
  const technicalDepth = clampScore(70 + answeredCount * 5 + Math.min(totalWords / 18, 12))
  const overall = clampScore(
    clarity * 0.25 +
      communication * 0.25 +
      confidence * 0.2 +
      technicalDepth * 0.3,
  )

  return { overall, confidence, clarity, communication, technicalDepth }
}

function buildConfidenceByQuestion(transcriptHistory) {
  return transcriptHistory.map((entry, index) => {
    const wordCount = (entry.answer ?? '').trim().split(/\s+/).filter(Boolean).length
    const fillers = Object.values(entry.fillerCounts ?? {}).reduce((sum, n) => sum + n, 0)
    const base = 62 + index * 4
    const wordBoost = Math.min(wordCount / 4, 18)
    const fillerPenalty = fillers * 3

    return clampScore(base + wordBoost - fillerPenalty)
  })
}

export function generateMockFeedback({ role, transcriptHistory, elapsedSeconds }) {
  const fillerStats = aggregateFillerCounts(transcriptHistory)
  const totalFillerCount = Object.values(fillerStats).reduce((sum, count) => sum + count, 0)
  const scores = computeScores(transcriptHistory, fillerStats)
  const roleId = role?.id ?? 'software-engineer'

  return {
    roleTitle: role?.title ?? 'Interview',
    elapsedSeconds,
    questionsAnswered: transcriptHistory.length,
    scores,
    fillerStats,
    totalFillerCount,
    confidenceByQuestion: buildConfidenceByQuestion(transcriptHistory),
    strengths: ROLE_STRENGTHS[roleId] ?? ROLE_STRENGTHS['software-engineer'],
    weaknesses: ROLE_WEAKNESSES[roleId] ?? ROLE_WEAKNESSES['software-engineer'],
    suggestions: ROLE_SUGGESTIONS[roleId] ?? ROLE_SUGGESTIONS['software-engineer'],
  }
}
