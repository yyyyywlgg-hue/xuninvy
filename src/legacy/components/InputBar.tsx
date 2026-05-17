import { Send } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
}

export default function InputBar({ value, onChange, onSend, disabled }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="input-bar flex items-center gap-2 flex-1 px-4 py-2.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? '等待回复...' : '输入消息...'}
        className="flex-1 bg-transparent text-[13px] text-white/85 outline-none placeholder:text-[var(--cyber-cyan)]/20 font-mono"
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="w-8 h-8 flex items-center justify-center text-[var(--cyber-cyan)]/40 hover:text-[var(--cyber-cyan)] disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300 hover:bg-[var(--cyber-cyan)]/10"
        style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
      >
        <Send size={14} />
      </button>
    </div>
  )
}
