import { useRef, useEffect } from 'react'

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789'
const CELL = 40
const LAVENDER = 'rgba(167,139,250,0.12)'
const ROSE = 'rgba(232,114,138,0.25)'
const WHITE = 'rgba(255,255,255,0.18)'

interface Cell {
  char: string
  phase: number
  speed: number
  peakColor: string
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

      const peakColors = [LAVENDER, ROSE, WHITE]

      cellsRef.current = Array.from({ length: count }, () => ({
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.8,
        peakColor: peakColors[Math.floor(Math.random() * peakColors.length)],
      }))
    }

    initCells()

    let lastTime = performance.now()

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now

      const w = canvas.width / dpr
      const h = canvas.height / dpr

      ctx.clearRect(0, 0, w, h)
      ctx.font = '28px "Courier New", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const cols = Math.ceil(w / CELL)

      for (let i = 0; i < cellsRef.current.length; i++) {
        const cell = cellsRef.current[i]
        cell.phase += cell.speed * dt

        const pulse = (Math.sin(cell.phase) + 1) / 2
        const alpha = 0.1 + pulse * 0.35

        ctx.fillStyle = cell.peakColor.replace(/[\d.]+\)$/, alpha.toFixed(2) + ')')
        const col = i % cols
        const row = Math.floor(i / cols)
        ctx.fillText(cell.char, col * CELL + CELL / 2, row * CELL + CELL / 2)
      }

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
      style={{ opacity: 0.8 }}
    />
  )
}
