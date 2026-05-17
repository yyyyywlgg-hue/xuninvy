interface Props {
  role: 'user' | 'ai'
  content: string
  isStreaming?: boolean
}

export default function ChatBubble({ role, content, isStreaming }: Props) {
  if (!content && !isStreaming) return null

  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${isUser ? 'animate-fadeInSlideRight' : 'animate-fadeInSlide'}`}>
      <div
        className={`max-w-[80%] px-4 py-3 text-[13px] leading-relaxed relative ${
          isUser ? 'chat-bubble-user' : 'chat-bubble-ai'
        }`}
        style={{
          clipPath: isUser
            ? 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)'
            : 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
        }}
      >
        <span className={`relative z-10 ${isUser ? 'text-[var(--cyber-cyan)]/90' : 'text-white/90'} ${isStreaming ? 'cyber-flicker' : ''}`}>
          {content || '▌'}
        </span>
        {isStreaming && !content && (
          <span className="inline-block w-1.5 h-3.5 bg-[var(--cyber-cyan)]/60 ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  )
}
