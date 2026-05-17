import { stripEmotionTag } from '../types'

type LipSyncCallback = (mouthOpen: number, isSpeaking: boolean) => void

export type TTSProvider = 'openai-compatible' | 'none'

export interface TTSConfig {
  provider: TTSProvider
  openaiBaseUrl: string
  openaiApiKey: string
  openaiModel: string
  openaiVoice: string
  openaiSpeed: number
}

const DEFAULT_TTS_CONFIG: TTSConfig = {
  provider: 'none',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiApiKey: '',
  openaiModel: 'tts-1',
  openaiVoice: 'alloy',
  openaiSpeed: 1.0,
}

export function getTTSConfig(): TTSConfig {
  const saved = localStorage.getItem('tts-config')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.provider === 'browser') {
        parsed.provider = 'none'
      }
      return { ...DEFAULT_TTS_CONFIG, ...parsed }
    } catch {}
  }
  return DEFAULT_TTS_CONFIG
}

export function saveTTSConfig(config: TTSConfig) {
  localStorage.setItem('tts-config', JSON.stringify(config))
}

let currentAudio: HTMLAudioElement | null = null
let currentObjectUrl: string | null = null
let lipSyncCallback: LipSyncCallback | null = null
let lipSyncAnimationId: number | null = null

function startLipSyncAnimation() {
  if (lipSyncAnimationId !== null) return

  let phase = 0
  const animate = () => {
    phase += 0.15
    const base = 0.3 + Math.sin(phase) * 0.25
    const noise = Math.random() * 0.2
    const mouthOpen = Math.min(1, base + noise)

    if (lipSyncCallback) {
      lipSyncCallback(mouthOpen, true)
    }

    lipSyncAnimationId = requestAnimationFrame(animate)
  }

  lipSyncAnimationId = requestAnimationFrame(animate)
}

function stopLipSyncAnimation() {
  if (lipSyncAnimationId !== null) {
    cancelAnimationFrame(lipSyncAnimationId)
    lipSyncAnimationId = null
  }

  if (lipSyncCallback) {
    lipSyncCallback(0, false)
  }
}

export function onLipSyncUpdate(callback: LipSyncCallback) {
  lipSyncCallback = callback
  return () => {
    lipSyncCallback = null
  }
}

async function speakOpenAI(text: string) {
  const config = getTTSConfig()
  if (!config.openaiApiKey) {
    console.warn('[TTS] No API key configured')
    return
  }

  const cleanText = stripEmotionTag(text)
  if (!cleanText) return

  try {
    const response = await fetch(`${config.openaiBaseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        input: cleanText,
        voice: config.openaiVoice,
        speed: config.openaiSpeed,
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      console.warn('[TTS] TTS API failed:', response.status)
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    currentObjectUrl = url

    const audio = new Audio(url)
    currentAudio = audio

    audio.onplay = () => {
      startLipSyncAnimation()
    }

    audio.onended = () => {
      stopLipSyncAnimation()
      if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null }
      currentAudio = null
    }

    audio.onerror = () => {
      stopLipSyncAnimation()
      if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null }
      currentAudio = null
    }

    await audio.play()
  } catch (err) {
    console.warn('[TTS] TTS error:', err)
  }
}

export function speak(text: string) {
  stop()

  const config = getTTSConfig()
  if (config.provider === 'none') return

  speakOpenAI(text)
}

export function stop() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }

  stopLipSyncAnimation()
}

export function isSpeaking(): boolean {
  return !!currentAudio
}
