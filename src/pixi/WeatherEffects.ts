import { Application, Container, Graphics } from 'pixi.js';
import type { WeatherEffect } from '../types';

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  graphic: Graphics;
}

export class WeatherEffects {
  private container: Container;
  private particles: WeatherParticle[] = [];
  private currentEffect: WeatherEffect = 'none';
  private width: number;
  private height: number;
  private lightningTimer: number = 0;
  private lightningAlpha: number = 0;
  private lightningOverlay: Graphics;

  constructor(app: Application, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.container = new Container();
    this.container.zIndex = 1;
    app.stage.addChild(this.container);

    this.lightningOverlay = new Graphics();
    this.lightningOverlay.beginFill(0xffffff, 0);
    this.lightningOverlay.drawRect(0, 0, width, height);
    this.lightningOverlay.endFill();
    this.lightningOverlay.zIndex = 10;
    app.stage.addChild(this.lightningOverlay);
  }

  setWeather(effect: WeatherEffect) {
    if (this.currentEffect === effect) return;
    this.currentEffect = effect;
    this.particles.forEach((p) => p.graphic.destroy());
    this.particles = [];
  }

  private spawnRain() {
    if (this.particles.length > 200) return;
    const p = this.createParticle();
    p.x = Math.random() * this.width;
    p.y = -10;
    p.vx = -1;
    p.vy = 8 + Math.random() * 4;
    p.size = 1;
    p.alpha = 0.3 + Math.random() * 0.4;
    p.maxLife = 100;
    this.particles.push(p);
  }

  private spawnPetal() {
    if (this.particles.length > 80) return;
    const p = this.createParticle();
    p.x = Math.random() * this.width;
    p.y = -10;
    p.vx = (Math.random() - 0.5) * 2;
    p.vy = 1 + Math.random() * 1.5;
    p.size = 3 + Math.random() * 4;
    p.alpha = 0.5 + Math.random() * 0.5;
    p.rotation = Math.random() * Math.PI * 2;
    p.rotationSpeed = (Math.random() - 0.5) * 0.05;
    p.maxLife = 300;
    this.particles.push(p);
  }

  private spawnFirefly() {
    if (this.particles.length > 40) return;
    const p = this.createParticle();
    p.x = Math.random() * this.width;
    p.y = Math.random() * this.height;
    p.vx = (Math.random() - 0.5) * 0.5;
    p.vy = (Math.random() - 0.5) * 0.5;
    p.size = 2 + Math.random() * 2;
    p.alpha = 0;
    p.maxLife = 400;
    this.particles.push(p);
  }

  private createParticle(): WeatherParticle {
    const graphic = new Graphics();
    this.container.addChild(graphic);
    return { x: 0, y: 0, vx: 0, vy: 0, size: 0, alpha: 0, rotation: 0, rotationSpeed: 0, life: 0, maxLife: 0, graphic };
  }

  update(delta: number) {
    if (this.currentEffect === 'rain') {
      for (let i = 0; i < 3; i++) this.spawnRain();
    } else if (this.currentEffect === 'petals') {
      if (Math.random() < 0.1) this.spawnPetal();
    } else if (this.currentEffect === 'fireflies') {
      if (Math.random() < 0.02) this.spawnFirefly();
    } else if (this.currentEffect === 'lightning') {
      this.lightningTimer += delta;
      if (this.lightningTimer > 60 + Math.random() * 120) {
        this.lightningAlpha = 0.6;
        this.lightningTimer = 0;
      }
      this.lightningAlpha *= 0.9;
      this.lightningOverlay.clear();
      this.lightningOverlay.beginFill(0xffffff, this.lightningAlpha);
      this.lightningOverlay.drawRect(0, 0, this.width, this.height);
      this.lightningOverlay.endFill();
    } else {
      this.lightningOverlay.clear();
      this.lightningOverlay.beginFill(0xffffff, 0);
      this.lightningOverlay.drawRect(0, 0, this.width, this.height);
      this.lightningOverlay.endFill();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life > p.maxLife || p.y > this.height + 20) {
        this.container.removeChild(p.graphic);
        p.graphic.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.rotation += p.rotationSpeed * delta;

      let alpha = p.alpha;
      if (this.currentEffect === 'fireflies') {
        const t = p.life / p.maxLife;
        alpha = p.alpha * Math.sin(t * Math.PI) * (0.5 + 0.5 * Math.sin(p.life * 0.1));
      } else {
        alpha = p.alpha * Math.min(p.life / 20, 1);
      }

      p.graphic.clear();

      if (this.currentEffect === 'rain') {
        p.graphic.lineStyle(1, 0x93c5fd, alpha);
        p.graphic.moveTo(p.x, p.y);
        p.graphic.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
      } else if (this.currentEffect === 'petals') {
        p.graphic.beginFill(0xfda4af, alpha);
        p.graphic.drawEllipse(p.x, p.y, p.size, p.size * 0.6);
        p.graphic.endFill();
        p.graphic.rotation = p.rotation;
      } else if (this.currentEffect === 'fireflies') {
        p.graphic.beginFill(0xfde68a, alpha);
        p.graphic.drawCircle(p.x, p.y, p.size);
        p.graphic.endFill();
        p.graphic.beginFill(0xfde68a, alpha * 0.2);
        p.graphic.drawCircle(p.x, p.y, p.size * 2.5);
        p.graphic.endFill();
      }
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  destroy() {
    this.particles.forEach((p) => p.graphic.destroy());
    this.lightningOverlay.destroy();
    this.container.destroy();
  }
}
