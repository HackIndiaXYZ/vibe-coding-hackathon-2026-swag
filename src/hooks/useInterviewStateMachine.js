import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { INTERVIEW_STATES } from '../constants/interviewStates'
import { getQuestionsForRole } from '../constants/mockQuestions'
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
  const questions = useMemo(
    () => getQuestionsForRole(role?.id),
    [role?.id],
  )
  const [state, setState] = useState(INTERVIEW_STATES.IDLE)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [submittedTranscript, setSubmittedTranscript] = useState('')
  const [transcriptHistory, setTranscriptHistory] = useState([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef(null)
  const transitionRef = useRef(null)
  const idleBootstrapRef = useRef(null)

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

  const currentQuestion = questions[questionIndex] ?? ''
  const progress = ((questionIndex + (state === INTERVIEW_STATES.AI_ANALYZING ? 1 : 0)) / questions.length) * 100
  const isComplete =
    state === INTERVIEW_STATES.INTERVIEW_COMPLETE ||
    (questionIndex >= questions.length - 1 && state === INTERVIEW_STATES.AI_ANALYZING)

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
    logTransition(`state → ${state}`)
  }, [state])

  const beginAiSpeaking = useCallback(
    (index = questionIndex) => {
      logTransition('transition → AI_SPEAKING', { questionIndex: index })
      setState(INTERVIEW_STATES.AI_SPEAKING)
      setSubmittedTranscript('')
      resetTranscript()
      stopListening()

      const duration = estimateSpeakingDuration(questions[index] ?? '')
      clearScheduledTransition()
      logTransition('scheduling AI_SPEAKING → USER_SPEAKING', { durationMs: duration })
      transitionRef.current = setTimeout(() => {
        logTransition('transition → USER_SPEAKING')
        setState(INTERVIEW_STATES.USER_SPEAKING)
      }, duration)
    },
    [clearScheduledTransition, questionIndex, questions, resetTranscript, stopListening],
  )

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

    logTransition('scheduling IDLE → AI_SPEAKING', { delayMs: 1200 })
    idleBootstrapRef.current = setTimeout(() => {
      logTransition('IDLE bootstrap complete → beginAiSpeaking')
      beginAiSpeaking()
    }, 1200)

    return clearIdleBootstrap
  }, [beginAiSpeaking, clearIdleBootstrap, state])

  const toggleRecording = useCallback(() => {
    if (state !== INTERVIEW_STATES.USER_SPEAKING) return

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
    setTranscriptHistory((prev) => [
      ...prev,
      { question: currentQuestion, answer: finalAnswer, fillerCounts: finalFillerCounts },
    ])
    logTransition('transition → AI_ANALYZING')
    setState(INTERVIEW_STATES.AI_ANALYZING)

    clearScheduledTransition()
    logTransition('scheduling AI_ANALYZING → next question', { delayMs: 2800 })
    transitionRef.current = setTimeout(() => {
      if (questionIndex < questions.length - 1) {
        const nextIndex = questionIndex + 1
        logTransition('advancing to next question', { nextIndex })
        setQuestionIndex(nextIndex)
        beginAiSpeaking(nextIndex)
      } else {
        logTransition('transition → INTERVIEW_COMPLETE')
        setState(INTERVIEW_STATES.INTERVIEW_COMPLETE)
      }
    }, 2800)
  }, [
    beginAiSpeaking,
    clearScheduledTransition,
    currentQuestion,
    getFullTranscript,
    isListening,
    questionIndex,
    questions.length,
    resetTranscript,
    startListening,
    state,
    stopListening,
  ])

  return {
    state,
    questionIndex,
    totalQuestions: questions.length,
    currentQuestion,
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
    toggleRecording,
  }
}
