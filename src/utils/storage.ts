import {
  CUSTOM_LABEL_MAX_LENGTH,
  DEFAULT_PREFERENCES,
  STORAGE_KEY,
  SUBTITLE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  VALID_MELODIES,
  VALID_PATTERNS,
  VALID_SNOW,
  VALID_TARGETS,
} from '../data/constants';
import { VALID_THEMES } from '../data/themes';
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

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLen);
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return false;
  const check = new Date(y, m - 1, d);
  return check.getFullYear() === y && check.getMonth() === m - 1 && check.getDate() === d;
}

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && VALID_THEMES.has(value as ThemeId);
}

function isLightPattern(value: unknown): value is LightPattern {
  return typeof value === 'string' && VALID_PATTERNS.has(value as LightPattern);
}

function isSnowLevel(value: unknown): value is SnowLevel {
  return typeof value === 'string' && VALID_SNOW.has(value as SnowLevel);
}

function isCountdownTarget(value: unknown): value is CountdownTarget {
  return typeof value === 'string' && VALID_TARGETS.has(value as CountdownTarget);
}

function isMusicMelody(value: unknown): value is MusicBoxMelody {
  return typeof value === 'string' && VALID_MELODIES.has(value as MusicBoxMelody);
}

function parseGreeting(raw: unknown, fallback: GreetingData): GreetingData {
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Record<string, unknown>;
  const title = sanitizeText(obj.title, TITLE_MAX_LENGTH);
  if (!title) return fallback;
  const subtitle = sanitizeText(obj.subtitle, SUBTITLE_MAX_LENGTH) || fallback.subtitle;
  const eyebrow = sanitizeText(obj.eyebrow, 40) || "SEASON'S GREETINGS";
  const id = sanitizeText(obj.id, 40) || 'custom';
  return { id, eyebrow, title, subtitle };
}

function parseCustomTarget(raw: unknown, fallback: CustomCountdownConfig): CustomCountdownConfig {
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Record<string, unknown>;
  const isoDate = isValidIsoDate(obj.isoDate) ? obj.isoDate : fallback.isoDate;
  const label = sanitizeText(obj.label, CUSTOM_LABEL_MAX_LENGTH) || fallback.label;
  return { label, isoDate };
}

export function parseStoredPreferences(raw: unknown): AppPreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PREFERENCES, greeting: { ...DEFAULT_PREFERENCES.greeting }, customTarget: { ...DEFAULT_PREFERENCES.customTarget } };
  }
  const obj = raw as Record<string, unknown>;

  return {
    theme: isThemeId(obj.theme) ? obj.theme : DEFAULT_PREFERENCES.theme,
    lightsOn: typeof obj.lightsOn === 'boolean' ? obj.lightsOn : DEFAULT_PREFERENCES.lightsOn,
    pattern: isLightPattern(obj.pattern) ? obj.pattern : DEFAULT_PREFERENCES.pattern,
    snow: isSnowLevel(obj.snow) ? obj.snow : DEFAULT_PREFERENCES.snow,
    target: isCountdownTarget(obj.target) ? obj.target : DEFAULT_PREFERENCES.target,
    customTarget: parseCustomTarget(obj.customTarget, DEFAULT_PREFERENCES.customTarget),
    greeting: parseGreeting(obj.greeting, DEFAULT_PREFERENCES.greeting),
    musicMelody: isMusicMelody(obj.musicMelody) ? obj.musicMelody : DEFAULT_PREFERENCES.musicMelody,
  };
}

export function loadPreferences(): AppPreferences {
  let stored: AppPreferences = parseStoredPreferences(null);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      stored = parseStoredPreferences(JSON.parse(raw));
    }
  } catch {
    // Private browsing or unavailable localStorage
  }

  return mergeUrlPreferences(stored, window.location.search);
}

export function mergeUrlPreferences(base: AppPreferences, search: string): AppPreferences {
  if (!search || search.length <= 1) return base;
  try {
    const params = new URLSearchParams(search);
    const next: AppPreferences = {
      ...base,
      greeting: { ...base.greeting },
      customTarget: { ...base.customTarget },
    };

    const qTheme = params.get('theme') ?? params.get('t');
    if (isThemeId(qTheme)) next.theme = qTheme;

    const qPattern = params.get('pattern') ?? params.get('p');
    if (isLightPattern(qPattern)) next.pattern = qPattern;

    const qSnow = params.get('snow') ?? params.get('s');
    if (isSnowLevel(qSnow)) next.snow = qSnow;

    const qTarget = params.get('target') ?? params.get('c');
    if (isCountdownTarget(qTarget)) next.target = qTarget;

    const qLights = params.get('lights');
    if (qLights === '0' || qLights === 'false') next.lightsOn = false;
    else if (qLights === '1' || qLights === 'true') next.lightsOn = true;

    const qDate = params.get('date');
    const qEvent = params.get('event');
    if (isValidIsoDate(qDate)) {
      next.customTarget.isoDate = qDate;
      if (!qTarget) next.target = 'custom';
    }
    if (qEvent) {
      const cleanEvent = sanitizeText(qEvent, CUSTOM_LABEL_MAX_LENGTH);
      if (cleanEvent) next.customTarget.label = cleanEvent;
    }

    const qTitle = params.get('title');
    const qSub = params.get('sub') ?? params.get('subtitle');
    const qEyebrow = params.get('eyebrow');
    if (qTitle) {
      const cleanTitle = sanitizeText(qTitle, TITLE_MAX_LENGTH);
      if (cleanTitle) {
        next.greeting = {
          id: 'shared',
          eyebrow: sanitizeText(qEyebrow, 40) || 'SHARED WISH',
          title: cleanTitle,
          subtitle: sanitizeText(qSub, SUBTITLE_MAX_LENGTH) || next.greeting.subtitle,
        };
      }
    } else if (qSub) {
      const cleanSub = sanitizeText(qSub, SUBTITLE_MAX_LENGTH);
      if (cleanSub) next.greeting.subtitle = cleanSub;
    }

    return next;
  } catch {
    return base;
  }
}

export function savePreferences(prefs: AppPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

export function buildShareUrl(prefs: AppPreferences): string {
  const url = new URL(window.location.href);
  url.search = '';
  const params = url.searchParams;
  params.set('theme', prefs.theme);
  params.set('title', prefs.greeting.title);
  if (prefs.greeting.subtitle) {
    params.set('sub', prefs.greeting.subtitle);
  }
  if (prefs.pattern !== DEFAULT_PREFERENCES.pattern) {
    params.set('pattern', prefs.pattern);
  }
  if (prefs.snow !== DEFAULT_PREFERENCES.snow) {
    params.set('snow', prefs.snow);
  }
  if (!prefs.lightsOn) {
    params.set('lights', '0');
  }
  if (prefs.target !== DEFAULT_PREFERENCES.target) {
    params.set('target', prefs.target);
  }
  if (prefs.target === 'custom') {
    params.set('date', prefs.customTarget.isoDate);
    if (prefs.customTarget.label) {
      params.set('event', prefs.customTarget.label);
    }
  }
  return url.toString();
}
