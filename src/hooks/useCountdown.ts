import { useEffect, useRef, useState } from 'react';
import { ensureTemporal, getNextTargetInfo, isTemporalReady } from '../engine/countdownEngine';
import type { CountdownInfo, CountdownTarget, CustomCountdownConfig } from '../types/studio';

interface UseCountdownOptions {
  target: CountdownTarget;
  customTarget: CustomCountdownConfig;
  midnightPreviewUntil: number;
  onCelebrationStart?: () => void;
}

export interface UseCountdownResult {
  info: CountdownInfo;
  newYearNumber: number;
  isPreviewingMidnight: boolean;
  temporalActive: boolean;
}

export function useCountdown({
  target,
  customTarget,
  midnightPreviewUntil,
  onCelebrationStart,
}: UseCountdownOptions): UseCountdownResult {
  const [temporalActive, setTemporalActive] = useState<boolean>(() => isTemporalReady());
  const [, setTick] = useState(0);
  const celebratedKeyRef = useRef<string | null>(null);
  const onCelebrationRef = useRef(onCelebrationStart);
  onCelebrationRef.current = onCelebrationStart;

  // Hydrate Temporal polyfill asynchronously once
  useEffect(() => {
    let active = true;
    ensureTemporal().then((loaded) => {
      if (active && loaded) {
        setTemporalActive(true);
        setTick((n) => n + 1);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // 1-second tick + immediate wake recomputation on visibilitychange
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    const onVisibility = () => {
      if (!document.hidden) setTick((n) => n + 1);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const rawInfo = getNextTargetInfo(target, customTarget);
  const nyInfo = target === 'newyear' ? rawInfo : getNextTargetInfo('newyear');
  const isPreviewingMidnight = Date.now() < midnightPreviewUntil;

  const info: CountdownInfo = isPreviewingMidnight
    ? {
        isCelebrationDay: true,
        year: nyInfo.year,
        label: `HAPPY NEW YEAR ${nyInfo.year}!`,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      }
    : rawInfo;

  // Trigger celebration fireworks once per target celebration day
  useEffect(() => {
    if (!isPreviewingMidnight && rawInfo.isCelebrationDay) {
      const key = `${target}-${rawInfo.year}-${rawInfo.label}`;
      if (celebratedKeyRef.current !== key) {
        celebratedKeyRef.current = key;
        onCelebrationRef.current?.();
      }
    } else if (!rawInfo.isCelebrationDay) {
      celebratedKeyRef.current = null;
    }
  }, [isPreviewingMidnight, rawInfo.isCelebrationDay, rawInfo.year, rawInfo.label, target]);

  return {
    info,
    newYearNumber: nyInfo.year,
    isPreviewingMidnight,
    temporalActive,
  };
}
