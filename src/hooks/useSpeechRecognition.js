import { useCallback, useEffect, useRef, useState } from 'react'

const FILLER_PATTERNS = [
  { key: 'you know', regex: /\byou know\b/gi },
  { key: 'basically', regex: /\bbasically\b/gi },
  { key: 'literally', regex: /\bliterally\b/gi },
  { key: 'like', regex: /\blike\b/gi },
  { key: 'um', regex: /\bum\b/gi },
  { key: 'uh', regex: /\buh\b/gi },
]

const INITIAL_FILLER_COUNTS = {
  um: 0,
  uh: 0,
  like: 0,
  'you know': 0,
  basically: 0,
  literally: 0,
}

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function countFillerWords(text) {
  const counts = { ...INITIAL_FILLER_COUNTS }
  if (!text) return counts

  for (const { key, regex } of FILLER_PATTERNS) {
    const matches = text.match(regex)
    counts[key] = matches ? matches.length : 0
  }

  return counts
}

function mapSpeechError(event) {
  switch (event.error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return {
        type: 'permission',
        message: 'Microphone access was denied. Please allow microphone permissions and try again.',
      }
    case 'no-speech':
      return {
        type: 'no-speech',
        message: 'No speech detected. Please speak clearly into your microphone.',
      }
    case 'audio-capture':
      return {
        type: 'audio-capture',
        message: 'No microphone was found. Please connect a microphone and try again.',
      }
    case 'network':
      return {
        type: 'network',
        message: 'Network error occurred during speech recognition.',
      }
    case 'aborted':
      return null
    default:
      return {
        type: event.error,
        message: `Speech recognition error: ${event.error}`,
      }
  }
}

export function useSpeechRecognition() {
  const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
  const isSupported = SpeechRecognitionCtor !== null

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [fillerCounts, setFillerCounts] = useState(INITIAL_FILLER_COUNTS)
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)
  const shouldListenRef = useRef(false)
  const transcriptRef = useRef('')
  const interimRef = useRef('')

  const updateFillerCounts = useCallback((finalText, interimText) => {
    const combined = [finalText, interimText].filter(Boolean).join(' ')
    setFillerCounts(countFillerWords(combined))
  }, [])

  const resetTranscript = useCallback(() => {
    transcriptRef.current = ''
    interimRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    setFillerCounts(INITIAL_FILLER_COUNTS)
    setError(null)
  }, [])

  const getFullTranscript = useCallback(() => {
    return [transcriptRef.current, interimRef.current]
      .filter(Boolean)
      .join(' ')
      .trim()
  }, [])

  useEffect(() => {
    if (!isSupported) return

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let interim = ''
      let finalChunk = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript

        if (result.isFinal) {
          finalChunk += text
        } else {
          interim += text
        }
      }

      setTranscript((prev) => {
        const updated = finalChunk ? prev + finalChunk : prev
        transcriptRef.current = updated
        interimRef.current = interim
        updateFillerCounts(updated, interim)
        return updated
      })
      setInterimTranscript(interim)
    }

    recognition.onerror = (event) => {
      const mapped = mapSpeechError(event)
      if (!mapped) return

      setError(mapped)

      if (mapped.type === 'permission' || mapped.type === 'audio-capture') {
        shouldListenRef.current = false
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start()
        } catch {
          setIsListening(false)
          shouldListenRef.current = false
        }
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      shouldListenRef.current = false
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try {
        recognition.stop()
      } catch {
        // recognition may not be running
      }
    }
  }, [SpeechRecognitionCtor, isSupported, updateFillerCounts])

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return false

    setError(null)
    shouldListenRef.current = true

    try {
      recognitionRef.current.start()
      setIsListening(true)
      return true
    } catch {
      setIsListening(false)
      shouldListenRef.current = false
      return false
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false

    if (!recognitionRef.current) {
      setIsListening(false)
      return
    }

    try {
      recognitionRef.current.stop()
    } catch {
      // recognition may already be stopped
    }

    setIsListening(false)
    interimRef.current = ''
    setInterimTranscript('')
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    fillerCounts,
    error,
    startListening,
    stopListening,
    resetTranscript,
    getFullTranscript,
  }
}
