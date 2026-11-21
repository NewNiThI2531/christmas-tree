import type { AppPreferences, LightPattern, MusicBoxMelody, SnowLevel, CountdownTarget } from '../types/studio';
import { GREETING_PRESETS, getUpcomingHolidayPresets } from './greetings';

export const STORAGE_KEY = 'winter-wonderland-prefs-v1';

export const TITLE_MAX_LENGTH = 40;
export const SUBTITLE_MAX_LENGTH = 90;
export const CUSTOM_LABEL_MAX_LENGTH = 36;

export const MAX_PARTICLES_NORMAL = 600;
export const MAX_PARTICLES_REDUCED = 200;

export const VALID_PATTERNS = new Set<LightPattern>(['twinkle', 'chase', 'pulse', 'warm']);
export const VALID_SNOW = new Set<SnowLevel>(['light', 'cozy', 'blizzard']);
export const VALID_TARGETS = new Set<CountdownTarget>(['newyear', 'christmas', 'custom']);
export const VALID_MELODIES = new Set<MusicBoxMelody>(['jingle-bells', 'auld-lang-syne']);

const defaultHoliday = getUpcomingHolidayPresets()[0] ?? {
  displayLabel: 'Lunar New Year 2027',
  isoDate: '2027-02-06',
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'nordic',
  lightsOn: true,
  pattern: 'twinkle',
  snow: 'cozy',
  target: 'newyear',
  customTarget: {
    label: defaultHoliday.displayLabel,
    isoDate: defaultHoliday.isoDate,
  },
  greeting: {
    id: GREETING_PRESETS[0]!.id,
    eyebrow: GREETING_PRESETS[0]!.eyebrow,
    title: GREETING_PRESETS[0]!.title,
    subtitle: GREETING_PRESETS[0]!.subtitle,
  },
  musicMelody: 'jingle-bells',
};

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 36,
  mass: 0.8,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 1,
};

export const SPRING_PLAYFUL = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 22,
  mass: 0.9,
};

export const SPRING_SHEET = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 34,
  mass: 0.95,
};
