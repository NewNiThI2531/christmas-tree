import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { useSceneBridge, useStudioPreferences, useStudioUI } from '../../context/StudioContext';
import { WinterTreeScene } from '../../engine/WinterTreeScene';
import type { SceneCallbacks } from '../../types/studio';

export const TreeCanvas = memo(function TreeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<WinterTreeScene | null>(null);

  const { prefs } = useStudioPreferences();
  const { celebrationMode, dismissHint } = useStudioUI();
  const { sceneRef, audio } = useSceneBridge();

  const callbacksRef = useRef<SceneCallbacks>({});
  useLayoutEffect(() => {
    callbacksRef.current = {
      onStarClick: () => {
        audio.playChime(6, 0.1);
        dismissHint();
      },
      onBaubleClick: (idx) => {
        audio.playChime(idx, 0.085);
        dismissHint();
      },
      onGiftClick: () => {
        audio.playGiftFanfare();
        dismissHint();
      },
      onFireworkExplode: () => {
        audio.playFireworkBurst();
      },
    };
  });

  const initialRef = useRef({
    theme: prefs.theme,
    lightsOn: prefs.lightsOn,
    pattern: prefs.pattern,
    snow: prefs.snow,
    view: 'home' as const,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new WinterTreeScene(canvas, initialRef.current, {
      onStarClick: () => callbacksRef.current.onStarClick?.(),
      onBaubleClick: (idx) => callbacksRef.current.onBaubleClick?.(idx),
      onGiftClick: (idx) => callbacksRef.current.onGiftClick?.(idx),
      onFireworkExplode: () => callbacksRef.current.onFireworkExplode?.(),
      onSkyFirework: () => callbacksRef.current.onSkyFirework?.(),
    });

    engineRef.current = scene;
    sceneRef.current = {
      replayDecorating: () => scene.replayDecorating(),
      launchFirework: (x, y) => scene.launchFirework(x, y),
      launchCelebrationBurst: () => scene.launchCelebrationBurst(),
      triggerStarEffect: () => scene.triggerStarEffect(),
      triggerGiftEffect: (idx) => scene.triggerGiftEffect(idx),
      getCanvasElement: () => scene.getCanvasElement(),
    };

    return () => {
      scene.destroy();
      engineRef.current = null;
      sceneRef.current = null;
    };
  }, [sceneRef]);

  useEffect(() => {
    engineRef.current?.setTheme(prefs.theme);
  }, [prefs.theme]);

  useEffect(() => {
    engineRef.current?.setLightsOn(prefs.lightsOn);
  }, [prefs.lightsOn]);

  useEffect(() => {
    engineRef.current?.setPattern(prefs.pattern);
  }, [prefs.pattern]);

  useEffect(() => {
    engineRef.current?.setSnowIntensity(prefs.snow);
  }, [prefs.snow]);

  useEffect(() => {
    engineRef.current?.setCelebrationMode(celebrationMode);
  }, [celebrationMode]);

  return (
    <canvas
      ref={canvasRef}
      id="scene-canvas"
      role="img"
      aria-label="Interactive handcrafted Christmas tree animation"
      className="fixed inset-0 z-0 block h-full w-full"
    />
  );
});
