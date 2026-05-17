import { Application, Container, Graphics } from 'pixi.js';
import type { Emotion, WeatherEffect } from '../types';
import { EMOTION_CONFIGS } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  graphic: Graphics;
}

export class ParticleSystem {
  private container: Container;
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private maxParticles: number;
  private currentColor: number = 0x8b5cf6;
  private targetColor: number = 0x8b5cf6;
  private currentSpeed: number = 0.6;
  private targetSpeed: number = 0.6;
  private currentDensity: number = 1.0;
  private targetDensity: number = 1.0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private width: number;
  private height: number;
  private mousemoveHandler: ((e: MouseEvent) => void) | null = null;

  constructor(app: Application, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.maxParticles = width < 768 ? 150 : 400;
    this.container = new Container();
    this.container.zIndex = 0;
    app.stage.addChild(this.container);

    this.mousemoveHandler = (e: MouseEvent) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    };
    window.addEventListener('mousemove', this.mousemoveHandler);
  }

  setEmotion(emotion: Emotion) {
    const config = EMOTION_CONFIGS[emotion];
    this.targetColor = config.particleColor;
    this.targetSpeed = config.particleSpeed;
    this.targetDensity = config.particleDensity;
  }

  private createParticle(): Particle {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    const graphic = new Graphics();
    this.container.addChild(graphic);
    return { x: 0, y: 0, vx: 0, vy: 0, size: 0, alpha: 0, life: 0, maxLife: 0, graphic };
  }

  private initParticle(p: Particle) {
    p.x = Math.random() * this.width;
    p.y = Math.random() * this.height;
    p.vx = (Math.random() - 0.5) * 0.5;
    p.vy = (Math.random() - 0.5) * 0.5 - 0.2;
    p.size = 1 + Math.random() * 3;
    p.alpha = 0.3 + Math.random() * 0.7;
    p.life = 0;
    p.maxLife = 200 + Math.random() * 300;
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return (rr << 16) | (rg << 8) | rb;
  }

  update(delta: number) {
    this.currentColor = this.lerpColor(this.currentColor, this.targetColor, 0.02);
    this.currentSpeed += (this.targetSpeed - this.currentSpeed) * 0.02;
    this.currentDensity += (this.targetDensity - this.currentDensity) * 0.02;

    const targetCount = Math.floor(this.maxParticles * this.currentDensity);
    while (this.particles.length < targetCount) {
      const p = this.createParticle();
      this.initParticle(p);
      this.particles.push(p);
    }

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const parallaxX = (this.mouseX - centerX) / centerX;
    const parallaxY = (this.mouseY - centerY) / centerY;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life > p.maxLife) {
        if (this.particles.length > targetCount) {
          this.container.removeChild(p.graphic);
          p.graphic.destroy();
          this.particles.splice(i, 1);
        } else {
          this.initParticle(p);
        }
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      const fadeIn = Math.min(lifeRatio * 5, 1);
      const fadeOut = lifeRatio > 0.8 ? 1 - (lifeRatio - 0.8) / 0.2 : 1;
      const alpha = p.alpha * fadeIn * fadeOut;

      p.x += p.vx * this.currentSpeed * delta;
      p.y += p.vy * this.currentSpeed * delta;
      p.x += parallaxX * 0.3 * delta;
      p.y += parallaxY * 0.3 * delta;

      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.height + 10;
      if (p.y > this.height + 10) p.y = -10;

      p.graphic.clear();
      p.graphic.beginFill(this.currentColor, alpha);
      p.graphic.drawCircle(p.x, p.y, p.size);
      p.graphic.endFill();
    }
  }

  getParticleCount() { return this.particles.length; }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.maxParticles = width < 768 ? 150 : 400;
  }

  destroy() {
    if (this.mousemoveHandler) {
      window.removeEventListener('mousemove', this.mousemoveHandler);
      this.mousemoveHandler = null;
    }
    this.particles.forEach((p) => p.graphic.destroy());
    this.pool.forEach((p) => p.graphic.destroy());
    this.container.destroy();
  }
}
