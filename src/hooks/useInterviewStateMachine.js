import { useCallback, useEffect, useRef, useState } from 'react'
import { INTERVIEW_STATES } from '../constants/interviewStates'
import { getQuestionsForRole } from '../constants/mockQuestions'

const MOCK_USER_RESPONSES = [
  'I would start by clarifying requirements and constraints, then break the problem into smaller components...',
  'In that situation I focused on isolating the root cause first, then communicated updates to stakeholders...',
  'My approach was to gather metrics, form a hypothesis, and validate with a controlled experiment...',
]

function estimateSpeakingDuration(text) {
  const words = text.split(/\s+/).length
  return Math.min(Math.max(words * 320, 2500), 6000)
}

export function useInterviewStateMachine(role) {
  const questions = getQuestionsForRole(role?.id)
  const [state, setState] = useState(INTERVIEW_STATES.IDLE)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [transcriptHistory, setTranscriptHistory] = useState([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef(null)
  const transitionRef = useRef(null)

  const currentQuestion = questions[questionIndex] ?? ''
  const progress = ((questionIndex + (state === INTERVIEW_STATES.AI_ANALYZING ? 1 : 0)) / questions.length) * 100
  const isComplete = questionIndex >= questions.length - 1 && state === INTERVIEW_STATES.AI_ANALYZING

  const clearScheduledTransition = useCallback(() => {
    if (transitionRef.current) {
      clearTimeout(transitionRef.current)
      transitionRef.current = null
    }
  }, [])

  const beginAiSpeaking = useCallback(
    (index = questionIndex) => {
      setState(INTERVIEW_STATES.AI_SPEAKING)
      setTranscript('')
      setIsRecording(false)

      const duration = estimateSpeakingDuration(questions[index] ?? '')
      clearScheduledTransition()
      transitionRef.current = setTimeout(() => {
        setState(INTERVIEW_STATES.USER_SPEAKING)
      }, duration)
    },
    [clearScheduledTransition, questionIndex, questions],
  )

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(timerRef.current)
      clearScheduledTransition()
    }
  }, [clearScheduledTransition])

  useEffect(() => {
    if (state !== INTERVIEW_STATES.IDLE) return

    transitionRef.current = setTimeout(() => {
      beginAiSpeaking()
    }, 1200)

    return clearScheduledTransition
  }, [beginAiSpeaking, clearScheduledTransition, state])

  const toggleRecording = useCallback(() => {
    if (state !== INTERVIEW_STATES.USER_SPEAKING) return

    if (!isRecording) {
      setIsRecording(true)
      setTranscript('')
      return
    }

    setIsRecording(false)
    const mockResponse =
      MOCK_USER_RESPONSES[questionIndex % MOCK_USER_RESPONSES.length]
    setTranscript(mockResponse)
    setTranscriptHistory((prev) => [
      ...prev,
      { question: currentQuestion, answer: mockResponse },
    ])
    setState(INTERVIEW_STATES.AI_ANALYZING)

    clearScheduledTransition()
    transitionRef.current = setTimeout(() => {
      if (questionIndex < questions.length - 1) {
        const nextIndex = questionIndex + 1
        setQuestionIndex(nextIndex)
        beginAiSpeaking(nextIndex)
      }
    }, 2800)
  }, [
    beginAiSpeaking,
    clearScheduledTransition,
    currentQuestion,
    isRecording,
    questionIndex,
    questions.length,
    state,
  ])

  return {
    state,
    questionIndex,
    totalQuestions: questions.length,
    currentQuestion,
    isRecording,
    transcript,
    transcriptHistory,
    elapsedSeconds,
    progress,
    isComplete,
    toggleRecording,
  }
}
