import { generateMockFeedback } from '../constants/mockFeedback'
import { getQuestionsForRole } from '../constants/mockQuestions'

const MODEL = 'gemini-2.5-flash'
const API_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const MAX_RETRIES = 2
const INTERVIEW_TARGET_ROUNDS = 3

function getApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? ''
}

export function isGeminiConfigured() {
  return Boolean(getApiKey())
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatTranscriptHistory(transcriptHistory) {
  if (!transcriptHistory.length) {
    return 'No previous exchanges. This is the opening question.'
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
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`)
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
      if (attempt < MAX_RETRIES) {
        await delay(800 * (attempt + 1))
      }
    }
  }

  throw lastError
}

function buildInterviewerPrompt({ role, transcriptHistory }) {
  const roundsCompleted = transcriptHistory.length
  const isOpening = roundsCompleted === 0

  return `You are a professional interviewer conducting a realistic ${role?.title ?? 'job'} interview.

Role track: ${role?.label ?? 'GENERAL'}
Role focus: ${role?.description ?? 'General professional interview'}

Behavior rules:
- Ask exactly ONE concise question at a time (1-2 sentences max, no preamble)
- Ask realistic, role-specific interview questions
- If the candidate's last answer was vague, shallow, or missing specifics, ask a sharp follow-up that challenges them
- Use follow-ups to probe depth before moving to a new topic
- When an answer is strong and complete, move to a new topic
- Aim for about ${INTERVIEW_TARGET_ROUNDS} substantive question rounds total
- Set shouldEndInterview to true after ${INTERVIEW_TARGET_ROUNDS} completed Q&A rounds unless one critical follow-up is absolutely necessary
- Never repeat a question that was already asked

${isOpening ? 'Generate the opening interview question.' : `Interview transcript so far:\n${formatTranscriptHistory(transcriptHistory)}\n\nGenerate the next question based on the candidate's last answer.`}

Respond with JSON only:
{
  "question": "string",
  "shouldEndInterview": boolean,
  "isFollowUp": boolean
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

function normalizeQuestionResponse(raw) {
  const question = String(raw?.question ?? '').trim()
  return {
    question,
    shouldEndInterview: Boolean(raw?.shouldEndInterview),
    isFollowUp: Boolean(raw?.isFollowUp),
  }
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
  if (!isGeminiConfigured()) {
    return getFallbackNextQuestion(role, transcriptHistory)
  }

  try {
    const raw = await withRetry(() =>
      callGemini(buildInterviewerPrompt({ role, transcriptHistory })),
    )
    const normalized = normalizeQuestionResponse(raw)

    if (!normalized.question) {
      throw new Error('Gemini returned an empty question')
    }

    return { ...normalized, source: 'gemini' }
  } catch (error) {
    console.warn('[geminiService] Falling back to mock question:', error)
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
    console.warn('[geminiService] Falling back to mock feedback:', error)
    return { ...generateMockFeedback(params), source: 'mock' }
  }
}

export const INTERVIEW_TARGET_QUESTIONS = INTERVIEW_TARGET_ROUNDS
