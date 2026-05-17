import { Application, Ticker } from 'pixi.js';
import { ParticleSystem } from './ParticleSystem';
import { WeatherEffects } from './WeatherEffects';
import type { Emotion } from '../types';
import { EMOTION_CONFIGS } from '../types';
import { cacheModelFromUrl, isModelCached } from '../services/opfsCache';

if (!(window as any).PIXI) {
  (window as any).PIXI = { Ticker };
}

let Live2DModel: any = null;

async function ensureCubismCore(): Promise<void> {
  if (Live2DModel) return;

  if (!(window as any).Live2DCubismCore) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${import.meta.env.BASE_URL}live2d/live2dcubismcore.min.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Cubism Core SDK'));
      document.head.appendChild(script);
    });
  }

  const mod = await import('pixi-live2d-display/cubism4');
  Live2DModel = mod.Live2DModel;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const easeInQuad = (t: number) => t * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

interface LipSyncState {
  isSpeaking: boolean;
  mouthOpen: number;
  releaseRemainingMs: number;
  lastForcedValue: number;
}

interface ExpressionParams {
  ParamEyeLOpen?: number;
  ParamEyeROpen?: number;
  ParamEyeLSmile?: number;
  ParamEyeRSmile?: number;
  ParamMouthOpenY?: number;
  ParamMouthForm?: number;
  ParamCheek?: number;
  ParamBrowLForm?: number;
  ParamBrowRForm?: number;
  [key: string]: number | undefined;
}

const EMOTION_EXPRESSIONS: Record<Emotion, ExpressionParams> = {
  happy: {
    ParamEyeLSmile: 1.0,
    ParamEyeRSmile: 1.0,
    ParamMouthForm: 1.0,
    ParamCheek: 1.0,
  },
  sad: {
    ParamEyeLOpen: 0.6,
    ParamEyeROpen: 0.6,
    ParamMouthForm: -1.0,
    ParamBrowLForm: -0.6,
    ParamBrowRForm: -0.6,
  },
  angry: {
    ParamEyeLOpen: 0.9,
    ParamEyeROpen: 0.9,
    ParamMouthForm: -0.5,
    ParamBrowLForm: -1.0,
    ParamBrowRForm: -1.0,
  },
  shy: {
    ParamEyeLOpen: 0.5,
    ParamEyeROpen: 0.5,
    ParamEyeLSmile: 0.3,
    ParamEyeRSmile: 0.3,
    ParamCheek: 1.0,
  },
  calm: {},
  think: {
    ParamEyeLOpen: 0.7,
    ParamEyeROpen: 0.7,
    ParamBrowLForm: -0.3,
    ParamBrowRForm: -0.3,
  },
  surprised: {
    ParamEyeLOpen: 1.2,
    ParamEyeROpen: 1.2,
    ParamMouthOpenY: 0.8,
    ParamBrowLForm: 0.8,
    ParamBrowRForm: 0.8,
  },
  curious: {
    ParamEyeLOpen: 0.9,
    ParamEyeROpen: 0.9,
    ParamBrowLForm: 0.4,
    ParamBrowRForm: 0.4,
  },
  awkward: {
    ParamEyeLOpen: 0.6,
    ParamEyeROpen: 0.6,
    ParamEyeLSmile: 0.2,
    ParamEyeRSmile: 0.2,
    ParamMouthForm: -0.3,
    ParamCheek: 0.5,
  },
};

export class SceneController {
  private app: Application;
  private particles: ParticleSystem;
  private weather: WeatherEffects;
  private currentEmotion: Emotion = 'calm';
  private model: any | null = null;
  private modelLoaded: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private currentCleanup: (() => void) | null = null;
  private beforeModelUpdateHandler: (() => void) | null = null;

  private lipSync: LipSyncState = {
    isSpeaking: false,
    mouthOpen: 0,
    releaseRemainingMs: 0,
    lastForcedValue: 0,
  };

  private expressionValues: ExpressionParams = {};
  private expressionTransition: number = 0;
  private expressionTransitionSpeed: number = 0.05;
  private targetExpression: ExpressionParams = {};
  private prevExpressionParams: Set<string> = new Set();

  constructor(app: Application, width: number, height: number) {
    this.app = app;
    this.particles = new ParticleSystem(app, width, height);
    this.weather = new WeatherEffects(app, width, height);

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (this.modelLoaded && this.model) {
        try {
          this.model.focus(e.clientX, e.clientY);
        } catch {}
      }
    });
  }

  async loadLive2DModel(modelUrl: string, cleanup?: (() => void) | null): Promise<boolean> {
    try {
      await ensureCubismCore();
      this.unloadModel();
      if (cleanup) this.currentCleanup = cleanup;

      this.model = await Live2DModel.from(modelUrl, { autoInteract: false });

      console.log('[Live2D] Model loaded:', {
        autoUpdate: (this.model as any).autoUpdate,
        internalModel: !!(this.model as any).internalModel,
      });

      this.model.anchor.set(0.5, 0.5);
      this.model.x = this.app.screen.width / 2;
      this.model.y = this.app.screen.height * 0.42;

      const scale = Math.min(
        (this.app.screen.height * 0.6) / this.model.height,
        (this.app.screen.width * 0.45) / this.model.width
      );
      this.model.scale.set(scale);
      this.model.zIndex = 5;

      this.app.stage.addChild(this.model);
      this.app.stage.sortChildren();
      this.modelLoaded = true;

      this.resetAnimationState();
      this.setupModelUpdateHook();
      this.playMotion('Idle', 0);

      isModelCached(modelUrl).then(cached => {
        if (!cached) {
          cacheModelFromUrl(modelUrl).then(ok => {
            if (ok) console.log('[OPFS] Model cached for offline use');
          });
        }
      });

      return true;
    } catch (err) {
      console.warn('Live2D model load failed:', err);
      this.modelLoaded = false;
      return false;
    }
  }

  private setupModelUpdateHook() {
    if (!this.model) return;

    const internalModel = (this.model as any).internalModel;
    if (!internalModel) return;

    this.beforeModelUpdateHandler = () => {
      this.applyCustomParameters();
    };

    internalModel.on('beforeModelUpdate', this.beforeModelUpdateHandler);
  }

  private applyCustomParameters() {
    const coreModel = this.getCoreModel();
    if (!coreModel) return;

    try {
      if (typeof coreModel.addParameterValueById !== 'function') return;

      for (const [key, value] of Object.entries(this.expressionValues)) {
        if (value === undefined || value === 0) continue;
        if (key === 'ParamEyeLOpen' || key === 'ParamEyeROpen') {
          coreModel.setParameterValueById(key, value);
        } else {
          coreModel.addParameterValueById(key, value);
        }
      }

      if (this.lipSync.isSpeaking) {
        coreModel.setParameterValueById('ParamMouthOpenY', this.lipSync.mouthOpen);
      } else if (this.lipSync.releaseRemainingMs > 0) {
        const blend = smoothstep(1 - this.lipSync.releaseRemainingMs / 200);
        const currentVal = (coreModel.getParameterValueById?.('ParamMouthOpenY') as number) ?? 0;
        const blended = this.lipSync.lastForcedValue * (1 - blend) + currentVal * blend;
        coreModel.setParameterValueById('ParamMouthOpenY', blended);
      }
    } catch {}
  }

  private unloadModel() {
    if (this.model) {
      const internalModel = (this.model as any).internalModel;
      if (internalModel && this.beforeModelUpdateHandler) {
        try { internalModel.off('beforeModelUpdate', this.beforeModelUpdateHandler); } catch {}
      }
      this.app.stage.removeChild(this.model);
      try { this.model.destroy(); } catch {}
      this.model = null;
    }
    if (this.currentCleanup) {
      this.currentCleanup();
      this.currentCleanup = null;
    }
    this.modelLoaded = false;
    this.beforeModelUpdateHandler = null;
  }

  private resetAnimationState() {
    this.expressionValues = {};
    this.expressionTransition = 0;
    this.targetExpression = {};
    this.prevExpressionParams = new Set();
    this.lipSync = {
      isSpeaking: false,
      mouthOpen: 0,
      releaseRemainingMs: 0,
      lastForcedValue: 0,
    };
  }

  setEmotion(emotion: Emotion) {
    this.currentEmotion = emotion;
    this.particles.setEmotion(emotion);
    const config = EMOTION_CONFIGS[emotion];
    this.weather.setWeather(config.weatherEffect);

    if (this.modelLoaded && this.model) {
      this.targetExpression = { ...EMOTION_EXPRESSIONS[emotion] };
      this.expressionTransition = 0;

      const motionMap: Record<Emotion, [string, number]> = {
        happy: ['Tap', 0],
        sad: ['Idle', 1],
        angry: ['Flick', 0],
        shy: ['Idle', 2],
        calm: ['Idle', 0],
        think: ['Idle', 1],
        surprised: ['Flick', 0],
        curious: ['Tap', 0],
        awkward: ['Idle', 2],
      };
      const [group, index] = motionMap[emotion];
      this.playMotion(group, index);
    }
  }

  playMotion(group: string, index: number = 0) {
    if (this.modelLoaded && this.model) {
      try { this.model.motion(group, index, 3); } catch {}
    }
  }

  startTalking() {
    this.lipSync.isSpeaking = true;
    this.playMotion('Tap@Body', 0);
  }

  stopTalking() {
    this.lipSync.isSpeaking = false;
    this.playMotion('Idle', 0);
  }

  setLipSyncMouthOpen(value: number) {
    this.lipSync.mouthOpen = clamp01(value);
  }

  isModelLoaded() {
    return this.modelLoaded;
  }

  private getCoreModel(): any | null {
    if (!this.modelLoaded || !this.model) return null;
    try {
      const internalModel = (this.model as any).internalModel;
      return internalModel?.coreModel ?? null;
    } catch {
      return null;
    }
  }

  private updateExpression() {
    if (Object.keys(this.targetExpression).length === 0 && this.expressionTransition >= 1) return;

    this.expressionTransition = Math.min(1, this.expressionTransition + this.expressionTransitionSpeed);

    const newParams = new Set<string>();
    for (const [key, targetValue] of Object.entries(this.targetExpression)) {
      if (targetValue === undefined) continue;
      newParams.add(key);

      const currentValue = this.expressionValues[key] ?? 0;
      const blended = currentValue + (targetValue - currentValue) * this.expressionTransition;
      this.expressionValues[key] = blended;
    }

    for (const paramId of this.prevExpressionParams) {
      if (!newParams.has(paramId)) {
        delete this.expressionValues[paramId];
      }
    }

    this.prevExpressionParams = newParams;
  }

  private updateLipSync(dtMs: number) {
    if (this.lipSync.isSpeaking) {
      this.lipSync.lastForcedValue = this.lipSync.mouthOpen;
      this.lipSync.releaseRemainingMs = 200;
      return;
    }

    if (this.lipSync.releaseRemainingMs > 0) {
      this.lipSync.releaseRemainingMs = Math.max(0, this.lipSync.releaseRemainingMs - dtMs);
    }
  }

  update(delta: number) {
    this.particles.update(delta);
    this.weather.update(delta);

    if (!this.modelLoaded || !this.model) return;

    const dtMs = delta * 16.67;

    this.updateExpression();
    this.updateLipSync(dtMs);
  }

  getParticleCount() {
    return this.particles.getParticleCount();
  }

  resize(width: number, height: number) {
    this.particles.resize(width, height);
    this.weather.resize(width, height);

    if (this.modelLoaded && this.model) {
      this.model.x = width / 2;
      this.model.y = height * 0.42;
      const scale = Math.min(
        (height * 0.6) / this.model.height,
        (width * 0.45) / this.model.width
      );
      this.model.scale.set(scale);
    }
  }

  destroy() {
    this.particles.destroy();
    this.weather.destroy();
    this.unloadModel();
  }
}
