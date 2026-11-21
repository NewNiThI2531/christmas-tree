import { useEffect, useRef } from 'react';

export interface KeyboardShortcutsConfig {
  disabled: boolean;
  onToggleLights: () => void;
  onFireworks: () => void;
  onToggleZen: () => void;
  onStar: () => void;
  onGift: () => void;
  onReplay: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig): void {
  const ref = useRef(config);
  ref.current = config;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const current = ref.current;

      if (e.key === 'Escape') {
        current.onEscape?.();
        return;
      }

      if (current.disabled) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.isComposing || e.keyCode === 229) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'l') current.onToggleLights();
      else if (key === 'f') current.onFireworks();
      else if (key === 'z') current.onToggleZen();
      else if (key === 's') current.onStar();
      else if (key === 'g') current.onGift();
      else if (key === 'r') current.onReplay();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
