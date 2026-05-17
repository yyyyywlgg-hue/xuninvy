import { useState, useRef, useEffect } from 'react'
import { Settings, Mic, MicOff, Square } from 'lucide-react'
import PixiCanvas from './components/PixiCanvas'
import ChatBubble from './components/ChatBubble'
import InputBar from './components/InputBar'
import PerfMonitor from './components/PerfMonitor'
import SettingsPanel from './components/SettingsPanel'
import { useChatStore } from './store/useChatStore'
import { streamChat, getGreetingStream } from './services/llmService'
import type { StreamChunk } from './types'
import { speak, stop as stopTTS } from './services/ttsService'
import { startListening, stopListening, getIsListening } from './services/sttService'

export default function App() {
  const {
    messages,
    currentEmotion,
    isStreaming,
    streamingText,
    showSettings,
    modelLoaded,
    addMessage,
    updateLastAiMessage,
    setLastAiMessageDone,
    setCurrentEmotion,
    setStreaming,
    setStreamingText,
    appendStreamingText,
    setShowSettings,
    loadHistory,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const pixiAppRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    let cancelStream: (() => void) | null = null

    loadHistory().then((hasHistory) => {
      if (cancelled || hasHistory) return

      const greetingId = `greeting-${Date.now()}`
      addMessage({ id: greetingId, role: 'ai', content: '', isStreaming: true, timestamp: Date.now() })
      setStreaming(true)

      cancelStream = getGreetingStream(
        (chunk: StreamChunk) => {
          if (chunk.type === 'text_delta' && chunk.content) {
            appendStreamingText(chunk.content)
            updateLastAiMessage(useChatStore.getState().streamingText)
          } else if (chunk.type === 'emotion' && chunk.emotion) {
            setCurrentEmotion(chunk.emotion)
          } else if (chunk.type === 'done') {
            updateLastAiMessage(useChatStore.getState().streamingText)
            setLastAiMessageDone()
            setStreamingText('')
          }
        },
        () => {}
      )
    })

    return () => {
      cancelled = true
      cancelStream?.()
    }
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, streamingText])

  const handleSend = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || isStreaming) return

    setInput('')
    setInterimText('')
    addMessage({ id: `user-${Date.now()}`, role: 'user', content: msg, timestamp: Date.now() })
    addMessage({ id: `ai-${Date.now()}`, role: 'ai', content: '', isStreaming: true, timestamp: Date.now() })
    setStreaming(true)
    setStreamingText('')

    let fullText = ''

    await streamChat(
      msg,
      (chunk) => {
        if (chunk.type === 'text_delta' && chunk.content) {
          fullText += chunk.content
          setStreamingText(fullText)
          updateLastAiMessage(fullText)
        } else if (chunk.type === 'emotion' && chunk.emotion) {
          setCurrentEmotion(chunk.emotion)
        } else if (chunk.type === 'done') {
          const finalText = fullText.replace(/^\[.*?\]\s*/, '')
          if (finalText) {
            speak(finalText)
          }
        }
      },
      () => {
        updateLastAiMessage(fullText)
        setLastAiMessageDone()
        setStreamingText('')
      },
      (err) => {
        updateLastAiMessage(`[ERROR] ${err}`)
        setLastAiMessageDone()
        setStreamingText('')
      }
    )
  }

  const handleAppReady = (app: any) => {
    pixiAppRef.current = app
  }

  const toggleRecording = () => {
    if (getIsListening()) {
      stopListening()
      setIsRecording(false)
    } else {
      setIsRecording(true)
      startListening(
        (text) => {
          setInterimText('')
          setIsRecording(false)
          handleSend(text)
        },
        (text) => setInterimText(text),
        (err) => {
          console.warn(err)
          setIsRecording(false)
        },
        () => setIsRecording(false)
      )
    }
  }

  const handleStop = () => {
    stopTTS()
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <PixiCanvas onAppReady={handleAppReady} />

      <div className="fixed inset-0 z-10 flex flex-col pointer-events-none">
        <div className="header-bar flex items-center justify-between px-5 py-3.5 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-[var(--cyber-cyan)]" style={{ boxShadow: '0 0 6px var(--cyber-cyan), 0 0 12px rgba(0, 240, 255, 0.3)', animation: 'textGlow 3s ease-in-out infinite' }} />
            </div>
            <span className="cyber-title text-[11px] text-[var(--cyber-cyan)]/80 tracking-[5px]" style={{ animation: 'textGlow 4s ease-in-out infinite' }}>SPIRIT REALM</span>
            <div className="hidden sm:block w-20 h-px bg-gradient-to-r from-[var(--cyber-cyan)]/25 to-transparent ml-2" />
          </div>
          <div className="flex items-center gap-2.5">
            <PerfMonitor />
            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 flex items-center justify-center border border-[var(--cyber-border)] bg-[var(--cyber-surface)] text-[var(--cyber-cyan)]/50 hover:text-[var(--cyber-cyan)] hover:border-[var(--cyber-cyan)]/40 hover:bg-[var(--cyber-cyan)]/5 transition-all duration-300 relative group"
              style={{ clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px))' }}
            >
              <Settings size={15} className="transition-transform duration-300 group-hover:rotate-45" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-end pb-5 pointer-events-none">
          <div className="w-full max-w-lg px-5 pointer-events-auto">
            <div
              ref={chatContainerRef}
              className="chat-container max-h-[50vh] overflow-y-auto scrollbar-thin space-y-3 mb-3.5 px-1"
            >
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.isStreaming}
                />
              ))}
            </div>

            {interimText && (
              <div className="text-[11px] text-[var(--cyber-cyan)]/40 mb-2.5 px-3 font-mono flex items-center gap-1.5">
                <span className="inline-block w-1 h-3 bg-[var(--cyber-cyan)]/30 animate-pulse" />
                {interimText}
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <InputBar
                value={input}
                onChange={setInput}
                onSend={() => handleSend()}
                disabled={isStreaming}
              />

              <button
                onClick={toggleRecording}
                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border transition-all duration-300 relative ${
                  isRecording
                    ? 'border-[var(--cyber-red)]/60 bg-[var(--cyber-red)]/15 text-[var(--cyber-red)]'
                    : 'border-[var(--cyber-border)] bg-[var(--cyber-surface)] text-[var(--cyber-cyan)]/40 hover:text-[var(--cyber-cyan)] hover:border-[var(--cyber-cyan)]/40 hover:bg-[var(--cyber-cyan)]/5'
                }`}
                style={{ clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px))' }}
              >
                {isRecording ? (
                  <>
                    <MicOff size={15} />
                    <div className="absolute inset-0 border border-[var(--cyber-red)]/30" style={{ animation: 'borderGlow 1.5s ease-in-out infinite' }} />
                  </>
                ) : (
                  <Mic size={15} />
                )}
              </button>

              {isStreaming && (
                <button
                  onClick={handleStop}
                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-[var(--cyber-red)]/40 bg-[var(--cyber-red)]/10 text-[var(--cyber-red)]/80 hover:bg-[var(--cyber-red)]/20 transition-all duration-300"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px))' }}
                >
                  <Square size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <SettingsPanel visible={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
