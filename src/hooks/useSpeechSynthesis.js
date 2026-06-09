import { useCallback, useEffect, useRef, useState } from 'react'

const SPEECH_CONFIG = {
  lang: 'en-US',
  rate: 0.92,
  pitch: 1.05,
}

function pickVoice(voices) {
  if (!voices.length) return null

  const googleUsEnglish = voices.find((voice) => voice.name === 'Google US English')
  if (googleUsEnglish) return googleUsEnglish

  const enUsVoice = voices.find(
    (voice) => voice.lang === 'en-US' || voice.lang.startsWith('en-US'),
  )
  if (enUsVoice) return enUsVoice

  return voices.find((voice) => voice.lang.startsWith('en')) ?? null
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const voiceRef = useRef(null)
  const utteranceRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      voiceRef.current = pickVoice(voices)
    }

    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      window.speechSynthesis.cancel()
    }
  }, [])

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setIsSpeaking(false)
  }, [])

  const speak = useCallback((text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const trimmed = text?.trim()
    if (!trimmed) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(trimmed)
    utterance.lang = SPEECH_CONFIG.lang
    utterance.rate = SPEECH_CONFIG.rate
    utterance.pitch = SPEECH_CONFIG.pitch

    if (voiceRef.current) {
      utterance.voice = voiceRef.current
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      utteranceRef.current = null
      setIsSpeaking(false)
    }

    utterance.onerror = () => {
      utteranceRef.current = null
      setIsSpeaking(false)
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  return {
    speak,
    cancel,
    isSpeaking,
  }
}
