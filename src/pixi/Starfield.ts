import { Application, Container, Mesh, Geometry, Shader, Program, Buffer } from 'pixi.js'
import type { Emotion } from '../types'

const STAR_VERT = `
attribute vec2 aStarPos;
attribute vec2 aLocalPos;
attribute float aSize;
attribute float aAlpha;
attribute float aPhase;
attribute float aDepth;

uniform mat3 projectionMatrix;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;

varying float vAlpha;
varying vec2 vLocalPos;

vec2 flow(vec2 p, float t) {
  float s1 = sin(p.x * 1.2 + t * 0.15) * cos(p.y * 0.8 + t * 0.1);
  float s2 = sin(p.y * 1.5 - t * 0.12) * cos(p.x * 0.9 - t * 0.08);
  float s3 = sin((p.x + p.y) * 0.7 + t * 0.06);
  return vec2(s1 + s3 * 0.5, s2 + s3 * 0.5) * 25.0;
}

void main() {
  vec2 basePos = aStarPos * uResolution;
  vec2 drift = flow(aStarPos, uTime + aPhase * 6.28);
  vec2 pixelPos = basePos + drift;

  vec2 mousePixel = uMouse * uResolution;
  vec2 diff = pixelPos - mousePixel;
  float dist = length(diff);
  float radius = 120.0;
  float repulse = smoothstep(radius, 0.0, dist) * 30.0;
  vec2 dir = dist > 0.001 ? normalize(diff) : vec2(0.0, 1.0);
  vec2 worldPos = pixelPos + dir * repulse;

  float twinkle = 0.6 + 0.4 * sin(uTime * (1.5 + aPhase * 2.0) + aPhase * 6.2832);
  vAlpha = aAlpha * twinkle;
  vLocalPos = aLocalPos;

  vec2 finalPos = worldPos + aLocalPos * aSize;
  gl_Position = vec4((projectionMatrix * vec3(finalPos, 1.0)).xy, 0.0, 1.0);
}
`

const STAR_FRAG = `
precision mediump float;

varying float vAlpha;
varying vec2 vLocalPos;

uniform vec3 uColor;

void main() {
  float dist = length(vLocalPos);

  float glow = exp(-dist * dist * 3.0);
  float core = smoothstep(0.3, 0.0, dist);

  float alpha = (glow * 0.3 + core * 0.7) * vAlpha;
  vec3 color = mix(uColor * 0.6, vec3(1.0), core * 0.8);

  if (alpha < 0.01) discard;

  gl_FragColor = vec4(color, alpha);
}
`

const NEBULA_VERT = `
attribute vec2 aPosition;
attribute vec2 aUv;

uniform mat3 projectionMatrix;

varying vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = vec4((projectionMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
}
`

const NEBULA_FRAG = `
precision mediump float;

varying vec2 vUv;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;

  float n1 = fbm(uv * 3.0 + uTime * 0.02);
  float n2 = fbm(uv * 2.0 - uTime * 0.015 + 100.0);

  float blob1 = smoothstep(0.3, 0.7, n1);
  float blob2 = smoothstep(0.4, 0.8, n2);

  vec3 color = uColor1 * blob1 * 0.12 + uColor2 * blob2 * 0.08;
  float alpha = (blob1 + blob2) * 0.06;

  gl_FragColor = vec4(color, alpha);
}
`

const SHOOTING_VERT = `
attribute vec2 aPosition;
attribute vec2 aLocalUv;

uniform mat3 projectionMatrix;

varying vec2 vLocalUv;

void main() {
  vLocalUv = aLocalUv;
  gl_Position = vec4((projectionMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
}
`

const SHOOTING_FRAG = `
precision mediump float;

varying vec2 vLocalUv;

uniform vec3 uColor;
uniform float uAlpha;

void main() {
  float gradient = 1.0 - vLocalUv.x;
  float width = 1.0 - abs(vLocalUv.y) * 2.0;

  float alpha = gradient * width * uAlpha;
  vec3 color = mix(uColor, vec3(1.0), gradient * 0.5);

  if (alpha < 0.01) discard;

  gl_FragColor = vec4(color, alpha);
}
`

const STAR_COLORS: Record<Emotion, [number, number, number]> = {
  happy: [1.0, 0.9, 0.6],
  sad: [0.4, 0.6, 1.0],
  angry: [1.0, 0.3, 0.2],
  shy: [1.0, 0.6, 0.8],
  calm: [0.7, 0.8, 1.0],
  think: [0.6, 0.7, 1.0],
  surprised: [1.0, 0.8, 0.4],
  curious: [0.4, 1.0, 0.8],
  awkward: [0.8, 0.6, 0.8],
  question: [0.6, 0.8, 1.0],
}

const NEBULA_COLORS: Record<Emotion, [[number, number, number], [number, number, number]]> = {
  happy: [[1.0, 0.6, 0.2], [1.0, 0.4, 0.6]],
  sad: [[0.2, 0.3, 0.8], [0.1, 0.2, 0.6]],
  angry: [[0.8, 0.1, 0.1], [0.6, 0.0, 0.2]],
  shy: [[0.8, 0.3, 0.6], [1.0, 0.5, 0.7]],
  calm: [[0.3, 0.4, 0.8], [0.2, 0.3, 0.6]],
  think: [[0.3, 0.3, 0.7], [0.2, 0.4, 0.6]],
  surprised: [[1.0, 0.7, 0.2], [0.8, 0.5, 0.1]],
  curious: [[0.1, 0.6, 0.5], [0.2, 0.4, 0.8]],
  awkward: [[0.5, 0.3, 0.6], [0.4, 0.2, 0.5]],
  question: [[0.3, 0.5, 0.8], [0.2, 0.3, 0.7]],
}

interface ShootingStarData {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  active: boolean
}

export class Starfield {
  private container: Container
  private starMesh: Mesh | null = null
  private nebulaMesh: Mesh | null = null
  private shootingMesh: Mesh | null = null
  private starGeometry: Geometry | null = null
  private starShader: Shader | null = null
  private nebulaGeometry: Geometry | null = null
  private nebulaShader: Shader | null = null
  private shootingGeometry: Geometry | null = null
  private shootingShader: Shader | null = null
  private shootingPosBuffer: Buffer | null = null
  private nebulaPosBuffer: Buffer | null = null

  private width: number
  private height: number
  private starCount: number
  private mouseX: number = 0
  private mouseY: number = 0
  private time: number = 0

  private currentStarColor: [number, number, number] = [0.7, 0.8, 1.0]
  private targetStarColor: [number, number, number] = [0.7, 0.8, 1.0]
  private currentNebulaColor1: [number, number, number] = [0.3, 0.4, 0.8]
  private targetNebulaColor1: [number, number, number] = [0.3, 0.4, 0.8]
  private currentNebulaColor2: [number, number, number] = [0.2, 0.3, 0.6]
  private targetNebulaColor2: [number, number, number] = [0.2, 0.3, 0.6]

  private shootingStars: ShootingStarData[] = []
  private maxShootingStars = 5

  private mousemoveHandler: ((e: MouseEvent) => void) | null = null
  private clickHandler: ((e: MouseEvent) => void) | null = null
  private touchHandler: ((e: TouchEvent) => void) | null = null

  constructor(app: Application, width: number, height: number) {
    this.width = width
    this.height = height
    this.starCount = width < 768 ? 300 : 600
    this.container = new Container()
    this.container.zIndex = 0
    app.stage.addChild(this.container)

    this.createNebula()
    this.createStars()
    this.createShootingStarMesh()

    for (let i = 0; i < this.maxShootingStars; i++) {
      this.shootingStars.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0, active: false,
      })
    }

    this.mousemoveHandler = (e: MouseEvent) => {
      this.mouseX = e.clientX / window.innerWidth
      this.mouseY = e.clientY / window.innerHeight
    }
    window.addEventListener('mousemove', this.mousemoveHandler)

    const canvas = app.view as HTMLCanvasElement
    this.clickHandler = (e: MouseEvent) => {
      this.spawnShootingStar(e.clientX, e.clientY)
    }
    canvas.addEventListener('click', this.clickHandler)

    this.touchHandler = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.spawnShootingStar(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    canvas.addEventListener('touchstart', this.touchHandler, { passive: true })
  }

  private createNebula() {
    const w = this.width
    const h = this.height
    const posData = new Float32Array([0, 0, w, 0, w, h, 0, h])
    this.nebulaPosBuffer = new Buffer(posData, false)

    this.nebulaGeometry = new Geometry()
    this.nebulaGeometry.addAttribute('aPosition', this.nebulaPosBuffer, 2, false)
    this.nebulaGeometry.addAttribute('aUv', new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1,
    ]), 2)
    this.nebulaGeometry.addIndex(new Uint16Array([0, 1, 2, 0, 2, 3]))

    const program = new Program(NEBULA_VERT, NEBULA_FRAG)
    this.nebulaShader = new Shader(program, {
      uColor1: this.currentNebulaColor1,
      uColor2: this.currentNebulaColor2,
      uTime: 0,
    })

    this.nebulaMesh = new Mesh(this.nebulaGeometry, this.nebulaShader as any)
    this.nebulaMesh.zIndex = -1
    this.container.addChild(this.nebulaMesh)
  }

  private createStars() {
    const count = this.starCount
    const positions = new Float32Array(count * 4 * 2)
    const localPositions = new Float32Array(count * 4 * 2)
    const sizes = new Float32Array(count * 4)
    const alphas = new Float32Array(count * 4)
    const phases = new Float32Array(count * 4)
    const depths = new Float32Array(count * 4)
    const indices = new Uint16Array(count * 6)

    for (let i = 0; i < count; i++) {
      const base = i * 4
      const sx = Math.random()
      const sy = Math.random()

      for (let j = 0; j < 4; j++) {
        positions[(base + j) * 2] = sx
        positions[(base + j) * 2 + 1] = sy
      }

      localPositions[base * 2] = -1
      localPositions[base * 2 + 1] = -1
      localPositions[(base + 1) * 2] = 1
      localPositions[(base + 1) * 2 + 1] = -1
      localPositions[(base + 2) * 2] = 1
      localPositions[(base + 2) * 2 + 1] = 1
      localPositions[(base + 3) * 2] = -1
      localPositions[(base + 3) * 2 + 1] = 1

      const depth = Math.random()
      const size = 0.5 + depth * 2 + Math.random() * 1
      const alpha = 0.3 + depth * 0.5 + Math.random() * 0.2
      const phase = Math.random()

      for (let j = 0; j < 4; j++) {
        sizes[base + j] = size
        alphas[base + j] = alpha
        phases[base + j] = phase
        depths[base + j] = depth
      }

      const idxBase = i * 6
      indices[idxBase] = base
      indices[idxBase + 1] = base + 1
      indices[idxBase + 2] = base + 2
      indices[idxBase + 3] = base
      indices[idxBase + 4] = base + 2
      indices[idxBase + 5] = base + 3
    }

    this.starGeometry = new Geometry()
    this.starGeometry.addAttribute('aStarPos', positions, 2)
    this.starGeometry.addAttribute('aLocalPos', localPositions, 2)
    this.starGeometry.addAttribute('aSize', sizes, 1)
    this.starGeometry.addAttribute('aAlpha', alphas, 1)
    this.starGeometry.addAttribute('aPhase', phases, 1)
    this.starGeometry.addAttribute('aDepth', depths, 1)
    this.starGeometry.addIndex(indices)

    const program = new Program(STAR_VERT, STAR_FRAG)
    this.starShader = new Shader(program, {
      uResolution: [this.width, this.height],
      uMouse: [0, 0],
      uTime: 0,
      uColor: this.currentStarColor,
    })

    this.starMesh = new Mesh(this.starGeometry, this.starShader as any)
    this.starMesh.zIndex = 0
    this.container.addChild(this.starMesh)
  }

  private createShootingStarMesh() {
    const count = this.maxShootingStars
    const positions = new Float32Array(count * 4 * 2)
    const localUvs = new Float32Array(count * 4 * 2)
    const indices = new Uint16Array(count * 6)

    for (let i = 0; i < count; i++) {
      const base = i * 4
      localUvs[base * 2] = 0
      localUvs[base * 2 + 1] = -1
      localUvs[(base + 1) * 2] = 1
      localUvs[(base + 1) * 2 + 1] = -1
      localUvs[(base + 2) * 2] = 1
      localUvs[(base + 2) * 2 + 1] = 1
      localUvs[(base + 3) * 2] = 0
      localUvs[(base + 3) * 2 + 1] = 1

      const idxBase = i * 6
      indices[idxBase] = base
      indices[idxBase + 1] = base + 1
      indices[idxBase + 2] = base + 2
      indices[idxBase + 3] = base
      indices[idxBase + 4] = base + 2
      indices[idxBase + 5] = base + 3
    }

    this.shootingPosBuffer = new Buffer(positions, false)

    this.shootingGeometry = new Geometry()
    this.shootingGeometry.addAttribute('aPosition', this.shootingPosBuffer, 2, false)
    this.shootingGeometry.addAttribute('aLocalUv', localUvs, 2)
    this.shootingGeometry.addIndex(indices)

    const program = new Program(SHOOTING_VERT, SHOOTING_FRAG)
    this.shootingShader = new Shader(program, {
      uColor: this.currentStarColor,
      uAlpha: 0,
    })

    this.shootingMesh = new Mesh(this.shootingGeometry, this.shootingShader as any)
    this.shootingMesh.zIndex = 1
    this.container.addChild(this.shootingMesh)
  }

  setEmotion(emotion: Emotion) {
    this.targetStarColor = STAR_COLORS[emotion]
    const [c1, c2] = NEBULA_COLORS[emotion]
    this.targetNebulaColor1 = c1
    this.targetNebulaColor2 = c2
  }

  private spawnShootingStar(x: number, y: number) {
    const slot = this.shootingStars.find(s => !s.active)
    if (!slot) return

    const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.5
    const speed = 4 + Math.random() * 3
    slot.x = x
    slot.y = y
    slot.vx = Math.cos(angle) * speed
    slot.vy = Math.sin(angle) * speed
    slot.life = 0
    slot.maxLife = 40 + Math.random() * 30
    slot.active = true
  }

  private lerpColor(
    current: [number, number, number],
    target: [number, number, number],
    t: number,
  ): [number, number, number] {
    return [
      current[0] + (target[0] - current[0]) * t,
      current[1] + (target[1] - current[1]) * t,
      current[2] + (target[2] - current[2]) * t,
    ]
  }

  private updateShootingStars(delta: number) {
    if (!this.shootingPosBuffer) return
    const posData = this.shootingPosBuffer.data as Float32Array
    let anyActive = false

    for (let i = 0; i < this.shootingStars.length; i++) {
      const s = this.shootingStars[i]
      if (!s.active) {
        const base = i * 4
        for (let j = 0; j < 4; j++) {
          posData[(base + j) * 2] = -9999
          posData[(base + j) * 2 + 1] = -9999
        }
        continue
      }

      anyActive = true
      s.life += delta
      if (s.life > s.maxLife) {
        s.active = false
        continue
      }

      s.x += s.vx * delta
      s.y += s.vy * delta

      const streakLen = 60 + s.maxLife * 1.5
      const dx = -s.vx
      const dy = -s.vy
      const len = Math.sqrt(dx * dx + dy * dy)
      const nx = dx / len
      const ny = dy / len
      const perpX = -ny
      const perpY = nx
      const halfW = 1

      const base = i * 4
      posData[base * 2] = s.x
      posData[base * 2 + 1] = s.y + perpY * halfW
      posData[(base + 1) * 2] = s.x + nx * streakLen
      posData[(base + 1) * 2 + 1] = s.y + ny * streakLen + perpY * halfW
      posData[(base + 2) * 2] = s.x + nx * streakLen
      posData[(base + 2) * 2 + 1] = s.y + ny * streakLen - perpY * halfW
      posData[(base + 3) * 2] = s.x
      posData[(base + 3) * 2 + 1] = s.y - perpY * halfW
    }

    this.shootingPosBuffer.update(posData)

    if (anyActive) {
      let maxAlpha = 0
      for (const s of this.shootingStars) {
        if (s.active) {
          const lifeRatio = s.life / s.maxLife
          const alpha = lifeRatio < 0.1 ? lifeRatio * 10 : 1 - (lifeRatio - 0.1) / 0.9
          maxAlpha = Math.max(maxAlpha, alpha)
        }
      }
      this.shootingShader!.uniforms.uAlpha = maxAlpha * 0.8
      this.shootingShader!.uniforms.uColor = this.currentStarColor
    } else {
      this.shootingShader!.uniforms.uAlpha = 0
    }
  }

  update(delta: number) {
    this.time += delta * 0.01667

    this.currentStarColor = this.lerpColor(this.currentStarColor, this.targetStarColor, 0.02)
    this.currentNebulaColor1 = this.lerpColor(this.currentNebulaColor1, this.targetNebulaColor1, 0.02)
    this.currentNebulaColor2 = this.lerpColor(this.currentNebulaColor2, this.targetNebulaColor2, 0.02)

    if (this.starShader) {
      this.starShader.uniforms.uResolution = [this.width, this.height]
      this.starShader.uniforms.uMouse = [this.mouseX, this.mouseY]
      this.starShader.uniforms.uTime = this.time
      this.starShader.uniforms.uColor = this.currentStarColor
    }

    if (this.nebulaShader) {
      this.nebulaShader.uniforms.uColor1 = this.currentNebulaColor1
      this.nebulaShader.uniforms.uColor2 = this.currentNebulaColor2
      this.nebulaShader.uniforms.uTime = this.time
    }

    this.updateShootingStars(delta)
  }

  getParticleCount() {
    return this.starCount
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height

    if (this.nebulaPosBuffer) {
      const data = this.nebulaPosBuffer.data as Float32Array
      data[0] = 0; data[1] = 0
      data[2] = width; data[3] = 0
      data[4] = width; data[5] = height
      data[6] = 0; data[7] = height
      this.nebulaPosBuffer.update(data)
    }
  }

  destroy() {
    if (this.mousemoveHandler) {
      window.removeEventListener('mousemove', this.mousemoveHandler)
      this.mousemoveHandler = null
    }
    if (this.clickHandler) {
      const canvases = document.querySelectorAll('canvas')
      canvases.forEach(c => c.removeEventListener('click', this.clickHandler!))
      this.clickHandler = null
    }
    if (this.touchHandler) {
      const canvases = document.querySelectorAll('canvas')
      canvases.forEach(c => c.removeEventListener('touchstart', this.touchHandler!))
      this.touchHandler = null
    }

    if (this.starMesh) { this.container.removeChild(this.starMesh); this.starMesh.destroy() }
    if (this.nebulaMesh) { this.container.removeChild(this.nebulaMesh); this.nebulaMesh.destroy() }
    if (this.shootingMesh) { this.container.removeChild(this.shootingMesh); this.shootingMesh.destroy() }
    if (this.starGeometry) this.starGeometry.destroy()
    if (this.nebulaGeometry) this.nebulaGeometry.destroy()
    if (this.shootingGeometry) this.shootingGeometry.destroy()

    this.container.destroy()
  }
}
