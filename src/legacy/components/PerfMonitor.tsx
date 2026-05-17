import { useEffect, useState } from 'react';

export default function PerfMonitor() {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const tick = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;

        const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
        if (perf.memory) {
          setMemory(Math.round(perf.memory.usedJSHeapSize / 1048576));
        }
      }
      requestAnimationFrame(tick);
    };

    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="font-mono text-[9px] leading-relaxed text-[var(--cyber-cyan)]/50 bg-[var(--cyber-surface)] px-2 py-1 border border-[var(--cyber-border)]" style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}>
      <div>{fps} FPS</div>
      {memory > 0 && <div>{memory}MB</div>}
    </div>
  );
}
