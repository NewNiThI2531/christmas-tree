import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { getNextTargetInfo } from '../engine/countdownEngine';
import { useFestiveAudio, type FestiveAudioHandle } from '../hooks/useFestiveAudio';
import { usePreferences, type PreferencesApi } from '../hooks/usePreferences';
import type { SceneHandle } from '../types/studio';

export interface StudioUIApi {
  celebrationMode: boolean;
  hintVisible: boolean;
  upcomingYear: number;
  setCelebrationMode: (active: boolean) => void;
  dismissHint: () => void;
  replayDecorating: () => void;
  triggerGiftCycle: () => void;
}

export interface SceneBridgeApi {
  sceneRef: RefObject<SceneHandle | null>;
  audio: FestiveAudioHandle;
}

const PreferencesContext = createContext<PreferencesApi | null>(null);
const StudioUIContext = createContext<StudioUIApi | null>(null);
const SceneBridgeContext = createContext<SceneBridgeApi | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const preferences = usePreferences();
  const audio = useFestiveAudio(preferences.prefs.musicMelody);
  const sceneRef = useRef<SceneHandle | null>(null);

  const [celebrationMode, setCelebrationMode] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const giftCycleRef = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => setHintVisible(false), 6000);
    return () => clearTimeout(id);
  }, []);

  const upcomingYear = useMemo(() => getNextTargetInfo('newyear').year, []);

  const dismissHint = useCallback(() => {
    setHintVisible(false);
  }, []);

  const replayDecorating = useCallback(() => {
    sceneRef.current?.replayDecorating();
    audio.playChime(2, 0.08);
  }, [audio]);

  const triggerGiftCycle = useCallback(() => {
    const nextIdx = giftCycleRef.current++;
    sceneRef.current?.triggerGiftEffect(nextIdx);
  }, []);

  const uiValue = useMemo<StudioUIApi>(
    () => ({
      celebrationMode,
      hintVisible,
      upcomingYear,
      setCelebrationMode,
      dismissHint,
      replayDecorating,
      triggerGiftCycle,
    }),
    [celebrationMode, hintVisible, upcomingYear, dismissHint, replayDecorating, triggerGiftCycle],
  );

  const bridgeValue = useMemo<SceneBridgeApi>(() => ({ sceneRef, audio }), [audio]);

  return (
    <PreferencesContext.Provider value={preferences}>
      <StudioUIContext.Provider value={uiValue}>
        <SceneBridgeContext.Provider value={bridgeValue}>{children}</SceneBridgeContext.Provider>
      </StudioUIContext.Provider>
    </PreferencesContext.Provider>
  );
}

export function useStudioPreferences(): PreferencesApi {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('useStudioPreferences must be used within StudioProvider');
  return ctx;
}

export function useStudioUI(): StudioUIApi {
  const ctx = useContext(StudioUIContext);
  if (!ctx) throw new Error('useStudioUI must be used within StudioProvider');
  return ctx;
}

export function useSceneBridge(): SceneBridgeApi {
  const ctx = useContext(SceneBridgeContext);
  if (!ctx) throw new Error('useSceneBridge must be used within StudioProvider');
  return ctx;
}
