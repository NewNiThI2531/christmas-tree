import { Volume2, VolumeX } from 'lucide-react';
import { useSceneBridge } from '../../context/StudioContext';

export function TopBar() {
  const { audio } = useSceneBridge();

  return (
    <header
      id="top-bar"
      className="fixed top-3.5 right-3.5 sm:top-5 sm:right-6 z-20 pointer-events-none"
    >
      <button
        type="button"
        id="btn-sound"
        onClick={audio.toggleSound}
        aria-pressed={audio.enabled}
        title={audio.enabled ? 'ปิดเสียง' : 'เปิดเสียง'}
        aria-label={audio.enabled ? 'ปิดเสียง' : 'เปิดเสียง'}
        className={`group pointer-events-auto relative inline-flex min-h-[42px] items-center justify-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-[0.84rem] font-bold transition-[transform,box-shadow,background,border-color,color] duration-100 ease-out cursor-pointer select-none ${
          audio.enabled
            ? 'border-[#104230] bg-[linear-gradient(180deg,#2f926e_0%,#1f7053_48%,#165840_100%)] text-white [text-shadow:0_-1px_0_rgba(10,44,31,0.58)] shadow-[0_4px_0_#0f3b2b,0_9px_20px_rgba(15,59,43,0.32),inset_0_1px_1px_rgba(210,255,235,0.52),inset_0_-2px_3px_rgba(10,42,30,0.38)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_#0f3b2b,0_12px_24px_rgba(15,59,43,0.36),inset_0_1px_1px_rgba(220,255,240,0.6),inset_0_-2px_3px_rgba(10,42,30,0.38)] active:translate-y-[3px] active:shadow-[0_1px_0_#0f3b2b,0_3px_8px_rgba(15,59,43,0.26),inset_0_2px_4px_rgba(8,34,24,0.45)]'
            : 'border-[#c8b596] bg-[linear-gradient(180deg,#fffefb_0%,#f6efe2_54%,#ebe0cd_100%)] text-[#1b2e25] [text-shadow:0_1px_0_rgba(255,255,255,0.88)] shadow-[0_4px_0_#c1ad8e,0_8px_18px_rgba(34,44,38,0.14),inset_0_1px_0_#ffffff,inset_0_-2px_3px_rgba(166,144,112,0.24)] hover:-translate-y-[1px] hover:border-[#b9a27e] hover:shadow-[0_5px_0_#c1ad8e,0_11px_22px_rgba(34,44,38,0.18),inset_0_1px_0_#ffffff,inset_0_-2px_3px_rgba(166,144,112,0.24)] active:translate-y-[3px] active:shadow-[0_1px_0_#c1ad8e,0_3px_7px_rgba(34,44,38,0.12),inset_0_2px_4px_rgba(128,108,82,0.22)]'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-2.5 top-[2px] h-[44%] rounded-full bg-gradient-to-b ${
            audio.enabled
              ? 'from-white/32 via-white/10 to-transparent'
              : 'from-white/85 via-white/25 to-transparent'
          }`}
        />
        <span
          aria-hidden="true"
          className="enamel-shimmer pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />

        {audio.enabled ? (
          <Volume2 className="relative z-10 h-4 w-4 shrink-0 text-[#f9e49e]" aria-hidden="true" />
        ) : (
          <VolumeX className="relative z-10 h-4 w-4 shrink-0 text-[#bf3d24]" aria-hidden="true" />
        )}

        <span className="relative z-10">{audio.enabled ? 'เปิดเสียง' : 'ปิดเสียง'}</span>

        {audio.enabled ? (
          <span aria-hidden="true" className="relative z-10 ml-0.5 flex h-3.5 items-end gap-[2px]">
            <span className="eq-bar-1 h-full w-[2.5px] rounded-full bg-[#fce395]" />
            <span className="eq-bar-2 h-full w-[2.5px] rounded-full bg-[#fff7d6]" />
            <span className="eq-bar-3 h-full w-[2.5px] rounded-full bg-[#fce395]" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="relative z-10 ml-0.5 h-2 w-2 rounded-full bg-[#c9b9a1] shadow-[inset_0_1px_2px_rgba(58,44,28,0.45),0_1px_0_rgba(255,255,255,0.85)]"
          />
        )}
      </button>
    </header>
  );
}
