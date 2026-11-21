import { Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useMemo } from 'react';
import { useSceneBridge, useStudioUI } from '../../context/StudioContext';
import { DEFAULT_PREFERENCES, SPRING_GENTLE } from '../../data/constants';
import { useCountdown } from '../../hooks/useCountdown';
import { CountdownPanel } from './CountdownPanel';

const FestiveBunting = memo(function FestiveBunting() {
  const swags = [
    { x0: 0, y0: 6, cx: 240, cy: 76, x1: 480, y1: 14 },
    { x0: 480, y0: 14, cx: 720, cy: 84, x1: 960, y1: 14 },
    { x0: 960, y0: 14, cx: 1200, cy: 76, x1: 1440, y1: 6 },
  ];

  const evalQuad = (s: (typeof swags)[number], t: number) => {
    const u = 1 - t;
    const x = u * u * s.x0 + 2 * u * t * s.cx + t * t * s.x1;
    const y = u * u * s.y0 + 2 * u * t * s.cy + t * t * s.y1;
    const dx = 2 * u * (s.cx - s.x0) + 2 * t * (s.x1 - s.cx);
    const dy = 2 * u * (s.cy - s.y0) + 2 * t * (s.y1 - s.cy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { x, y, angle };
  };

  const palette = [
    { grad: 'url(#felt-crimson)', stitch: '#fff6e5', motif: 'star' as const },
    { grad: 'url(#felt-pine)', stitch: '#f7df9d', motif: 'band' as const },
    { grad: 'url(#felt-ochre)', stitch: '#fffaf0', motif: 'dot' as const },
    { grad: 'url(#felt-crimson)', stitch: '#f7df9d', motif: 'band' as const },
    { grad: 'url(#felt-teal)', stitch: '#fff6e5', motif: 'star' as const },
    { grad: 'url(#felt-pine)', stitch: '#fff6e5', motif: 'dot' as const },
  ];

  const flagTs = [0.14, 0.32, 0.5, 0.68, 0.86];
  const bulbTs = [0.23, 0.41, 0.59, 0.77];

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 132"
      preserveAspectRatio="xMidYMin slice"
      className="pointer-events-none fixed top-0 left-0 right-0 z-10 h-[84px] sm:h-[114px] w-full"
    >
      <defs>
        <pattern id="felt-weave" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3H6M3 0V6" stroke="#ffffff" strokeWidth="0.45" opacity="0.22" />
          <path d="M0 0L6 6" stroke="#1a120a" strokeWidth="0.35" opacity="0.1" />
        </pattern>

        <linearGradient id="felt-crimson" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#d95136" />
          <stop offset="60%" stopColor="#bd3a22" />
          <stop offset="100%" stopColor="#992916" />
        </linearGradient>
        <linearGradient id="felt-pine" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#267a5c" />
          <stop offset="60%" stopColor="#1b5e46" />
          <stop offset="100%" stopColor="#124533" />
        </linearGradient>
        <linearGradient id="felt-ochre" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#e8ae35" />
          <stop offset="60%" stopColor="#cc8e1e" />
          <stop offset="100%" stopColor="#a87012" />
        </linearGradient>
        <linearGradient id="felt-teal" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#3582a2" />
          <stop offset="60%" stopColor="#256783" />
          <stop offset="100%" stopColor="#1a4e64" />
        </linearGradient>

        <linearGradient id="brass-socket" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6a4b17" />
          <stop offset="35%" stopColor="#f2d483" />
          <stop offset="68%" stopColor="#b4832c" />
          <stop offset="100%" stopColor="#5c3e10" />
        </linearGradient>
        <radialGradient id="edison-glass" cx="42%" cy="46%" r="58%">
          <stop offset="0%" stopColor="#fffef5" />
          <stop offset="36%" stopColor="#ffe799" />
          <stop offset="76%" stopColor="#f2b238" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#cc7d14" stopOpacity="0.86" />
        </radialGradient>
        <radialGradient id="edison-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd875" stopOpacity="0.52" />
          <stop offset="45%" stopColor="#ffbe4a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffbe4a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Twisted Natural Jute Twine */}
      <g>
        {swags.map((s, si) => {
          const d = `M ${s.x0} ${s.y0} Q ${s.cx} ${s.cy} ${s.x1} ${s.y1}`;
          return (
            <g key={`cord-${si}`}>
              <path
                d={d}
                transform="translate(0,3)"
                fill="none"
                stroke="rgba(42,29,16,0.16)"
                strokeWidth="3.4"
              />
              <path d={d} fill="none" stroke="#8b683e" strokeWidth="2.8" strokeLinecap="round" />
              <path
                d={d}
                fill="none"
                stroke="#d9b984"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                strokeLinecap="round"
              />
              <path
                d={d}
                fill="none"
                stroke="#5c4020"
                strokeWidth="1"
                strokeDasharray="2 7"
                strokeDashoffset="3"
              />
            </g>
          );
        })}
      </g>

      {/* Stitched Felt / Linen Pennants */}
      {swags.map((s, si) =>
        flagTs.map((t, fi) => {
          const { x, y, angle } = evalQuad(s, t);
          const style = palette[(si * 5 + fi) % palette.length]!;
          return (
            <g
              key={`flag-${si}-${fi}`}
              transform={`translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${(angle * 0.42).toFixed(1)})`}
            >
              <path
                d="M -21 1 L 21 1 L 2.2 44.5 Q 0 47.5 -2.2 44.5 Z"
                transform="translate(1.8, 3.2)"
                fill="rgba(30, 22, 14, 0.17)"
              />
              <path d="M -21 0 L 21 0 L 2.2 44 Q 0 47 -2.2 44 Z" fill={style.grad} />
              <path d="M -21 0 L 21 0 L 2.2 44 Q 0 47 -2.2 44 Z" fill="url(#felt-weave)" />
              <path d="M -21 0 L 21 0 L 18.8 5 L -18.8 5 Z" fill="#1b120a" opacity="0.22" />
              <path
                d="M -16.8 3.6 L 16.8 3.6 L 1.2 40 Q 0 42 -1.2 40 Z"
                fill="none"
                stroke={style.stitch}
                strokeWidth="1.15"
                strokeDasharray="3.2 2.6"
                strokeLinecap="round"
                opacity="0.82"
              />
              {style.motif === 'star' && (
                <path
                  d="M 0 11 L 1.8 15.8 L 6.6 17.6 L 1.8 19.4 L 0 24.2 L -1.8 19.4 L -6.6 17.6 L -1.8 15.8 Z"
                  fill={style.stitch}
                  opacity="0.9"
                />
              )}
              {style.motif === 'band' && (
                <>
                  <line
                    x1="-11"
                    y1="15.5"
                    x2="11"
                    y2="15.5"
                    stroke={style.stitch}
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    opacity="0.86"
                  />
                  <line
                    x1="-7.5"
                    y1="21.5"
                    x2="7.5"
                    y2="21.5"
                    stroke={style.stitch}
                    strokeWidth="1.3"
                    strokeDasharray="2.2 2.2"
                    strokeLinecap="round"
                    opacity="0.78"
                  />
                </>
              )}
              {style.motif === 'dot' && (
                <>
                  <circle cx="0" cy="15.5" r="3.1" fill={style.stitch} opacity="0.9" />
                  <circle cx="0" cy="25" r="1.8" fill={style.stitch} opacity="0.78" />
                </>
              )}
              <circle cx="0" cy="46.5" r="3.4" fill="#d99a26" />
              <circle cx="-0.9" cy="45.5" r="1.2" fill="#fff0b8" opacity="0.85" />
            </g>
          );
        }),
      )}

      {/* Blown-Glass Edison Fairy Bulbs with Brass Sockets */}
      {swags.map((s, si) =>
        bulbTs.map((t, bi) => {
          const { x, y } = evalQuad(s, t);
          const haloClass = (si + bi) % 2 === 0 ? 'bulb-halo-a' : 'bulb-halo-b';
          return (
            <g key={`bulb-${si}-${bi}`} transform={`translate(${x.toFixed(1)}, ${y.toFixed(1)})`}>
              <circle cx="0" cy="15" r="19" fill="url(#edison-halo)" className={haloClass} />
              <line x1="0" y1="0" x2="0" y2="4.5" stroke="#5a4324" strokeWidth="1.4" />
              <rect
                x="-3.4"
                y="3.8"
                width="6.8"
                height="4.4"
                rx="1.2"
                fill="url(#brass-socket)"
                stroke="#4c330d"
                strokeWidth="0.5"
              />
              <line x1="-3" y1="5.4" x2="3" y2="5.4" stroke="#664615" strokeWidth="0.6" opacity="0.6" />
              <path
                d="M -2.7 8 C -3.8 11.2 -5.8 13.8 -5.4 17.4 C -5.0 20.6 -2.6 22.6 0 22.6 C 2.6 22.6 5.0 20.6 5.4 17.4 C 5.8 13.8 3.8 11.2 2.7 8 Z"
                fill="url(#edison-glass)"
                stroke="#c98018"
                strokeWidth="0.65"
              />
              <path
                d="M -1.3 9.2 L -1.1 15.2 Q 0 17.5 1.1 15.2 L 1.3 9.2"
                fill="none"
                stroke="#fffef6"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path
                d="M -3.1 13.4 Q -3.9 16.2 -2.6 18.8"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.15"
                strokeLinecap="round"
                opacity="0.88"
              />
            </g>
          );
        }),
      )}
    </svg>
  );
});

const BrassStarburst = memo(function BrassStarburst({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" fill="none" className={className}>
      <path d="M14 1 L16.8 11.2 L27 14 L16.8 16.8 L14 27 L14 14 Z" fill="#f2cf72" />
      <path d="M14 1 L14 14 L14 27 L11.2 16.8 L1 14 L11.2 11.2 Z" fill="#b47a1c" />
      <path d="M14 1 L16.8 11.2 L14 14 L11.2 11.2 Z" fill="#fff2c4" opacity="0.9" />
      <circle cx="14" cy="14" r="1.9" fill="#fff7dc" />
    </svg>
  );
});

export function NewYearView() {
  const { setCelebrationMode } = useStudioUI();
  const { sceneRef } = useSceneBridge();

  // Optional URL param ?preview=newyear to preview Jan 1 nonstop fireworks mode anytime
  const forceCelebrationPreview = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('preview') === 'newyear';
  }, []);

  const { info } = useCountdown({
    target: 'newyear',
    customTarget: DEFAULT_PREFERENCES.customTarget,
    midnightPreviewUntil: 0,
  });

  const isNewYearsDay = forceCelebrationPreview || info.isCelebrationDay;

  useEffect(() => {
    setCelebrationMode(isNewYearsDay);
  }, [isNewYearsDay, setCelebrationMode]);

  return (
    <motion.section
      id="view-newyear"
      aria-label={`Happy New Year ${info.year}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_GENTLE}
      className="relative flex min-h-[100dvh] w-full flex-col justify-end items-center text-center lg:justify-center lg:items-start lg:text-left pt-[5.25rem] px-4 pb-[max(2.75rem,calc(env(safe-area-inset-bottom)+2.25rem))] lg:pt-[5.5rem] lg:pb-[2.5rem] lg:px-[clamp(1.75rem,6vw,5rem)]"
    >
      <FestiveBunting />

      {/* Editorial Stationery Showcase */}
      <div className="pointer-events-auto relative w-full max-w-[440px] lg:max-w-[min(560px,47vw)] xl:max-w-[590px] rounded-[28px] border border-[#d6c4a8] bg-gradient-to-b from-[#fffdf9] via-[#faf4e8] to-[#f3ead9] px-5 py-6 shadow-[0_4px_0_#d5c2a4,0_20px_44px_rgba(29,43,36,0.16),inset_0_1px_0_#ffffff] lg:rounded-none lg:bg-none lg:bg-transparent lg:border-0 lg:p-0 lg:shadow-none">
        {/* Compositor-only Floating Die-Cast Brass Sparkles */}
        <div
          aria-hidden="true"
          className="brass-float-a pointer-events-none hidden lg:block absolute -top-9 -left-7"
        >
          <BrassStarburst className="h-7 w-7 opacity-95" />
        </div>

        <div
          aria-hidden="true"
          className="brass-float-b pointer-events-none hidden lg:block absolute top-10 right-2"
        >
          <BrassStarburst className="h-5 w-5 opacity-85" />
        </div>

        {/* Letterpress Heading + Dual-Layer Burnished 24K Gold-Foil Year */}
        <h1
          id="ny-main-heading"
          className="m-0 font-display font-bold tracking-[-0.025em] leading-[0.98]"
        >
          <span className="block text-[clamp(2.25rem,8vw,3.25rem)] lg:text-[clamp(3.15rem,5.2vw,4.9rem)] text-title [text-shadow:0_1px_0_rgba(255,253,248,0.92),0_4px_12px_rgba(24,54,42,0.12)]">
            Happy New Year
          </span>
          <span className="mt-1 inline-flex items-center gap-3 leading-none">
            <span className="relative inline-block tabular-digits text-[clamp(3.35rem,13vw,4.75rem)] lg:text-[clamp(4.55rem,7.8vw,6.85rem)]">
              <span aria-hidden="true" className="gold-foil-extrude absolute inset-0 select-none">
                {info.year}
              </span>
              <span className="gold-foil-face relative block">{info.year}</span>
            </span>
            <span aria-hidden="true" className="brass-float-a inline-flex">
              <BrassStarburst className="h-7 w-7 lg:h-10 lg:w-10 shrink-0" />
            </span>
          </span>
        </h1>

        {/* Warm Festive Wish Subtitle */}
        <p className="mt-2.5 mb-0 text-[0.9rem] lg:text-[1.04rem] font-medium leading-[1.6] text-muted max-w-[40ch] mx-auto lg:mx-0 [text-shadow:0_1px_0_rgba(255,253,248,0.75)]">
          {isNewYearsDay
            ? `สวัสดีปีใหม่ ${info.year}! ขอให้ทุกวันเต็มไปด้วยความสุขและแสงสว่าง`
            : 'ขอให้ปีใหม่นี้เต็มไปด้วยความอบอุ่น รอยยิ้ม และเรื่องราวดี ๆ ในทุกวัน'}
        </p>

        {/* Embossed Brass & Enamel Filigree Divider */}
        <div
          aria-hidden="true"
          className="my-4 lg:my-5 flex items-center justify-center lg:justify-start gap-2.5"
        >
          <span className="h-2 w-2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff987e_0%,#c93a22_65%,#7a1c0d_100%)] shadow-[0_1px_2px_rgba(68,20,10,0.3)]" />
          <span className="h-[2px] w-14 rounded-full bg-gradient-to-r from-[#b87a24]/80 via-[#edd080] to-[#c99538]/80 shadow-[0_1px_0_rgba(255,255,255,0.85)]" />
          <BrassStarburst className="h-4 w-4" />
          <span className="h-[2px] w-14 rounded-full bg-gradient-to-r from-[#c99538]/80 via-[#edd080] to-[#1f6e52]/75 shadow-[0_1px_0_rgba(255,255,255,0.85)]" />
          <span className="h-2 w-2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#6cc49e_0%,#1f6e52_65%,#0f3d2c_100%)] shadow-[0_1px_2px_rgba(15,48,36,0.3)]" />
        </div>

        {/* Mechanical Split-Flap Countdown (automatically removed on Jan 1) */}
        <AnimatePresence initial={false}>
          {!isNewYearsDay && (
            <motion.div
              key="countdown-block"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={SPRING_GENTLE}
              className="mb-5"
            >
              <CountdownPanel info={info} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Embossed Champagne-Brass Celebration Plaque shown all day on Jan 1 */}
        {isNewYearsDay && (
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c5943c]/65 bg-gradient-to-b from-[#fff8e2] via-[#f9e7b8] to-[#eed18a] px-4.5 py-2 text-[0.86rem] font-bold text-[#5e2310] shadow-[0_3px_0_#b98a35,0_10px_20px_rgba(128,84,18,0.18),inset_0_1px_0_rgba(255,255,255,0.88)] [text-shadow:0_1px_0_rgba(255,250,232,0.7)]">
            <span aria-hidden="true">🥂</span>
            <span>สุขสันต์วันขึ้นปีใหม่ {info.year}</span>
          </div>
        )}

        {/* Physical 3D Crimson-Cinnabar Lacquer Push Button */}
        <div className="flex items-center justify-center lg:justify-start pb-1">
          <button
            type="button"
            id="btn-fireworks"
            onClick={() => sceneRef.current?.launchCelebrationBurst()}
            className="group relative inline-flex min-h-[48px] items-center justify-center gap-2.5 overflow-hidden rounded-full border border-[#8a2111] ring-1 ring-[#f0c76e]/45 bg-[linear-gradient(180deg,#ef6d4c_0%,#d8472b_46%,#bf3319_56%,#a62712_100%)] px-8 py-2.5 text-[0.95rem] font-bold text-white [text-shadow:0_-1px_0_rgba(98,18,6,0.6)] shadow-[0_5px_0_#761b0c,0_10px_22px_rgba(118,27,12,0.34),0_2px_4px_rgba(45,14,6,0.22),inset_0_1px_1px_rgba(255,232,216,0.62),inset_0_-2px_4px_rgba(92,16,5,0.42)] transition-[transform,box-shadow] duration-100 ease-out hover:-translate-y-[1px] hover:shadow-[0_6px_0_#761b0c,0_14px_26px_rgba(118,27,12,0.38),0_3px_6px_rgba(45,14,6,0.24),inset_0_1px_1px_rgba(255,238,224,0.72),inset_0_-2px_4px_rgba(92,16,5,0.42)] active:translate-y-[4px] active:shadow-[0_1px_0_#761b0c,0_3px_8px_rgba(118,27,12,0.28),inset_0_2px_5px_rgba(74,14,4,0.48)] cursor-pointer select-none"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-[2px] h-[44%] rounded-full bg-gradient-to-b from-white/40 via-white/12 to-transparent"
            />
            <span
              aria-hidden="true"
              className="enamel-shimmer pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-transparent via-white/35 to-transparent"
            />
            <Sparkles
              className="relative z-10 h-4 w-4 text-[#fff2c7] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
              aria-hidden="true"
            />
            <span className="relative z-10">จุดพลุ</span>
          </button>
        </div>
      </div>
    </motion.section>
  );
}
