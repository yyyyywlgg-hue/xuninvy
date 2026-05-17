interface CyberRadioProps {
  name: string
  options: { value: string; label: string; number?: string }[]
  value: string
  onChange: (value: string) => void
}

export function CyberRadio({ name, options, value, onChange }: CyberRadioProps) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <div key={opt.value} className="cyber-radio-wrapper">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="cyber-input"
          />
          <div className="cyber-btn">
            {opt.number && <span className="cyber-number">{opt.number}</span>}
            {opt.label}
            <div className="cyber-btn__glitch" aria-hidden="true">
              {opt.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface CyberChipProps {
  name: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export function CyberChipGroup({ name, options, value, onChange }: CyberChipProps) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {options.map((opt) => (
        <div key={opt.value} className="cyber-chip-wrapper">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="cyber-input"
          />
          <div className="cyber-chip">{opt.label}</div>
        </div>
      ))}
    </div>
  )
}
