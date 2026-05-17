interface TabRadioProps {
  name: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export function CyberRadio({ name, options, value, onChange }: TabRadioProps) {
  return (
    <div className="flex gap-1 p-1 bg-[var(--bg-glass)] rounded-[var(--radius-md)] border border-[var(--border-soft)]">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`tab-btn flex-1 ${value === opt.value ? 'active' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface ChipGroupProps {
  name: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export function CyberChipGroup({ name, options, value, onChange }: ChipGroupProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`preset-chip ${value === opt.value ? 'active' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
