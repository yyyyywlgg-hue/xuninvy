export type Emotion =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'shy'
  | 'calm'
  | 'think'
  | 'surprised'
  | 'curious'
  | 'awkward'

export type WeatherEffect = 'none' | 'rain' | 'snow' | 'lightning' | 'petals' | 'fireflies'

export interface EmotionConfig {
  particleColor: number
  particleColorHex: string
  particleSpeed: number
  particleDensity: number
  weatherEffect: WeatherEffect
  characterExpression: string
  live2dMotion: string
  bgGradientStart: string
  bgGradientEnd: string
  label: string
  emoji: string
}

export const EMOTION_CONFIGS: Record<Emotion, EmotionConfig> = {
  happy: {
    particleColor: 0xfbbf24,
    particleColorHex: '#fbbf24',
    particleSpeed: 1.5,
    particleDensity: 1.3,
    weatherEffect: 'petals',
    characterExpression: 'happy',
    live2dMotion: 'Happy',
    bgGradientStart: '#1a1005',
    bgGradientEnd: '#0a0a1a',
    label: '开心',
    emoji: '😊',
  },
  sad: {
    particleColor: 0x60a5fa,
    particleColorHex: '#60a5fa',
    particleSpeed: 0.5,
    particleDensity: 0.8,
    weatherEffect: 'rain',
    characterExpression: 'sad',
    live2dMotion: 'Sad',
    bgGradientStart: '#050a1a',
    bgGradientEnd: '#0a0a1a',
    label: '难过',
    emoji: '😢',
  },
  angry: {
    particleColor: 0xef4444,
    particleColorHex: '#ef4444',
    particleSpeed: 2.5,
    particleDensity: 1.5,
    weatherEffect: 'lightning',
    characterExpression: 'angry',
    live2dMotion: 'Angry',
    bgGradientStart: '#1a0505',
    bgGradientEnd: '#0a0a1a',
    label: '生气',
    emoji: '😤',
  },
  shy: {
    particleColor: 0xf9a8d4,
    particleColorHex: '#f9a8d4',
    particleSpeed: 0.8,
    particleDensity: 1.0,
    weatherEffect: 'fireflies',
    characterExpression: 'shy',
    live2dMotion: 'Awkward',
    bgGradientStart: '#1a0515',
    bgGradientEnd: '#0a0a1a',
    label: '害羞',
    emoji: '😳',
  },
  calm: {
    particleColor: 0x8b5cf6,
    particleColorHex: '#8b5cf6',
    particleSpeed: 0.6,
    particleDensity: 1.0,
    weatherEffect: 'none',
    characterExpression: 'calm',
    live2dMotion: 'Idle',
    bgGradientStart: '#0a051a',
    bgGradientEnd: '#0a0a1a',
    label: '平静',
    emoji: '😌',
  },
  think: {
    particleColor: 0x38bdf8,
    particleColorHex: '#38bdf8',
    particleSpeed: 0.4,
    particleDensity: 0.9,
    weatherEffect: 'none',
    characterExpression: 'think',
    live2dMotion: 'Think',
    bgGradientStart: '#05101a',
    bgGradientEnd: '#0a0a1a',
    label: '思考',
    emoji: '🤔',
  },
  surprised: {
    particleColor: 0xfacc15,
    particleColorHex: '#facc15',
    particleSpeed: 2.0,
    particleDensity: 1.4,
    weatherEffect: 'none',
    characterExpression: 'surprised',
    live2dMotion: 'Surprise',
    bgGradientStart: '#1a1505',
    bgGradientEnd: '#0a0a1a',
    label: '惊讶',
    emoji: '😲',
  },
  curious: {
    particleColor: 0xa78bfa,
    particleColorHex: '#a78bfa',
    particleSpeed: 0.7,
    particleDensity: 1.1,
    weatherEffect: 'fireflies',
    characterExpression: 'curious',
    live2dMotion: 'Curious',
    bgGradientStart: '#10051a',
    bgGradientEnd: '#0a0a1a',
    label: '好奇',
    emoji: '🧐',
  },
  awkward: {
    particleColor: 0xfb923c,
    particleColorHex: '#fb923c',
    particleSpeed: 0.9,
    particleDensity: 1.0,
    weatherEffect: 'none',
    characterExpression: 'awkward',
    live2dMotion: 'Awkward',
    bgGradientStart: '#1a0f05',
    bgGradientEnd: '#0a0a1a',
    label: '尴尬',
    emoji: '😅',
  },
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  emotion?: Emotion
  isStreaming?: boolean
  timestamp?: number
}

export interface StreamChunk {
  type: 'text_delta' | 'emotion' | 'done'
  content?: string
  emotion?: Emotion
}
