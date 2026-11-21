import { TreeCanvas } from './components/canvas/TreeCanvas';
import { InteractionHint } from './components/chrome/InteractionHint';
import { TopBar } from './components/chrome/TopBar';
import { NewYearView } from './components/views/NewYearView';
import { StudioProvider, useSceneBridge, useStudioUI } from './context/StudioContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function StudioShell() {
  const { replayDecorating, triggerGiftCycle } = useStudioUI();
  const { sceneRef } = useSceneBridge();

  useKeyboardShortcuts({
    disabled: false,
    onToggleLights: () => {},
    onFireworks: () => sceneRef.current?.launchCelebrationBurst(),
    onToggleZen: () => {},
    onStar: () => sceneRef.current?.triggerStarEffect(),
    onGift: triggerGiftCycle,
    onReplay: replayDecorating,
  });

  return (
    <>
      <TreeCanvas />
      <TopBar />

      <main className="pointer-events-none relative z-10 min-h-[100dvh] w-full">
        <NewYearView />
      </main>

      <InteractionHint />
    </>
  );
}

export function App() {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  );
}

export default App;
