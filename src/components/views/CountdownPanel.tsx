import { memo, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { CountdownInfo } from '../../types/studio';

function pad2(num: number): string {
  return String(Math.max(0, num)).padStart(2, '0');
}

const BrassScrew = memo(function BrassScrew({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-[9px] w-[9px] rounded-full border border-[#8a6523]/70 bg-[radial-gradient(circle_at_32%_28%,#fff3c7_0%,#dbb054_50%,#87601c_100%)] shadow-[0_1px_1px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(68,45,10,0.35)] ${className}`}
    >
      <span className="absolute inset-x-[1.5px] top-1/2 h-[1.2px] -translate-y-1/2 -rotate-[32deg] rounded-full bg-[#52380c]/75" />
    </span>
  );
});

interface SplitFlapUnitProps {
  id: string;
  value: string;
  label: string;
  reducedMotion: boolean;
}

const SplitFlapUnit = memo(function SplitFlapUnit({
  id,
  value,
  label,
  reducedMotion,
}: SplitFlapUnitProps) {
  const [flipState, setFlipState] = useState({
    prev: value,
    curr: value,
    flipping: false,
    seq: 0,
  });

  // Sync during render so there is 0-frame flash before the mechanical flip starts
  if (value !== flipState.curr) {
    setFlipState({
      prev: flipState.curr,
      curr: value,
      flipping: !reducedMotion,
      seq: flipState.seq + 1,
    });
  }

  const digitClass =
    'tabular-digits font-display text-[clamp(1.55rem,4.6vw,2.2rem)] lg:text-[2.25rem] font-bold leading-none tracking-[-0.02em] text-[#fffaf0] [text-shadow:0_1px_2px_rgba(8,14,11,0.65)] select-none';

  return (
    <div className="flex flex-1 lg:flex-none flex-col items-center gap-2 min-w-[58px] max-w-[78px] lg:w-[78px]">
      {/* Exact accessible value for screen readers & DOM selectors */}
      <span id={id} className="sr-only">
        {value}
      </span>

      {/* Physical Solari Split-Flap Mechanical Card */}
      <div
        aria-hidden="true"
        className="split-flap-scene relative h-[64px] sm:h-[72px] lg:h-[78px] w-full rounded-[11px] bg-[#16211c] shadow-[0_2px_0_#131c18,0_3px_0_#394941,0_5px_0_#101814,0_6px_0_#2e3c35,0_10px_14px_-3px_rgba(7,14,10,0.52)]"
      >
        {/* Static TOP Half (reveals incoming / current value) */}
        <div className="relative h-1/2 w-full overflow-hidden rounded-t-[11px] bg-gradient-to-b from-[#33493f] via-[#25372f] to-[#1b2923] border-x border-t border-[#4b6358]/55 shadow-[inset_0_1px_0_rgba(255,252,240,0.22)]">
          <span
            className={`absolute top-0 inset-x-0 h-[200%] flex items-center justify-center ${digitClass}`}
          >
            {flipState.curr}
          </span>
        </div>

        {/* Static BOTTOM Half (holds previous value until lower flap lands) */}
        <div className="relative h-1/2 w-full overflow-hidden rounded-b-[11px] bg-gradient-to-b from-[#16221d] via-[#1f2f28] to-[#263830] border-x border-b border-[#0d1512]/80 shadow-[inset_0_-1px_0_rgba(255,248,230,0.09)]">
          <span
            className={`absolute -top-full inset-x-0 h-[200%] flex items-center justify-center ${digitClass}`}
          >
            {flipState.flipping ? flipState.prev : flipState.curr}
          </span>
        </div>

        {/* Animated Mechanical Flaps — mounted ONLY for ~400ms on the unit that changed */}
        {flipState.flipping && (
          <>
            <div
              key={`top-${flipState.seq}`}
              className="split-flap-top-anim pointer-events-none absolute top-0 inset-x-0 z-20 h-1/2 overflow-hidden rounded-t-[11px] bg-gradient-to-b from-[#33493f] via-[#25372f] to-[#1b2923] border-x border-t border-[#4b6358]/55 shadow-[inset_0_1px_0_rgba(255,252,240,0.22)]"
            >
              <span
                className={`absolute top-0 inset-x-0 h-[200%] flex items-center justify-center ${digitClass}`}
              >
                {flipState.prev}
              </span>
              <span className="split-flap-top-shade absolute inset-0 bg-[#080e0b]" />
            </div>

            <div
              key={`bot-${flipState.seq}`}
              onAnimationEnd={() =>
                setFlipState((s) => (s.flipping ? { ...s, prev: s.curr, flipping: false } : s))
              }
              className="split-flap-bottom-anim pointer-events-none absolute bottom-0 inset-x-0 z-20 h-1/2 overflow-hidden rounded-b-[11px] bg-gradient-to-b from-[#16221d] via-[#1f2f28] to-[#263830] border-x border-b border-[#0d1512]/80 shadow-[inset_0_-1px_0_rgba(255,248,230,0.09)]"
            >
              <span
                className={`absolute -top-full inset-x-0 h-[200%] flex items-center justify-center ${digitClass}`}
              >
                {flipState.curr}
              </span>
              <span className="split-flap-bottom-shade absolute inset-0 bg-[#080e0b]" />
            </div>
          </>
        )}

        {/* Crisp Mechanical Center Split Crease + Cast Shadow */}
        <span className="pointer-events-none absolute inset-x-0 top-1/2 z-30 -translate-y-1/2">
          <span className="block h-[2px] w-full bg-[#09100d] shadow-[0_1px_2px_rgba(0,0,0,0.55)]" />
          <span className="block h-px w-full bg-white/10" />
        </span>

        {/* Metallic Left & Right Brass Hinge Pins */}
        <span className="pointer-events-none absolute left-[2px] top-1/2 z-30 h-[12px] w-[4px] -translate-y-1/2 rounded-[2px] bg-gradient-to-b from-[#7a581c] via-[#f6dd94] to-[#5e4112] shadow-[0_0_0_1px_rgba(9,15,12,0.75)]" />
        <span className="pointer-events-none absolute right-[2px] top-1/2 z-30 h-[12px] w-[4px] -translate-y-1/2 rounded-[2px] bg-gradient-to-b from-[#7a581c] via-[#f6dd94] to-[#5e4112] shadow-[0_0_0_1px_rgba(9,15,12,0.75)]" />
      </div>

      {/* Debossed Porcelain Unit Label */}
      <span className="text-[0.63rem] sm:text-[0.67rem] font-bold tracking-[0.14em] uppercase text-[#56422b] [text-shadow:0_1px_0_rgba(255,255,255,0.88)]">
        {label}
      </span>
    </div>
  );
});

interface CountdownPanelProps {
  info: CountdownInfo;
}

export function CountdownPanel({ info }: CountdownPanelProps) {
  const reducedMotion = useReducedMotion();
  const units = [
    { id: 'cd-days', value: pad2(info.days), label: 'Days' },
    { id: 'cd-hours', value: pad2(info.hours), label: 'Hours' },
    { id: 'cd-minutes', value: pad2(info.minutes), label: 'Mins' },
    { id: 'cd-seconds', value: pad2(info.seconds), label: 'Secs' },
  ];

  return (
    <div
      id="countdown-panel"
      className="relative inline-flex w-full lg:w-auto flex-col items-center lg:items-start gap-3 rounded-[22px] border border-[#cdb898] bg-gradient-to-b from-[#fffdf9] via-[#f6eee0] to-[#eae0cd] px-3.5 py-3.5 sm:px-5 sm:py-4.5 shadow-[0_4px_0_#cbb799,0_18px_38px_rgba(29,43,36,0.16),0_4px_10px_rgba(29,43,36,0.1),inset_0_1px_0_#ffffff]"
    >
      {/* 4 Slotted Brass Corner Screws */}
      <BrassScrew className="top-2.5 left-2.5" />
      <BrassScrew className="top-2.5 right-2.5" />
      <BrassScrew className="bottom-2.5 left-2.5" />
      <BrassScrew className="bottom-2.5 right-2.5" />

      {/* Riveted Brushed-Brass Header Nameplate */}
      <div className="flex w-full items-center justify-center lg:justify-between px-3">
        <span
          id="countdown-target-label"
          aria-live="polite"
          aria-atomic="true"
          className="inline-flex items-center gap-2 rounded-full border border-[#a97d31]/55 bg-gradient-to-r from-[#d2a756] via-[#f4dc98] to-[#cca04e] px-3 py-0.5 text-[0.68rem] font-bold tracking-[0.17em] text-[#2b1d0b] uppercase shadow-[0_1px_2px_rgba(45,30,10,0.18),inset_0_1px_0_rgba(255,252,235,0.75)] [text-shadow:0_1px_0_rgba(255,248,220,0.55)]"
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-[#b8351d] shadow-[inset_0_1px_1px_rgba(255,210,195,0.7),0_0_0_1px_rgba(92,22,10,0.35)]"
          />
          <span>{info.label}</span>
        </span>
      </div>

      {/* Recessed Mechanical Clock Bay */}
      <div
        id="countdown-grid"
        className="flex w-full items-start justify-center gap-1.5 sm:gap-2 rounded-[16px] border border-[#d6c5aa] bg-gradient-to-b from-[#e4d7c1] via-[#ede2cf] to-[#f4ebdc] p-2 sm:p-2.5 shadow-[inset_0_2px_6px_rgba(48,36,22,0.16),inset_0_-1px_0_rgba(255,255,255,0.85)]"
      >
        {units.map((unit, idx) => (
          <div key={unit.id} className="contents">
            <SplitFlapUnit
              id={unit.id}
              value={unit.value}
              label={unit.label}
              reducedMotion={reducedMotion}
            />
            {idx < units.length - 1 && (
              <span
                aria-hidden="true"
                className="flex flex-col gap-2 px-0.5 pt-[23px] sm:pt-[27px] lg:pt-[30px] select-none"
              >
                <span className="h-[6px] w-[6px] rounded-full bg-[radial-gradient(circle_at_32%_28%,#fff3c4_0%,#d8a238_52%,#7a5414_100%)] shadow-[0_1px_2px_rgba(28,20,10,0.42)]" />
                <span className="h-[6px] w-[6px] rounded-full bg-[radial-gradient(circle_at_32%_28%,#fff3c4_0%,#d8a238_52%,#7a5414_100%)] shadow-[0_1px_2px_rgba(28,20,10,0.42)]" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
