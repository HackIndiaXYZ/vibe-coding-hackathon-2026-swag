import { useCallback, useEffect, useRef, useState } from 'react'
import { INTERVIEW_STATES } from '../constants/interviewStates'
import {
  generateNextQuestion,
  INTERVIEW_TARGET_QUESTIONS,
  isGeminiConfigured,
} from '../services/geminiService'
import { countFillerWords, useSpeechRecognition } from './useSpeechRecognition'

function estimateSpeakingDuration(text) {
  const words = text.split(/\s+/).length
  return Math.min(Math.max(words * 320, 2500), 6000)
}

function logTransition(label, detail) {
  if (detail !== undefined) {
    console.log(`[InterviewStateMachine] ${label}`, detail)
  } else {
    console.log(`[InterviewStateMachine] ${label}`)
  }
}

export function useInterviewStateMachine(role) {
  const [state, setState] = useState(INTERVIEW_STATES.IDLE)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [submittedTranscript, setSubmittedTranscript] = useState('')
  const [transcriptHistory, setTranscriptHistory] = useState([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const timerRef = useRef(null)
  const transitionRef = useRef(null)
  const idleBootstrapRef = useRef(null)
  const mountedRef = useRef(true)
  const lastAiActionRef = useRef(null)

  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript: liveTranscript,
    interimTranscript,
    fillerCounts,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    getFullTranscript,
  } = useSpeechRecognition()

  const progress = Math.min(
    100,
    state === INTERVIEW_STATES.INTERVIEW_COMPLETE
      ? 100
      : ((questionIndex + (state === INTERVIEW_STATES.AI_ANALYZING ? 1 : 0)) /
          INTERVIEW_TARGET_QUESTIONS) *
        100,
  )

  const isComplete =
    state === INTERVIEW_STATES.INTERVIEW_COMPLETE ||
    (questionIndex >= INTERVIEW_TARGET_QUESTIONS - 1 &&
      state === INTERVIEW_STATES.AI_ANALYZING)

  const clearScheduledTransition = useCallback(() => {
    if (transitionRef.current) {
      clearTimeout(transitionRef.current)
      transitionRef.current = null
    }
  }, [])

  const clearIdleBootstrap = useCallback(() => {
    if (idleBootstrapRef.current) {
      clearTimeout(idleBootstrapRef.current)
      idleBootstrapRef.current = null
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    logTransition(`state → ${state}`)
  }, [state])

  const beginAiSpeaking = useCallback(
    (questionText) => {
      const question = questionText?.trim() ?? ''
      logTransition('transition → AI_SPEAKING', { questionIndex })
      setCurrentQuestion(question)
      setState(INTERVIEW_STATES.AI_SPEAKING)
      setSubmittedTranscript('')
      resetTranscript()
      stopListening()

      const duration = estimateSpeakingDuration(question || 'Preparing question')
      clearScheduledTransition()
      logTransition('scheduling AI_SPEAKING → USER_SPEAKING', { durationMs: duration })
      transitionRef.current = setTimeout(() => {
        logTransition('transition → USER_SPEAKING')
        setState(INTERVIEW_STATES.USER_SPEAKING)
      }, duration)
    },
    [clearScheduledTransition, questionIndex, resetTranscript, stopListening],
  )

  const fetchAndPresentQuestion = useCallback(
    async (history) => {
      setIsAiLoading(true)
      setAiError(null)
      lastAiActionRef.current = { type: 'question', history }

      try {
        const result = await generateNextQuestion({ role, transcriptHistory: history })

        if (!mountedRef.current) return

        if (result.source === 'mock' && isGeminiConfigured()) {
          setAiError({
            message: 'AI unavailable — using offline interview questions.',
            canRetry: true,
          })
        }

        if (result.shouldEndInterview) {
          logTransition('transition → INTERVIEW_COMPLETE')
          setState(INTERVIEW_STATES.INTERVIEW_COMPLETE)
          return
        }

        if (history.length > 0) {
          setQuestionIndex((prev) => prev + 1)
        }

        beginAiSpeaking(result.question)
      } catch (error) {
        if (!mountedRef.current) return

        setAiError({
          message: error.message || 'Failed to load AI question.',
          canRetry: true,
        })
      } finally {
        if (mountedRef.current) {
          setIsAiLoading(false)
        }
      }
    },
    [beginAiSpeaking, role],
  )

  const processAnswer = useCallback(
    async (updatedHistory) => {
      logTransition('transition → AI_ANALYZING')
      setState(INTERVIEW_STATES.AI_ANALYZING)
      setIsAiLoading(true)
      setAiError(null)
      lastAiActionRef.current = { type: 'answer', history: updatedHistory }

      try {
        const result = await generateNextQuestion({
          role,
          transcriptHistory: updatedHistory,
        })

        if (!mountedRef.current) return

        if (result.source === 'mock' && isGeminiConfigured()) {
          setAiError({
            message: 'AI unavailable — using offline interview questions.',
            canRetry: true,
          })
        }

        if (result.shouldEndInterview) {
          logTransition('transition → INTERVIEW_COMPLETE')
          setState(INTERVIEW_STATES.INTERVIEW_COMPLETE)
          return
        }

        setQuestionIndex((prev) => prev + 1)
        beginAiSpeaking(result.question)
      } catch (error) {
        if (!mountedRef.current) return

        setAiError({
          message: error.message || 'Failed to analyze your response.',
          canRetry: true,
        })
      } finally {
        if (mountedRef.current) {
          setIsAiLoading(false)
        }
      }
    },
    [beginAiSpeaking, role],
  )

  const retryAiAction = useCallback(() => {
    const lastAction = lastAiActionRef.current
    if (!lastAction) return

    if (lastAction.type === 'question') {
      fetchAndPresentQuestion(lastAction.history)
      return
    }

    if (lastAction.type === 'answer') {
      processAnswer(lastAction.history)
    }
  }, [fetchAndPresentQuestion, processAnswer])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      clearScheduledTransition()
      clearIdleBootstrap()
    }
  }, [clearIdleBootstrap, clearScheduledTransition])

  useEffect(() => {
    if (state !== INTERVIEW_STATES.IDLE) return

    logTransition('scheduling IDLE → fetch first question', { delayMs: 1200 })
    idleBootstrapRef.current = setTimeout(() => {
      logTransition('IDLE bootstrap complete → fetch first question')
      fetchAndPresentQuestion([])
    }, 1200)

    return clearIdleBootstrap
  }, [clearIdleBootstrap, fetchAndPresentQuestion, state])

  const toggleRecording = useCallback(() => {
    if (state !== INTERVIEW_STATES.USER_SPEAKING || isAiLoading) return

    if (!isListening) {
      resetTranscript()
      setSubmittedTranscript('')
      startListening()
      return
    }

    const finalAnswer = getFullTranscript()
    const finalFillerCounts = countFillerWords(finalAnswer)
    stopListening()

    setSubmittedTranscript(finalAnswer)
    const updatedHistory = [
      ...transcriptHistory,
      { question: currentQuestion, answer: finalAnswer, fillerCounts: finalFillerCounts },
    ]
    setTranscriptHistory(updatedHistory)
    clearScheduledTransition()
    processAnswer(updatedHistory)
  }, [
    clearScheduledTransition,
    currentQuestion,
    getFullTranscript,
    isAiLoading,
    isListening,
    processAnswer,
    resetTranscript,
    startListening,
    state,
    stopListening,
    transcriptHistory,
  ])

  return {
    state,
    questionIndex,
    totalQuestions: INTERVIEW_TARGET_QUESTIONS,
    currentQuestion: isAiLoading && state === INTERVIEW_STATES.IDLE
      ? 'Initializing interview session...'
      : currentQuestion,
    isRecording: isListening,
    transcript: isListening ? liveTranscript : submittedTranscript,
    interimTranscript: isListening ? interimTranscript : '',
    fillerCounts,
    isSpeechSupported,
    speechError,
    transcriptHistory,
    elapsedSeconds,
    progress,
    isComplete,
    isAiLoading,
    aiError,
    retryAiAction,
    toggleRecording,
  }
}
