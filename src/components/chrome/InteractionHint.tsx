import { AnimatePresence, motion } from 'motion/react';
import { useStudioUI } from '../../context/StudioContext';

export function InteractionHint() {
  const { hintVisible } = useStudioUI();

  return (
    <AnimatePresence>
      {hintVisible && (
        <motion.p
          key="interaction-hint"
          id="interaction-hint"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.35 }}
          className="pointer-events-none fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 lg:translate-x-0 lg:bottom-4 lg:left-[clamp(1.75rem,6vw,5rem)] z-20 max-w-[calc(100vw-1.5rem)] whitespace-nowrap rounded-full bg-surface border border-edge px-3.5 py-1.5 text-[0.75rem] sm:text-[0.8rem] font-medium text-muted shadow-soft"
        >
          ลองแตะที่ดาว ลูกบอล หรือกล่องของขวัญใต้ต้นไม้ดูสิ
        </motion.p>
      )}
    </AnimatePresence>
  );
}
