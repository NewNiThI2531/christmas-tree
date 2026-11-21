import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FestiveAudio } from '../engine/FestiveAudio';
import type { MusicBoxMelody } from '../types/studio';

export interface FestiveAudioHandle {
  enabled: boolean;
  musicPlaying: boolean;
  setEnabled: (value: boolean) => void;
  toggleSound: () => void;
  setMusicPlaying: (playing: boolean, melody?: MusicBoxMelody) => void;
  toggleMusic: (melody?: MusicBoxMelody) => void;
  setMelody: (melody: MusicBoxMelody) => void;
  playChime: (noteIndex?: number | null, volume?: number) => void;
  playGiftFanfare: () => void;
  playFireworkBurst: () => void;
}

export function useFestiveAudio(initialMelody: MusicBoxMelody): FestiveAudioHandle {
  const audioRef = useRef<FestiveAudio | null>(null);
  const [enabled, setEnabledState] = useState(false);
  const [musicPlaying, setMusicPlayingState] = useState(false);

  const getEngine = useCallback((): FestiveAudio => {
    if (!audioRef.current) {
      const engine = new FestiveAudio();
      engine.setMelody(initialMelody);
      audioRef.current = engine;
    }
    return audioRef.current;
  }, [initialMelody]);

  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  const setEnabled = useCallback(
    (value: boolean) => {
      const engine = getEngine();
      engine.setEnabled(value);
      setEnabledState(engine.enabled);
      if (!value) {
        setMusicPlayingState(false);
        engine.setMusicPlaying(false);
      }
    },
    [getEngine],
  );

  const toggleSound = useCallback(() => {
    const engine = getEngine();
    const next = !engine.enabled;
    engine.setEnabled(next);
    setEnabledState(engine.enabled);
    if (!next) {
      engine.setMusicPlaying(false);
      setMusicPlayingState(false);
    }
  }, [getEngine]);

  const setMusicPlaying = useCallback(
    (playing: boolean, melody?: MusicBoxMelody) => {
      const engine = getEngine();
      engine.setMusicPlaying(playing, melody);
      setMusicPlayingState(engine.musicPlaying);
      setEnabledState(engine.enabled);
    },
    [getEngine],
  );

  const toggleMusic = useCallback(
    (melody?: MusicBoxMelody) => {
      const engine = getEngine();
      const next = !engine.musicPlaying;
      engine.setMusicPlaying(next, melody);
      setMusicPlayingState(engine.musicPlaying);
      setEnabledState(engine.enabled);
    },
    [getEngine],
  );

  const setMelody = useCallback(
    (melody: MusicBoxMelody) => {
      const engine = getEngine();
      engine.setMelody(melody);
    },
    [getEngine],
  );

  const playChime = useCallback(
    (noteIndex: number | null = null, volume = 0.09) => {
      audioRef.current?.playChime(noteIndex, volume);
    },
    [],
  );

  const playGiftFanfare = useCallback(() => {
    audioRef.current?.playGiftFanfare();
  }, []);

  const playFireworkBurst = useCallback(() => {
    audioRef.current?.playFireworkBurst();
  }, []);

  return useMemo(
    () => ({
      enabled,
      musicPlaying,
      setEnabled,
      toggleSound,
      setMusicPlaying,
      toggleMusic,
      setMelody,
      playChime,
      playGiftFanfare,
      playFireworkBurst,
    }),
    [
      enabled,
      musicPlaying,
      setEnabled,
      toggleSound,
      setMusicPlaying,
      toggleMusic,
      setMelody,
      playChime,
      playGiftFanfare,
      playFireworkBurst,
    ],
  );
}
