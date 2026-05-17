interface TabRadioProps {
  name: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export function CyberRadio({ name, options, value, onChange }: TabRadioProps) {
  const activeIndex = options.findIndex(opt => opt.value === value)

  return (
    <div className="glass-radio-group">
      {options.map((opt, i) => (
        <label
          key={opt.value}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </label>
      ))}
      <div
        className="glass-glider"
        style={{
          width: `${100 / options.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
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
