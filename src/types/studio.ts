export type ThemeId = 'nordic' | 'sunny' | 'matcha' | 'hearth';
export type LightPattern = 'twinkle' | 'chase' | 'pulse' | 'warm';
export type SnowLevel = 'light' | 'cozy' | 'blizzard';
export type CountdownTarget = 'newyear' | 'christmas' | 'custom';
export type ViewMode = 'home' | 'newyear';
export type MusicBoxMelody = 'jingle-bells' | 'auld-lang-syne';

export interface GreetingData {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}

export interface GreetingPreset extends GreetingData {
  tag: string;
}

export interface GiftSurprise {
  emoji: string;
  title: string;
  meaning: string;
  quote: string;
}

export interface CustomCountdownConfig {
  label: string;
  isoDate: string; // YYYY-MM-DD
}

export interface HolidayDatePreset {
  id: string;
  label: string;
  displayLabel: string;
  isoDate: string;
}

/** Persisted to localStorage under 'winter-wonderland-prefs-v1' */
export interface AppPreferences {
  theme: ThemeId;
  lightsOn: boolean;
  pattern: LightPattern;
  snow: SnowLevel;
  target: CountdownTarget;
  customTarget: CustomCountdownConfig;
  greeting: GreetingData;
  musicMelody: MusicBoxMelody;
}

export interface CountdownInfo {
  isCelebrationDay: boolean;
  isPast?: boolean;
  year: number;
  label: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface ThemePalette {
  id: ThemeId;
  name: string;
  swatchGradient: string;
  isLight: boolean;
  skyTop: string;
  skyMid: string;
  skyBot: string;
  cloudColor: string;
  sunOrMoon: string;
  sunGlow: string;
  hillFar: string;
  hillMid: string;
  snowFloorTop: string;
  snowFloorMid: string;
  snowFloorBot: string;
  groundGlow: string;
  rugColor: string;
  potColor: string;
  potRim: string;
  treeDark: string;
  treeMid: string;
  treeLight: string;
  snowCap: string;
  lights: readonly string[];
  baubles: readonly string[];
  star: string;
  starShade: string;
  starGlow: string;
  garland: string;
  flakeOutline: string;
  confetti: readonly string[];
}

export interface SceneInitialOptions {
  theme: ThemeId;
  lightsOn: boolean;
  pattern: LightPattern;
  snow: SnowLevel;
  view: ViewMode;
}

export interface SceneCallbacks {
  onStarClick?: () => void;
  onBaubleClick?: (index: number) => void;
  onGiftClick?: (index: number) => void;
  onFireworkExplode?: () => void;
  onSkyFirework?: () => void;
}

export interface SceneHandle {
  replayDecorating: () => void;
  launchFirework: (x?: number | null, y?: number | null) => void;
  launchCelebrationBurst: () => void;
  triggerStarEffect: () => void;
  triggerGiftEffect: (index?: number) => void;
  getCanvasElement: () => HTMLCanvasElement | null;
}
