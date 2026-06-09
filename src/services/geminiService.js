import { generateMockFeedback } from '../constants/mockFeedback'
import { getQuestionsForRole } from '../constants/mockQuestions'

const MODEL = 'gemini-2.5-flash'
const API_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const MAX_RETRIES = 2
const INTERVIEW_TARGET_ROUNDS = 3
const REFILL_BATCH_MIN = 3
const REFILL_BATCH_MAX = 5

/** In-memory question cache for the active interview session. */
const questionCache = {
  roleId: null,
  questions: [],
}

function getApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? ''
}

export function isGeminiConfigured() {
  return Boolean(getApiKey())
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resetQuestionCache(roleId) {
  questionCache.roleId = roleId ?? null
  questionCache.questions = []
}

function formatTranscriptHistory(transcriptHistory) {
  if (!transcriptHistory.length) {
    return 'No previous exchanges.'
  }

  return transcriptHistory
    .map((entry, index) => {
      const answer = entry.answer?.trim() || '(no answer captured)'
      return `Q${index + 1}: ${entry.question}\nA${index + 1}: ${answer}`
    })
    .join('\n\n')
}

function extractJson(text) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(candidate)
}

function parseRetryDelayMs(errorBody) {
  let parsed

  try {
    parsed = typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody
  } catch {
    return null
  }

  const details = parsed?.error?.details
  if (!Array.isArray(details)) return null

  for (const detail of details) {
    const retryDelay = detail?.retryDelay
    if (retryDelay == null) continue

    if (typeof retryDelay === 'string') {
      const seconds = parseFloat(retryDelay.replace(/s$/i, ''))
      if (!Number.isNaN(seconds)) return Math.ceil(seconds * 1000)
    }

    if (typeof retryDelay === 'number') {
      return Math.ceil(retryDelay * 1000)
    }
  }

  return null
}

function createGeminiError(status, errorBody) {
  const error = new Error(`Gemini API error (${status}): ${errorBody}`)
  error.status = status
  error.body = errorBody
  return error
}

async function callGemini(prompt, { responseSchema } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('Gemini API key is not configured')
  }

  const generationConfig = {
    temperature: 0.7,
    responseMimeType: 'application/json',
  }

  if (responseSchema) {
    generationConfig.responseSchema = responseSchema
  }

  const response = await fetch(`${API_BASE}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw createGeminiError(response.status, errorBody)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('Gemini returned an empty response')
  }

  return extractJson(text)
}

async function withRetry(operation) {
  let lastError = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt >= MAX_RETRIES) break

      if (error.status === 429) {
        const retryMs = parseRetryDelayMs(error.body)
        if (!retryMs) {
          console.warn(
            '[geminiService] 429 rate limit hit but no retryDelay in response — cannot retry',
          )
          break
        }

        console.warn(
          `[geminiService] 429 rate limited — waiting ${retryMs}ms (retryDelay from API) before retry ${attempt + 1}/${MAX_RETRIES}`,
        )
        await delay(retryMs)
        continue
      }

      continue
    }
  }

  throw lastError
}

function buildInitialQuestionsPrompt(role) {
  return `You are a professional interviewer preparing questions for a ${role?.title ?? 'job'} mock interview.

Role track: ${role?.label ?? 'GENERAL'}
Role focus: ${role?.description ?? 'General professional interview'}

Generate exactly ${INTERVIEW_TARGET_ROUNDS} realistic interview questions for the full session.
Rules:
- Each question must be concise (1-2 sentences, no preamble)
- Questions must be role-specific and realistic
- Order from accessible warm-up to deeper assessment
- Mark follow-up style probes with isFollowUp: true when they probe vagueness from a prior topic
- Do not repeat topics unnecessarily

Respond with JSON only:
{
  "questions": [
    { "question": "string", "isFollowUp": boolean }
  ]
}`
}

function buildRefillQuestionsPrompt(role, transcriptHistory) {
  return `You are a professional interviewer continuing a ${role?.title ?? 'job'} mock interview.

Role track: ${role?.label ?? 'GENERAL'}
Role focus: ${role?.description ?? 'General professional interview'}

The interview has used more questions than expected. Generate ${REFILL_BATCH_MIN} to ${REFILL_BATCH_MAX} additional questions in a single batch.

Rules:
- Each question must be concise (1-2 sentences)
- Base follow-ups on vague or shallow answers in the transcript
- Challenge weak answers; move to new topics when answers are strong
- Never repeat a question already asked

Interview transcript so far:
${formatTranscriptHistory(transcriptHistory)}

Respond with JSON only:
{
  "questions": [
    { "question": "string", "isFollowUp": boolean }
  ]
}`
}

function buildFeedbackPrompt({ role, transcriptHistory, elapsedSeconds }) {
  return `You are an expert interview coach analyzing a completed mock interview.

Role: ${role?.title ?? 'Interview'}
Track: ${role?.label ?? 'GENERAL'}
Duration: ${elapsedSeconds} seconds
Questions answered: ${transcriptHistory.length}

Transcript:
${formatTranscriptHistory(transcriptHistory)}

Provide honest, specific feedback based only on the transcript.
Scores must be integers from 45 to 98.
confidenceByQuestion must have one score per answered question (same order as transcript).

Respond with JSON only:
{
  "scores": {
    "overall": number,
    "confidence": number,
    "clarity": number,
    "communication": number,
    "technicalDepth": number
  },
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string", "string"],
  "suggestions": ["string", "string", "string"],
  "confidenceByQuestion": [number]
}`
}

function clampScore(value) {
  return Math.max(45, Math.min(98, Math.round(Number(value) || 0)))
}

function normalizeQuestionsArray(raw) {
  const items = Array.isArray(raw?.questions) ? raw.questions : []

  return items
    .map((item) => ({
      question: String(item?.question ?? '').trim(),
      isFollowUp: Boolean(item?.isFollowUp),
    }))
    .filter((item) => item.question)
}

function normalizeFeedbackResponse(raw, params) {
  const mockBase = generateMockFeedback(params)
  const scores = raw?.scores ?? {}

  return {
    roleTitle: params.role?.title ?? 'Interview',
    elapsedSeconds: params.elapsedSeconds,
    questionsAnswered: params.transcriptHistory.length,
    scores: {
      overall: clampScore(scores.overall ?? mockBase.scores.overall),
      confidence: clampScore(scores.confidence ?? mockBase.scores.confidence),
      clarity: clampScore(scores.clarity ?? mockBase.scores.clarity),
      communication: clampScore(scores.communication ?? mockBase.scores.communication),
      technicalDepth: clampScore(scores.technicalDepth ?? mockBase.scores.technicalDepth),
    },
    fillerStats: mockBase.fillerStats,
    totalFillerCount: mockBase.totalFillerCount,
    confidenceByQuestion:
      Array.isArray(raw?.confidenceByQuestion) && raw.confidenceByQuestion.length
        ? raw.confidenceByQuestion.map(clampScore)
        : mockBase.confidenceByQuestion,
    strengths:
      Array.isArray(raw?.strengths) && raw.strengths.length
        ? raw.strengths.slice(0, 3)
        : mockBase.strengths,
    weaknesses:
      Array.isArray(raw?.weaknesses) && raw.weaknesses.length
        ? raw.weaknesses.slice(0, 3)
        : mockBase.weaknesses,
    suggestions:
      Array.isArray(raw?.suggestions) && raw.suggestions.length
        ? raw.suggestions.slice(0, 3)
        : mockBase.suggestions,
    source: 'gemini',
  }
}

async function fetchInitialQuestionBatch(role) {
  const raw = await withRetry(() => callGemini(buildInitialQuestionsPrompt(role)))
  const questions = normalizeQuestionsArray(raw)

  if (!questions.length) {
    throw new Error('Gemini returned an empty initial question batch')
  }

  questionCache.roleId = role?.id ?? null
  questionCache.questions = questions

  console.log(
    `[geminiService] Cached ${questions.length} interview questions for session (single API call)`,
  )
}

async function fetchRefillQuestionBatch(role, transcriptHistory) {
  const raw = await withRetry(() =>
    callGemini(buildRefillQuestionsPrompt(role, transcriptHistory)),
  )
  const questions = normalizeQuestionsArray(raw)

  if (!questions.length) {
    throw new Error('Gemini returned an empty refill question batch')
  }

  questionCache.questions.push(...questions)

  console.log(
    `[geminiService] Appended ${questions.length} questions to cache (single API call, total: ${questionCache.questions.length})`,
  )
}

async function ensureQuestionAvailable(role, transcriptHistory, nextIndex) {
  const roleId = role?.id ?? null

  if (nextIndex === 0) {
    resetQuestionCache(roleId)
    await fetchInitialQuestionBatch(role)
    return
  }

  if (questionCache.roleId !== roleId || questionCache.questions.length === 0) {
    resetQuestionCache(roleId)
    await fetchInitialQuestionBatch(role)
  }

  if (nextIndex >= questionCache.questions.length) {
    await fetchRefillQuestionBatch(role, transcriptHistory)
  }
}

function getCachedQuestion(nextIndex) {
  return questionCache.questions[nextIndex] ?? null
}

export function getFallbackNextQuestion(role, transcriptHistory) {
  const questions = getQuestionsForRole(role?.id)
  const nextIndex = transcriptHistory.length

  if (nextIndex >= questions.length) {
    return { question: '', shouldEndInterview: true, isFollowUp: false, source: 'mock' }
  }

  return {
    question: questions[nextIndex],
    shouldEndInterview: false,
    isFollowUp: false,
    source: 'mock',
  }
}

export function getFallbackOpeningQuestion(role) {
  return getFallbackNextQuestion(role, [])
}

export async function generateNextQuestion({ role, transcriptHistory }) {
  const nextIndex = transcriptHistory.length

  if (!isGeminiConfigured()) {
    console.warn(
      '[geminiService] MOCK FALLBACK: VITE_GEMINI_API_KEY is not set — serving offline question.',
    )
    return getFallbackNextQuestion(role, transcriptHistory)
  }

  if (nextIndex >= INTERVIEW_TARGET_ROUNDS) {
    return {
      question: '',
      shouldEndInterview: true,
      isFollowUp: false,
      source: 'gemini',
    }
  }

  try {
    await ensureQuestionAvailable(role, transcriptHistory, nextIndex)

    const cached = getCachedQuestion(nextIndex)
    if (!cached) {
      throw new Error(`Question cache miss at index ${nextIndex}`)
    }

    return {
      question: cached.question,
      shouldEndInterview: false,
      isFollowUp: cached.isFollowUp,
      source: 'gemini',
    }
  } catch (error) {
    console.warn(
      '[geminiService] MOCK FALLBACK: All Gemini retries failed — serving offline question.',
      error,
    )
    return getFallbackNextQuestion(role, transcriptHistory)
  }
}

export async function generateInterviewFeedback(params) {
  if (!isGeminiConfigured()) {
    return { ...generateMockFeedback(params), source: 'mock' }
  }

  try {
    const raw = await withRetry(() => callGemini(buildFeedbackPrompt(params)))
    return normalizeFeedbackResponse(raw, params)
  } catch (error) {
    console.warn(
      '[geminiService] MOCK FALLBACK: Feedback generation failed — serving offline analysis.',
      error,
    )
    return { ...generateMockFeedback(params), source: 'mock' }
  }
}

export const INTERVIEW_TARGET_QUESTIONS = INTERVIEW_TARGET_ROUNDS
