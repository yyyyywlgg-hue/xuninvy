import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { SceneController } from '../pixi/SceneController';
import { useChatStore } from '../store/useChatStore';
import { onLipSyncUpdate } from '../services/ttsService';

interface Props {
  onAppReady: (app: Application) => void;
}

export default function PixiCanvas({ onAppReady }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const controllerRef = useRef<SceneController | null>(null);
  const initRef = useRef(false);
  const currentEmotion = useChatStore((s) => s.currentEmotion);
  const setModelLoaded = useChatStore((s) => s.setModelLoaded);
  const modelLoadRequest = useChatStore((s) => s.modelLoadRequest);
  const modelUrl = useChatStore((s) => s.modelUrl);

  useEffect(() => {
    if (!canvasRef.current || initRef.current) return;
    initRef.current = true;

    const el = canvasRef.current;
    const app = new Application({
      width: el.clientWidth,
      height: el.clientHeight,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      resizeTo: el,
    });

    el.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const controller = new SceneController(app, el.clientWidth, el.clientHeight);
    controllerRef.current = controller;

    if (modelUrl) {
      controller.loadLive2DModel(modelUrl).then(loaded => {
        setModelLoaded(loaded);
      });
    }

    app.ticker.add((delta) => {
      controller.update(delta);
    });

    onAppReady(app);

    const handleResize = () => {
      if (!el || !controllerRef.current) return;
      controllerRef.current.resize(el.clientWidth, el.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    const unsubscribeLipSync = onLipSyncUpdate((mouthOpen, isSpeaking) => {
      if (!controllerRef.current) return;
      controllerRef.current.setLipSyncMouthOpen(mouthOpen);
      if (isSpeaking) {
        controllerRef.current.startTalking();
      } else {
        controllerRef.current.stopTalking();
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribeLipSync();
      useChatStore.getState().clearEmotionTimer();
      try {
        controllerRef.current?.destroy();
        appRef.current?.destroy(true);
      } catch {}
      appRef.current = null;
      controllerRef.current = null;
      initRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!controllerRef.current || !modelLoadRequest) return;
    const { url, cleanup } = modelLoadRequest;
    controllerRef.current.loadLive2DModel(url, cleanup).then(loaded => {
      setModelLoaded(loaded);
    });
    useChatStore.getState().setModelLoadRequest(null);
  }, [modelLoadRequest, setModelLoaded]);

  useEffect(() => {
    controllerRef.current?.setEmotion(currentEmotion);
  }, [currentEmotion]);

  return (
    <div
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ background: 'transparent' }}
    />
  );
}
