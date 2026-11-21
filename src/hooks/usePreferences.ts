import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEY } from '../data/constants';
import { GREETING_PRESETS } from '../data/greetings';
import type {
  AppPreferences,
  CountdownTarget,
  CustomCountdownConfig,
  GreetingData,
  LightPattern,
  MusicBoxMelody,
  SnowLevel,
  ThemeId,
} from '../types/studio';
import { loadPreferences, parseStoredPreferences, savePreferences } from '../utils/storage';

export interface PreferencesApi {
  prefs: AppPreferences;
  setTheme: (theme: ThemeId) => void;
  setLightsOn: (on: boolean) => void;
  toggleLights: () => void;
  setPattern: (pattern: LightPattern) => void;
  setSnow: (snow: SnowLevel) => void;
  setTarget: (target: CountdownTarget) => void;
  setCustomTarget: (customTarget: CustomCountdownConfig) => void;
  setGreeting: (greeting: GreetingData) => void;
  cycleGreeting: () => void;
  setMusicMelody: (melody: MusicBoxMelody) => void;
}

export function usePreferences(): PreferencesApi {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());

  // Sync html[data-theme] and persist to localStorage
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    savePreferences(prefs);
  }, [prefs]);

  // Cross-tab localStorage synchronization
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setPrefs(parseStoredPreferences(JSON.parse(event.newValue)));
      } catch {
        // Ignore malformed cross-tab payloads
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((theme: ThemeId) => {
    setPrefs((prev) => (prev.theme === theme ? prev : { ...prev, theme }));
  }, []);

  const setLightsOn = useCallback((lightsOn: boolean) => {
    setPrefs((prev) => (prev.lightsOn === lightsOn ? prev : { ...prev, lightsOn }));
  }, []);

  const toggleLights = useCallback(() => {
    setPrefs((prev) => ({ ...prev, lightsOn: !prev.lightsOn }));
  }, []);

  const setPattern = useCallback((pattern: LightPattern) => {
    setPrefs((prev) => (prev.pattern === pattern ? prev : { ...prev, pattern }));
  }, []);

  const setSnow = useCallback((snow: SnowLevel) => {
    setPrefs((prev) => (prev.snow === snow ? prev : { ...prev, snow }));
  }, []);

  const setTarget = useCallback((target: CountdownTarget) => {
    setPrefs((prev) => (prev.target === target ? prev : { ...prev, target }));
  }, []);

  const setCustomTarget = useCallback((customTarget: CustomCountdownConfig) => {
    setPrefs((prev) => ({ ...prev, customTarget }));
  }, []);

  const setGreeting = useCallback((greeting: GreetingData) => {
    setPrefs((prev) => ({
      ...prev,
      greeting: {
        id: greeting.id || 'custom',
        eyebrow: greeting.eyebrow || "SEASON'S GREETINGS",
        title: greeting.title,
        subtitle: greeting.subtitle,
      },
    }));
  }, []);

  const cycleGreeting = useCallback(() => {
    setPrefs((prev) => {
      const idx = GREETING_PRESETS.findIndex((g) => g.id === prev.greeting.id);
      const next = GREETING_PRESETS[(idx + 1) % GREETING_PRESETS.length]!;
      return {
        ...prev,
        greeting: {
          id: next.id,
          eyebrow: next.eyebrow,
          title: next.title,
          subtitle: next.subtitle,
        },
      };
    });
  }, []);

  const setMusicMelody = useCallback((musicMelody: MusicBoxMelody) => {
    setPrefs((prev) => (prev.musicMelody === musicMelody ? prev : { ...prev, musicMelody }));
  }, []);

  return {
    prefs,
    setTheme,
    setLightsOn,
    toggleLights,
    setPattern,
    setSnow,
    setTarget,
    setCustomTarget,
    setGreeting,
    cycleGreeting,
    setMusicMelody,
  };
}
