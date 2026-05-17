import { useState, useRef, useEffect } from 'react'
import { Settings, Mic, MicOff, Square, Trash2 } from 'lucide-react'
import PixiCanvas from './components/PixiCanvas'
import ChatBubble from './components/ChatBubble'
import InputBar from './components/InputBar'
import PerfMonitor from './components/PerfMonitor'
import SettingsPanel from './components/SettingsPanel'
import MatrixBackground from './components/MatrixBackground'
import { useChatStore } from './store/useChatStore'
import { streamChat, getGreetingStream, getConfig, initConversation, restoreConversationFromMessages } from './services/llmService'
import type { StreamChunk } from './types'
import { speak, stop as stopTTS } from './services/ttsService'
import { startListening, stopListening, getIsListening } from './services/sttService'

export default function App() {
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const streamingText = useChatStore((s) => s.streamingText)
  const showSettings = useChatStore((s) => s.showSettings)
  const addMessage = useChatStore((s) => s.addMessage)
  const updateLastAiMessage = useChatStore((s) => s.updateLastAiMessage)
  const setLastAiMessageDone = useChatStore((s) => s.setLastAiMessageDone)
  const setCurrentEmotion = useChatStore((s) => s.setCurrentEmotion)
  const setStreaming = useChatStore((s) => s.setStreaming)
  const setStreamingText = useChatStore((s) => s.setStreamingText)
  const appendStreamingText = useChatStore((s) => s.appendStreamingText)
  const setShowSettings = useChatStore((s) => s.setShowSettings)
  const loadHistory = useChatStore((s) => s.loadHistory)
  const clearHistory = useChatStore((s) => s.clearHistory)

  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [greetingTriggered, setGreetingTriggered] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [settingsInitialTab, setSettingsInitialTab] = useState<'character' | 'voice' | 'model' | 'api'>('api')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const pixiAppRef = useRef<any>(null)

  useEffect(() => {
    loadHistory().then((hasHistory) => {
      const config = getConfig()
      if (config.apiKey) {
        setIsReady(true)
        if (hasHistory) {
          setGreetingTriggered(true)
          restoreConversationFromMessages(
            useChatStore.getState().messages.map(m => ({ role: m.role, content: m.content }))
          )
        } else {
          initConversation()
        }
      } else {
        setSettingsInitialTab('api')
        setShowSettings(true)
      }
    })
  }, [])

  useEffect(() => {
    if (greetingTriggered || isStreaming || messages.length > 0) return
    if (showSettings) return
    if (!isReady) return

    setGreetingTriggered(true)
    const greetingId = `greeting-${Date.now()}`
    addMessage({ id: greetingId, role: 'ai', content: '', isStreaming: true, timestamp: Date.now() })
    setStreaming(true)

    getGreetingStream(
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
  }, [showSettings, greetingTriggered, isStreaming, messages.length, isReady])

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

  const handleClearChat = async () => {
    await clearHistory()
    initConversation()
    setGreetingTriggered(false)
    setShowClearConfirm(false)
  }

  const handleSettingsClose = () => {
    const config = getConfig()
    if (!isReady && config.apiKey) {
      setIsReady(true)
      initConversation()
    }
    setShowSettings(false)
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <MatrixBackground />
      {isReady && <PixiCanvas onAppReady={handleAppReady} />}

      {!isReady && (
        <div className="fixed inset-0 z-5 flex items-center justify-center">
          <div className="text-center">
            <div className="w-4 h-4 rounded-full bg-[var(--accent-rose)]/20 mx-auto mb-5 animate-breathe" style={{ boxShadow: '0 0 30px rgba(232, 114, 138, 0.15)' }} />
            <div className="text-sm text-[var(--accent-rose)]/50 tracking-[4px] font-medium mb-2">SPIRIT REALM</div>
            <div className="text-[11px] text-[var(--text-muted)]">请先完成初始配置</div>
          </div>
        </div>
      )}

      {isReady && (
        <div className="fixed inset-0 z-10 flex flex-col pointer-events-none">
          <div className="header-bar flex items-center justify-between px-5 py-3.5 pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--accent-rose)]/60 animate-breathe" style={{ boxShadow: '0 0 8px rgba(232, 114, 138, 0.3)' }} />
              <span className="text-[11px] text-[var(--accent-rose)]/60 tracking-[4px] font-medium">SPIRIT REALM</span>
            </div>
            <div className="flex items-center gap-2">
              <PerfMonitor />
              {messages.length > 0 && !isStreaming && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="icon-btn text-red-400/40 hover:text-red-400 hover:border-red-400/30"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => { setSettingsInitialTab('character'); setShowSettings(true) }}
                className="icon-btn text-[var(--accent-rose)]/40 hover:text-[var(--accent-rose)] hover:border-[var(--accent-rose)]/30"
              >
                <Settings size={15} />
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
                <div className="text-[11px] text-[var(--accent-lavender)]/40 mb-2.5 px-3 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-3 bg-[var(--accent-lavender)]/30 animate-pulse rounded-sm" />
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
                  className={`icon-btn !w-10 !h-10 flex-shrink-0 ${
                    isRecording
                      ? '!bg-red-500/15 !border-red-500/40 !text-red-400'
                      : 'text-[var(--accent-rose)]/40 hover:text-[var(--accent-rose)] hover:border-[var(--accent-rose)]/30'
                  }`}
                >
                  {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                </button>

                {isStreaming && (
                  <button
                    onClick={handleStop}
                    className="icon-btn !w-10 !h-10 flex-shrink-0 !bg-red-500/10 !border-red-500/30 !text-red-400/80 hover:!bg-red-500/20"
                  >
                    <Square size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <SettingsPanel visible={showSettings} onClose={handleSettingsClose} initialTab={settingsInitialTab} onReset={() => { setIsReady(false); setGreetingTriggered(false); setSettingsInitialTab('api'); setShowSettings(true); }} />

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel p-6 max-w-sm w-full mx-4">
            <h3 className="text-red-400 text-sm font-semibold tracking-wide mb-3">清除对话</h3>
            <p className="text-[var(--text-secondary)] text-xs mb-6 leading-relaxed">
              确定要清除所有对话记录吗？此操作不可撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="action-btn action-btn-ghost"
              >
                取消
              </button>
              <button
                onClick={handleClearChat}
                className="action-btn action-btn-danger"
              >
                清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
