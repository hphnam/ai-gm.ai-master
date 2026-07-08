'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { UseFormSetValue } from 'react-hook-form'
import { toast } from 'sonner'

const VOICE_CONSENT_KEY = 'gm.voice.consent.v1'

// Web Speech API typing — DOM lib doesn't expose SpeechRecognition globally
// in every TS setup, so we declare just what we need.
type SpeechRecognitionLike = EventTarget & {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

type VoiceSetter = UseFormSetValue<{ userMessage: string }>

export function useVoiceInput({
  value,
  setValue,
  disabled,
  isPending,
}: {
  value: string
  setValue: VoiceSetter
  disabled: boolean
  isPending: boolean
}) {
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'unsupported'>('idle')
  const [voiceConsentOpen, setVoiceConsentOpen] = useState(false)
  const [voiceConsentGranted, setVoiceConsentGranted] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const transcriptBaseRef = useRef('')

  // Read prior consent on mount. Stored locally per browser/device, not synced
  // server-side — this is a one-time UX nudge, not auth.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      setVoiceConsentGranted(window.localStorage.getItem(VOICE_CONSENT_KEY) === 'granted')
    } catch {
      // localStorage blocked (private mode) — treat as un-granted; user will be re-asked.
    }
  }, [])

  // Detect Web Speech API support once on mount. SSR-safe: window is gated.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition
    if (!Ctor) {
      setVoiceState('unsupported')
      return
    }
    const rec = new Ctor()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-GB' : 'en-GB'
    rec.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript ?? ''
      }
      const combined = `${transcriptBaseRef.current}${transcript}`.trimStart()
      setValue('userMessage', combined, { shouldDirty: true })
    }
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        toast.error('Microphone permission denied')
      } else if (event.error === 'no-speech') {
        // benign — user didn't speak; quietly end
      } else {
        toast.error(`Voice input error (${event.error})`)
      }
      setVoiceState('idle')
    }
    rec.onend = () => setVoiceState('idle')
    recognitionRef.current = rec
    return () => {
      try {
        rec.abort()
      } catch {
        // ignore abort errors on teardown
      }
      recognitionRef.current = null
    }
  }, [setValue])

  const startListening = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    transcriptBaseRef.current = value ? `${value.trimEnd()} ` : ''
    try {
      rec.start()
      setVoiceState('listening')
    } catch {
      try {
        rec.abort()
      } catch {
        // best-effort
      }
      setVoiceState('idle')
    }
  }, [value])

  const grantConsent = useCallback(() => {
    try {
      window.localStorage.setItem(VOICE_CONSENT_KEY, 'granted')
    } catch {
      // best-effort persistence
    }
    setVoiceConsentGranted(true)
    setVoiceConsentOpen(false)
    startListening()
  }, [startListening])

  const toggleVoice = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    if (voiceState === 'listening') {
      rec.stop()
      setVoiceState('idle')
      return
    }
    if (!voiceConsentGranted) {
      setVoiceConsentOpen(true)
      return
    }
    startListening()
  }, [voiceState, voiceConsentGranted, startListening])

  // Stop listening if the parent disables the composer (venue switch,
  // conversation flip to read-only, etc.) or while a turn is in flight.
  // Without this the mic keeps recording into a textarea the user can no
  // longer send from.
  useEffect(() => {
    if ((disabled || isPending) && voiceState === 'listening') {
      recognitionRef.current?.stop()
    }
  }, [disabled, isPending, voiceState])

  const voiceSupported = voiceState !== 'unsupported'
  const voiceListening = voiceState === 'listening'

  return {
    voiceState,
    voiceSupported,
    voiceListening,
    voiceConsentOpen,
    setVoiceConsentOpen,
    toggleVoice,
    grantConsent,
  }
}
