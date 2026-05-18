import { create } from 'zustand'
import type { ChatMessage, Emotion, EmotionState, ContextMessage, ContextSnapshot } from '../types'
import type { DisplayModel } from '../types/model'
import { EMOTION_CONFIGS } from '../types'
import { loadModels, getSelectedModelId, setSelectedModelId, extractZipToBlobUrls, getPresetModels } from '../services/modelService'
import { loadMessages, saveMessage, clearMessages } from '../services/chatStorage'
import { restoreConversationFromMessages } from '../services/llmService'
import { stripEmotionTag } from '../types'
import { ModelFormat } from '../types/model'

interface ModelLoadRequest {
  url: string
  cleanup: (() => void) | null
}

interface ChatState {
  messages: ChatMessage[]
  currentEmotion: Emotion
  emotionHistory: EmotionState[]
  emotionTimer: ReturnType<typeof setTimeout> | null
  contextSnapshots: ContextSnapshot
  isStreaming: boolean
  streamingText: string
  showSettings: boolean
  modelUrl: string
  modelLoaded: boolean
  models: DisplayModel[]
  selectedModelId: string
  modelLoadRequest: ModelLoadRequest | null
  historyLoaded: boolean
  addMessage: (message: ChatMessage) => void
  updateLastAiMessage: (text: string) => void
  setLastAiMessageDone: () => void
  setCurrentEmotion: (emotion: Emotion) => void
  setStreaming: (streaming: boolean) => void
  setStreamingText: (text: string) => void
  appendStreamingText: (char: string) => void
  setShowSettings: (show: boolean) => void
  setModelUrl: (url: string) => void
  setModelLoaded: (loaded: boolean) => void
  setModels: (models: DisplayModel[]) => void
  setSelectedModelId: (id: string) => void
  setModelLoadRequest: (req: ModelLoadRequest | null) => void
  reloadModels: () => Promise<void>
  switchToModel: (id: string) => Promise<void>
  loadHistory: () => Promise<boolean>
  clearHistory: () => Promise<void>
  ingestContextMessage: (contextId: string, text: string) => void
  clearContextSnapshots: () => void
  getContextsSnapshot: () => ContextSnapshot
}

async function resolveModelUrl(model: DisplayModel): Promise<{ url: string; cleanup: (() => void) | null }> {
  if (model.type === 'url') {
    return { url: model.url, cleanup: null }
  }

  if (model.format === ModelFormat.Live2DZip) {
    const result = await extractZipToBlobUrls(model.fileData)
    return { url: result.modelUrl, cleanup: result.cleanup }
  }

  throw new Error('不支持的模型格式')
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentEmotion: 'calm',
  emotionHistory: [],
  emotionTimer: null,
  contextSnapshots: {},
  isStreaming: false,
  streamingText: '',
  showSettings: false,
  modelUrl: `${import.meta.env.BASE_URL}live2d/hiyori/hiyori_free_t08.model3.json`,
  modelLoaded: false,
  models: getPresetModels(),
  selectedModelId: getSelectedModelId() || 'preset-hiyori-free',
  modelLoadRequest: null,
  historyLoaded: false,

  loadHistory: async () => {
    try {
      const saved = await loadMessages()
      if (saved.length > 0) {
        const cleaned = saved.map(m =>
          m.role === 'ai' ? { ...m, content: stripEmotionTag(m.content) } : m
        )
        restoreConversationFromMessages(cleaned)
        set({ messages: cleaned, historyLoaded: true })
        return true
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
    }
    set({ historyLoaded: true })
    return false
  },

  clearHistory: async () => {
    await clearMessages()
    set({ messages: [] })
  },

  addMessage: (message) =>
    set((state) => {
      const lastTs = state.messages.length > 0 ? (state.messages[state.messages.length - 1].timestamp || 0) : 0
      const ts = message.timestamp ? Math.max(message.timestamp, lastTs + 1) : Math.max(Date.now(), lastTs + 1)
      const msg = { ...message, timestamp: ts }
      let messages = [...state.messages, msg]
      if (messages.length > 250) {
        messages = messages.slice(-200)
      }
      if (!msg.isStreaming) {
        saveMessage(msg).catch(console.error)
      }
      return { messages }
    }),

  updateLastAiMessage: (text) =>
    set((state) => {
      const messages = [...state.messages]
      const lastIdx = messages.findLastIndex((m) => m.role === 'ai')
      if (lastIdx >= 0) {
        messages[lastIdx] = { ...messages[lastIdx], content: stripEmotionTag(text) }
      }
      return { messages }
    }),

  setLastAiMessageDone: () =>
    set((state) => {
      const messages = [...state.messages]
      const lastIdx = messages.findLastIndex((m) => m.role === 'ai')
      if (lastIdx >= 0) {
        const done = { ...messages[lastIdx], isStreaming: false }
        messages[lastIdx] = done
        saveMessage(done).catch(console.error)
      }
      return { messages, isStreaming: false }
    }),

  setCurrentEmotion: (emotion) => {
    const state = get()
    const config = EMOTION_CONFIGS[emotion]

    if (state.emotionTimer) {
      clearTimeout(state.emotionTimer)
    }

    const newEmotionState: EmotionState = {
      emotion,
      startTime: Date.now(),
      duration: config.duration,
    }

    const newHistory = [...state.emotionHistory, newEmotionState].slice(-5)

    const timer = setTimeout(() => {
      const current = get().currentEmotion
      if (current === emotion) {
        set({ currentEmotion: 'calm' })
      }
    }, config.duration)

    set({
      currentEmotion: emotion,
      emotionHistory: newHistory,
      emotionTimer: timer,
    })
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingText: (text) => set({ streamingText: text }),
  appendStreamingText: (char) =>
    set((state) => ({ streamingText: state.streamingText + char })),
  setShowSettings: (show) => set({ showSettings: show }),
  setModelUrl: (url) => set({ modelUrl: url }),
  setModelLoaded: (loaded) => set({ modelLoaded: loaded }),
  setModels: (models) => set({ models }),
  setSelectedModelId: (id) => {
    setSelectedModelId(id)
    set({ selectedModelId: id })
  },
  setModelLoadRequest: (req) => set({ modelLoadRequest: req }),

  reloadModels: async () => {
    const models = await loadModels()
    set({ models })
  },

  switchToModel: async (id: string) => {
    const state = get()
    const model = state.models.find(m => m.id === id)
    if (!model) return

    setSelectedModelId(id)
    set({ selectedModelId: id, modelLoaded: false })

    try {
      const { url, cleanup } = await resolveModelUrl(model)
      set({
        modelUrl: url,
        modelLoadRequest: { url, cleanup },
      })
    } catch (err) {
      console.error('Failed to switch model:', err)
      set({ modelLoaded: false })
    }
  },

  ingestContextMessage: (contextId: string, text: string) => {
    set((state) => {
      const existing = state.contextSnapshots[contextId] || []
      const newMessage: ContextMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
      }
      const updated = [...existing, newMessage].slice(-10)
      return {
        contextSnapshots: {
          ...state.contextSnapshots,
          [contextId]: updated,
        },
      }
    })
  },

  clearContextSnapshots: () => set({ contextSnapshots: {} }),

  getContextsSnapshot: () => get().contextSnapshots,
}))