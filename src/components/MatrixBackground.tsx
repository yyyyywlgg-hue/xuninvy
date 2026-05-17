import { useRef, useEffect } from 'react'

const CHARS = '★☆✪✩✫✯❤♡❥♥❣✿❀✾♪♫♩♬♭დღ0123456789'
const CELL = 40

interface Cell {
  char: string
  duration: number
  delay: number
  timeOffset: number
  bright: boolean
}

const DURATIONS = [2.8, 2.9, 3.2, 3.5, 3.6, 3.9, 4.1, 4.3, 4.9, 5.3, 5.6, 5.9]
const DELAYS = [0.1, 0.2, 0.4, 0.5, 0.7, 0.9, 1.0, 1.1, 1.2, 1.3, 1.5, 1.8]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpColor(c1: [number, number, number, number], c2: [number, number, number, number], t: number): [number, number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t), lerp(c1[3], c2[3], t)]
}

const STAGE_0: [number, number, number, number] = [0, 150, 255, 0.4]
const STAGE_30: [number, number, number, number] = [100, 200, 255, 1]
const STAGE_50: [number, number, number, number] = [255, 105, 180, 1]
const STAGE_70: [number, number, number, number] = [255, 255, 255, 1]
const STAGE_100: [number, number, number, number] = [0, 150, 255, 0.4]

const BRIGHT_BASE: [number, number, number, number] = [100, 200, 255, 0.7]

function getColorAtProgress(p: number, bright: boolean): [number, number, number, number] {
  if (bright && p < 0.05) return BRIGHT_BASE

  let c: [number, number, number, number]
  if (p <= 0.3) {
    c = lerpColor(STAGE_0, STAGE_30, p / 0.3)
  } else if (p <= 0.5) {
    c = lerpColor(STAGE_30, STAGE_50, (p - 0.3) / 0.2)
  } else if (p <= 0.7) {
    c = lerpColor(STAGE_50, STAGE_70, (p - 0.5) / 0.2)
  } else {
    c = lerpColor(STAGE_70, STAGE_100, (p - 0.7) / 0.3)
  }
  return c
}

export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cellsRef = useRef<Cell[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio, 2)

    const initCells = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cols = Math.ceil(w / CELL)
      const rows = Math.ceil(h / CELL)
      const count = cols * rows

      cellsRef.current = Array.from({ length: count }, (_, i) => ({
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        duration: DURATIONS[i % DURATIONS.length] + (Math.random() - 0.5) * 0.4,
        delay: DELAYS[i % DELAYS.length],
        timeOffset: Math.random() * 10,
        bright: i % 11 === 0,
      }))
    }

    initCells()

    const startTime = performance.now() / 1000

    const draw = () => {
      const now = performance.now() / 1000 - startTime
      const w = canvas.width / dpr
      const h = canvas.height / dpr

      ctx.clearRect(0, 0, w, h)
      ctx.font = '32px "Courier New", Courier, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const cols = Math.ceil(w / CELL)

      for (let i = 0; i < cellsRef.current.length; i++) {
        const cell = cellsRef.current[i]
        const t = now + cell.timeOffset + cell.delay
        const progress = ((t % cell.duration) / cell.duration)

        const [r, g, b, a] = getColorAtProgress(progress, cell.bright)

        const glowIntensity = a > 0.6 ? a : 0
        if (glowIntensity > 0) {
          ctx.shadowColor = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${(glowIntensity * 0.6).toFixed(2)})`
          ctx.shadowBlur = 10 + glowIntensity * 10
        } else {
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
        }

        ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(2)})`
        const col = i % cols
        const row = Math.floor(i / cols)
        ctx.fillText(cell.char, col * CELL + CELL / 2, row * CELL + CELL / 2)
      }

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    const handleResize = () => initCells()
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.15 }}
    />
  )
}
