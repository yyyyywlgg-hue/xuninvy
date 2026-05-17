import { stripEmotionTag } from '../types'

interface Props {
  role: 'user' | 'ai'
  content: string
  isStreaming?: boolean
}

export default function ChatBubble({ role, content, isStreaming }: Props) {
  if (!content && !isStreaming) return null

  const isUser = role === 'user'
  const displayContent = isUser ? content : stripEmotionTag(content)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${isUser ? 'animate-fadeInSlideRight' : 'animate-fadeInSlide'}`}>
      <div
        className={`max-w-[80%] px-4 py-3 text-[13px] leading-relaxed ${
          isUser ? 'chat-bubble-user' : 'chat-bubble-ai'
        }`}
      >
        <span className={`relative z-10 font-bold ${isUser ? 'text-black/80' : 'text-black/85'}`} style={!isUser ? { fontFamily: '"LXGW WenKai", "Noto Sans SC", sans-serif' } : undefined}>
          {displayContent || '▌'}
        </span>
        {isStreaming && !displayContent && (
          <span className="inline-block w-1.5 h-3.5 bg-[var(--accent-lavender)]/60 ml-0.5 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  )
}
